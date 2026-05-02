# Invitation

An **invitation** is a single-use token that allows a specific person to register for an
[audience](/functional/audience) even when open registration is disabled. Invitations give operators and client
applications fine-grained control over who can create an account, without falling back to fully manual account
provisioning through the [Admin API](/technical/api/admin).

## Why invitations exist

SympAuthy supports open registration (`sign-up-enabled: true`), where anyone can create an account during the
[interactive flow](/functional/interactive_flow). But many deployments need to restrict who can register — for
example, an internal backoffice that should only be accessible to handpicked employees, or an admin panel where the
first administrator must bootstrap themselves.

Without invitations, the only alternative to open registration is creating accounts entirely through the
[Admin API](/technical/api/admin#create-user), which requires the administrator to set a password on behalf of the
user. Invitations fill the gap: registration stays closed to the public, but invited users can still go through the
normal self-service sign-up flow.

## Registration modes

Each [audience](/functional/audience) has two flags that control how users can register:

| `sign-up-enabled` | `invitation-enabled` | Behavior |
|--------------------|----------------------|----------|
| `true` | `false` | **Open registration** — anyone can sign up (default) |
| `true` | `true` | **Open registration + invitations** — anyone can sign up; invitations can pre-assign claims |
| `false` | `false` | **No self-registration** — accounts can only be created through the Admin API |
| `false` | `true` | **Invitation-only** — registration is closed, but invited users can self-register |

The last row is the primary use case: closed registration with invitation-only sign-up.

These flags are configured per audience in the [audience configuration](/technical/configuration/audience).

## How invitations work

```
Admin / Client                          Invited user
      │                                       │
      │  1. Create invitation (API)            │
      │──────────────────────┐                 │
      │                      │                 │
      │  ◄── token returned  │                 │
      │                                        │
      │  2. Share token                        │
      │───────────────────────────────────────►│
      │                                        │
      │         3. Authorize with token        │
      │         ──────────────────────►  SympAuthy
      │                                        │
      │         4. Sign up through flow        │
      │         ──────────────────────►  SympAuthy
      │                                        │
      │         5. Account created,            │
      │            invitation consumed         │
```

1. An **administrator** (via the [Admin API](/technical/api/admin)) or a **client application** (via the
   [Client API](/technical/api/client)) creates an invitation for a specific audience. The API returns a token.
2. The creator shares the token with the intended user — by email, chat, or any other channel. SympAuthy does not
   send the invitation itself.
3. The user visits the authorize endpoint with the `invitation_token` query parameter. SympAuthy validates the token
   and binds the invitation to the authorization flow.
4. The user completes the sign-up form (password or third-party provider). Because the invitation is bound to the
   flow, sign-up is allowed even when open registration is disabled.
5. On successful registration, the invitation is marked as **used** and cannot be redeemed again.

Invitations are always **single-use**: one invitation allows exactly one registration. To invite multiple people,
create multiple invitations.

## Claims pre-assignment

An invitation can carry **custom [claims](/functional/claims)** that are automatically set on the user's account
upon registration. Only custom claims are accepted — OpenID Connect claims (email, name, etc.) must come from the
user themselves.

Pre-assigned claims are useful for granting permissions indirectly. Since invitations do not carry
[scopes](/functional/scope) directly, operators use
[scope granting rules](/functional/user_authorization#scope-granting-rules) that evaluate the pre-assigned claims.
For example, an invitation that pre-assigns `role: admin` combined with a rule
`CLAIM("role") = "admin"` → grant admin scopes gives the invited user admin access without hardcoding scope
assignments in the invitation itself.

This keeps scope management in one place — the scope granting rules — rather than splitting it between rules and
invitations.

## Bootstrap invitations

Invitations can be declared directly in [configuration](/technical/configuration/invitation) for bootstrapping
purposes. This follows the same Infrastructure-as-Code pattern as
[clients](/technical/configuration/client), [claims](/technical/configuration/claim), and
[scopes](/technical/configuration/scope).

The primary use case is bootstrapping the first administrator. When the `admin`
[environment](/technical/configuration/environments) is active, the admin audience has `sign-up-enabled: false` and
`invitation-enabled: true` by default. A bootstrap invitation in the configuration allows the first admin to
self-register without any manual database intervention.

On startup, SympAuthy checks whether any user has already consented to any client in the invitation's audience.
If no one has, the invitation is created and its token is logged to stdout. If at least one user exists, the
bootstrap invitation is skipped — it is no longer needed. Each restart generates a new token and invalidates the
previous one.

## Token security

- **Entropy**: 256 bits (32 bytes of cryptographic randomness, base64url-encoded). Exceeds the 128-bit minimum
  from [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750).
- **Storage**: tokens are hashed with scrypt before storage. The raw token is returned only once at creation and
  is never stored in plaintext.
- **Expiration**: enforced when the token is presented at the authorize endpoint. Configurable default and maximum
  in the [advanced configuration](/technical/configuration/advanced#advanced-invitation).
- **Single-use**: an invitation is consumed on successful registration and cannot be reused.
- **Audience validation**: the authorize endpoint verifies that the requesting client belongs to the invitation's
  audience, preventing cross-audience token usage.

## Relation to other concepts

- **[Audiences](/functional/audience)** — each invitation is bound to an audience. The `sign-up-enabled` and
  `invitation-enabled` flags on the audience control registration behavior.
- **[Claims](/functional/claims)** — invitations can pre-assign custom claims to the user's account.
- **[Scope granting rules](/functional/user_authorization#scope-granting-rules)** — pre-assigned claims can be
  evaluated by rules to grant scopes indirectly.
- **[Consent](/functional/consent)** — bootstrap invitations use the presence of consents to decide whether the
  invitation is still needed.
- **[Interactive flow](/functional/interactive_flow)** — invitations are redeemed through the standard authorize
  and sign-up flow. All existing security mechanisms (PKCE, state, redirect URI validation) apply.

## Configuration

Invitations involve several configuration sections:

- [Audience](/technical/configuration/audience) — per-audience `sign-up-enabled` and `invitation-enabled` flags.
- [Invitation](/technical/configuration/invitation) — bootstrap invitations declared in configuration.
- [Advanced](/technical/configuration/advanced#advanced-invitation) — token length, expiration defaults, and
  hashing parameters.
- [Authorization](/technical/configuration/authorization#flows-id) — `sign-up` flow URL required when invitations
  are enabled.
