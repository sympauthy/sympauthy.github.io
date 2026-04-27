# Admin API

The Admin API provides endpoints for administering the SympAuthy authorization server, including client management,
user administration, access control, and monitoring. This API is intended for operators and internal tooling, not for
end-user-facing applications.

All Admin API endpoints are under `/api/v1/admin/` and require authentication with appropriate admin scopes.

## Admin Environment

SympAuthy provides a dedicated `admin` [Micronaut environment](/technical/configuration/environments) that
pre-configures everything needed to use the Admin API:

- All admin scopes listed in the [Admin Scopes](#admin-scopes) table below
- A default `admin` client with all admin scopes in its `allowed-scopes`

To activate the admin environment, include `admin` in the `MICRONAUT_ENVIRONMENTS` variable:

```
MICRONAUT_ENVIRONMENTS=default,by-mail,admin
```

The default admin client is a [public client](/functional/client#confidential-and-public-clients) that
uses [PKCE](/technical/security#pkce-proof-key-for-code-exchange) instead of a client secret.
Everything is ready out of the box — no secret to configure.

> You can also configure admin access manually without using the `admin` environment. Add the desired admin scopes
> to any client's `allowed-scopes` in the [configuration](/technical/configuration/client) and mark it as a
> [public client](/functional/client#confidential-and-public-clients) to use PKCE. This is useful if
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
| `admin:consent:read`   | View consents                                           |
| `admin:consent:write`  | Revoke consents, force logout                           |

The `admin:users:delete` scope is intentionally separated from `admin:users:write` because user deletion is an
irreversible operation with GDPR implications and should require explicit authorization.

## Authentication

All Admin API endpoints require authentication using an OAuth 2.1 access token obtained via the Client Credentials
flow with [PKCE](/technical/security#pkce-proof-key-for-code-exchange). The default admin client is a
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
[Client Management](#client-management). Both OpenID Connect and custom claims are returned.
Requires the `admin:config:read` scope.

#### List Claims

**Path**: `/api/v1/admin/claims`

**Method**: GET

**Authentication**: Bearer token with `admin:config:read` scope

**Purpose**: Retrieves a paginated list of all configured claims (OpenID Connect and custom).

**Query Parameters**:

- `page` (optional): Zero-indexed page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)
- `enabled` (optional): Filter by enabled status (`true`, `false`)
- `required` (optional): Filter by required status (`true`, `false`)
- `origin` (optional): Filter by origin (`openid` for OpenID Connect claims, `custom` for operator-defined claims)

**Response Format**:

```json
{
  "claims": [
    {
      "id": "email",
      "type": "string",
      "origin": "openid",
      "enabled": true,
      "required": true,
      "identifier": true,
      "allowed_values": null,
      "group": null
    },
    {
      "id": "name",
      "type": "string",
      "origin": "openid",
      "enabled": true,
      "required": false,
      "identifier": false,
      "allowed_values": null,
      "group": "profile"
    },
    {
      "id": "custom_department",
      "type": "string",
      "origin": "custom",
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
    - `origin`: Where the claim is defined. Possible values: `"openid"` (OpenID Connect specification) | `"custom"` (defined by the operator in configuration)
    - `enabled`: Whether collection is enabled for this claim
    - `required`: Whether the end-user must provide this claim to complete an authorization flow
    - `identifier`: Whether this claim is configured as an [identifier claim](/technical/configuration/authorization#auth), used for password login and cross-provider account merging
    - `allowed_values`: Array of accepted values, or `null` if any value is accepted (no restriction)
    - `group`: Grouping identifier (e.g., `"profile"`, `"address"`), or `null` if the claim belongs to no group
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of claims

**Use Cases**:

- Admin dashboard displaying all configured claims and their settings
- Auditing which claims are enabled and required without accessing configuration files
- Reviewing allowed values for claims with restricted inputs

---

### Scope Management

Endpoints for viewing configured scopes. Since scopes are defined in configuration files or by SympAuthy itself
(not in a database), these endpoints expose them as read-only resources — following the same pattern as
[Client Management](#client-management) and [Claim Management](#claim-management). All three scope types
(consentable, grantable, client) are returned. Requires the `admin:config:read` scope.

#### List Scopes

**Path**: `/api/v1/admin/scopes`

**Method**: GET

**Authentication**: Bearer token with `admin:config:read` scope

**Purpose**: Retrieves a paginated list of all configured scopes (OpenID Connect and custom, across all three types).

**Query Parameters**:

- `page` (optional): Zero-indexed page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)
- `type` (optional): Filter by scope type (`consentable`, `grantable`, `client`)
- `enabled` (optional): Filter by enabled status (`true`, `false`)

**Response Format**:

```json
{
  "scopes": [
    {
      "id": "openid",
      "type": "grantable",
      "origin": "openid",
      "enabled": true
    },
    {
      "id": "profile",
      "type": "consentable",
      "origin": "openid",
      "enabled": true,
      "claims": [
        "name",
        "family_name",
        "given_name",
        "middle_name",
        "nickname",
        "preferred_username",
        "picture",
        "website",
        "gender",
        "birthdate",
        "zoneinfo",
        "locale",
        "updated_at"
      ]
    },
    {
      "id": "admin:users:read",
      "type": "grantable",
      "origin": "system",
      "enabled": true
    },
    {
      "id": "users:read",
      "type": "client",
      "origin": "system",
      "enabled": true
    }
  ],
  "page": 0,
  "size": 20,
  "total": 4
}
```

**Properties**:

- `scopes`: Array of scope records
    - `id`: Unique scope identifier
    - `type`: Scope type. Possible values: `"consentable"` | `"grantable"` | `"client"`.
      See [Scope](/functional/scope) for the meaning of each type
    - `origin`: Where the scope is defined. Possible values:
      `"oauth2"` (OAuth 2 specification) | `"openid"` (OpenID Connect specification) |
      `"system"` (defined by SympAuthy) | `"custom"` (defined by the operator in configuration)
    - `enabled`: Whether the scope is enabled
    - `claims` (consentable scopes only): Array of [claim](/functional/claims) identifiers
      protected by this scope. Omitted for grantable and client scopes
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of scopes

**Use Cases**:

- Admin dashboard displaying all available scopes and their types
- Auditing which scopes are enabled and how they are categorized
- Reviewing which claims are protected by each consentable scope
- Filtering scopes by type to inspect admin, client, or user-facing permissions separately

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

**Purpose**: Retrieves the account status, metadata, and identifier claim values for a specific user.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enabled",
  "created_at": "2026-01-15T14:30:00Z",
  "identifier_claims": {
    "email": "jane@example.com"
  }
}
```

**Properties**:

- `user_id`: Unique identifier of the user
- `status`: Account status (`enabled` or `disabled`)
- `created_at`: ISO 8601 timestamp (UTC) when the account was created
- `identifier_claims`: Object containing the user's identifier claim values as key/value pairs. Only claims configured as identifiers are included.

**Use Cases**:

- Check a user's account status in an admin dashboard
- Verify whether a user account exists and is active
- Display a user summary with their identifying information (e.g., email) without loading full claim data

---

#### List User Claims

**Path**: `/api/v1/admin/users/{user_id}/claims`

**Method**: GET

**Authentication**: Bearer token with `admin:users:read` scope

**Purpose**: Retrieves a paginated list of claim values for a specific user, with claim definition metadata. Only claims
enabled in the configuration are returned. OpenID `*_verified` claims (e.g., `email_verified`, `phone_number_verified`)
are excluded — their status is represented by the `verified_at` field on the parent claim.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Query Parameters**:

- `page` (optional): Zero-indexed page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)
- `claim_id` (optional): Filter by specific claim ID (e.g., `?claim_id=email`)
- `identifier` (optional): Filter by identifier status (`true`, `false`)
- `required` (optional): Filter by required status (`true`, `false`)
- `collected` (optional): Filter by whether a value has been collected (`true`, `false`)
- `verified` (optional): Filter by whether the claim has been verified (`true`, `false`)
- `origin` (optional): Filter by origin (`openid` for OpenID Connect claims, `custom` for operator-defined claims)

**Response Format**:

```json
{
  "claims": [
    {
      "claim_id": "email",
      "value": "jane@example.com",
      "type": "string",
      "origin": "openid",
      "required": true,
      "identifier": true,
      "group": null,
      "collected_at": "2026-01-15T14:30:00Z",
      "verified_at": "2026-01-15T14:35:00Z"
    },
    {
      "claim_id": "name",
      "value": "Jane Doe",
      "type": "string",
      "origin": "openid",
      "required": false,
      "identifier": false,
      "group": "profile",
      "collected_at": "2026-01-15T14:30:00Z",
      "verified_at": null
    },
    {
      "claim_id": "custom_department",
      "value": null,
      "type": "string",
      "origin": "custom",
      "required": false,
      "identifier": false,
      "group": null,
      "collected_at": null,
      "verified_at": null
    }
  ],
  "page": 0,
  "size": 20,
  "total": 3
}
```

**Properties**:

- `claims`: Array of claim records
    - `claim_id`: Unique claim identifier, as defined in configuration
    - `value`: The user's value for this claim, or `null` if not yet provided
    - `type`: Data type (`string`, `number`, or `date`)
    - `origin`: Where the claim is defined. Possible values: `"openid"` (OpenID Connect specification) | `"custom"` (defined by the operator in configuration)
    - `required`: Whether the end-user must provide this claim
    - `identifier`: Whether this claim is configured as an identifier claim
    - `group`: Optional grouping identifier (e.g., `"profile"`, `"address"`), or `null`
    - `collected_at`: ISO 8601 timestamp (UTC) when the value was collected, or `null`
    - `verified_at`: ISO 8601 timestamp (UTC) when the value was verified, or `null`
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of claims matching the filters

**Use Cases**:

- View a user's profile data in an admin dashboard
- Audit which required claims are missing (`?collected=false&required=true`)
- Check which claims have been verified (`?verified=true`)
- Find unverified identifier claims (`?identifier=true&verified=false`)
- List only custom claims (`?origin=custom`)

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

**Authentication**: Bearer token with `admin:consent:write` scope

**Purpose**: Revokes all tokens for a specific user, forcing them to re-authenticate.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "tokens_revoked": 3
}
```

**Properties**:

- `user_id`: Unique identifier of the user
- `tokens_revoked`: Number of active tokens that were revoked

**Use Cases**:

- Respond to a compromised account by terminating all sessions
- Enforce re-authentication after a password reset
- Remove access for a departing employee immediately

---

#### Force Client Logout

**Path**: `/api/v1/admin/users/{user_id}/logout/{client_id}`

**Method**: POST

**Authentication**: Bearer token with `admin:consent:write` scope

**Purpose**: Revokes all tokens for a specific user on a specific client application, forcing them to re-authenticate on
that client only.

**Path Parameters**:

- `user_id`: Unique identifier of the user
- `client_id`: Unique identifier of the client application

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "my-client-app",
  "tokens_revoked": 2
}
```

**Properties**:

- `user_id`: Unique identifier of the user
- `client_id`: Identifier of the client application whose tokens were revoked
- `tokens_revoked`: Number of active tokens that were revoked for the specified client

**Use Cases**:

- Revoke access for a user on a specific application without affecting their other sessions
- Respond to a client-specific security incident
- Remove access to a particular service for a departing team member

---

### Provider Links

Endpoints for viewing and managing the links between end-user accounts and external identity providers. Requires
`admin:users:read` for read operations and `admin:users:write` for modifications.

#### List User Provider Links

**Path**: `/api/v1/admin/users/{user_id}/providers`

**Method**: GET

**Authentication**: Bearer token with `admin:users:read` scope

**Purpose**: Retrieves a paginated list of all external identity providers linked to a specific user account.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Query Parameters**:

- `page` (optional): Zero-indexed page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)

**Response Format**:

`200 OK`:

```json
{
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
  "page": 0,
  "size": 20,
  "total": 2
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

- `providers`: Array of provider link records
    - `provider_id`: Identifier of the external provider, as defined in configuration
    - `subject`: The user's unique identifier at the provider
    - `linked_at`: ISO 8601 timestamp (UTC) when the provider was linked to this account
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of linked providers

**Use Cases**:

- View which external providers a user has linked in an admin dashboard
- Investigate authentication issues related to a specific provider
- Audit provider links for security reviews

---

#### Unlink Provider

**Path**: `/api/v1/admin/users/{user_id}/providers/{provider_id}`

**Method**: DELETE

**Authentication**: Bearer token with `admin:users:write` scope

**Purpose**: Removes the link between a user account and an external identity provider. The user will no longer be
able to authenticate through this provider until they re-link it via the authentication flow. Returns 404 if no
link exists for the user and provider pair.

**Path Parameters**:

- `user_id`: Unique identifier of the user
- `provider_id`: Identifier of the provider to unlink

**Response Format**:

`200 OK`:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "provider_id": "discord",
  "unlinked": true
}
```

`404 Not Found`:

```json
{
  "error": "not_found",
  "error_description": "No provider link found for user 550e8400-e29b-41d4-a716-446655440000 and provider: discord"
}
```

**Properties**:

- `user_id`: Unique identifier of the user
- `provider_id`: Identifier of the provider that was unlinked
- `unlinked`: Confirmation that the provider was unlinked

**Use Cases**:

- Disconnect a compromised provider account from a user
- Clean up provider links during account maintenance
- Respond to user requests to remove a linked provider

---

### Access Control

Endpoints for viewing and managing end-user consents. Requires the `admin:consent:read` scope for read operations
and `admin:consent:write` for modifications.

#### List User Consents

**Path**: `/api/v1/admin/users/{user_id}/consents`

**Method**: GET

**Authentication**: Bearer token with `admin:consent:read` scope

**Purpose**: Retrieves all active consents granted by a specific user, grouped by [audience](/functional/audience).

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
      "audience_id": "my-app",
      "prompted_by_client_id": "my-web-app",
      "scopes": [
        "profile",
        "email"
      ],
      "consented_at": "2026-01-15T14:30:00Z"
    },
    {
      "audience_id": "backoffice",
      "prompted_by_client_id": "backoffice-app",
      "scopes": [
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
    - `audience_id`: Identifier of the [audience](/functional/audience) that received consent
    - `prompted_by_client_id`: Identifier of the client that originally prompted consent (kept for audit)
    - `scopes`: List of scopes the user has consented to for this audience
    - `consented_at`: ISO 8601 timestamp (UTC) when consent was granted
- `page`: Current page number
- `size`: Current page size
- `total`: Total number of active consents for this user

**Use Cases**:

- Audit which audiences a user has authorized
- Review consent history for compliance reporting
- Investigate user data access for privacy requests

---

#### Revoke User Consent

**Path**: `/api/v1/admin/users/{user_id}/consents/{audience_id}`

**Method**: DELETE

**Authentication**: Bearer token with `admin:consent:write` scope

**Purpose**: Revokes the active consent granted by a user to a specific [audience](/functional/audience). All clients
in the audience will no longer be able to access the user's data until the user re-authorizes. Returns 404 if no
active consent exists for the user and audience pair.

**Path Parameters**:

- `user_id`: Unique identifier of the user
- `audience_id`: Identifier of the audience whose consent should be revoked

**Response Format**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "audience_id": "my-app",
  "revoked": true
}
```

**Revocation behavior**:

When a consent is revoked through this endpoint:

1. The consent is marked as revoked (`revoked_by = ADMIN`) with the administrator's identifier.
2. All refresh tokens for the user across all clients in the audience are immediately invalidated.
3. As a safety net, subsequent token refresh attempts also verify that a valid consent exists — so even if a refresh
   token was missed, it cannot be used.

Existing access tokens for clients in the audience remain valid until they expire naturally (typically minutes), but no
new tokens can be obtained.

**Use Cases**:

- Revoke access for a decommissioned audience
- Respond to user requests to disconnect an application
- Enforce access policies during security incidents


