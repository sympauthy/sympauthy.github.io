# How to write a flow purpose

An [interactive flow](/functional/interactive_flow) is no longer a single hardcoded OAuth2 cascade: it is a
**purpose-agnostic engine** that walks the end-user through whatever steps the session's purposes require. A
**purpose** is that engine's unit of composition — a reason a flow session exists (OAuth2 authorization, MFA
enrollment, re-authentication, provider linking, …) together with the small state machine that decides which
steps run and what happens when it finishes. This guide covers how to add one.

::: tip
This guide is about the **purpose**: the business-layer building block that sequences steps. Its sibling,
[How to design a flow endpoint](/contributing/backend/how-to-design-a-flow-endpoint), is about the **step**:
the transport-layer controller that renders one page and advances the flow. You will often touch both — write
the purpose here, expose its steps there.
:::

## What a purpose is

A purpose is a value of the `InteractiveFlowPurpose` enum. A session carries an **ordered list** of purposes and
one `initiatingPurpose`; the engine drives them in order. Each value plays one of three roles:

| Role | Purposes | Behaviour |
|------|----------|-----------|
| **Initiating** | `OAUTH2_AUTHORIZE`, `LINK_PROVIDER` | Owns the session's terminal handoff; the session's `initiatingPurpose`. |
| **Gate** | `CONFIRM`, `REAUTHENTICATION` | Prepended in front of the initiating purpose so it runs first; owns no terminal handoff and is never the `initiatingPurpose`. |
| **Follow-up** | `MFA_ENROLLMENT`, `MFA_CHALLENGE` | Appended by another purpose that requires it (e.g. OAuth2 requiring MFA before it completes). |

The enum's own KDoc is the authoritative description of each purpose — read it before adding a value.

## How the engine sequences purposes

`InteractiveFlowEngine.advance(session)` turns a session into the single next step to present:

- It walks `purposes` **in order**, asking each purpose's handler for its `nextStepOrNull`. The first purpose
  that still needs a step yields that step — and the walk stops there.
- When a purpose resolves (its `nextStepOrNull` returns `null`), the engine marks it complete and inserts the
  follow-up purposes it declares **immediately after it** — so a gate's follow-up (e.g. re-authentication's MFA
  challenge) lands ahead of the sensitive purpose it guards, never after it.
- Once **every** purpose has resolved, the engine runs each purpose's `applyTerminalEffect` in order, then
  transitions the session to completed (or failed).

::: warning
A handler **only ever reads the session and describes what its purpose needs**. Appending purposes, marking a
purpose complete, and completing or failing the session are the engine's sole responsibility. Never mutate or
persist the session from a handler.
:::

## Anatomy of a purpose handler

A purpose is implemented by a `@Singleton` `InteractiveFlowPurposeHandler` — one per enum value. There is **no
registration list to edit**: `InteractiveFlowPurposeRegistry` injects `List<InteractiveFlowPurposeHandler>` and
indexes them by their `purpose`, so dropping a new `@Singleton` into the graph wires it up. A purpose whose
handler is missing is a programming error and throws `flow.purpose.unsupported`.

```kotlin
interface InteractiveFlowPurposeHandler {
    val purpose: InteractiveFlowPurpose

    suspend fun nextStepOrNull(session: OnGoingInteractiveFlowSession): InteractiveFlowStep?

    suspend fun followUpPurposes(session: OnGoingInteractiveFlowSession): List<InteractiveFlowPurpose> =
        emptyList()

    suspend fun applyTerminalEffect(session: OnGoingInteractiveFlowSession): TerminalEffectResult =
        TerminalEffectResult.Proceed
}
```

| Member | Answers | Default |
|--------|---------|---------|
| `purpose` | Which purpose this handler owns. | — |
| `nextStepOrNull` | What step the user must go through next for this purpose; `null` once it is resolved. | — |
| `followUpPurposes` | Which purposes must run once this one resolves. | `emptyList()` |
| `applyTerminalEffect` | This purpose's own completion work, run when the whole flow is about to succeed. | `Proceed` |

A minimal purpose only implements `purpose` and `nextStepOrNull`; the other two have sensible defaults.

## `nextStepOrNull`: the step state machine

`nextStepOrNull` is a **pure query**: given the ongoing session, return the next `InteractiveFlowStep` the user
must go through, or `null` once the purpose is satisfied. The step is **abstract** — it never carries a URI.
Mapping it to a concrete redirect (or another transport) happens at the API boundary, so the engine stays free
of transport concerns.

The whole `CONFIRM` gate is the smallest possible example — it presents the confirm step until the session's
confirm record is marked confirmed:

```kotlin
@Singleton
class ConfirmInteractiveFlowPurposeHandler(
    private val confirmManager: InteractiveFlowSessionConfirmManager,
) : InteractiveFlowPurposeHandler {

    override val purpose = InteractiveFlowPurpose.CONFIRM

    override suspend fun nextStepOrNull(session: OnGoingInteractiveFlowSession): InteractiveFlowStep? {
        val confirmed = confirmManager.fetchConfirmOrNull(session)?.confirmed ?: false
        return if (confirmed) null else InteractiveFlowStep.Confirm
    }
}
```

A purpose with several steps just branches on session state. The `OAUTH2_AUTHORIZE` handler, for instance,
returns `SignIn`/`SignUp` while there is no user, then `CollectClaims`, then `ValidateClaims`, then `null` — each
branch mirroring one requirement still outstanding.

::: warning
The applicability predicate of a [flow step endpoint](/contributing/backend/how-to-design-a-flow-endpoint#the-applicability-predicate)
must **mirror** the step this method computes for the same session. If a `GET` step serves its config in a state
where the purpose would route the user elsewhere, you get a redirect loop.
:::

## `followUpPurposes`: requiring another purpose

Return the purposes that must run **once this one resolves**. The engine appends any not already present,
immediately after this purpose. This is how one purpose composes another rather than duplicating its steps — the
OAuth2 authorize purpose requires an MFA purpose as its final gate:

```kotlin
override suspend fun followUpPurposes(
    session: OnGoingInteractiveFlowSession
): List<InteractiveFlowPurpose> {
    val hasMfaPurpose = session.purposes.any {
        it == InteractiveFlowPurpose.MFA_ENROLLMENT || it == InteractiveFlowPurpose.MFA_CHALLENGE
    }
    if (hasMfaPurpose) return emptyList()
    return listOfNotNull(requiredMfaPurpose(session))   // MFA_CHALLENGE, MFA_ENROLLMENT, or null
}
```

The `REAUTHENTICATION` gate does the same to keep re-authentication at least as strong as the account's own
login. Guard against re-adding a purpose already on the session (as above), and return `emptyList()` — the
default — when there is no follow-up.

## `applyTerminalEffect`: the completion effect

A purpose's terminal effect is its **concern-specific completion work**, run by the engine — in purpose order —
only once every purpose has resolved and the flow is about to succeed. Return `TerminalEffectResult.Proceed`
(the default) on success, or `TerminalEffectResult.Fail(exception)` to fail the whole session. **Gate purposes
usually have no terminal effect** (the `CONFIRM` handler above records approval during its step, so it just
inherits the `Proceed` default).

The `OAUTH2_AUTHORIZE` handler carries the meaningful example — it grants the requested scopes, records the
consent, and fails the session when no scope can be granted (abbreviated):

```kotlin
override suspend fun applyTerminalEffect(
    session: OnGoingInteractiveFlowSession
): TerminalEffectResult {
    val userId = session.userId
        ?: throw internalBusinessExceptionOf("flow.authorization_flow.complete.missing_user")

    val grant = scopeGrantingManager.grantScopes(session, collectedClaimManager.findByUserId(userId))
    val oauth2 = oauth2Manager.setGrantedScopes(session, grant.grantedScopes, grant.grantedBy)

    val hasAnyScope = !oauth2.grantedScopes.isNullOrEmpty() || !oauth2.consentedScopes.isNullOrEmpty()
    if (!hasAnyScope && !featuresConfig.allowAccessToClientWithoutScope) {
        return TerminalEffectResult.Fail(
            BusinessException(recoverable = false, detailsId = "flow.authorization_flow.complete.no_scope")
        )
    }

    consentManager.saveConsent(userId, client.audience.id, oauth2.clientId, oauth2.consentedScopes ?: emptyList())
    return TerminalEffectResult.Proceed
}
```

## Concern-specific state: add a session sub-record

`InteractiveFlowSession` carries only **flow-generic** state — id, the purpose list, `userId`, MFA status,
expiration, terminal status. A purpose's own data lives in a **separate record keyed by the session id**, with
its own manager, and is fetched on demand — never carried on the session object. The `CONFIRM` purpose stores
what is being approved in `InteractiveFlowSessionConfirm` and reads it through
`InteractiveFlowSessionConfirmManager`; `OAUTH2_AUTHORIZE`, `REAUTHENTICATION` and `LINK_PROVIDER` each have their
own record and manager the same way.

```kotlin
data class InteractiveFlowSessionConfirm(
    val sessionId: UUID,                         // keyed by the session, not embedded in it
    val action: ConfirmActionType,
    val clientId: String? = null,
    val confirmedDate: LocalDateTime? = null,    // the resolved marker for the CONFIRM purpose
) {
    val confirmed: Boolean get() = confirmedDate != null
}
```

::: warning
Do not add a purpose's concern-specific fields to `InteractiveFlowSession`. Keeping generic session state and
per-purpose state apart is what lets the same session host several unrelated purposes.
:::

## New steps: add and map them

If your purpose needs UI the flow does not have yet:

1. Add a value to the `InteractiveFlowStep` sealed interface (a `data object`, or a `data class` when the step
   needs a parameter, like `ValidateClaims(media)`).
2. Map it to a concrete page in `InteractiveFlowStepUriMapper.toRedirectUri`, using the page URI the flow
   declares under `flows.<id>` in the [configuration](/technical/configuration/authorization).
3. Expose the step as a [flow endpoint](/contributing/backend/how-to-design-a-flow-endpoint), whose applicability
   predicate mirrors your `nextStepOrNull`.

::: warning
Every server-side redirect the flow issues is a **303 (See Other)**, never 307 — this is an engine-wide rule
inherited by every step; you do not build redirects yourself.
:::

## Initiate the purpose

There is **no single generic start endpoint** — each purpose has its own entry point: `OAUTH2_AUTHORIZE` starts
at the public `/api/oauth2/authorize`, while authenticated operations (MFA enrollment, provider linking) start
from Client API endpoints. The entry point creates the session with the ordered purpose list via
`InteractiveFlowSessionManager.newSession(...)`, prepending any gates:

```kotlin
// A client-initiated provider link: gates first, initiating purpose last.
val session = sessionManager.newSession(
    purposes = listOf(
        InteractiveFlowPurpose.CONFIRM,           // approve the action
        InteractiveFlowPurpose.REAUTHENTICATION,  // prove control of the account
        InteractiveFlowPurpose.LINK_PROVIDER,     // the sensitive purpose itself
    ),
    initiatingPurpose = InteractiveFlowPurpose.LINK_PROVIDER,
    flow = flow,
    successRedirectUri = returnUri,
    redirectType = InteractiveFlowRedirectType.PLAIN,
)
```

The per-concern managers are the recipes to copy: `InteractiveFlowSessionOAuth2Manager`
(`listOf(OAUTH2_AUTHORIZE)`), `InteractiveFlowSessionMfaEnrollmentManager`
(`listOf(CONFIRM, MFA_ENROLLMENT)`), and `InteractiveFlowSessionLinkProviderManager` (above). Persist any
attached sub-record in the same transaction as the session.

## Keep the logic in managers

A handler stays thin and read-only. The behaviour it queries and the effects it triggers live in
[business managers](/contributing/backend/how-to-write-a-business-manager); a handler reads through a manager
(`confirmManager.fetchConfirmOrNull`) and delegates its terminal effect to managers
(`scopeGrantingManager.grantScopes`, `consentManager.saveConsent`). Signal problems with
[business exceptions](/contributing/backend/how-to-throw-an-exception): a **recoverable** exception becomes a
`4xx` the user can retry, while an **unrecoverable** one fails the session — a terminal effect surfaces the
latter as `TerminalEffectResult.Fail`.

## Test the purpose

- Add a `*InteractiveFlowPurposeHandlerTest` covering each `nextStepOrNull` branch, the `followUpPurposes`
  conditions, and — if present — the `applyTerminalEffect` success/`Fail` paths.
- `InteractiveFlowPurposeRegistryTest` already asserts every `InteractiveFlowPurpose` value resolves to a
  handler, so a new value with no `@Singleton` handler fails the build.
- `InteractiveFlowEngineTest` covers cross-purpose sequencing (ordering, follow-up insertion, terminal effects).

## Checklist

- [ ] New value added to `InteractiveFlowPurpose` with authoritative KDoc; its role (initiating / gate / follow-up) is clear.
- [ ] A `@Singleton` `InteractiveFlowPurposeHandler` implements the contract; it is **read-only** — no session mutation.
- [ ] `nextStepOrNull` returns abstract steps; `followUpPurposes` / `applyTerminalEffect` implemented only if needed.
- [ ] Concern-specific state lives in a session sub-record + its manager, keyed by session id — not on `InteractiveFlowSession`.
- [ ] Any new step is added to `InteractiveFlowStep`, mapped in `InteractiveFlowStepUriMapper`, and its page URI configured.
- [ ] An entry point creates the session via `newSession(...)` with the correct ordered purposes and `initiatingPurpose`.
- [ ] Logic and persistence live in managers; failures are recoverable/unrecoverable business exceptions.
- [ ] Handler test added; registry and engine tests pass.
