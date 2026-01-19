# OAuth 2.0 & OpenID Compatibility Matrix

This document provides an overview of SympAuthy's compatibility with OAuth 2.0 and OpenID Connect specifications.

## OAuth 2.0 Grant Types

| Grant Type | Status    | Reference                                                                           |
|------------|-----------|-------------------------------------------------------------------------------------|
| Authorization Code Grant | Supported | [RFC 6749 - section 4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1) |
| Implicit Grant | Not Supported | [RFC 6749 - section 4.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.2) |
| Resource Owner Password Credentials Grant | Not Supported | [RFC 6749 - section 4.3](https://datatracker.ietf.org/doc/html/rfc6749#section-4.3) |
| Client Credentials Grant | Not Supported | [RFC 6749 - section 4.4](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4) |
| Refresh Token Grant | Supported | [RFC 6749 - section 6](https://datatracker.ietf.org/doc/html/rfc6749#section-6)     |

## Token Types

| Token Type | Status |
|------------|--------|
| Access Token | Supported |
| Refresh Token | Supported |
| ID Token (JWT) | Supported |

## Client Authentication Methods

| Method | Status        | Reference                                                                               |
|--------|---------------|-----------------------------------------------------------------------------------------|
| Client Secret Basic | Supported     | [RFC 6749 - section 2.3.1](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1) |
| Client Secret Post | Supported     | [RFC 6749 - section 2.3.1](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1) |
| Client Secret JWT | Not Supported | [RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523)                               |
| Private Key JWT | Not Supported | [RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523)                               |
| None (Public Clients) | Not Supported | [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)                               |

## PKCE (Proof Key for Code Exchange)

| Feature | Status        | Reference |
|---------|---------------|-----------|
| PKCE Support | Not Supported | [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) |
| S256 Challenge Method | Not Supported | [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) |
| Plain Challenge Method | Not Supported | [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) |

## Security Best Practices

| Practice | Status     | Reference                                                                               |
|----------|------------|-----------------------------------------------------------------------------------------|
| State Parameter | Required   | [RFC 6749 - section 10.12](https://datatracker.ietf.org/doc/html/rfc6749#section-10.12) |
| Nonce Parameter | Supported  | [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)            |
| Authorization Code One-Time Use | Enforced | [RFC 6749 - section 4.1.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2) |

## Scope Support

| Scope | Status           | Description |
|-------|------------------|-------------|
| `openid` | Supported        | Required for OpenID Connect flows |
| `profile` | Supported        | User profile claims |
| `email` | Supported | User email claims |
| `address` | Supported | User address claims |
| `phone` | Supported | User phone claims |
| Custom Scopes | S Status Unknown | Application-specific scopes |

## OpenID Connect

| Feature | Status | Reference |
|---------|--------|-----------|
| OpenID Connect Discovery | Supported | [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) |
| ID Token | Supported | [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) |
| Dynamic Client Registration | Not Supported | [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591) |

## Endpoints

### OAuth 2.0 Endpoints

| Endpoint | Status        | Path | Reference |
|----------|---------------|------|-----------|
| Authorization Endpoint | Supported     | `/api/oauth2/authorize` | [RFC 6749 - section 3.1](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1) |
| Token Endpoint | Supported     | `/api/oauth2/token` | [RFC 6749 - section 3.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2) |
| Token Revocation | Not Supported | - | [RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009) |
| Token Introspection | Not Supported | - | [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662) |

### OpenID Discovery Endpoints

| Endpoint | Status        | Path | Reference |
|----------|---------------|------|-----------|
| Authorization Endpoint | Supported     | `.well-known/openid-configuration` | [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig) |

### OpenID Connect Endpoints

| Endpoint | Status        | Path | Reference |
|----------|---------------|------|-----------|
| UserInfo Endpoint | Supported     | `/api/openid/userinfo` | [OpenID Connect Core 1.0 - section 5.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo) |

## Legend

- **Supported**: Feature is implemented and available
- **Supported (>= version)**: Feature is implemented and available since a specific version
- **Not Supported**: Feature is not implemented and not planned

---

For more information about OAuth 2.0 specifications, visit:
- [OAuth 2.0 Framework (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Specifications](https://openid.net/connect/)
