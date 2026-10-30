# OAuth 2.1 & OpenID Compatibility Matrix

This document provides an overview of SympAuthy's compatibility with the
[OAuth 2.1 specification (draft-ietf-oauth-v2-1)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) and
[OpenID Connect](https://openid.net/connect/). OAuth 2.1 consolidates OAuth 2.0 (RFC 6749) and its security best
practices into a single specification. Items marked **Planned** are not yet enforced but will be in a future release.

## Grant Types

| Grant Type                                | Status        | Reference                                                                                                            |
|-------------------------------------------|---------------|----------------------------------------------------------------------------------------------------------------------|
| Authorization Code Grant                  | Supported     | [draft-ietf-oauth-v2-1 - section 4.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.1)       |
| Implicit Grant                            | Not Supported | Removed in [draft-ietf-oauth-v2-1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) (was RFC 6749 - 4.2) |
| Resource Owner Password Credentials Grant | Not Supported | Removed in [draft-ietf-oauth-v2-1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) (was RFC 6749 - 4.3) |
| Client Credentials Grant                  | Supported     | [draft-ietf-oauth-v2-1 - section 4.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.2)       |
| Refresh Token Grant                       | Supported     | [draft-ietf-oauth-v2-1 - section 4.3](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.3)       |
| Token Exchange Grant (delegation)         | Supported     | [RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693)                                                            |

> The Implicit Grant and Resource Owner Password Credentials grant have been removed from OAuth 2.1. The Implicit Grant
> exposes tokens in the browser URL. The ROPC grant exposes user credentials directly to the client, bypassing the
> delegated authorization model that OAuth was designed to provide, and offers no support for multi-factor
> authentication.

> SympAuthy supports [OAuth 2.0 Token Exchange (RFC 8693)](https://datatracker.ietf.org/doc/html/rfc8693)
> for **delegation**: a confidential client can obtain an identity-only access token that acts on behalf
> of a user *by id* (Phase 1), recording the acting client in an `act` claim. On-behalf-of by exchanging
> a user's own token (Phase 2) is **planned**. See the [Delegation](/functional/delegation) documentation
> for details.

## Token Types

| Token Type                              | Status        | Reference                                                                                                      |
|-----------------------------------------|---------------|----------------------------------------------------------------------------------------------------------------|
| Access Token                            | Supported     | [draft-ietf-oauth-v2-1 - section 1.4](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-1.4) |
| Refresh Token                           | Supported     | [draft-ietf-oauth-v2-1 - section 1.5](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-1.5) |
| ID Token (JWT)                          | Supported     | [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)                               |
| `auth_time` in ID, access and introspection | Supported | [OpenID Connect Core - section 2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken), [RFC 9068 - section 2.2.1](https://www.rfc-editor.org/rfc/rfc9068#section-2.2.1), [RFC 9470 - section 6.2](https://www.rfc-editor.org/rfc/rfc9470#section-6.2) |
| Refresh Token Rotation                  | Not Supported | [draft-ietf-oauth-v2-1 - section 6.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-6.1) |
| JWT Profile for Access Tokens           | Supported     | [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068)                                                      |
| Sender-constrained Tokens (DPoP)        | Supported     | [RFC 9449](https://datatracker.ietf.org/doc/html/rfc9449)                                                      |
| Sender-constrained Tokens (mTLS)        | Not Supported | [RFC 8705](https://datatracker.ietf.org/doc/html/rfc8705)                                                      |
| Bearer Tokens in Query Strings          | Not Supported | [draft-ietf-oauth-v2-1 - section 5.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-5.1) |

> Refresh tokens are **not rotated**. A refresh token may be presented as often as its client likes until it expires,
> and one replaced during a refresh is not refused afterwards — so a leaked refresh token is not detected as a replay
> when the thief and the client both use it. The response carries a new refresh token only where the one presented
> would otherwise expire before the access token issued with it, and the one presented stays valid either way; with
> the shipped lifetimes a refresh answers with no refresh token at all. What a client holds is withdrawn by revoking
> the [grant](/functional/grant) it was issued under, which the
> [revocation endpoint](/technical/security#token-revocation) does whichever token it is given.

> SympAuthy supports sender-constrained tokens via DPoP ([RFC 9449](https://datatracker.ietf.org/doc/html/rfc9449)).
> When a client sends a valid DPoP proof, the issued access token is bound to the client's key pair and returned with
> `token_type: "DPoP"`. See the [Security](/technical/security#dpop-demonstrating-proof-of-possession) documentation for details.

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
| `max_age` Authentication Age Request | Supported | [OpenID Connect Core - section 3.1.2.1](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)    |
| Step Up Authentication Challenge | Partial      | [RFC 9470](https://www.rfc-editor.org/rfc/rfc9470)                                                                 |
| Authorization Code One-Time Use | Enforced      | [draft-ietf-oauth-v2-1 - section 4.1.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.1.2) |
| Authorization Code Replay Revocation | Enforced | [draft-ietf-oauth-v2-1 - section 4.1.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.1.2) |
| HTTP 307 Redirect Prohibition   | Enforced      | [draft-ietf-oauth-v2-1 - section 7.5.3](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-7.5.3) |
| DPoP Nonce & Replay Detection   | Planned       | [RFC 9449 - section 8](https://datatracker.ietf.org/doc/html/rfc9449#section-8)                                    |
| Exact Redirect URI Matching     | Enforced      | [draft-ietf-oauth-v2-1 - section 7.5.3](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-7.5.3) |

> The `plain` challenge method will not be
> implemented. [RFC 7636 section 7.2](https://www.rfc-editor.org/rfc/rfc7636#section-7.2) identifies it as vulnerable to
> interception and recommends `S256` for all deployments.

> OAuth 2.1 requires PKCE for all clients using the authorization code flow. SympAuthy enforces this for both
> public and confidential clients. See the [Security](/technical/security#pkce-proof-key-for-code-exchange) documentation
> for details.

> An authorization code is spent by the exchange that is issued tokens. A second exchange of the same code is refused
> with `invalid_grant` and, where it passes client authentication and the PKCE verifier, **revokes the
> [grant](/functional/grant) the code was issued under** — every token the first exchange was issued, and every token
> refreshed from them — so a client that retries an exchange whose response it lost signs the end-user out. A code
> whose grant was revoked before it was exchanged is refused for that too. See
> [authorization code security](/technical/security#authorization-code-security).

> `max_age` is satisfied by construction: SympAuthy keeps no session between authorizations, so every authorization
> signs the end-user in anew. See [Authentication](/functional/authentication#asking-for-a-recent-authentication) for
> why, and for what a client observes in return.

> [RFC 9470](https://www.rfc-editor.org/rfc/rfc9470) is **partially** supported, and the two halves differ. The
> authentication information the RFC asks a server to convey **is** served: `auth_time` on the access token and in the
> introspection response, so a resource server can decide for itself how recent an authentication is. The **challenge**
> itself — `WWW-Authenticate: Bearer error="insufficient_user_authentication"`, carrying the `max_age` an operation
> demands — is implemented in the server, but no endpoint emits one yet: its first consumer is the end-user's own
> claim write ([sympauthy#482](https://github.com/sympauthy/sympauthy/issues/482)), which is not built. `acr` and
> `acr_values` are not supported at all — SympAuthy publishes no vocabulary of authentication strengths, so it
> advertises no `acr_values_supported` and the challenge never names `acr_values`.

## OpenID Connect

### Features

| Feature                     | Status        | Reference                                                                                  |
|-----------------------------|---------------|--------------------------------------------------------------------------------------------|
| OpenID Connect Discovery    | Supported     | [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) |
| ID Token                    | Supported     | [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)           |
| `claims` Request Parameter  | Partial       | [OpenID Connect Core - section 5.5](https://openid.net/specs/openid-connect-core-1_0.html#ClaimsParameter) |
| Request Object (`request`, `request_uri`) | Not Supported | [OpenID Connect Core - section 6](https://openid.net/specs/openid-connect-core-1_0.html#JWTRequests) |
| `response_mode`             | Not Supported | [OAuth 2.0 Multiple Response Type Encoding Practices](https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html#ResponseModes) |
| Dynamic Client Registration | Not Supported | [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)                                  |
| Grant Management            | Not Supported | [Grant Management for OAuth 2.0](https://openid.net/specs/oauth-v2-grant-management.html)  |

> The `claims` request parameter is **partially** supported, and `claims_parameter_supported` is advertised as `true`.
> A client may ask for a claim in the `id_token` or `userinfo` member, and the claim is carried there only where the
> deployment opened that place to a request with
> [`published-in-when-requested`](/technical/configuration/claim#claims-id-published-in-when-requested) — the request
> only ever adds, and never overrides access control, the audience or publication. The `essential`, `value` and
> `values` members of section 5.5.1 are ignored, as are `claims_locales` and the language tags of section 5.2. See
> [asking for a claim in the request](/functional/claims#asking-for-a-claim-in-the-request).

> The JWT request objects of section 6 are **refused**, not ignored: an authorization request carrying `request` or
> `request_uri` fails with `authorize.request.unsupported` or `authorize.request_uri.unsupported`, and the end-user
> reaches the flow's error page rather than being redirected back to the client. The discovery document says so up
> front — `request_parameter_supported` and `request_uri_parameter_supported` are both `false`, and
> `require_request_uri_registration` is `false`. A client sends `claims` in the query string instead.

> A `response_mode` in the authorization request is **ignored**: the authorization response is always sent in the query
> string of `redirect_uri`, and `response_modes_supported` advertises `query` alone.

> A grant is never put on the wire. SympAuthy records a [grant](/functional/grant) for every token it issues, but
> Grant Management — which would return a `grant_id` for a client to query and revoke, and advertise
> `grant_management_actions_supported` — is not served. A client withdraws what it holds through the
> [revocation endpoint](/technical/security#token-revocation), which revokes the grant whichever token it is given, and an
> administrator through the [Admin API](/technical/api/admin#revoke-grants).

### Scopes

| Scope         | Status        | Description                       |
|---------------|---------------|-----------------------------------|
| `openid`      | Supported     | Required for OpenID Connect flows |
| `profile`     | Supported     | User profile claims               |
| `email`       | Supported     | User email claims                 |
| `address`     | Supported     | User address claims               |
| `phone`       | Supported     | User phone claims                 |
| Custom Scopes | Supported     | Application-specific [consentable or grantable scopes](/functional/scope#custom-scopes); custom client scopes are not supported |

## Endpoints

### OAuth 2.1 Endpoints

| Endpoint               | Status    | Path                     | Reference                                                                                                      |
|------------------------|-----------|--------------------------|----------------------------------------------------------------------------------------------------------------|
| Authorization Endpoint | Supported | `/api/oauth2/authorize`  | [draft-ietf-oauth-v2-1 - section 3.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-3.1) |
| Token Endpoint         | Supported | `/api/oauth2/token`      | [draft-ietf-oauth-v2-1 - section 3.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-3.2) |
| Token Revocation       | Supported | `/api/oauth2/revoke`     | [RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)                                                      |
| Token Introspection    | Supported | `/api/oauth2/introspect` | [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662)                                                      |

### Error Responses

| Feature                | Status    | Reference                                                                               |
|------------------------|-----------|-----------------------------------------------------------------------------------------|
| Error Response Body    | Supported | [RFC 6749 - section 5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)     |
| `error_uri`            | Not Supported | [RFC 6749 - section 5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) |

> A failed request to one of the four endpoints above answers the body RFC 6749 section 5.2 defines: `error` names the
> code and `error_description` carries the human-readable text. No `error_uri` is ever sent. When
> `features.print-details-in-error` is enabled, a technical `details` member is added beside them — an extension of
> this server's own. This is **not** the body the rest of the APIs answer: everything under `/api/v1/...` uses the
> [error format](/technical/api/client#error-format) with `status`, `error_code` and `description`.

### OpenID Connect Endpoints

| Endpoint                      | Status    | Path                               | Reference                                                                                                 |
|-------------------------------|-----------|------------------------------------|-----------------------------------------------------------------------------------------------------------|
| OpenID Provider Configuration | Supported | `.well-known/openid-configuration` | [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig) |
| UserInfo Endpoint             | Supported | `/api/openid/userinfo`             | [OpenID Connect Core 1.0 - section 5.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)   |

## Legend

- **Supported**: Feature is implemented and available
- **Supported (>= version)**: Feature is implemented and available since a specific version
- **Not Supported**: Feature is not implemented and not planned
- **Partial**: Feature is partly implemented — the note beside the table says which part
- **Planned**: Feature is not yet implemented but will be in a future release
- **Required**: Feature must be used by clients
- **Enforced**: Feature is enforced by the server

---

For more information about OAuth specifications, visit:

- [OAuth 2.1 (draft-ietf-oauth-v2-1)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)
- [OAuth 2.0 Framework (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749)
- [JWT Profile for OAuth 2.0 Access Tokens (RFC 9068)](https://datatracker.ietf.org/doc/html/rfc9068)
- [OAuth 2.0 Demonstrating Proof of Possession (RFC 9449)](https://datatracker.ietf.org/doc/html/rfc9449)
- [OAuth 2.0 Token Introspection (RFC 7662)](https://datatracker.ietf.org/doc/html/rfc7662)
- [OAuth 2.0 Token Exchange (RFC 8693)](https://datatracker.ietf.org/doc/html/rfc8693)
- [OAuth 2.0 Step Up Authentication Challenge Protocol (RFC 9470)](https://www.rfc-editor.org/rfc/rfc9470)
- [OpenID Connect Specifications](https://openid.net/connect/)
