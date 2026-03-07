# Technical documentation

This part of the documentation describes the technical aspects of SympAuthy, like its configuration file and APIs.

## Security

SympAuthy is designed with security as a first-class concern. See the [Security](security) documentation for a detailed
description of the measures in place, including password hashing, token signing, OAuth 2.0 flow protections, and safe
configuration defaults.

## Configuration

Sympauthy is configured through a configuration file that defines how the authorization server behaves. The
configuration controls authentication methods, OAuth providers, claim collection, validation requirements, and various
security settings. It allows you to customize the authentication experience without modifying code. See
the [Configuration](configuration) documentation for detailed information on all available configuration options
and [Well-known providers](well-known_providers) for pre-configured OAuth provider templates.

## APIs

Sympauthy implements four distinct APIs to support different use cases:

### 1. OAuth 2.0 & OpenID Connect API

Standard OAuth 2.0 and OpenID Connect endpoints for authorization and authentication:

- **Authorization Endpoint**: `/api/oauth2/authorize` - Initiates OAuth 2.0 authorization flows
- **Token Endpoint**: `/api/oauth2/token` - Issues access tokens, refresh tokens, and ID tokens
- **UserInfo Endpoint**: `/api/openid/userinfo` - Returns user profile claims
- **Discovery Endpoint**: `/.well-known/openid-configuration` - OpenID Connect metadata

This API supports the Authorization Code Grant and Refresh Token flows, with Client Secret Basic and Client Secret Post
authentication methods. See the [OAuth 2.0, 2.1 & OpenID Compatibility Matrix](oauth2_compatibility) for full specification
compliance details.

### 2. Flow API

Low-level endpoints for building custom authentication flows, providing fine-grained control over the authentication
experience. All endpoints are under `/api/v1/flow/`:

- **Configuration**: Get flow settings, enabled features, and available providers
- **Sign-Up/Sign-In**: Password-based registration and authentication
- **Provider OAuth**: Third-party authentication via OAuth providers
- **Claims Collection**: Gather additional user information
- **Claim Validation**: Verify claims via EMAIL/SMS validation codes
- **MFA**: TOTP enrollment, challenge, and method routing

The Flow API uses state-based session management and a redirect-driven pattern where each step returns a `redirect_url`
to guide flow progression. Steps can auto-skip when no user interaction is required.
See the [Flow API](flow_api) documentation for detailed information on all available endpoints.

### 3. Client API

Endpoints allowing client applications to query the authorization server for information about end-users. This API
enables client applications to retrieve user data and manage user sessions. All endpoints require client authentication.

See the [Client API](client_api) documentation for detailed information on available endpoints.

### 4. Admin API

Endpoints for administering the authorization server, including client management, user administration, access control,
and monitoring. The Admin API requires activation of the `admin` Micronaut environment and uses OAuth 2.0 Client
Credentials authentication with fine-grained admin scopes.

See the [Admin API](admin_api) documentation for detailed information on authentication, scopes, and available
endpoints.
