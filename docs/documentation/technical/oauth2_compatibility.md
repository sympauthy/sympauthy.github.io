# OAuth 2.1 & OpenID Compatibility Matrix

This document provides an overview of SympAuthy's compatibility with the
[OAuth 2.1 specification (draft-ietf-oauth-v2-1)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) and
[OpenID Connect](https://openid.net/connect/). OAuth 2.1 consolidates OAuth 2.0 (RFC 6749) and its security best
practices into a single specification. Items marked **Planned** are not yet enforced but will be in a future release.

## Grant Types

| Grant Type                                | Status        | Reference                                                                                                             |
|-------------------------------------------|---------------|-----------------------------------------------------------------------------------------------------------------------|
| Authorization Code Grant                  | Supported     | [draft-ietf-oauth-v2-1 - section 4.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.1)       |
| Implicit Grant                            | Not Supported | Removed in [draft-ietf-oauth-v2-1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) (was RFC 6749 - 4.2) |
| Resource Owner Password Credentials Grant | Not Supported | Removed in [draft-ietf-oauth-v2-1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) (was RFC 6749 - 4.3) |
| Client Credentials Grant                  | Supported     | [draft-ietf-oauth-v2-1 - section 4.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.2)       |
| Refresh Token Grant                       | Supported     | [draft-ietf-oauth-v2-1 - section 4.3](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.3)       |

> The Implicit Grant and Resource Owner Password Credentials grant have been removed from OAuth 2.1. The Implicit Grant
> exposes tokens in the browser URL. The ROPC grant exposes user credentials directly to the client, bypassing the
> delegated authorization model that OAuth was designed to provide, and offers no support for multi-factor
> authentication.

## Token Types

| Token Type                              | Status        | Reference                                                                                                      |
|-----------------------------------------|---------------|----------------------------------------------------------------------------------------------------------------|
| Access Token                            | Supported     | [draft-ietf-oauth-v2-1 - section 1.4](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-1.4) |
| Refresh Token                           | Supported     | [draft-ietf-oauth-v2-1 - section 1.5](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-1.5) |
| ID Token (JWT)                          | Supported     | [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)                               |
| Refresh Token Rotation (Public Clients) | Supported     | [draft-ietf-oauth-v2-1 - section 6.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-6.1) |
| Sender-constrained Tokens               | Not Supported | [draft-ietf-oauth-v2-1 - section 6.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-6.1) |
| Bearer Tokens in Query Strings          | Not Supported | [draft-ietf-oauth-v2-1 - section 5.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-5.1) |

## Client Authentication Methods

| Method                | Status        | Reference                                                                                                          |
|-----------------------|---------------|--------------------------------------------------------------------------------------------------------------------|
| Client Secret Basic   | Supported     | [draft-ietf-oauth-v2-1 - section 2.4.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-2.4.1) |
| Client Secret Post    | Supported     | [draft-ietf-oauth-v2-1 - section 2.4.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-2.4.1) |
| Client Secret JWT     | Not Supported | [RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523)                                                          |
| Private Key JWT       | Not Supported | [RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523)                                                          |
| None (Public Clients) | Supported     | [draft-ietf-oauth-v2-1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)                               |

## Authorization Flow Security

| Feature                         | Status        | Reference                                                                                                          |
|---------------------------------|---------------|--------------------------------------------------------------------------------------------------------------------|
| PKCE (S256)                     | Required      | [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)                                                          |
| PKCE Plain Method               | Not Supported | [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)                                                          |
| State Parameter                 | Required      | [draft-ietf-oauth-v2-1 - section 7.5.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-7.5.1) |
| Nonce Parameter                 | Supported     | [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)                                       |
| Authorization Code One-Time Use | Enforced      | [draft-ietf-oauth-v2-1 - section 4.1.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.1.2) |
| Exact Redirect URI Matching     | Planned       | [draft-ietf-oauth-v2-1 - section 7.5.3](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-7.5.3) |

> The `plain` challenge method will not be
> implemented. [RFC 7636 section 7.2](https://www.rfc-editor.org/rfc/rfc7636#section-7.2) identifies it as vulnerable to
> interception and recommends `S256` for all deployments.

> OAuth 2.1 requires PKCE for all clients using the authorization code flow. PKCE is currently enforced for
> [public clients](/documentation/functional/client#confidential-and-public-clients) and optional for confidential
> clients. Enforcement for confidential clients is **planned**. See the
> [Security](security#pkce-proof-key-for-code-exchange) documentation for details on the current enforcement policy.

## OpenID Connect

### Features

| Feature                     | Status        | Reference                                                                                  |
|-----------------------------|---------------|--------------------------------------------------------------------------------------------|
| OpenID Connect Discovery    | Supported     | [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) |
| ID Token                    | Supported     | [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)           |
| Dynamic Client Registration | Not Supported | [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)                                  |

### Scopes

| Scope         | Status        | Description                       |
|---------------|---------------|-----------------------------------|
| `openid`      | Supported     | Required for OpenID Connect flows |
| `profile`     | Supported     | User profile claims               |
| `email`       | Supported     | User email claims                 |
| `address`     | Supported     | User address claims               |
| `phone`       | Supported     | User phone claims                 |
| Custom Scopes | Not Supported | Application-specific scopes       |

## Endpoints

### OAuth 2.1 Endpoints

| Endpoint               | Status        | Path                    | Reference                                                                           |
|------------------------|---------------|-------------------------|-------------------------------------------------------------------------------------|
| Authorization Endpoint | Supported     | `/api/oauth2/authorize` | [draft-ietf-oauth-v2-1 - section 3.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-3.1) |
| Token Endpoint         | Supported     | `/api/oauth2/token`     | [draft-ietf-oauth-v2-1 - section 3.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-3.2) |
| Token Revocation       | Supported     | `/api/oauth2/revoke`    | [RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)                           |
| Token Introspection    | Not Supported | -                       | [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662)                           |

### OpenID Connect Endpoints

| Endpoint                      | Status    | Path                               | Reference                                                                                                 |
|-------------------------------|-----------|------------------------------------|-----------------------------------------------------------------------------------------------------------|
| OpenID Provider Configuration | Supported | `.well-known/openid-configuration` | [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig) |
| UserInfo Endpoint             | Supported | `/api/openid/userinfo`             | [OpenID Connect Core 1.0 - section 5.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)   |

## Legend

- **Supported**: Feature is implemented and available
- **Supported (>= version)**: Feature is implemented and available since a specific version
- **Not Supported**: Feature is not implemented and not planned
- **Planned**: Feature is not yet implemented but will be in a future release
- **Required**: Feature must be used by clients
- **Enforced**: Feature is enforced by the server

---

For more information about OAuth specifications, visit:

- [OAuth 2.1 (draft-ietf-oauth-v2-1)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)
- [OAuth 2.0 Framework (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Specifications](https://openid.net/connect/)
