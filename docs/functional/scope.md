# Scope

A **scope** is a named permission. When a client application requests access on behalf of a user, it declares which
scopes it needs — for example, the right to read the user's email address, or access to a premium feature. The granted
scopes are recorded inside the tokens SympAuthy issues. The client reads them to decide what the user is allowed to see
or do.

SympAuthy has three scope types, each with a distinct purpose, granting path, and grant type:

| Type                                    | Protects          | Granted by                            | Grant type           |
|-----------------------------------------|-------------------|---------------------------------------|----------------------|
| [Consentable](#consentable-scope)       | User claims       | End-user consent                      | `authorization_code` |
| [Grantable](#grantable-scope)           | Resources         | Scope granting rules / third-party webhook | `authorization_code` |
| [Client](#client-scope)                 | Client operations | Scope granting rules / third-party webhook | `client_credentials` |

These three types are **mutually exclusive** — a scope is always exactly one type. This separation exists by design:

- The server should never decide on behalf of the end-user which personal information to share (**consentable**).
- The end-user should not be asked to consent to system-level permissions they have no control over (**grantable**).
- Operations that belong to the client itself should not depend on a user context (**client**).

Scopes can be [OpenID Connect](#openid-connect-scopes) (defined in the OpenID Connect specification) or
[custom](#custom-scopes) (defined by the operator).

## Consentable scope

A **consentable scope** protects [claims](/functional/claims) about the end-user — their name, email
address, or any other personal information. A client can only access a claim if the end-user has explicitly
[consented](/functional/consent) to the corresponding scope.

Consentable scopes are granted **only** through end-user consent during an `authorization_code` flow. The authorization
server never grants them on its own — no scope granting rule or API call can substitute for the user's explicit
approval. This guarantees that the end-user always controls which personal information is shared with which client.

Examples of consentable scopes:

- `profile`, `email`, `address`, `phone` — OpenID Connect scopes that protect OpenID Connect claims.

[Custom claims](/functional/claims#custom-claims) are not protected by consentable scopes — they are
client-managed metadata, not personal data provided by the end-user.

See [User Authorization](/functional/user_authorization) for details on how consentable scopes are granted
during an authorization flow.

## Grantable scope

A **grantable scope** protects a resource or represents a permission that the authorization server manages on behalf of
a user. Unlike consentable scopes, grantable scopes are not tied to user claims and do not require end-user consent.

Grantable scopes are granted during `authorization_code` flows through
[scope granting rules](/functional/user_authorization#scope-granting-rules) or by
[delegating to a third-party through webhook](/functional/user_authorization#delegating-to-a-third-party-through-webhook).

Examples of grantable scopes:

- `openid` — a protocol signal indicating that the client is using OpenID Connect. It is grantable with a default scope
  granting rule that automatically grants it.
- `admin:*` — scopes that protect administrative resources of the authorization server.
- Any custom scope that protects client resources without being tied to user claims.

See [User Authorization](/functional/user_authorization) for details on scope granting rules.

### Admin scopes

Admin scopes are grantable scopes defined by SympAuthy that protect operations of the
[Admin API](/technical/admin_api). They follow the naming convention `admin:{domain}:{action}`,
providing fine-grained control so operators can grant only the minimum necessary privileges.

| Scope                  | Description                                        |
|------------------------|----------------------------------------------------|
| `admin:config:read`    | View configuration resources (clients, claims)     |
| `admin:users:read`     | View users                                         |
| `admin:users:write`    | Create, update, disable, enable users              |
| `admin:users:delete`   | Delete users (separated for GDPR sensitivity)      |
| `admin:consent:read`   | View consents                                      |
| `admin:consent:write`  | Revoke consents, force logout                      |

## Client scope

A **client scope** represents an operation that the client application itself is authorized to perform — independently
of any user. Client scopes are used in `client_credentials` flows, where there is no end-user involved.

Client scopes are granted through
[scope granting rules](/functional/client_authorization#scope-granting-rules) or by
[delegating to a third-party through webhook](/functional/client_authorization#delegating-to-a-third-party-through-webhook).
Their granting rules evaluate client attributes rather than user claims.

Client scopes are defined by SympAuthy and protect operations of the
[Client API](/technical/client_api). They follow the naming convention `{resource}:{action}`.

| Scope                | Description                                          |
|----------------------|------------------------------------------------------|
| `users:read`         | List users with consented scopes                     |
| `users:claims:read`  | Read consented and custom claims                     |
| `users:claims:write` | Write custom claims                                  |

See [Client Authorization](/functional/client_authorization) for details on client scope granting rules.

## OpenID Connect scopes

OpenID Connect scopes are scopes defined in the
[OpenID Connect specification](https://openid.net/specs/openid-connect-core-1_0.html). The list of OpenID Connect scopes
supported by SympAuthy is the following:

| Scope   | Type        | Origin  | Description                                                       |
|---------|-------------|---------|-------------------------------------------------------------------|
| openid  | Grantable   | OpenID Connect | Protocol signal for OpenID Connect. Auto-granted by default rule. |
| profile | Consentable | OpenID Connect |                                                                   |

## Custom scopes

You can define your own scopes to:

- protect the [claims](/functional/claims) of the end-user — making the scope **consentable**.
- protect resources on behalf of a user — making the scope **grantable**.

The scope type is set explicitly via the `type` configuration property. A scope is **grantable** by default. Set
`type: consentable` to create a scope that protects user claims and requires end-user consent. Custom client scopes are
not supported — client scopes are defined exclusively by SympAuthy.

They can be declared either by configuration or by API.

### By configuration

To create a custom scope using configuration, define a name, enable it, and set its type:

```
scope:
- <scope>:
  enabled: true
  type: consentable  # or grantable (default)
```

You can refer to the [configuration](/technical/configuration#scopes-id) to learn more.
