# Design FAQ

This page records design questions that came up during development, the options considered, and the decisions made. It
serves as a reference to avoid revisiting settled questions and to explain the rationale behind non-obvious choices.

---

## MFA

### Should clients be able to control whether MFA is required and which methods are enabled?

**Decision:** No — MFA policy is global only.

**Options considered:**

- **Global policy only**: `mfa.required` and `mfa.totp.enabled` apply to all clients uniformly.
- **Per-client overrides**: each `clients.<id>` entry could carry its own `mfa.required` and method list.

**Rationale:**

SympAuthy is designed around a single user pool shared across all clients. Per-client MFA control would create a
confusing user experience (the same user being challenged on one client but not another) and a potential security
bypass (a client opting out of a globally enforced MFA policy). Because MFA enrollment is a user-level concern — a user
has one TOTP device regardless of which client they authenticate through — a global policy is the right fit for
SympAuthy's shared user pool. Audiences group clients for consent purposes but do not create separate user populations.

Per-audience MFA policy could be reconsidered in the future.