# Tokens

When SympAuthy successfully authenticates a user, it issues a set of **tokens** to the client application. A token is
a self-contained credential that carries information about the user and their permissions. The client uses these tokens
to know who the user is and to make requests on their behalf.

SympAuthy issues three kinds of tokens, each with a distinct purpose:

- **Access token** — used to access protected resources.
- **Refresh token** — used to obtain a new access token when the current one expires.
- **ID token** — used to identify who the user is.

## Access token

The **access token** is the credential the client presents whenever it wants to access a protected resource. It is
proof that the user has been authenticated and that certain permissions ([scopes](scope)) have been granted.

Access tokens are intentionally short-lived. If one is stolen, it becomes useless quickly. When it expires, the client
uses the [refresh token](#refresh-token) to obtain a new one without asking the user to sign in again.

### Structure of an access token

An access token is encoded as a JSON Web Token (JWT) following
the [JWT Profile for OAuth 2.0 Access Tokens (RFC 9068)](https://datatracker.ietf.org/doc/html/rfc9068). The JWT uses
the `at+jwt` type header and contains the following claims:

| Claim       | Description                                        | RFC 9068    |
|-------------|----------------------------------------------------|-------------|
| `iss`       | Issuer — the URL of this authorization server.     | MUST        |
| `exp`       | Expiration time.                                   | MUST        |
| `aud`       | Audience the token is intended for.                | MUST        |
| `sub`       | Subject — the authenticated user's identifier.     | MUST        |
| `client_id` | The client that requested the token.               | MUST        |
| `iat`       | Issued-at time.                                    | MUST        |
| `jti`       | Unique token identifier.                           | MUST        |
| `scope`     | Space-separated list of granted scopes. For `authorization_code` tokens: [consentable](/functional/scope#consentable-scope) and [grantable](/functional/scope#grantable-scope) scopes. For `client_credentials` tokens: [client](/functional/scope#client-scope) scopes. | SHOULD      |

The client can read this information directly from the token without making an additional request to SympAuthy.

### Expiration

Access tokens have a short lifespan — typically minutes to a few hours. The exact duration is controlled by the
`token.access-token.lifespan` configuration key.

Once expired, the access token is rejected. The client must use the refresh token to obtain a new one.

## Refresh token

The **refresh token** is a long-lived credential whose only purpose is to let the client obtain a new access token
when the current one expires. It is never sent to protected resources — only back to SympAuthy.

When the client detects that its access token has expired, it sends the refresh token to SympAuthy. SympAuthy validates
it and issues a fresh access token in return. From the user's perspective, this happens silently: they stay signed in
without being prompted to authenticate again.

### Expiration

Refresh tokens have a much longer lifespan than access tokens — typically hours to days. The exact duration is
controlled by the `token.refresh-token.lifespan` configuration key.

If a refresh token itself expires, the user will need to sign in again from scratch.

## ID token

The **ID token** contains information about the authenticated user — their [claims](claims) such as a name, an email
address, or any custom attributes you have configured. It is intended for the client to read, not for accessing
resources.

While the access token answers "is this user allowed to do this?", the ID token answers "who is this user?"

### Expiration

ID tokens have the same lifespan as access tokens. Once expired, the client should use the refresh token to obtain a
fresh set of tokens.

## Staying signed in

From the user's perspective, being "signed in" means the client holds a valid access token. As long as the client can
silently refresh that token using the refresh token, the user never needs to authenticate again.

The user will be prompted to sign in again when:

- the refresh token has expired (controlled by `token.refresh-token.lifespan`),
- the refresh token has been revoked (for example, following an account action),
- the [consent](/functional/consent) for the user and client pair has been revoked — either by an
  administrator or because the user re-authorized with new scopes,
- the client explicitly signs the user out.