# Multi-factor Authentication

A [TOTP](/functional/authentication#totp) — a time-based one-time password, the six-digit code an
authenticator app shows — is the second factor SympAuthy asks for. MFA applies to any flow, not only
[server-initiated](/testcontainers/server_initiated_flows) ones: an already-enrolled user must answer a
**TOTP challenge** on a normal sign-in. Enable MFA on the container with `withMfa()`, which sets
[`mfa.totp.enabled=true`](/technical/configuration/authorization#mfa) and leaves MFA optional for users
(`mfa.required=false`), so they may skip enrolment. To require it, add
`withProperty("mfa.required", "true")` after `withMfa()`: a sign-up then enrols TOTP through the
enrolment handler below.

[`withFlows`](/testcontainers/interactive_flow) already declares the
[confirm](/functional/interactive_flow#an-action-started-on-the-user-s-behalf) and MFA pages the mock
frontend serves, so no extra registry setup is needed for MFA itself. A server-initiated flow needs
the server-side settings listed at the end of [Server-initiated Flows](/testcontainers/server_initiated_flows).

## Handlers

These per-flow callbacks drive the confirm step of a server-initiated flow and the MFA steps:

| Callback | Purpose |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `withConfirmHandler(ConfirmHandler)`               | approve (`ConfirmDecision.CONFIRM`) or decline (`CANCEL`) an action a client or an administrator started for the user. Declining follows the step's [`cancel_url`](/technical/api/flow#leaving-the-flow). It receives a `ConfirmFlowResource`: `action()` (`enroll_mfa` or `link_provider`), `client()` — the initiating client's `id()` and `displayName()`, the latter `null` when the client has no `display-name` — and `cancelUrl()`. `client()` is `null` when an administrator started the action. No default: every server-initiated flow needs one, and a run reaching the step without it throws `UnsupportedFlowStepException`. |
| `withTotpEnrollmentHandler(TotpEnrollmentHandler)` | receives a `TotpEnrollData` — the enrolment `secret()` an authenticator app would scan from a QR code, its `uri()`, `client()` and `cancelUrl()` — and returns the code to submit. Default: a valid code computed from the secret. Return another to test a refused code: the server answers `flow.mfa.totp.enroll.invalid_code` and the run throws a `FlowException`, without retrying. |
| `withTotpChallengeHandler(TotpChallengeHandler)`   | supply the code answering a TOTP challenge. No default: every sign-in of an enrolled user needs one, and a run reaching the challenge without it throws `UnsupportedFlowStepException`. A wrong code fails the run as above. |

The driver always skips the enrolment a sign-in or sign-up offers while MFA is optional, even with a
`withTotpEnrollmentHandler`: with optional MFA, a [server-initiated flow](/testcontainers/server_initiated_flows)
is the way to enrol a user.

## The `Totp` helper

TOTP codes are computed for you from the shared secret; the dependency-free `Totp` (RFC 6238) is
public, so you can compute one yourself — for example, to answer a challenge with the secret captured
at enrolment:

```java
String secret = /* data.secret(), captured by a withTotpEnrollmentHandler */;

InteractiveFlow signIn = registry.newFlow()
    .withSignInHandler(cfg -> Credentials.of(email, password))
    .withTotpChallengeHandler(() -> Totp.code(secret));

TokenResponse tokens = signIn.run().exchange();
assertTrue(signIn.stepTypes().contains(FlowStep.Type.MFA));   // the challenge was answered
```

The server accepts a code from the current 30-second step or the one either side of it, and does not
refuse one it has already accepted, so a challenge answered right after enrolment needs no wait.
