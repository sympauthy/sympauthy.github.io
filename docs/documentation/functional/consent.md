# Consent

A **consent** is the record that an end-user has authorized a specific
[client](/documentation/functional/client) to access specific
[scopes](/documentation/functional/authorization#scope). When a user logs in through a client and scopes are granted,
SympAuthy creates a consent to keep track of that relationship.

Consents serve several purposes:

- They record exactly which scopes each user has granted to each client.
- They support audit and compliance needs, such as answering the question "which third-party applications have access to
  my data?"
- They enable revocation of a client's access to a user's data.

::: info
Consents only apply to user-facing authorization flows (e.g., authorization code). `client_credentials` grants operate
without a user and do not create consents.
:::

## How consents are created

A consent is created automatically the first time scopes are granted to a client on behalf of a user. This happens as a
result of the mechanisms described in [Authorization](/documentation/functional/authorization#granting-scope) — either
through scope granting rules or through the API.

If the user re-authorizes with the same client, the previous consent is revoked and a new one is created with the scopes
granted during this authorization. The new consent **replaces** the previous one — scopes are never merged across
authorizations.

A single end-user can have at most one **active** consent per client at any given time. SympAuthy keeps a full history
of past consents for audit purposes.

## What a consent contains

A consent records:

- The **end-user** who gave consent.
- The **client** that received it.
- The **granted scopes** — the list of scopes the user has authorized the client to use.
- The **date** when consent was given.
- The **revocation date** — when the consent was revoked, if applicable.
- The **revocation origin** — who revoked the consent: `USER` (when the user re-authorized with new scopes) or `ADMIN`
  (when an administrator revoked it through the [Admin API](/documentation/technical/admin_api)).
- The **revoking user** — the identifier of the user who caused the revocation.

## Revoking consent

A consent can be revoked in two ways:

- **By an administrator** through the [Admin API](/documentation/technical/admin_api). The consent is marked with
  `revoked_by = ADMIN` and the administrator's identifier.
- **By the user re-authorizing** with the same client. The previous consent is automatically revoked (marked with
  `revoked_by = USER` and the user's identifier) and replaced by a new consent reflecting the newly granted scopes.

When a consent is revoked, all refresh tokens for the user and client pair are immediately invalidated. As an additional
safety net, the token refresh flow verifies that a valid consent still exists before issuing new tokens. This means
revocation takes effect immediately — the client cannot use any previously issued refresh token to obtain new access
tokens.

## Relation to other concepts

- **[Scopes](/documentation/functional/authorization#scope)** — a consent records which scopes were granted. Without
  scopes, there is nothing to consent to.
- **[Clients](/documentation/functional/client)** — a consent ties a user to a client.
- **[Claims](/documentation/functional/claims)** — only claims covered by the consented scopes are shared with the
  client.
- **[Tokens](/documentation/functional/tokens)** — tokens issued by SympAuthy reflect the scopes recorded in the
  consent. Revoking a consent invalidates the associated refresh tokens.