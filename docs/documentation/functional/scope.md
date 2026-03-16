# Scope

A **scope** is a named permission. When a client application requests access on behalf of a user, it declares which
scopes it needs — for example, the right to read the user's email address, or access to a premium feature. The granted
scopes are recorded inside the tokens SympAuthy issues. The client reads them to decide what the user is allowed to see
or do.

SympAuthy has three scope types, each with a distinct purpose, granting path, and grant type:

| Type                                    | Protects          | Granted by                            | Grant type           |
|-----------------------------------------|-------------------|---------------------------------------|----------------------|
| [Consentable](#consentable-scope)       | User claims       | End-user consent                      | `authorization_code` |
| [Grantable](#grantable-scope)           | Resources         | Scope granting rules / third-party API | `authorization_code` |
| [Client](#client-scope)                 | Client operations | Scope granting rules / third-party API | `client_credentials` |

These three types are **mutually exclusive** — a scope is always exactly one type. This separation exists by design:

- The server should never decide on behalf of the end-user which personal information to share (**consentable**).
- The end-user should not be asked to consent to system-level permissions they have no control over (**grantable**).
- Operations that belong to the client itself should not depend on a user context (**client**).

Scopes can be [standard](#standard-scopes) (defined in specifications) or [custom](#custom-scopes) (defined by the
operator).

## Consentable scope

A **consentable scope** protects [claims](/documentation/functional/claims) about the end-user — their name, email
address, or any other personal information. A client can only access a claim if the end-user has explicitly
[consented](/documentation/functional/consent) to the corresponding scope.

Consentable scopes are granted **only** through end-user consent during an `authorization_code` flow. The authorization
server never grants them on its own — no scope granting rule or API call can substitute for the user's explicit
approval. This guarantees that the end-user always controls which personal information is shared with which client.

Examples of consentable scopes:

- `profile`, `email`, `address`, `phone` — standard scopes that protect standard claims.
- Any custom scope that protects custom claims.

See [User Authorization](/documentation/functional/user_authorization) for details on how consentable scopes are granted
during an authorization flow.

## Grantable scope

A **grantable scope** protects a resource or represents a permission that the authorization server manages on behalf of
a user. Unlike consentable scopes, grantable scopes are not tied to user claims and do not require end-user consent.

Grantable scopes are granted during `authorization_code` flows through
[scope granting rules](/documentation/functional/user_authorization#scope-granting-rules) or by
[delegating to a third-party through API](/documentation/functional/user_authorization#delegating-to-a-third-party-through-api).

Examples of grantable scopes:

- `openid` — a protocol signal indicating that the client is using OpenID Connect. It is grantable with a default scope
  granting rule that automatically grants it.
- `admin:*` — scopes that protect administrative resources of the authorization server.
- Any custom scope that protects client resources without being tied to user claims.

See [User Authorization](/documentation/functional/user_authorization) for details on scope granting rules.

## Client scope

A **client scope** represents an operation that the client application itself is authorized to perform — independently
of any user. Client scopes are used in `client_credentials` flows, where there is no end-user involved.

Client scopes are granted through
[scope granting rules](/documentation/functional/client_authorization#scope-granting-rules) or by
[delegating to a third-party through API](/documentation/functional/client_authorization#delegating-to-a-third-party-through-api).
Their granting rules evaluate client attributes rather than user claims.

Examples of client scopes:

- `users:claims:write` — allows the client to update user claims through the Client API.
- Any custom scope that represents an operation the client performs as itself, not on behalf of a user.

See [Client Authorization](/documentation/functional/client_authorization) for details on client scope granting rules.

## Standard scopes

Standard scopes are scopes defined in specifications. The list of standard scopes supported by SympAuthy is the
following:

| Scope   | Type        | Origin  | Description                                                       |
|---------|-------------|---------|-------------------------------------------------------------------|
| openid  | Grantable   | OAuth 2 | Protocol signal for OpenID Connect. Auto-granted by default rule. |
| profile | Consentable | OAuth 2 |                                                                   |

## Custom scopes

You can define your own scopes to:

- protect the [claims](/documentation/functional/claims) of the end-user — making the scope **consentable**.
- protect resources on behalf of a user — making the scope **grantable**.
- protect operations performed by the client itself — making the scope a **client scope**.

A custom scope is **consentable** if it protects custom claims, **grantable** if it protects resources in a user
context, and a **client scope** if it protects client operations.

They can be declared either by configuration or by API.

### By configuration

To create a custom scope using configuration, you simply need to define a name for it and enable it:

```
scope:
- <scope>:
  enabled: true
```

You can refer to the [configuration](/documentation/technical/configuration) to learn more.
