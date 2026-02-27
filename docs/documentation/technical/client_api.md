# Client API

The Client API provides endpoints allowing client applications to query the authorization server for information about
end-users. This API enables client applications to retrieve user data and manage user sessions.

All Client API endpoints are under `/api/v1/client/` and require client authentication.

## Authentication

All Client API endpoints require authentication using an OAuth 2.0 access token obtained via the Client Credentials
flow.

### Obtaining an Access Token

To authenticate with the Client API, you must first obtain an access token using the OAuth 2.0 Client Credentials grant:

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

```
GET /api/v1/client/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Endpoints

### List Users with Granted Scopes

**Path**: `/api/v1/client/users`

**Method**: GET

**Authentication**: Client credentials required

**Purpose**: Retrieves a list of all end-users who have granted scopes to the requesting client application.

**Response Format**:

```json
{
  "users": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "granted_scopes": [
        "openid",
        "profile",
        "email"
      ],
      "granted_at": "2026-01-15T14:30:00Z"
    },
    {
      "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "granted_scopes": [
        "openid",
        "email"
      ],
      "granted_at": "2026-02-20T09:15:30Z"
    }
  ]
}
```

**Properties**:

- `users`: Array of user grant records
    - `user_id`: Unique identifier of the end-user
    - `granted_scopes`: List of OAuth scopes the user has granted to this client
    - `granted_at`: ISO 8601 timestamp (UTC) when scopes were granted

**Use Cases**:

- Audit which users have authorized the client application
- Display active user connections in client admin panels
- Synchronize user access across distributed systems
- Monitor application usage and user adoption

---

### Get User Info

**Path**: `/api/v1/client/users/{user_id}`

**Method**: GET

**Authentication**: Bearer token required

**Purpose**: Retrieves basic information about a specific end-user and their authorization status with the client.

**Path Parameters**:
- `user_id`: Unique identifier of the end-user

**Response Format**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "granted_scopes": ["openid", "profile", "email"],
  "granted_at": "2026-01-15T14:30:00Z"
}
```

**Properties**:
- `user_id`: Unique identifier of the end-user
- `granted_scopes`: List of OAuth scopes the user has granted to this client
- `granted_at`: ISO 8601 timestamp (UTC) when scopes were granted

**Use Cases**:
- Check authorization status for a specific user
- Verify which scopes a user has granted
- Determine when a user authorized the application

---

### Get User Claims

**Path**: `/api/v1/client/users/{user_id}/claims`

**Method**: GET

**Authentication**: Bearer token required

**Purpose**: Retrieves claims associated with a specific end-user. Only returns claims that the end-user has given
consent for the client to access.

**Path Parameters**:

- `user_id`: Unique identifier of the end-user

**Response Format**:

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
    "custom_department": "Engineering",
    "custom_employee_id": "EMP-12345"
  }
}
```

**Properties**:

- `user_id`: Unique identifier of the end-user
- `claims`: Object containing claims the user has consented to share with this client
    - Standard claims (email, name, phone_number, etc.)
    - Custom claims (prefixed with `custom_`)
    - Verification status claims (email_verified, phone_number_verified)

**Important Notes**:

- Only claims for which the user has granted consent are returned
- The returned claims are determined by the scopes granted during authorization
- Claims not covered by granted scopes will not be included in the response

**Use Cases**:

- Retrieve user profile information
- Display user details in client applications
- Synchronize user data across systems
- Access custom attributes stored for users

---

### Update User Custom Claims

**Path**: `/api/v1/client/users/{user_id}/claims`

**Method**: PATCH

**Authentication**: Bearer token required

**Purpose**: Updates custom claims for a specific end-user. Only custom claims can be modified through this endpoint.

**Path Parameters**:

- `user_id`: Unique identifier of the end-user

**Request Format**:

```json
{
  "custom_department": "Product Management",
  "custom_employee_id": "EMP-67890",
  "custom_role": "Senior Product Manager"
}
```

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "updated_claims": {
    "custom_department": "Product Management",
    "custom_employee_id": "EMP-67890",
    "custom_role": "Senior Product Manager"
  }
}
```

**Properties**:

- `user_id`: Unique identifier of the end-user
- `updated_claims`: Object containing the custom claims that were updated

**Important Notes**:

- Only claims prefixed with `custom_` can be modified through this endpoint
- Standard claims (email, name, phone_number, etc.) cannot be modified via this endpoint
- Attempting to modify standard claims will result in an error
- Custom claims can be set to `null` to remove them

**Use Cases**:

- Store application-specific user metadata
- Tag users with custom attributes (roles, departments, etc.)
- Maintain additional user information beyond standard claims
- Update user attributes from external systems

---

### List User Sessions

**Path**: `/api/v1/client/users/{user_id}/sessions`

**Method**: GET

**Authentication**: Bearer token required

**Purpose**: Retrieves all active sessions for a specific end-user with the client application.

**Path Parameters**:
- `user_id`: Unique identifier of the end-user

**Response Format**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "sessions": [
    {
      "session_id": "sess_abc123xyz",
      "created_at": "2026-02-27T10:30:00Z",
      "last_accessed_at": "2026-02-27T14:45:00Z",
      "expires_at": "2026-03-06T10:30:00Z",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
      "session_id": "sess_def456uvw",
      "created_at": "2026-02-25T08:15:00Z",
      "last_accessed_at": "2026-02-27T09:20:00Z",
      "expires_at": "2026-03-04T08:15:00Z",
      "ip_address": "192.168.1.50",
      "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
    }
  ]
}
```

**Properties**:
- `user_id`: Unique identifier of the end-user
- `sessions`: Array of active session records
  - `session_id`: Unique identifier for the session
  - `created_at`: ISO 8601 timestamp (UTC) when the session was created
  - `last_accessed_at`: ISO 8601 timestamp (UTC) of the last activity in this session
  - `expires_at`: ISO 8601 timestamp (UTC) when the session will expire
  - `ip_address`: IP address from which the session was initiated
  - `user_agent`: Browser/device user agent string

**Use Cases**:
- Display active sessions to users in account settings
- Monitor concurrent sessions for security purposes
- Audit user activity across devices
- Detect suspicious login patterns
- Allow users to review their active sessions

---

### List User Sessions

**Path**: `/api/v1/client/users/{user_id}/sessions`

**Method**: GET

**Authentication**: Bearer token required

**Purpose**: Retrieves all active sessions for a specific end-user with the client application.

**Path Parameters**:
- `user_id`: Unique identifier of the end-user

**Response Format**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "sessions": [
    {
      "session_id": "sess_abc123xyz",
      "created_at": "2026-02-27T10:30:00Z",
      "last_accessed_at": "2026-02-27T14:45:00Z",
      "expires_at": "2026-03-06T10:30:00Z",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
      "session_id": "sess_def456uvw",
      "created_at": "2026-02-25T08:15:00Z",
      "last_accessed_at": "2026-02-27T09:20:00Z",
      "expires_at": "2026-03-04T08:15:00Z",
      "ip_address": "192.168.1.50",
      "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
    }
  ]
}
```

**Properties**:
- `user_id`: Unique identifier of the end-user
- `sessions`: Array of active session records
  - `session_id`: Unique identifier for the session
  - `created_at`: ISO 8601 timestamp (UTC) when the session was created
  - `last_accessed_at`: ISO 8601 timestamp (UTC) of the last activity in this session
  - `expires_at`: ISO 8601 timestamp (UTC) when the session will expire
  - `ip_address`: IP address from which the session was initiated
  - `user_agent`: Browser/device user agent string

**Use Cases**:
- Display active sessions to users in account settings
- Monitor concurrent sessions for security purposes
- Audit user activity across devices
- Detect suspicious login patterns
- Allow users to review their active sessions
