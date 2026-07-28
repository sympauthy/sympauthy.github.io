# How to design a flow endpoint

The [Flow API](/technical/api/flow) is a **step-based, state-driven workflow API**, not a
resource-oriented CRUD API. Each endpoint is one step of an [interactive flow](/functional/interactive_flow):
a custom UI drives the user through the steps, and after every action the **server** decides which step
comes next. This guide covers the backend pattern for adding a new flow step endpoint.

::: tip
This guide complements [How to design an API endpoint](/contributing/backend/how-to-design-an-api-endpoint), which covers the
resource-oriented Admin and Client APIs. The URL, status-code and pagination conventions there still
apply; this page adds the flow-specific pattern those conventions explicitly leave out.
:::

## Anatomy of a flow step

A flow step is a controller under `/api/v1/flow/<step>`, secured by the flow state:

```kotlin
@Controller("/api/v1/flow/sign-in")
@Secured(HAS_STATE)
class SignInController( /* ... */ )
```

- Use **kebab-case** for the step segment (`sign-in`, `sign-up`, `claims/validation`).
- Every flow endpoint is `@Secured(HAS_STATE)` — it runs inside an ongoing authorization attempt
  identified by the `state` token. Only the initial `/api/oauth2/authorize` entry point is unauthenticated.

A step controller exposes up to two handlers:

| Handler | Purpose | Returns |
|---------|---------|---------|
| `GET` | Give the UI what it needs to **render** the step | the step's config **or** a `redirect_url` |
| `POST` | Apply the user's **action**, then advance | a `redirect_url` to the next step |

The `state` is transmitted differently per method — `?state=` on GET, `Authorization: State <jwt>` on
POST. See [State management](/technical/api/flow#state-management) and [Security](/technical/security)
for why. You never read the state yourself; the helpers below do it for you.

## Never hand-roll: use `WebAuthorizationFlowControllerUtil`

`WebAuthorizationFlowControllerUtil` is the single entry point every flow handler goes through. It
decodes and verifies the state, loads the `OnGoingAuthorizeAttempt` and its `WebAuthorizationFlow`,
runs your step logic, translates exceptions, and computes the next-step redirect. Pick the helper that
matches your handler:

| Helper | Use for |
|--------|---------|
| `fetchOnGoingAttemptThenRunAndRedirect` | A `GET` step: serve config **or** redirect |
| `fetchOnGoingAttemptWithUserThenRunAndRedirect` | A `GET` step that needs the authenticated `User` |
| `fetchOnGoingAttemptThenUpdateAndRedirect` / `…WithUser…` | A `POST` step: mutate, then redirect |

::: warning
Do not decode the state, load the attempt, or build redirects directly in a controller. Doing so
bypasses the centralized state handling and the recoverable/unrecoverable exception split, and it is the
first thing a review will send back.
:::

## The two response shapes

Flow responses come in two shapes (see [Response patterns](/technical/api/flow#response-patterns)):

- **Simple** — only a `redirect_url`. Used by action `POST`s that always advance to the next step.
- **Config-or-redirect** — the step's config fields **or** a `redirect_url`. When `redirect_url` is set,
  every config field is `null`; the client checks `redirect_url` first.

A `GET` step uses the config-or-redirect shape: return the config when the step applies to the current
attempt, otherwise let the engine redirect the user to the step they actually belong on.

```kotlin
@Get
suspend fun getSignInConfiguration(
    authentication: Authentication
): SignInFlowResource = webAuthorizationFlowControllerUtil.fetchOnGoingAttemptThenRunAndRedirect(
    state = authentication.stateOrNull,
    run = { authorizeAttempt, flow ->
        if (signInApplies(authorizeAttempt, flow)) {
            buildSignInConfiguration(authorizeAttempt, flow)
        } else {
            null // step does not apply → the util computes the correct redirect
        }
    },
    mapResultToResource = { it },
    mapRedirectUriToResource = { SignInFlowResource(redirectUrl = it.toString()) }
)
```

When `run` returns a value, `mapResultToResource` turns it into the response. When `run` returns `null`,
the helper calls `WebAuthorizationFlowManager.getStatusAndCompleteIfNecessary` and
`WebAuthorizationFlowRedirectUriBuilder.getRedirectUri` to find the correct next step, then
`mapRedirectUriToResource` wraps that URI. Completed, failed and expired attempts are handled the same
way for free.

## The applicability predicate

The heart of a `GET` step is the predicate that decides *applies → serve config* vs *does not apply →
redirect*. It must mirror the routing in `WebAuthorizationFlowRedirectUriBuilder`, so a step that does
not apply never redirects back to itself.

```kotlin
private fun signInApplies(
    authorizeAttempt: OnGoingAuthorizeAttempt,
    flow: WebAuthorizationFlow
): Boolean {
    if (authorizeAttempt.userId != null) return false          // already authenticated → next step
    return authorizeAttempt.invitationId == null               // invitation → sign-up page
        || flow.signUpUri == null
}
```

The next-step routing lives in two places you should read before adding a step:

- `WebAuthorizationFlowStatus` — the boolean flags describing what the attempt still needs
  (`missingUser`, `missingMfa`, `missingRequiredClaims`, …).
- `WebAuthorizationFlowRedirectUriBuilder` — the cascade that turns that status into the next URI.

::: tip
Sanity-check every not-applicable branch: for each reason your predicate returns `null`, confirm the
redirect builder sends the user *somewhere else*. If it would route back to the current step, you have a
redirect loop.
:::

## Design the response resource

Flow configuration is **UI-only**: it carries what the front-end needs to render the step and nothing
else. Step sequencing, prerequisites, purpose and OAuth2 request data do **not** belong in the response —
they live in the session and the engine.

Naming rule: a resource that can carry a `redirect_url` is named `*FlowResource`; a pure config
sub-resource is a plain `*Resource` and is reused across steps.

```kotlin
@Serdeable
data class SignInFlowResource(
    val password: PasswordResource? = null,       // null → password sign-in disabled
    val providers: List<ProviderResource>? = null,
    @get:JsonProperty("sign_up_redirect_url")
    val signUpRedirectUrl: String? = null,        // cross-link; null when sign-up not allowed
    @get:JsonProperty("redirect_url")
    val redirectUrl: String? = null               // set → all config fields are null
)
```

- `@Serdeable`; `snake_case` JSON via `@JsonProperty`; document fields with `@Schema`.
- Config fields are nullable because the resource is either/or: config **or** `redirect_url`.
- Reuse the shared sub-resources (`PasswordResource`, `ProviderResource`, `CollectableClaimResource`)
  rather than redefining claim/provider shapes per step.

## URLs always carry state

Every URL a flow endpoint returns — `redirect_url`, cross-links, provider `authorize_url` — is built
with the state already appended, so the client can follow it directly. Use the redirect builder rather
than assembling URLs by hand:

- `WebAuthorizationFlowRedirectUriBuilder.appendStateToUri(attempt, uri)` for an arbitrary URL.
- `getSignInRedirectUri(attempt, flow)` / `getSignUpRedirectUri(attempt, flow)` for the sign-in / sign-up
  pages.

**Cross-links** (a link from one step to a sibling, e.g. sign-in → sign-up) are included **only when the
target is allowed**. Decide that with a manager predicate, never with logic inlined in the controller:

```kotlin
val signUpRedirectUrl = if (
    webAuthorizationFlowManager.isSignUpAllowed(authorizeAttempt) && flow.signUpUri != null
) {
    redirectUriBuilder.getSignUpRedirectUri(authorizeAttempt, flow)?.toString()
} else null
```

::: warning
All server-side redirects use HTTP **303 (See Other)**, never 307 —
[OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-7.5.3) forbids 307
because it re-submits the original body (including credentials) to the redirect target.
:::

## Keep the logic in managers

A flow controller only assembles the response resource and delegates to the helper. The step's behaviour
and its predicates live in [business managers](/contributing/backend/how-to-write-a-business-manager) — for example
`WebAuthorizationFlowPasswordManager.signInWithPassword` and `WebAuthorizationFlowManager.isSignUpAllowed`.
Managers never return entities, and they signal problems with [business exceptions](/contributing/backend/how-to-throw-an-exception):
a **recoverable** exception becomes a `4xx` the user can retry; an **unrecoverable** one marks the attempt
failed and redirects to the error page. The helper applies that split for you.

A `POST` step follows the same shape, mutating through a manager and letting the helper redirect:

```kotlin
@Post
suspend fun signIn(
    authentication: Authentication,
    @Body inputResource: SignInInputResource
): SimpleFlowResource =
    webAuthorizationFlowControllerUtil.fetchOnGoingAttemptThenUpdateAndRedirect(
        state = authentication.stateOrNull,
        update = { authorizeAttempt, _ ->
            passwordFlowManager.signInWithPassword(
                authorizeAttempt = authorizeAttempt,
                login = inputResource.login,
                password = inputResource.password
            )
        },
        mapRedirectUriToResource = { SimpleFlowResource(it.toString()) }
    )
```

## CORS and configuration

A custom flow serves its step pages from the origin declared under `flows.<id>` in the
[configuration](/technical/configuration/authorization). The Flow API's strict CORS policy derives
its allow-list from those configured flow URIs, so a new step whose **page** lives at a new origin must be
registered there — otherwise the browser blocks the request. See
[CORS](/technical/api/flow#cors) for the full policy.

## Document the endpoint

Add the new endpoint to the [Flow API](/technical/api/flow) reference using the endpoint template
from [How to design an API endpoint](/contributing/backend/how-to-design-an-api-endpoint#endpoint-documentation-template)
(`Path` / `Method` / `Authentication` / `Purpose` / request & response formats / properties), and annotate
the handler with `@Operation` so it appears in the generated OpenAPI document.

## Checklist

- [ ] Controller under `/api/v1/flow/<step>` (kebab-case), `@Secured(HAS_STATE)`.
- [ ] Every handler goes through `WebAuthorizationFlowControllerUtil` — no manual state or redirect handling.
- [ ] `GET` returns config **or** `redirect_url`; the applicability predicate mirrors the redirect builder.
- [ ] Response resource is UI-only; `*FlowResource` only if it carries `redirect_url`; sub-resources reused.
- [ ] URLs built via the redirect builder (state appended); cross-links gated by a manager predicate; 303 not 307.
- [ ] Step logic and predicates live in managers; exceptions are recoverable/unrecoverable business exceptions.
- [ ] Endpoint documented in the [Flow API](/technical/api/flow) reference.
