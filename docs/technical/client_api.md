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
| `users:claims:read`  | Read consented and custom claims             |
| `users:claims:write` | Write custom claims                          |

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

**Purpose**: Retrieves a paginated list of all end-users who have consented to share scopes with the requesting client application.

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
    - `consented_scopes`: List of OAuth scopes the user has consented to share with this client
    - `consented_at`: ISO 8601 timestamp (UTC) when consent was given
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of users with consented scopes

**Use Cases**:

- Audit which users have authorized the client application
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
- `consented_scopes`: List of OAuth scopes the user has consented to share with this client
- `consented_at`: ISO 8601 timestamp (UTC) when consent was given

**Use Cases**:

- Check authorization status for a specific user
- Verify which scopes a user has consented to
- Determine when a user authorized the application

---

### Claims

Endpoints for reading and updating user claims. Requires `users:claims:read` for read operations and
`users:claims:write` for modifications.

#### Get User Claims

**Path**: `/api/v1/client/users/{user_id}/claims`

**Method**: GET

**Authentication**: Bearer token with `users:claims:read` scope

**Purpose**: Retrieves claims associated with a specific end-user. Only returns claims that the end-user has given
consent for the client to access.

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
- `claims`: Object containing claims the user has consented to share with this client
    - OpenID Connect claims (email, name, phone_number, etc.)
    - Custom claims (defined by the operator in configuration)
    - Verification status claims (email_verified, phone_number_verified)

**Important Notes**:

- Only claims for which the user has given consent are returned
- The returned claims are determined by the scopes consented during authorization
- Claims not covered by consented scopes will not be included in the response

**Use Cases**:

- Retrieve user profile information
- Display user details in client applications
- Synchronize user data across systems
- Access custom attributes stored for users

---

#### Update User Custom Claims

**Path**: `/api/v1/client/users/{user_id}/claims`

**Method**: PATCH

**Authentication**: Bearer token with `users:claims:write` scope

**Purpose**: Updates custom claims for a specific end-user. Only custom claims can be modified through this endpoint.

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
  "error_description": "Only custom claims can be modified through this endpoint. The claim 'email' is an OpenID Connect claim."
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

- Only custom claims (origin: `custom`) can be modified through this endpoint
- OpenID Connect claims (origin: `openid`) cannot be modified via this endpoint
- Attempting to modify an OpenID Connect claim will result in an error
- Custom claims can be set to `null` to remove them

**Use Cases**:

- Store application-specific user metadata
- Tag users with custom attributes (roles, departments, etc.)
- Maintain additional user information beyond OpenID Connect claims
- Update user attributes from external systems
