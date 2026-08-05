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
- Every flow endpoint is `@Secured(HAS_STATE)` — it runs inside an ongoing interactive flow session
  identified by the `state` token. Only the initial `/api/oauth2/authorize` entry point is unauthenticated.

A step controller exposes up to two handlers:

| Handler | Purpose | Returns |
|---------|---------|---------|
| `GET` | Give the UI what it needs to **render** the step | the step's config **or** a `redirect_url` |
| `POST` | Apply the user's **action**, then advance | a `redirect_url` to the next step |

The `state` is transmitted differently per method — `?state=` on GET, `Authorization: State <jwt>` on
POST. See [State management](/technical/api/flow#state-management) and [Security](/technical/security)
for why. You never read the state yourself; the helpers below do it for you.

## Never hand-roll: use `InteractiveAuthFlowSessionControllerUtil`

`InteractiveAuthFlowSessionControllerUtil` is the single entry point every flow handler goes through. It
decodes and verifies the state, loads the `OnGoingInteractiveFlowSession` and its `InteractiveFlow`,
runs your step logic, translates exceptions, and computes the next-step redirect. Pick the helper that
matches your handler:

| Helper | Use for |
|--------|---------|
| `fetchOnGoingSessionThenRunAndRedirect` | A `GET` step: serve config **or** redirect |
| `fetchOnGoingSessionWithUserThenRunAndRedirect` | A `GET` step that needs the authenticated `User` |
| `fetchOnGoingSessionThenUpdateAndRedirect` / `…WithUser…` | A `POST` step: mutate, then redirect |

::: warning
Do not decode the state, load the session, or build redirects directly in a controller. Doing so
bypasses the centralized state handling and the recoverable/unrecoverable exception split, and it is the
first thing a review will send back.
:::

## The two response shapes

Flow responses come in two shapes (see [Response patterns](/technical/api/flow#response-patterns)):

- **Simple** — only a `redirect_url`. Used by action `POST`s that always advance to the next step.
- **Config-or-redirect** — the step's config fields **or** a `redirect_url`. When `redirect_url` is set,
  every config field is `null`; the client checks `redirect_url` first.

A `GET` step uses the config-or-redirect shape: return the config when the step applies to the current
session, otherwise let the engine redirect the user to the step they actually belong on.

```kotlin
@Get
suspend fun getSignInConfiguration(
    authentication: Authentication
): SignInFlowResource = interactiveAuthFlowSessionControllerUtil.fetchOnGoingSessionThenRunAndRedirect(
    state = authentication.stateOrNull,
    run = { session, flow ->
        if (signInApplies(session, flow)) {
            buildSignInConfiguration(session, flow)
        } else {
            null // step does not apply → the util computes the correct redirect
        }
    },
    mapResultToResource = { it },
    mapRedirectUriToResource = { SignInFlowResource(redirectUrl = it.toString()) }
)
```

When `run` returns a value, `mapResultToResource` turns it into the response. When `run` returns `null`,
the helper asks the flow's purpose engine for the next step: `InteractiveFlowPurposeRegistry` selects the
session's `InteractiveFlowPurposeHandler`, which completes the session if needed and computes the next
abstract `InteractiveFlowStep`; `InteractiveFlowStepUriMapper.toRedirectUri` then maps that step to a
concrete page URI, which `mapRedirectUriToResource` wraps. Completed, failed and expired sessions are
handled the same way for free.

::: tip
`InteractiveFlowPurposeHandler` is the business-layer state machine behind that redirect: it decides which
step a purpose needs next and what happens when the flow completes. Authoring one is covered in
[How to write a flow purpose](/contributing/backend/how-to-write-a-flow-purpose).
:::

## The applicability predicate

The heart of a `GET` step is the predicate that decides *applies → serve config* vs *does not apply →
redirect*. It must mirror the step the purpose handler would compute for the same session, so a step that
does not apply never redirects back to itself.

```kotlin
private suspend fun signInApplies(
    session: OnGoingInteractiveFlowSession,
    flow: InteractiveFlow
): Boolean {
    if (session.userId != null) return false               // already authenticated → next step
    val invitationId = oauth2Manager.fetchOAuth2(session).invitationId
    return invitationId == null                            // invitation → sign-up page
        || flow.signUpUri == null
}
```

The session carries only flow-generic state (`userId`, MFA, terminal status); OAuth2 request data such as
the invitation is fetched on demand via `InteractiveFlowSessionOAuth2Manager.fetchOAuth2(session)`, never
read off the session object.

The next-step routing lives in two places you should read before adding a step:

- `OAuth2AuthorizeInteractiveFlowStatus` — the boolean flags describing what the session still needs
  (`missingUser`, `missingMfa`, `missingRequiredClaims`, …).
- `OAuth2AuthorizeInteractiveFlowPurposeHandler` — the handler that turns that status into the next
  abstract `InteractiveFlowStep`, which `InteractiveFlowStepUriMapper` maps to the concrete page URI.

::: tip
Sanity-check every not-applicable branch: for each reason your predicate returns `null`, confirm the
purpose handler sends the user *somewhere else*. If it would route back to the current step, you have a
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
with the state already appended, so the client can follow it directly. Use the step URI mapper rather
than assembling URLs by hand:

- `InteractiveFlowStepUriMapper.appendState(session, uri)` for an arbitrary URL.
- `getSignInRedirectUri(session, flow)` / `getSignUpRedirectUri(session, flow)` for the sign-in / sign-up
  pages.

**Cross-links** (a link from one step to a sibling, e.g. sign-in → sign-up) are included **only when the
target is allowed**. Decide that with a manager predicate, never with logic inlined in the controller:

```kotlin
val signUpRedirectUrl = if (
    interactiveAuthFlowSessionManager.isSignUpAllowed(session) && flow.signUpUri != null
) {
    stepUriMapper.getSignUpRedirectUri(session, flow)?.toString()
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
`InteractiveAuthFlowSessionPasswordManager.signInWithPassword` and `InteractiveAuthFlowSessionManager.isSignUpAllowed`.
Managers never return entities, and they signal problems with [business exceptions](/contributing/backend/how-to-throw-an-exception):
a **recoverable** exception becomes a `4xx` the user can retry; an **unrecoverable** one marks the session
failed and redirects to the error page. The helper applies that split for you.

A `POST` step follows the same shape, mutating through a manager and letting the helper redirect:

```kotlin
@Post
suspend fun signIn(
    authentication: Authentication,
    @Body inputResource: SignInInputResource
): SimpleFlowResource =
    interactiveAuthFlowSessionControllerUtil.fetchOnGoingSessionThenUpdateAndRedirect(
        state = authentication.stateOrNull,
        update = { session, _ ->
            passwordFlowManager.signInWithPassword(
                session = session,
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
- [ ] Every handler goes through `InteractiveAuthFlowSessionControllerUtil` — no manual state or redirect handling.
- [ ] `GET` returns config **or** `redirect_url`; the applicability predicate mirrors the purpose handler's step.
- [ ] Response resource is UI-only; `*FlowResource` only if it carries `redirect_url`; sub-resources reused.
- [ ] URLs built via the step URI mapper (state appended); cross-links gated by a manager predicate; 303 not 307.
- [ ] Step logic and predicates live in managers; exceptions are recoverable/unrecoverable business exceptions.
- [ ] Endpoint documented in the [Flow API](/technical/api/flow) reference.
