# Technical documentation

This part of the documentation describes the technical aspects of SympAuthy, like its configuration file and APIs.

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
authentication methods. See the [OAuth 2.0 & OpenID Compatibility Matrix](oauth2_compatibility) for full specification
compliance details.

### 2. Flow API

Low-level endpoints for building custom authentication flows, providing fine-grained control over the authentication
experience. All endpoints are under `/api/v1/flow/`:

- **Configuration**: Get flow settings, enabled features, and available providers
- **Sign-Up/Sign-In**: Password-based registration and authentication
- **Provider OAuth**: Third-party authentication via OAuth providers
- **Claims Collection**: Gather additional user information
- **Claim Validation**: Verify claims via EMAIL/SMS validation codes

The Flow API uses state-based session management and a redirect-driven pattern where each step returns a `redirect_url`
to guide flow progression. Steps can auto-skip when no user interaction is required.
See [How to use Flow API to write a custom flow](writing_a_custom_flow) for detailed documentation.

### 3. Client API

Endpoints allowing client applications to query the authorization server for information about end-users. This API
enables client applications to retrieve user data and manage user sessions.

*Documentation coming soon.*

### 4. Admin API

Endpoints intended for administration of the authorization server, including client management, user administration, and
server configuration.

*Documentation coming soon.*
