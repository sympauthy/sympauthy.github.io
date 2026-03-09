# Consent

A **consent** is the record that an end-user has authorized a specific
[client](/documentation/functional/client) to access specific
[scopes](/documentation/functional/authorization#scope). When a user logs in through a client and scopes are granted,
SympAuthy creates a consent to keep track of that relationship.

Consents serve several purposes:

- They let a client know which users it serves — for example, to list them through
  the [Client API](/documentation/technical/client_api).
- They record exactly which scopes each user has granted to each client.
- They support audit and compliance needs, such as answering the question "which third-party applications have access to
  my data?"

## How consents are created

A consent is created automatically the first time scopes are granted to a client on behalf of a user. This happens as a
result of the mechanisms described in [Authorization](/documentation/functional/authorization#granting-scope) — either
through scope granting rules or through the API.

If additional scopes are granted later, the existing consent is updated to reflect the new set of granted scopes.

A single end-user can have one consent per client. Each consent captures the full list of scopes that the user has
granted to that client.

## What a consent contains

A consent records:

- The **end-user** who gave consent.
- The **client** that received it.
- The **granted scopes** — the list of scopes the user has authorized the client to use.
- The **date** when consent was given or last updated.

## Revoking consent

A consent can be revoked by an administrator through the [Admin API](/documentation/technical/admin_api). Revoking a
consent removes the client's access to the user's data: tokens will no longer be renewable, and the client will no
longer see the user when listing its known users.

## Relation to other concepts

- **[Scopes](/documentation/functional/authorization#scope)** — a consent records which scopes were granted. Without
  scopes, there is nothing to consent to.
- **[Clients](/documentation/functional/client)** — a consent ties a user to a client. It is what allows the client to
  know the user exists.
- **[Claims](/documentation/functional/claims)** — only claims covered by the consented scopes are shared with the
  client.
- **[Tokens](/documentation/functional/tokens)** — tokens issued by SympAuthy reflect the scopes recorded in the
  consent.