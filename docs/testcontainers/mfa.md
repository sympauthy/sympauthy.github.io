# Multi-factor Authentication

MFA applies to any flow, not only [server-initiated](/testcontainers/server_initiated_flows)
ones — an already-enrolled user must answer a **TOTP challenge** on a normal sign-in. Enable MFA on
the container with `withMfa()` (optional TOTP: `mfa.required=false`, `mfa.totp.enabled=true`);
[`withFlows`](/testcontainers/interactive_flow) already declares the confirm/MFA flow pages
the mock frontend serves, so no extra registry setup is needed.

## Handlers

Three more per-flow callbacks drive the confirm and MFA steps:

| Callback | Purpose |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `withConfirmHandler(ConfirmHandler)`               | approve (`ConfirmDecision.CONFIRM`) or decline (`CANCEL`) an action a client/admin asked the user to confirm; the resource exposes `action()` and `initiatingClientId()` (`null` when an admin initiated it) |
| `withTotpEnrollmentHandler(TotpEnrollmentHandler)` | observe the enrolment secret or override the submitted code (default: compute a valid one) |
| `withTotpChallengeHandler(TotpChallengeHandler)`   | supply the code answering a TOTP challenge |

## The `Totp` helper

TOTP codes are computed for you from the shared secret; the dependency-free `Totp` (RFC 6238) is
public, so you can compute one yourself — for example, to answer a challenge with the secret captured
at enrolment:

```java
InteractiveFlow signIn = registry.newFlow()
    .withSignInHandler(cfg -> Credentials.of(email, password))
    .withTotpChallengeHandler(() -> Totp.code(secret));   // secret captured at enrolment

TokenResponse tokens = signIn.run().exchange();
assertTrue(signIn.stepTypes().contains(FlowStep.Type.MFA));   // the challenge was answered
```

::: tip
With optional MFA a normal sign-up does not force enrolment. To enrol a user on demand — the
`confirm` step and auto-driven TOTP enrolment — start a
[server-initiated flow](/testcontainers/server_initiated_flows).
:::
