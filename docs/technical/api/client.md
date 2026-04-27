# Client API

The Client API provides endpoints allowing client applications to query the authorization server for information about
end-users. This API enables client applications to retrieve user data and manage custom claims.

All Client API endpoints are under `/api/v1/client/` and require client authentication.

## Client Scopes

Client scopes follow the `{resource}:{action}` naming convention. They control what operations a client application
can perform through the Client API. See [Scope](/functional/scope#client-scope) for details on how client scopes
are granted.

| Scope                | Description                                  |
|----------------------|----------------------------------------------|
| `users:read`         | List users with consented scopes             |
| `users:claims:read`  | Read claims the client is authorized to access  |
| `users:claims:write` | Write claims the client is authorized to modify |

## Authentication

All Client API endpoints require authentication using an OAuth 2.1 access token obtained via the Client Credentials
flow.

### Obtaining an Access Token

To authenticate with the Client API, you must first obtain an access token using the OAuth 2.1 Client Credentials grant:

**Step 1**: Request an access token from the Token Endpoint

**Endpoint**: `/api/oauth2/token`

**Method**: POST

**Request Format**:

```
POST /api/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

**Response Format**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Step 2**: Use the access token in Client API requests

Include the access token in the `Authorization` header:

```http
GET /api/v1/client/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Authorization

Each Client API endpoint requires a specific client scope. The access token must include the scope required by the
endpoint being called.

- If the token is missing or invalid: **401 Unauthorized**
- If the token is valid but lacks the required scope: **403 Forbidden**

**401 Response Example**:

```json
{
  "error": "unauthorized",
  "error_description": "Missing or invalid access token."
}
```

**403 Response Example**:

```json
{
  "error": "forbidden",
  "error_description": "The access token does not include the required scope: users:read"
}
```

The required scope for each endpoint is documented in the [Endpoints](#endpoints) section below.

## Endpoints

### User Management

Endpoints for listing users and viewing their authorization status. Requires the `users:read` scope.

#### List Users with Consented Scopes

**Path**: `/api/v1/client/users`

**Method**: GET

**Authentication**: Bearer token with `users:read` scope

**Purpose**: Retrieves a paginated list of all end-users who have consented to share scopes with the [audience](/functional/audience) the requesting client belongs to.

**Query Parameters**:

- `page` (optional): Zero-indexed page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)
- `provider_id` (optional): Filter users linked to a specific provider (e.g. `?provider_id=discord`)
- `subject` (optional): Filter by provider subject ID. Must be used together with `provider_id`
  (e.g. `?provider_id=discord&subject=123456789012345678`)

**Response Format**:

`200 OK`:

```json
{
  "users": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "identifier_claims": {
        "email": "jane@example.com"
      },
      "providers": [
        {
          "provider_id": "discord",
          "subject": "123456789012345678",
          "linked_at": "2026-01-15T14:30:00Z"
        }
      ],
      "consented_scopes": [
        "openid",
        "profile",
        "email"
      ],
      "consented_at": "2026-01-15T14:30:00Z"
    },
    {
      "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "identifier_claims": {
        "email": "john@example.com"
      },
      "providers": [
        {
          "provider_id": "google",
          "subject": "109876543210",
          "linked_at": "2026-02-20T09:15:30Z"
        }
      ],
      "consented_scopes": [
        "openid",
        "email"
      ],
      "consented_at": "2026-02-20T09:15:30Z"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 2
}
```

**Properties**:

- `users`: Array of user consent records
    - `user_id`: Unique identifier of the end-user
    - `identifier_claims`: Object containing the user's identifier claim values as key/value pairs. Only claims configured as identifiers are included.
    - `providers`: Array of linked provider identity records
        - `provider_id`: Identifier of the external provider (e.g. `"discord"`, `"google"`)
        - `subject`: The user's unique identifier at the provider
        - `linked_at`: ISO 8601 timestamp (UTC) when the provider was linked
    - `consented_scopes`: List of OAuth scopes the user has consented to share with this audience
    - `consented_at`: ISO 8601 timestamp (UTC) when consent was given
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of users with consented scopes

**Use Cases**:

- Audit which users have authorized the audience
- Display active user connections in client admin panels
- Synchronize user access across distributed systems
- Monitor application usage and user adoption

---

#### Get User Info

**Path**: `/api/v1/client/users/{user_id}`

**Method**: GET

**Authentication**: Bearer token with `users:read` scope

**Purpose**: Retrieves basic information about a specific end-user and their authorization status with the client.

**Path Parameters**:

- `user_id`: Unique identifier of the end-user

**Response Format**:

`200 OK`:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "identifier_claims": {
    "email": "jane@example.com"
  },
  "providers": [
    {
      "provider_id": "discord",
      "subject": "123456789012345678",
      "linked_at": "2026-01-15T14:30:00Z"
    },
    {
      "provider_id": "google",
      "subject": "109876543210",
      "linked_at": "2026-02-01T10:00:00Z"
    }
  ],
  "consented_scopes": ["openid", "profile", "email"],
  "consented_at": "2026-01-15T14:30:00Z"
}
```

`404 Not Found`:

```json
{
  "error": "not_found",
  "error_description": "No user found with id: 550e8400-e29b-41d4-a716-446655440000"
}
```

**Properties**:

- `user_id`: Unique identifier of the end-user
- `identifier_claims`: Object containing the user's identifier claim values as key/value pairs. Only claims configured as identifiers are included.
- `providers`: Array of linked provider identity records
    - `provider_id`: Identifier of the external provider (e.g. `"discord"`, `"google"`)
    - `subject`: The user's unique identifier at the provider
    - `linked_at`: ISO 8601 timestamp (UTC) when the provider was linked
- `consented_scopes`: List of OAuth scopes the user has consented to share with this audience
- `consented_at`: ISO 8601 timestamp (UTC) when consent was given

**Use Cases**:

- Check authorization status for a specific user
- Verify which scopes a user has consented to
- Determine when a user authorized the audience

---

### Claims

Endpoints for reading and updating user claims. Requires `users:claims:read` for read operations and
`users:claims:write` for modifications.

#### Get User Claims

**Path**: `/api/v1/client/users/{user_id}/claims`

**Method**: GET

**Authentication**: Bearer token with `users:claims:read` scope

**Purpose**: Retrieves claims associated with a specific end-user. Returns claims that the client is authorized to
read based on each claim's [ACL](/technical/configuration/claim#claims-id-acl).

**Path Parameters**:

- `user_id`: Unique identifier of the end-user

**Response Format**:

`200 OK`:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "claims": {
    "email": "user@example.com",
    "email_verified": true,
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "phone_number": "+1234567890",
    "phone_number_verified": false,
    "birthdate": "1990-01-15",
    "department": "Engineering",
    "employee_id": "EMP-12345"
  }
}
```

`404 Not Found`:

```json
{
  "error": "not_found",
  "error_description": "No user found with id: 550e8400-e29b-41d4-a716-446655440000"
}
```

**Properties**:

- `user_id`: Unique identifier of the end-user
- `claims`: Object containing the user's claims. Which claims are included depends on each claim's
  [ACL](/technical/configuration/claim#claims-id-acl):
    - Claims with consent-based access are included when the end-user has consented to the relevant scope
    - Claims with unconditional access are included when the client holds the required client scope
    - Verification status claims (email_verified, phone_number_verified) follow the same ACL rules

**Important Notes**:

- Claims scoped to a different [audience](/functional/audience) than the requesting client are filtered out. Only
  claims that are unscoped or scoped to the client's audience are returned.
- By default, OpenID Connect claims require end-user consent to the relevant scope, and custom claims are returned
  unconditionally to clients holding `users:claims:read`. This behavior can be customized through
  [ACL configuration](/technical/configuration/claim#claims-id-acl).

**Use Cases**:

- Retrieve user profile information
- Display user details in client applications
- Synchronize user data across systems
- Access custom attributes stored for users

---

#### Update User Claims

**Path**: `/api/v1/client/users/{user_id}/claims`

**Method**: PATCH

**Authentication**: Bearer token with `users:claims:write` scope

**Purpose**: Updates claims for a specific end-user. Only claims that the client is authorized to write based on the
claim's [ACL](/technical/configuration/claim#claims-id-acl) can be modified through this endpoint.

**Path Parameters**:

- `user_id`: Unique identifier of the end-user

**Request Format**:

```json
{
  "department": "Product Management",
  "employee_id": "EMP-67890",
  "role": "Senior Product Manager"
}
```

**Response Format**:

`200 OK`:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "claims": {
    "email": "user@example.com",
    "email_verified": true,
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "phone_number": "+1234567890",
    "phone_number_verified": false,
    "birthdate": "1990-01-15",
    "department": "Product Management",
    "employee_id": "EMP-67890",
    "role": "Senior Product Manager"
  }
}
```

`400 Bad Request`:

```json
{
  "error": "invalid_claim",
  "error_description": "The claim 'email' cannot be modified by the client. Either the claim does not exist or the client does not hold the required scopes."
}
```

`404 Not Found`:

```json
{
  "error": "not_found",
  "error_description": "No user found with id: 550e8400-e29b-41d4-a716-446655440000"
}
```

**Properties**:

- `user_id`: Unique identifier of the end-user
- `claims`: Object containing all of the user's claims after the update

**Important Notes**:

- Only claims whose [ACL](/technical/configuration/claim#claims-id-acl) grants write access to the client can be
  modified. By default, OpenID Connect claims are not writable by clients, and custom claims are writable by clients
  holding `users:claims:write`.
- Attempting to modify a claim the client is not authorized to write will result in an error.
- Claims can be set to `null` to remove them.

**Use Cases**:

- Store application-specific user metadata
- Tag users with custom attributes (roles, departments, etc.)
- Maintain additional user information beyond OpenID Connect claims
- Update user attributes from external systems
