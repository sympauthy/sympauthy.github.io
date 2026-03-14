# Admin API

The Admin API provides endpoints for administering the SympAuthy authorization server, including client management,
user administration, access control, and monitoring. This API is intended for operators and internal tooling, not for
end-user-facing applications.

All Admin API endpoints are under `/api/v1/admin/` and require authentication with appropriate admin scopes.

## Admin Environment

SympAuthy provides a dedicated `admin` [Micronaut environment](configuration#micronaut-environments) that
pre-configures everything needed to use the Admin API:

- All admin scopes listed in the [Admin Scopes](#admin-scopes) table below
- A default `admin` client with all admin scopes in its `allowed-scopes`

To activate the admin environment, include `admin` in the `MICRONAUT_ENVIRONMENTS` variable:

```
MICRONAUT_ENVIRONMENTS=default,by-mail,admin
```

The default admin client is a [public client](/documentation/functional/client#confidential-and-public-clients) that
uses [PKCE](/documentation/technical/security#pkce-proof-key-for-code-exchange) instead of a client secret.
Everything is ready out of the box — no secret to configure.

> You can also configure admin access manually without using the `admin` environment. Add the desired admin scopes
> to any client's `allowed-scopes` in the [configuration](configuration) and mark it as a
> [public client](/documentation/functional/client#confidential-and-public-clients) to use PKCE. This is useful if
> you need multiple admin clients with different permission levels.

## Admin Scopes

Admin scopes follow the naming convention `admin:{domain}:{action}`, providing fine-grained control so operators can
grant only the minimum necessary privileges.

| Scope                  | Description                                             |
|------------------------|---------------------------------------------------------|
| `admin:config:read`    | List and view configuration resources (clients, claims) |
| `admin:users:read`     | List and view users                                     |
| `admin:users:write`    | Create, update, disable, enable users                   |
| `admin:users:delete`   | Delete users (separated for GDPR sensitivity)           |
| `admin:access:read`    | View consents                                           |
| `admin:access:write`   | Revoke consents                                         |
| `admin:sessions:read`  | View active sessions                                    |
| `admin:sessions:write` | Force logout, revoke sessions                           |

The `admin:users:delete` scope is intentionally separated from `admin:users:write` because user deletion is an
irreversible operation with GDPR implications and should require explicit authorization.

## Authentication

All Admin API endpoints require authentication using an OAuth 2.1 access token obtained via the Client Credentials
flow with [PKCE](/documentation/technical/security#pkce-proof-key-for-code-exchange). The default admin client is a
public client — it authenticates using a code verifier instead of a client secret.

### Obtaining an Access Token

To authenticate with the Admin API, you must first obtain an access token using the OAuth 2.1 Client Credentials grant
with PKCE:

**Step 1**: Generate a PKCE code verifier and challenge

Before making the token request, generate a random `code_verifier` and compute the challenge:

```
code_challenge = BASE64URL(SHA256(code_verifier))
```

**Step 2**: Request an access token from the Token Endpoint

**Endpoint**: `/api/oauth2/token`

**Method**: POST

**Request Format**:

```
POST /api/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=YOUR_ADMIN_CLIENT_ID
&code_verifier=YOUR_CODE_VERIFIER
&code_challenge=YOUR_CODE_CHALLENGE
&code_challenge_method=S256
```

> When using the `admin` Micronaut environment, the default admin client ID is pre-configured. No client secret is
> needed — PKCE secures the exchange.

**Response Format**:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Step 3**: Use the access token in Admin API requests

Include the access token in the `Authorization` header:

```http
GET /api/v1/admin/users
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Authorization

Each Admin API endpoint requires a specific admin scope. The access token must include the scope required by the
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
  "error_description": "The access token does not include the required scope: admin:users:read"
}
```

The required scope for each endpoint is documented in the [Endpoints](#endpoints) section below.

## Endpoints

> **Work in progress** — [Client Management](#client-management) and [Claim Management](#claim-management) endpoints
> are implemented. The remaining endpoints below are planned but not yet implemented. The paths and response formats
> shown are preliminary and may change. See [GitHub issue #109](https://github.com/sympauthy/sympauthy/issues/109)
> for progress.

### Client Management

Endpoints for viewing configured client applications. Since clients are defined in configuration files
(not in a database), these endpoints expose them as read-only resources. Client secrets are never included
in responses. Requires the `admin:config:read` scope.

#### List Clients

**Path**: `/api/v1/admin/clients`

**Method**: GET

**Authentication**: Bearer token with `admin:config:read` scope

**Purpose**: Retrieves a paginated list of all configured client applications.

**Query Parameters**:

- `page` (optional): Zero-indexed page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)

**Response Format**:

```json
{
  "clients": [
    {
      "client_id": "my-app",
      "type": "public",
      "allowed_scopes": [
        "openid",
        "profile"
      ],
      "default_scopes": [
        "openid"
      ],
      "allowed_redirect_uris": [
        "https://my-app.com/callback"
      ]
    }
  ],
  "page": 0,
  "size": 20,
  "total": 1
}
```

**Properties**:

- `clients`: Array of client records
    - `client_id`: Unique identifier of the client, as defined in configuration
    - `type`: Type of the client as defined by
      the [OAuth 2.1 specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-2.1).
      Possible values: `"public"` | `"confidential"`
    - `allowed_scopes`: Scopes the client is allowed to request
    - `default_scopes`: Scopes granted by default when the client does not explicitly request any
    - `allowed_redirect_uris`: Redirect URIs the client is allowed to use during authorization
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of clients

**Use Cases**:

- Admin dashboard listing all registered clients and their permissions
- Verifying which scopes and redirect URIs are configured for a specific client
- Auditing client configurations without accessing configuration files directly

---

#### Get Client Details

**Path**: `/api/v1/admin/clients/{client_id}`

**Method**: GET

**Authentication**: Bearer token with `admin:config:read` scope

**Purpose**: Retrieves details for a specific client.

**Path Parameters**:

- `client_id`: Unique identifier of the client

**Response Format**:

`200 OK`:

```json
{
  "client_id": "my-app",
  "type": "public",
  "allowed_scopes": [
    "openid",
    "profile"
  ],
  "default_scopes": [
    "openid"
  ],
  "allowed_redirect_uris": [
    "https://my-app.com/callback"
  ]
}
```

`404 Not Found`:

```json
{
  "error": "not_found",
  "error_description": "No client found with id: my-app"
}
```

**Properties**:

- `client_id`: Unique identifier of the client, as defined in configuration
- `type`: Type of the client as defined by
  the [OAuth 2.1 specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-2.1). Possible
  values: `"public"` | `"confidential"`
- `allowed_scopes`: Scopes the client is allowed to request
- `default_scopes`: Scopes granted by default when the client does not explicitly request any
- `allowed_redirect_uris`: Redirect URIs the client is allowed to use during authorization

**Use Cases**:

- Admin dashboard listing all registered clients and their permissions
- Verifying which scopes and redirect URIs are configured for a specific client
- Auditing client configurations without accessing configuration files directly

---

### Claim Management

Endpoints for viewing configured claims. Since claims are defined in configuration files
(not in a database), these endpoints expose them as read-only resources — following the same pattern as
[Client Management](#client-management). Both standard (OpenID Connect) and custom claims are returned.
Requires the `admin:config:read` scope.

#### List Claims

**Path**: `/api/v1/admin/claims`

**Method**: GET

**Authentication**: Bearer token with `admin:config:read` scope

**Purpose**: Retrieves a paginated list of all configured claims (standard and custom).

**Query Parameters**:

- `page` (optional): Zero-indexed page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)
- `enabled` (optional): Filter by enabled status (`true`, `false`)
- `required` (optional): Filter by required status (`true`, `false`)

**Response Format**:

```json
{
  "claims": [
    {
      "id": "email",
      "type": "string",
      "standard": true,
      "enabled": true,
      "required": true,
      "identifier": true,
      "allowed_values": null,
      "group": null
    },
    {
      "id": "name",
      "type": "string",
      "standard": true,
      "enabled": true,
      "required": false,
      "identifier": false,
      "allowed_values": null,
      "group": "profile"
    },
    {
      "id": "custom_department",
      "type": "string",
      "standard": false,
      "enabled": true,
      "required": false,
      "identifier": false,
      "allowed_values": [
        "Engineering",
        "Marketing",
        "Sales"
      ],
      "group": null
    }
  ],
  "page": 0,
  "size": 20,
  "total": 3
}
```

**Properties**:

- `claims`: Array of claim records
    - `id`: Unique claim identifier, as defined in configuration
    - `type`: Data type expected for this claim (`string`, `number`, or `date`)
    - `standard`: `true` if this is an OpenID Connect standard claim, `false` for custom claims
    - `enabled`: Whether collection is enabled for this claim
    - `required`: Whether the end-user must provide this claim to complete an authorization flow
    - `identifier`: Whether this claim is configured as an [identifier claim](/documentation/technical/configuration#auth), used for password login and cross-provider account merging
    - `allowed_values`: Array of accepted values, or `null` if any value is accepted
    - `group`: Optional grouping identifier (e.g., `"profile"`, `"address"`), or `null`
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of claims

**Use Cases**:

- Admin dashboard displaying all configured claims and their settings
- Auditing which claims are enabled and required without accessing configuration files
- Reviewing allowed values for claims with restricted inputs

---

### User Management

Endpoints for managing end-user accounts. Different operations require different scopes: `admin:users:read` for
read operations, `admin:users:write` for modifications, and `admin:users:delete` for deletion.

#### Create User

**Path**: `/api/v1/admin/users`

**Method**: POST

**Authentication**: Bearer token with `admin:users:write` scope

**Purpose**: Creates a new user account. Useful for bulk provisioning and user migrations.

**Request Format**:

```json
{
  "claims": {
    "email": "user@example.com",
    "name": "Jane Doe",
    "given_name": "Jane",
    "family_name": "Doe"
  },
  "password": "initial-password"
}
```

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "claims": {
    "email": "user@example.com",
    "name": "Jane Doe",
    "given_name": "Jane",
    "family_name": "Doe"
  },
  "status": "enabled",
  "created_at": "2026-03-06T10:00:00Z"
}
```

**Properties**:

- `user_id`: Unique identifier assigned to the new user
- `claims`: Object containing the user's claims
- `status`: Account status (`enabled`)
- `created_at`: ISO 8601 timestamp (UTC) when the account was created

**Use Cases**:

- Bulk user provisioning from an external system
- User migration from another identity provider
- Creating service accounts

---

#### List Users

**Path**: `/api/v1/admin/users`

**Method**: GET

**Authentication**: Bearer token with `admin:users:read` scope

**Purpose**: Retrieves a paginated list of users. Supports filtering by status, searching by claim values, selecting
which claims to include, and sorting.

**Query Parameters**:

- `page` (optional): Zero-indexed page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)
- `status` (optional): Filter by account status (`enabled`, `disabled`)
- `claims` (optional): Comma-separated claim IDs to include in the response (default: all enabled claims)
- `q` (optional): Partial, case-insensitive search across all enabled claim values
- `{claim_id}` (optional): Exact-match filter on a specific claim (e.g., `?email=jane@example.com`)
- `sort` (optional): Property to sort by: `created_at`, `status`, or any enabled claim ID
- `order` (optional): Sort direction — `asc` or `desc` (default: `asc`)

::: info Reserved parameter names
The names `page`, `size`, `status`, `claims`, `q`, `sort`, and `order` are reserved and cannot be used as claim IDs for
filtering.
:::

**Response Format**:

```json
{
  "users": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "claims": {
        "email": "jane@example.com",
        "name": "Jane Doe"
      },
      "status": "enabled",
      "created_at": "2026-01-15T14:30:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 42
}
```

**Properties**:

- `users`: Array of user records
    - `user_id`: Unique identifier of the user
    - `claims`: Object containing the user's claim values. By default includes all enabled claims; use the `claims`query
      parameter to select specific claims.
    - `status`: Account status (`enabled` or `disabled`)
    - `created_at`: ISO 8601 timestamp (UTC) when the account was created
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of users matching the query

**Errors**:

Returns **400 Bad Request** with error code `invalid_claim` when:

- `claims` contains a disabled or unknown claim ID
- `sort` references a disabled or unknown claim ID
- A claim filter query parameter references a disabled or unknown claim ID

```json
{
  "error": "invalid_claim",
  "error_description": "Unknown or disabled claim: department"
}
```

**Use Cases**:

- Display user lists with profile details in an admin dashboard
- Search for users by name or email
- Sort users by a specific claim value (e.g., alphabetically by name)
- Filter users by a specific claim value (e.g., all users in a department)

---

#### Get User

**Path**: `/api/v1/admin/users/{user_id}`

**Method**: GET

**Authentication**: Bearer token with `admin:users:read` scope

**Purpose**: Retrieves detailed information about a specific user, including their claims and account status.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "claims": {
    "email": "user@example.com",
    "email_verified": true,
    "name": "Jane Doe",
    "given_name": "Jane",
    "family_name": "Doe"
  },
  "status": "enabled",
  "created_at": "2026-01-15T14:30:00Z"
}
```

**Properties**:

- `user_id`: Unique identifier of the user
- `claims`: Object containing the user's claims (standard and custom)
- `status`: Account status (`enabled` or `disabled`)
- `created_at`: ISO 8601 timestamp (UTC) when the account was created

**Use Cases**:

- View user details in an admin dashboard
- Investigate user account issues
- Verify user claim data

---

#### Update User

**Path**: `/api/v1/admin/users/{user_id}`

**Method**: PATCH

**Authentication**: Bearer token with `admin:users:write` scope

**Purpose**: Updates claims for a specific user. Only the provided claims are modified; omitted claims remain unchanged.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Request Format**:

```json
{
  "claims": {
    "name": "Jane Smith",
    "family_name": "Smith",
    "custom_department": "Engineering"
  }
}
```

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "claims": {
    "email": "user@example.com",
    "email_verified": true,
    "name": "Jane Smith",
    "given_name": "Jane",
    "family_name": "Smith",
    "custom_department": "Engineering"
  },
  "status": "enabled",
  "created_at": "2026-01-15T14:30:00Z"
}
```

**Properties**:

- `user_id`: Unique identifier of the user
- `claims`: Object containing all of the user's claims after the update
- `status`: Account status
- `created_at`: ISO 8601 timestamp (UTC) when the account was created

**Use Cases**:

- Update user attributes from an external HR system
- Correct user profile information
- Manage custom claims for application-specific metadata

---

#### Disable User

**Path**: `/api/v1/admin/users/{user_id}/disable`

**Method**: POST

**Authentication**: Bearer token with `admin:users:write` scope

**Purpose**: Disables a user account. A disabled user cannot authenticate but their data is preserved.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "disabled"
}
```

**Use Cases**:

- Temporarily suspend a user account during a security investigation
- Offboard employees while retaining their data for audit purposes
- Comply with account suspension requests

---

#### Enable User

**Path**: `/api/v1/admin/users/{user_id}/enable`

**Method**: POST

**Authentication**: Bearer token with `admin:users:write` scope

**Purpose**: Re-enables a previously disabled user account.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enabled"
}
```

**Use Cases**:

- Restore access after a security investigation concludes
- Re-onboard a returning employee
- Resolve accidental account suspensions

---

#### Delete User

**Path**: `/api/v1/admin/users/{user_id}`

**Method**: DELETE

**Authentication**: Bearer token with `admin:users:delete` scope

**Purpose**: Permanently deletes a user account and all associated data. This operation is irreversible.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "deleted": true
}
```

**Important Notes**:

- This operation is **irreversible** — all user data, claims, sessions, and consents are permanently removed
- Requires the dedicated `admin:users:delete` scope, which is intentionally separated from `admin:users:write`
- Intended for GDPR right-to-erasure compliance

**Use Cases**:

- Fulfill GDPR deletion requests (right to erasure)
- Remove accounts during data cleanup operations
- Complete user offboarding with full data removal

---

#### Reset Password

**Path**: `/api/v1/admin/users/{user_id}/reset-password`

**Method**: POST

**Authentication**: Bearer token with `admin:users:write` scope

**Purpose**: Administratively resets the password for a user account.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Request Format**:

```json
{
  "new_password": "new-secure-password"
}
```

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "password_reset": true
}
```

**Use Cases**:

- Help users locked out of their accounts
- Enforce password changes during security incidents
- Set initial passwords during bulk user provisioning

---

#### Force Logout

**Path**: `/api/v1/admin/users/{user_id}/logout`

**Method**: POST

**Authentication**: Bearer token with `admin:sessions:write` scope

**Purpose**: Invalidates all active sessions for a specific user, forcing them to re-authenticate.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "sessions_revoked": 3
}
```

**Properties**:

- `user_id`: Unique identifier of the user
- `sessions_revoked`: Number of active sessions that were invalidated

**Use Cases**:

- Respond to a compromised account by terminating all sessions
- Enforce re-authentication after a password reset
- Remove access for a departing employee immediately

---

### Access Control

Endpoints for viewing and managing end-user consents. Requires the `admin:access:read` scope for read operations
and `admin:access:write` for modifications.

#### List User Consents

**Path**: `/api/v1/admin/users/{user_id}/consents`

**Method**: GET

**Authentication**: Bearer token with `admin:access:read` scope

**Purpose**: Retrieves all active consents granted by a specific user to client applications.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Query Parameters**:

- `page` (optional): Zero-indexed page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)

**Response Format**:

```json
{
  "consents": [
    {
      "client_id": "my-web-app",
      "scopes": [
        "openid",
        "profile",
        "email"
      ],
      "consented_at": "2026-01-15T14:30:00Z"
    },
    {
      "client_id": "mobile-app",
      "scopes": [
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

- `consents`: Array of active consent records
    - `client_id`: Identifier of the client application that received consent
    - `scopes`: List of scopes the user has consented usage to this client
    - `consented_at`: ISO 8601 timestamp (UTC) when consent was granted
- `page`: Current page number
- `size`: Current page size
- `total`: Total number of active consents for this user

**Use Cases**:

- Audit which applications a user has authorized
- Review consent history for compliance reporting
- Investigate user data access for privacy requests

---

#### Revoke User Consent

**Path**: `/api/v1/admin/users/{user_id}/consents/{client_id}`

**Method**: DELETE

**Authentication**: Bearer token with `admin:access:write` scope

**Purpose**: Revokes the active consent granted by a user to a specific client application. The client will no longer be
able to access the user's data until the user re-authorizes. Returns 404 if no active consent exists for the
user and client pair.

**Path Parameters**:

- `user_id`: Unique identifier of the user
- `client_id`: Identifier of the client application whose consent should be revoked

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "my-web-app",
  "revoked": true
}
```

**Revocation behavior**:

When a consent is revoked through this endpoint:

1. The consent is marked as revoked (`revoked_by = ADMIN`) with the administrator's identifier.
2. All refresh tokens for the user and client pair are immediately invalidated.
3. As a safety net, subsequent token refresh attempts also verify that a valid consent exists — so even if a refresh
   token was missed, it cannot be used.

The client's existing access tokens remain valid until they expire naturally (typically minutes), but no new tokens can
be obtained.

**Use Cases**:

- Revoke access for a decommissioned client application
- Respond to user requests to disconnect an application
- Enforce access policies during security incidents

---

### Monitoring & Audit

Endpoints for viewing active sessions and monitoring authentication activity. Requires the `admin:sessions:read`
scope for read operations and `admin:sessions:write` for modifications.

#### List Active Sessions

**Path**: `/api/v1/admin/sessions`

**Method**: GET

**Authentication**: Bearer token with `admin:sessions:read` scope

**Purpose**: Retrieves a list of all active sessions across all users.

**Query Parameters**:

- `page` (optional): Page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)
- `user_id` (optional): Filter sessions by user

**Response Format**:

```json
{
  "sessions": [
    {
      "session_id": "sess_abc123xyz",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "client_id": "my-web-app",
      "created_at": "2026-02-27T10:30:00Z",
      "last_accessed_at": "2026-03-06T14:45:00Z",
      "expires_at": "2026-03-13T10:30:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 156
}
```

**Properties**:

- `sessions`: Array of session records
    - `session_id`: Unique identifier for the session
    - `user_id`: Unique identifier of the user who owns the session
    - `client_id`: Identifier of the client application associated with the session
    - `created_at`: ISO 8601 timestamp (UTC) when the session was created
    - `last_accessed_at`: ISO 8601 timestamp (UTC) of the last activity
    - `expires_at`: ISO 8601 timestamp (UTC) when the session will expire
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of active sessions matching the query

**Use Cases**:

- Monitor active sessions across the authorization server
- Detect unusual session patterns or suspicious activity
- Audit user activity for compliance reporting

