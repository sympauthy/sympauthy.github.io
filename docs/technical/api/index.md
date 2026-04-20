# API

SympAuthy implements four distinct APIs to support different use cases:

## OAuth 2.1 & OpenID Connect API

Standard OAuth 2.1 and OpenID Connect endpoints for authorization and authentication:

- **Authorization Endpoint**: `/api/oauth2/authorize` - Initiates OAuth 2.1 authorization flows
- **Token Endpoint**: `/api/oauth2/token` - Issues access tokens, refresh tokens, and ID tokens
- **UserInfo Endpoint**: `/api/openid/userinfo` - Returns user profile claims
- **Introspection Endpoint**: `/api/oauth2/introspect` - Validates tokens and returns metadata
- **Discovery Endpoint**: `/.well-known/openid-configuration` - OpenID Connect metadata

This API supports the Authorization Code Grant and Refresh Token flows, with Client Secret Basic and Client Secret Post
authentication methods. See the [OAuth 2.1 & OpenID Compatibility Matrix](/technical/oauth2_compatibility) for full
specification compliance details.

## Flow API

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
See the [Flow API](flow) documentation for detailed information on all available endpoints.

## Client API

Endpoints allowing client applications to query the authorization server for information about end-users. This API
enables client applications to retrieve user data and manage user sessions. All endpoints require client authentication.

See the [Client API](client) documentation for detailed information on available endpoints.

## Admin API

Endpoints for administering the authorization server, including client management, user administration, access control,
and monitoring. The Admin API requires activation of the `admin` Micronaut environment and uses OAuth 2.1 Client
Credentials authentication with fine-grained admin scopes.

See the [Admin API](admin) documentation for detailed information on authentication, scopes, and available
endpoints.
