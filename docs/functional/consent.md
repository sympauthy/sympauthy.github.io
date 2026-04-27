# Consent

A **consent** is the record that an end-user has authorized an
[audience](/functional/audience) to access specific
[consentable scopes](/functional/scope#consentable-scope). When a user logs in through a client and
consentable scopes are granted through the user's explicit approval, SympAuthy creates a consent for the client's
audience to keep track of that relationship.

Consents serve several purposes:

- They record exactly which consentable scopes each user has granted to each audience.
- They support audit and compliance needs, such as answering the question "which applications have access to
  my data?"
- They enable revocation of an audience's access to a user's data.

::: info
Consents only apply to [consentable scopes](/functional/scope#consentable-scope).
[Grantable scopes](/functional/scope#grantable-scope) — which protect resources rather than user
claims — are managed through scope granting rules or the API and do not involve end-user consent.
:::

::: info
Consents only apply to user-facing authorization flows (e.g., authorization code). `client_credentials` grants operate
without a user and do not create consents.
:::

## How consents are created

A consent is created automatically the first time an end-user approves
[consentable scopes](/functional/scope#consentable-scope) for a client within an
[audience](/functional/audience) during an authorization flow.

If the user later authorizes another client in the same audience — or re-authorizes with the same client — the newly
granted scopes are **merged** into the existing consent. Previously consented scopes are preserved. This ensures that
authorizing through one client never removes permissions granted through another client in the same audience.

A single end-user can have at most one **active** consent per audience at any given time. SympAuthy keeps a full
history of past consents for audit purposes.

## What a consent contains

A consent records:

- The **end-user** who gave consent.
- The **audience** that received it.
- The **client** that originally prompted consent — kept for audit purposes.
- The **granted scopes** — the list of scopes the user has authorized the audience to use.
- The **date** when consent was given.
- The **revocation date** — when the consent was revoked, if applicable.
- The **revocation origin** — who revoked the consent: `ADMIN`
  (when an administrator revoked it through the [Admin API](/technical/api/admin)).
- The **revoking user** — the identifier of the user who caused the revocation.

## Revoking consent

A consent can be revoked by an **administrator** through the [Admin API](/technical/api/admin). The consent is marked
with `revoked_by = ADMIN` and the administrator's identifier.

When a consent is revoked, all refresh tokens for the user across all clients in the audience are immediately
invalidated. As an additional safety net, the token refresh flow verifies that a valid consent still exists before
issuing new tokens. This means revocation takes effect immediately — no client in the audience can use any previously
issued refresh token to obtain new access tokens.

## Relation to other concepts

- **[Consentable scopes](/functional/scope#consentable-scope)** — a consent records which
  consentable scopes were granted. Only consentable scopes — those protecting user claims — are subject to consent.
- **[Audiences](/functional/audience)** — a consent ties a user to an audience. All clients within
  the same audience share the consent.
- **[Clients](/functional/client)** — a client belongs to an audience. The client that originally
  prompted consent is recorded for audit purposes.
- **[Claims](/functional/claims)** — claims with [consent-based access](/functional/claims#access-control) are
  only shared with the client when covered by the consented scopes.
- **[Tokens](/functional/tokens)** — tokens issued by SympAuthy reflect the scopes recorded in the
  consent. Revoking a consent invalidates the associated refresh tokens across all clients in the audience.
