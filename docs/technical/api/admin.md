# Admin API

The Admin API provides endpoints for administering the SympAuthy authorization server, including client management,
user administration, access control, and monitoring. This API is intended for operators and internal tooling, not for
end-user-facing applications.

All Admin API endpoints are under `/api/v1/admin/` and require authentication with appropriate admin scopes.

## Admin Environment

SympAuthy provides a dedicated `admin` [Micronaut environment](/technical/configuration/environments) that
pre-configures everything needed to use the Admin API:

- An `admin` [audience](/functional/audience) that admin scopes are bound to
- All admin scopes listed in the [Admin Scopes](#admin-scopes) table below, restricted to the `admin` audience
- A default `admin` client in the `admin` audience with all admin scopes in its `allowed-scopes`

To activate the admin environment, include `admin` in the `MICRONAUT_ENVIRONMENTS` variable:

```
MICRONAUT_ENVIRONMENTS=default,by-mail,admin
```

The default admin client is a [public client](/functional/client#confidential-and-public-clients) that
uses [PKCE](/technical/security#pkce-proof-key-for-code-exchange) instead of a client secret.
Everything is ready out of the box — no secret to configure.

> You can also configure admin access manually without using the `admin` environment. Set
> [`admin.audience`](/technical/configuration/admin) to an existing audience, add the desired admin scopes
> to a client's `allowed-scopes` in the [configuration](/technical/configuration/client), and ensure the client
> belongs to the same audience. Mark the client as a
> [public client](/functional/client#confidential-and-public-clients) to use PKCE. This is useful if
> you need multiple admin clients with different permission levels.

## Admin Scopes

Admin scopes follow the naming convention `admin:{domain}:{action}`, providing fine-grained control so operators can
grant only the minimum necessary privileges.

| Scope                       | Description                                                                |
|-----------------------------|----------------------------------------------------------------------------|
| `admin:config:read`         | List and view configuration resources (audiences, clients, claims, scopes) |
| `admin:consent:read`        | View consents                                                              |
| `admin:consent:write`       | Revoke consents, force logout                                              |
| `admin:interactive-flow-sessions:read` | Read the [interactive flow](/functional/interactive_flow) sessions currently in flight, and the places each one was driven from |
| `admin:invitations:read`    | List and view [invitations](/functional/invitation)                        |
| `admin:invitations:write`   | Create and revoke [invitations](/functional/invitation)                    |
| `admin:users:read`          | List and view users and their MFA methods                                  |
| `admin:users:write`         | Create, update, disable, enable users; revoke MFA methods, start MFA enrollment, and start a provider link |
| `admin:users:delete`        | Delete users (separated for GDPR sensitivity)                              |

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

- If the token is missing or invalid: **401 Unauthorized** (`unauthorized`)
- If the token is valid but lacks the required scope: **403 Forbidden** (`forbidden`)

The required scope for each endpoint is documented in the [Endpoints](#endpoints) section below.

### Error format

When a request fails, the API responds with a JSON error object containing the HTTP `status`, a stable
machine-readable `error_code`, a user-facing `description`, and — only when the `print-details-in-error` feature is
enabled on the server — a technical `details` message. Each failure case in this page is listed by its `error_code`
and `description`.

The following errors may be returned by any endpoint:

| Error code     | Description                                                                    |
|----------------|--------------------------------------------------------------------------------|
| `unauthorized` | The access to this resource is protected. Please authenticate before retrying. |
| `forbidden`    | The access token does not include the required scope to access this resource.  |

Endpoints returning a collection may return additional errors. See [Collections](#collections).

### Date and time format

Every date and time this API publishes is ISO-8601 with no zone, because the server runs in UTC and every timestamp it
holds is UTC — `2026-01-15T14:30:00`, never `2026-01-15T14:30:00Z`. A field holding no value is absent from the
response rather than published as `null`.

## Collections

**Every endpoint of the Admin API that returns a collection follows the
[collection grammar](/technical/api/collections)**: `page` and `size` to read a page, `sort` to order it, `q` to search
it, and `{field}` or `{field}.{operator}` to filter it. That page holds the operators, the paging bounds, the
[error codes](/technical/api/collections#errors) and the format of the capability document.

Each listing publishes what it accepts at `capabilities` under its own path — for instance
`/api/v1/admin/users/capabilities` — gated by the same scope as the listing, and built from this deployment's own
configuration. The fields each listing offers are named with it below.

## Endpoints

> **Work in progress** — [Client Management](#client-management), [Claim Management](#claim-management),
> [Scope Management](#scope-management), [Audience Management](#audience-management), and
> [Interactive Flow Session Management](#interactive-flow-session-management) endpoints are implemented.
> The remaining endpoints below are planned but not yet implemented. The paths and response formats shown are
> preliminary and may change. See [GitHub issue #109](https://github.com/sympauthy/sympauthy/issues/109) for progress.

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

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `audience_id` | `enum` — the audiences this deployment configures | Yes | — |
| `id` | `string` | — | Yes |
| `public` | `boolean` | Yes | — |


**Default order**: by client identifier, ascending.

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

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

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

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `audience_id` | `enum` — the audiences this deployment configures | Yes | — |
| `data_type` | `enum` — `boolean`, `date`, `email`, `number`, `phone_number`, `string`, `timezone` | Yes | — |
| `enabled` | `boolean` | Yes | — |
| `generated` | `boolean` | Yes | — |
| `group` | `enum` — `identity`, `address` | Yes | — |
| `id` | `string` | — | Yes |
| `origin` | `enum` — `openid`, `custom` | Yes | — |
| `required` | `boolean` | Yes | — |


`audience_id` and `group` may be absent from a claim, so both also admit `is_null`.

**Default order**: `-enabled` — enabled claims first.

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
      "identifier": true
    },
    {
      "id": "name",
      "type": "string",
      "origin": "openid",
      "enabled": true,
      "required": false,
      "identifier": false,
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
      ]
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
    - `allowed_values`: Array of accepted values. Absent when the claim accepts any value
    - `group`: Grouping identifier (e.g., `"profile"`, `"address"`). Absent when the claim belongs to no group
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

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `audience_id` | `enum` — the audiences this deployment configures | Yes | — |
| `enabled` | `boolean` | Yes | — |
| `scope` | `string` | — | Yes |
| `type` | `enum` — `consentable`, `grantable`, `client` | Yes | — |


`audience_id` may be absent from a scope, so it also admits `is_null`.

**Default order**: by scope, ascending.

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

### Audience Management

Endpoints for viewing configured [audiences](/functional/audience). Since audiences are defined in configuration files
(not in a database), these endpoints expose them as read-only resources — following the same pattern as
[Client Management](#client-management), [Claim Management](#claim-management), and
[Scope Management](#scope-management). Requires the `admin:config:read` scope.

#### List Audiences

**Path**: `/api/v1/admin/audiences`

**Method**: GET

**Authentication**: Bearer token with `admin:config:read` scope

**Purpose**: Retrieves a paginated list of all configured audiences.

**Query Parameters**:

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `client_count` | `number` — how many clients belong to the audience | Yes | — |
| `id` | `string` | — | Yes |
| `invitation_enabled` | `boolean` | Yes | — |
| `sign_up_enabled` | `boolean` | Yes | — |
| `token_audience` | `string` | Yes | — |


**Default order**: by audience identifier, ascending.

**Response Format**:

```json
{
  "audiences": [
    {
      "audience_id": "my-app",
      "token_audience": "my-app"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 1
}
```

**Properties**:

- `audiences`: Array of audience records
    - `audience_id`: Unique identifier of the audience, as defined in the [configuration](/technical/configuration/audience)
    - `token_audience`: Value used as the [`aud`](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3) claim in access and refresh tokens issued for clients belonging to this audience. Defaults to the audience identifier when not explicitly configured
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of audiences

**Use Cases**:

- Admin dashboard listing all configured audiences and their token audience values
- Verifying which `aud` claim value will appear in tokens for a given audience
- Auditing audience configurations without accessing configuration files directly

---

#### Get Audience Details

**Path**: `/api/v1/admin/audiences/{audienceId}`

**Method**: GET

**Authentication**: Bearer token with `admin:config:read` scope

**Purpose**: Retrieves details for a specific audience.

**Path Parameters**:

- `audienceId`: Unique identifier of the audience

**Response Format**:

`200 OK`:

```json
{
  "audience_id": "my-app",
  "token_audience": "my-app"
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

**Properties**:

- `audience_id`: Unique identifier of the audience, as defined in the [configuration](/technical/configuration/audience)
- `token_audience`: Value used as the [`aud`](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3) claim in access and refresh tokens issued for clients belonging to this audience. Defaults to the audience identifier when not explicitly configured

**Use Cases**:

- Verify the token audience value for a specific audience in an admin dashboard
- Confirm an audience exists and inspect its configuration
- Look up the `aud` claim value that will appear in tokens issued for a specific audience

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
  "created_at": "2026-03-06T10:00:00"
}
```

**Properties**:

- `user_id`: Unique identifier assigned to the new user
- `claims`: Object containing the user's claims
- `status`: Account status (`enabled`)
- `created_at`: When the account was created

**Use Cases**:

- Bulk user provisioning from an external system
- User migration from another identity provider
- Creating service accounts

---

#### List Users

**Path**: `/api/v1/admin/users`

**Method**: GET

**Authentication**: Bearer token with `admin:users:read` scope

**Purpose**: Retrieves a paginated list of users. Filters on the account's own fields and on any claim this
deployment collects, searches across claim values, orders on any of them, and selects which claims to include in the
response.

**Query Parameters**:

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)
- `claims` (optional): Comma-separated claim IDs to include in the response (default: all enabled claims). This
  selects what is published rather than what is kept, so it is not a filter criterion.

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `created_at` | `date_time` | Yes | — |
| `id` | `uuid` | — | — |
| `status` | `enum` — `enabled`, `disabled` | Yes | — |

In addition, **every enabled claim this deployment collects is a field of its own**, filterable, sortable and
searchable. A claim field takes the type of the claim's data type — so a `date` claim admits the ordered
operators and an `email` claim the text ones — enumerates the claim's allowed values where the configuration
restricts them, and admits `is_null` for users who have no value for it.

```
GET /api/v1/admin/users?status=enabled&email.contains=ana&created_at.gte=2026-01-01T00:00:00
```

Generated claims are not offered as fields, and neither is a claim whose identifier would collide with one of
`id`, `status`, `created_at`, `page`, `size`, `sort`, `q` or `claims`. Call
`/api/v1/admin/users/capabilities` to discover the fields this deployment actually offers.

**Default order**: `created_at`, ascending.

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
      "created_at": "2026-01-15T14:30:00"
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
    - `created_at`: When the account was created
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of users matching the query

**Errors**:

Returns **400 Bad Request** with error code `user.search.invalid_claim` when:

- `claims` contains a disabled or unknown claim ID
- `sort` references a disabled or unknown claim ID
- A claim filter query parameter references a disabled or unknown claim ID

| Error code | Description |
|------------|-------------|
| `user.search.invalid_claim` | The claim `{claim}` is not recognized or is currently disabled. Please check the available claims and try again. |

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
  "created_at": "2026-01-15T14:30:00",
  "identifier_claims": {
    "email": "jane@example.com"
  }
}
```

**Properties**:

- `user_id`: Unique identifier of the user
- `status`: Account status (`enabled` or `disabled`)
- `created_at`: When the account was created
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

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `claim_id` | `enum` — the claims this deployment configures | — | Yes |
| `collected` | `boolean` — whether a value has been collected | Yes | — |
| `data_type` | `enum` — `boolean`, `date`, `email`, `number`, `phone_number`, `string`, `timezone` | Yes | — |
| `generated` | `boolean` | Yes | — |
| `identifier` | `boolean` | Yes | — |
| `origin` | `enum` — `openid`, `custom` | Yes | — |
| `required` | `boolean` | Yes | — |
| `value` | `string` — the collected value | — | Yes |
| `verified` | `boolean` — whether the claim has been verified | Yes | — |

`value` is absent for a claim that has not been collected, so it also admits `is_null`.

**Default order**: by claim identifier, ascending.

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
      "collected_at": "2026-01-15T14:30:00",
      "verified_at": "2026-01-15T14:35:00"
    },
    {
      "claim_id": "name",
      "value": "Jane Doe",
      "type": "string",
      "origin": "openid",
      "required": false,
      "identifier": false,
      "group": "profile",
      "collected_at": "2026-01-15T14:30:00"
    },
    {
      "claim_id": "custom_department",
      "type": "string",
      "origin": "custom",
      "required": false,
      "identifier": false
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
    - `value`: The user's value for this claim. Absent when it has not been collected
    - `type`: Data type (`string`, `number`, or `date`)
    - `origin`: Where the claim is defined. Possible values: `"openid"` (OpenID Connect specification) | `"custom"` (defined by the operator in configuration)
    - `required`: Whether the end-user must provide this claim
    - `identifier`: Whether this claim is configured as an identifier claim
    - `group`: Grouping identifier (e.g., `"profile"`, `"address"`). Absent when the claim belongs to no group
    - `collected_at`: When the value was collected. Absent when no value has been collected
    - `verified_at`: When the value was verified. Absent when the claim has not been verified
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
  "created_at": "2026-01-15T14:30:00"
}
```

**Properties**:

- `user_id`: Unique identifier of the user
- `claims`: Object containing all of the user's claims after the update
- `status`: Account status
- `created_at`: When the account was created

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

`204 No Content` — a successful deletion returns no body.

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

### MFA Management

Endpoints for viewing and managing a user's registered
[multi-factor authentication](/functional/authentication#multi-factor-authentication-mfa) methods, and for starting an
admin-initiated MFA enrollment on a user's behalf. Requires `admin:users:read` for read operations and
`admin:users:write` for modifications.

#### List MFA Methods

**Path**: `/api/v1/admin/users/{user_id}/mfa`

**Method**: GET

**Authentication**: Bearer token with `admin:users:read` scope

**Purpose**: Retrieves a paginated list of the MFA methods a user has registered.

**Path Parameters**:

- `user_id`: Unique identifier of the user

**Query Parameters**:

- `page`, `size`, `sort` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `confirmed_date` | `date_time` | Yes | — |
| `creation_date` | `date_time` | Yes | — |
| `id` | `uuid` | — | — |

This listing names no searchable field, so it accepts no `q`, and one sent to it is refused with
`collection.search.unsupported`.

**Default order**: `confirmed_date`, ascending.

**Response Format**:

`200 OK`:

```json
{
  "mfa_methods": [
    {
      "mfa_id": "6f2a1b7c-9d3e-4a5f-8b21-0c4d5e6f7a8b",
      "type": "totp",
      "registered_at": "2026-01-15T14:30:00"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 1
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

**Properties**:

- `mfa_methods`: Array of registered MFA method records
    - `mfa_id`: Unique identifier of the MFA registration
    - `type`: Type of MFA method. Possible values: `"totp"`
    - `registered_at`: When the MFA method was registered
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of MFA methods registered by the user

**Use Cases**:

- Display a user's registered second factors in an admin dashboard
- Verify whether a user has MFA configured before enforcing a policy
- Audit MFA coverage across accounts

---

#### Revoke MFA Method

**Path**: `/api/v1/admin/users/{user_id}/mfa/{mfa_id}`

**Method**: DELETE

**Authentication**: Bearer token with `admin:users:write` scope

**Purpose**: Revokes a specific MFA method registered by a user. The user can no longer use it as a second factor.
Returns 404 if no MFA registration matches the given identifier.

**Path Parameters**:

- `user_id`: Unique identifier of the user
- `mfa_id`: Unique identifier of the MFA registration to revoke

**Response Format**:

`204 No Content` — a successful revocation returns no body.

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

**Use Cases**:

- Remove a lost or compromised authenticator from a user's account
- Help a user locked out of their second factor recover access
- Clean up stale MFA registrations during account maintenance

---

#### Start MFA Enrollment

**Path**: `/api/v1/admin/users/{user_id}/mfa/enrollment`

**Method**: POST

**Authentication**: Bearer token with `admin:users:write` scope

**Purpose**: Starts a standalone MFA enrollment [interactive flow](/functional/interactive_flow) on a user's behalf and
returns a `redirect_url` to hand or send to that user. When the user completes enrollment, they are redirected to the
`return_uri`; if the administrator also supplies an optional `cancel_uri`, the user may instead abandon the enrollment
and be sent there. Because the enrollment is initiated by an administrator rather than the user, the flow is gated by a
confirmation the user must approve — shown as initiated by "an administrator."

This is the administrator counterpart to the client-driven
[Start MFA Enrollment](/technical/api/client#start-mfa-enrollment) endpoint. Unlike that endpoint, it requires no
end-user access token: the administrator names the **user** via the path and the **client** the user will be returned
into via `client_id` in the body.

**Path Parameters**:

- `user_id`: Unique identifier of the user to enroll

**Request Format**:

```json
{
  "client_id": "my-app",
  "return_uri": "https://app.example.com/account/security",
  "cancel_uri": "https://app.example.com/account/security"
}
```

**Properties**:

- `client_id`: Identifier of the client the end-user is returned into once enrollment completes. The `return_uri` and
  optional `cancel_uri` are validated against **this client's** [registered redirect URIs](/technical/configuration/client).
- `return_uri`: URI the end-user is redirected to once enrollment completes. It must match one of the named client's
  registered redirect URIs — validated with the same OAuth 2.1 redirect-URI rules as the authorization endpoint — to
  prevent open redirects.
- `cancel_uri` (optional): URI the end-user is redirected to if they cancel the enrollment via the flow's
  [Cancel Endpoint](/technical/api/flow#_7-cancel-endpoint). Like `return_uri`, it must match one of the named client's
  registered redirect URIs and is validated with the same rules. When omitted, the enrollment offers no way to cancel
  and the end-user must complete it.

**Response Format**:

`200 OK`:

```json
{
  "redirect_url": "https://auth.example.com/flow/mfa?state=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `admin.users.mfa.enrollment.mfa_disabled` | This authorization server is not configured to support multi-factor authentication, so an enrollment cannot be started. |
| `not_found` | The resource you are looking for is not available on this authorization server. |

- Returns **400 Bad Request** with `admin.users.mfa.enrollment.mfa_disabled` when no MFA method is enabled in the server
  configuration ([`mfa.totp.enabled`](/technical/configuration/authorization#mfa)). The check happens up front, before
  any enrollment session is created.
- Returns **400 Bad Request** when the `return_uri` or `cancel_uri` does not match the named client's registered
  redirect URIs.
- Returns **404 Not Found** (`not_found`) when no user **or** no client exists for the given identifiers.

**Properties**:

- `redirect_url`: URL to hand or send to the end-user so they can enroll their authenticator. The signed `state`
  identifying the enrollment [interactive flow](/technical/api/flow#state-management) session is already included as a
  query parameter.

Unlike the [client endpoint](/technical/api/client#start-mfa-enrollment), the response carries **only** `redirect_url`
— no standalone `state` field. The administrator does not drive the flow through the API; they simply deliver the link
to the user, so the `state` is needed only inside the URL.

**Use Cases**:

- Enroll a second factor for a user during onboarding or a support interaction
- Enforce MFA on privileged accounts by sending users a ready-to-use enrollment link
- Drive MFA enrollment from an admin dashboard without the user starting it themselves

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

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `change_date` | `date_time` | Yes | — |
| `fetch_date` | `date_time` | Yes | — |
| `link_date` | `date_time` | Yes | — |
| `provider_id` | `enum` — the providers this deployment configures | — | Yes |

**Default order**: `link_date`, ascending.

**Response Format**:

`200 OK`:

```json
{
  "providers": [
    {
      "provider_id": "discord",
      "subject": "123456789012345678",
      "linked_at": "2026-01-15T14:30:00"
    },
    {
      "provider_id": "google",
      "subject": "109876543210",
      "linked_at": "2026-02-01T10:00:00"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 2
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

**Properties**:

- `providers`: Array of provider link records
    - `provider_id`: Identifier of the external provider, as defined in configuration
    - `subject`: The user's unique identifier at the provider
    - `linked_at`: When the provider was linked to this account
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

`204 No Content` — a successful unlink returns no body.

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

**Use Cases**:

- Disconnect a compromised provider account from a user
- Clean up provider links during account maintenance
- Respond to user requests to remove a linked provider

---

#### Start Provider Link

**Path**: `/api/v1/admin/users/{user_id}/providers/{provider_id}/link`

**Method**: POST

**Authentication**: Bearer token with `admin:users:write` scope

**Purpose**: Starts a standalone provider-link [interactive flow](/functional/interactive_flow) on a user's behalf and
returns a `redirect_url` to hand or send to that user. In the flow the end-user is asked to **confirm** the action —
shown as initiated by "an administrator" — and to **re-authenticate**, then to authorize the target provider; the
resolved provider identity is attached to their existing account. When the link completes, they are redirected to the
`return_uri`; if the administrator also supplies an optional `cancel_uri`, the user may instead abandon the link and be
sent there.

This is the administrator counterpart to the client-driven
[Start Provider Link](/technical/api/client#provider-linking) endpoint. Unlike that endpoint, it requires no end-user
access token: the administrator names the **user** via the path and the **client** the user will be returned into via
`client_id` in the body.

**Why re-authentication is required**: linking a provider mints a **durable login credential** — anyone who can
subsequently sign in through that provider gains access to the account. The user must prove they own the account before
the link commits, so an administrator cannot attach a new sign-in method without the account holder's participation.
This step is not optional and cannot be skipped.

**Path Parameters**:

- `user_id`: Unique identifier of the user to link the provider to
- `provider_id`: Identifier of the [provider](/technical/configuration/provider) to link (e.g. `discord`, `google`). It
  must be a known, enabled provider.

**Request Format**:

```json
{
  "client_id": "my-app",
  "return_uri": "https://app.example.com/account/security",
  "cancel_uri": "https://app.example.com/account/security"
}
```

**Properties**:

- `client_id`: Identifier of the client the end-user is returned into once the link completes. The `return_uri` and
  optional `cancel_uri` are validated against **this client's** [registered redirect URIs](/technical/configuration/client).
- `return_uri`: URI the end-user is redirected to once the link completes. It must match one of the named client's
  registered redirect URIs — validated with the same OAuth 2.1 redirect-URI rules as the authorization endpoint — to
  prevent open redirects.
- `cancel_uri` (optional): URI the end-user is redirected to if they cancel the link via the flow's
  [Cancel Endpoint](/technical/api/flow#_7-cancel-endpoint). Like `return_uri`, it must match one of the named client's
  registered redirect URIs and is validated with the same rules. When omitted, the link offers no way to cancel and the
  end-user must complete it.

**Response Format**:

`200 OK`:

```json
{
  "redirect_url": "https://auth.example.com/flow/confirm?state=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `provider.missing` | The provider `{provider_id}` does not exist. |
| `provider.disabled` | The provider `{provider_id}` is disabled by configuration. |
| `not_found` | The resource you are looking for is not available on this authorization server. |

- Returns **400 Bad Request** with `provider.missing` or `provider.disabled` when the named provider is unknown or
  disabled. The check happens up front, before any link session is created.
- Returns **400 Bad Request** when the `return_uri` or `cancel_uri` does not match the named client's registered
  redirect URIs.
- Returns **404 Not Found** (`not_found`) when no user **or** no client exists for the given identifiers.

**Properties**:

- `redirect_url`: URL to hand or send to the end-user so they can link the provider. The signed `state` identifying the
  provider-link [interactive flow](/technical/api/flow#state-management) session is already included as a query
  parameter.

Unlike the [client endpoint](/technical/api/client#provider-linking), the response carries **only** `redirect_url` — no
standalone `state` field. The administrator does not drive the flow through the API; they simply deliver the link to the
user, so the `state` is needed only inside the URL.

**Important Notes**:

- The link is attached to the named user's existing account — it never creates a new account. If the target provider
  identity (its subject, or an identifier claim it carries) is **already linked to a different account**, the flow
  hard-fails and the link cannot be completed. Otherwise, if that identity is already linked to *this* account, the
  operation is idempotent.

**Use Cases**:

- Help a user connect a social or enterprise identity provider during onboarding or a support interaction
- Send a user a ready-to-use link to add a sign-in method to an account they created with a password
- Drive provider linking from an admin dashboard without the user starting it themselves

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

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `audience_id` | `enum` — the audiences this deployment configures | Yes | — |
| `consented_at` | `date_time` | Yes | — |
| `id` | `uuid` | — | — |
| `prompted_by_client_id` | `enum` — the clients this deployment configures | Yes | — |
| `scope` | `string` — the scopes the consent covers | — | Yes |

A consent covers several scopes, so `scope=openid` keeps a consent holding `openid` among others, and
`scope.ne=openid` keeps only the consents that do not hold it at all.

**Default order**: `consented_at`, ascending.

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
      "consented_at": "2026-01-15T14:30:00"
    },
    {
      "audience_id": "backoffice",
      "prompted_by_client_id": "backoffice-app",
      "scopes": [
        "email"
      ],
      "consented_at": "2026-02-20T09:15:30"
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
    - `consented_at`: When consent was granted
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

`204 No Content` — a successful revocation returns no body.

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

---

### Invitation Management

Endpoints for creating, viewing, and revoking [invitations](/functional/invitation). Invitations allow
invitation-only registration for [audiences](/functional/audience) where open sign-up is disabled.
Requires `admin:invitations:read` for read operations and `admin:invitations:write` for creation and revocation.

The admin API can see and manage all invitations regardless of who created them (admin or client).

#### Create Invitation

**Path**: `/api/v1/admin/invitations`

**Method**: POST

**Authentication**: Bearer token with `admin:invitations:write` scope

**Purpose**: Creates a single-use invitation for a specific audience. The invitation token is returned only in this
response — it cannot be retrieved later.

**Request Format**:

```json
{
  "audience_id": "default",
  "expires_at": "2026-04-15T00:00:00",
  "claims": {
    "custom_department": "Engineering",
    "role": "admin"
  },
  "note": "Onboarding Jane from the Engineering team"
}
```

**Properties**:

- `audience_id` (required): The [audience](/functional/audience) the invitation is bound to. When the invitation is
  redeemed, the requesting client must belong to this audience.
- `expires_at` (optional): Expiration date as an ISO 8601 date-time with no zone, in UTC. Defaults to
  `now + default-expiration`. Capped at `now + max-expiration`. See
  [advanced configuration](/technical/configuration/advanced#advanced-invitation) for these values.
- `claims` (optional): Custom [claim](/functional/claims) values to pre-set on the user's account upon
  registration. Only custom claims are accepted — OpenID Connect claims must come from the user. Unlike the
  [Client API](/technical/api/client#create-invitation), admin invitations skip the claim
  [ACL](/technical/configuration/claim#claims-id-acl) check — any enabled custom claim can be pre-assigned.
- `note` (optional): Admin-only note attached to the invitation.

**Response Format**:

`201 Created`:

```json
{
  "invitation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "token": "dGhpcyBpcyBhIHNlY3VyZSByYW5kb20gdG9rZW4",
  "audience_id": "default",
  "status": "pending",
  "claims": {
    "custom_department": "Engineering",
    "role": "admin"
  },
  "note": "Onboarding Jane from the Engineering team",
  "created_at": "2026-03-28T10:00:00",
  "expires_at": "2026-04-04T10:00:00"
}
```

**Properties**:

- `invitation_id`: Unique identifier of the invitation
- `token`: The invitation token. **Returned only at creation** — subsequent reads show `token_prefix` instead.
  The client application is responsible for building the authorize URL with the `invitation_token` parameter.
- `audience_id`: Audience identifier the invitation is bound to
- `status`: Invitation status (`pending`)
- `claims`: Pre-assigned custom claims. Absent when none were set
- `note`: Admin note. Absent when none was set
- `created_at`: When the invitation was created
- `expires_at`: When the invitation expires

**Use Cases**:

- Invite specific people to register for a closed-registration audience
- Pre-assign roles or department claims during onboarding
- Create time-limited invitations for contractors or temporary team members

---

#### List Invitations

**Path**: `/api/v1/admin/invitations`

**Method**: GET

**Authentication**: Bearer token with `admin:invitations:read` scope

**Purpose**: Retrieves a paginated list of all invitations across all audiences and creators.

**Query Parameters**:

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `audience_id` | `enum` — the audiences this deployment configures | Yes | — |
| `consumed_at` | `date_time` | Yes | — |
| `consumed_by_user_id` | `uuid` | — | — |
| `created_at` | `date_time` | Yes | — |
| `created_by` | `enum` — `admin`, `client`, `bootstrap` | Yes | — |
| `created_by_id` | `string` — the client that created the invitation, where a client did | — | — |
| `expires_at` | `date_time` | Yes | — |
| `id` | `uuid` | — | — |
| `note` | `string` | — | Yes |
| `revoked_at` | `date_time` | Yes | — |
| `status` | `enum` — `pending`, `consumed`, `revoked`, `expired` | Yes | — |
| `token_prefix` | `string` | — | Yes |

`consumed_at`, `consumed_by_user_id`, `created_by_id`, `note` and `revoked_at` may be absent, so each also
admits `is_null` — `revoked_at.is_null=false` lists the invitations that were revoked.

**Default order**: `created_at`, ascending.

**Response Format**:

```json
{
  "invitations": [
    {
      "invitation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "token_prefix": "dGhpcyBp",
      "audience_id": "default",
      "status": "pending",
      "claims": {
        "custom_department": "Engineering",
        "role": "admin"
      },
      "note": "Onboarding Jane from the Engineering team",
      "created_by": "admin",
      "created_at": "2026-03-28T10:00:00",
      "expires_at": "2026-04-04T10:00:00"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 1
}
```

**Properties**:

- `invitations`: Array of invitation records
    - `invitation_id`: Unique identifier of the invitation
    - `token_prefix`: First 8 characters of the token, for identification purposes. The full token is never
      returned after creation.
    - `audience_id`: Audience identifier
    - `status`: Invitation status. Possible values: `"pending"` | `"consumed"` | `"revoked"` | `"expired"`
    - `claims`: Pre-assigned custom claims
    - `note`: Admin note
    - `created_by`: Who created the invitation — `admin`, `client`, or `bootstrap`
    - `created_at`: When the invitation was created
    - `expires_at`: When the invitation expires
    - `user_id`, `consumed_at`, `revoked_at`: Present only once the invitation has been redeemed or revoked
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of invitations matching the filters

**Use Cases**:

- List all pending invitations in an admin dashboard
- Audit invitation usage across audiences
- Find expired or unused invitations for cleanup

---

#### Get Invitation

**Path**: `/api/v1/admin/invitations/{invitation_id}`

**Method**: GET

**Authentication**: Bearer token with `admin:invitations:read` scope

**Purpose**: Retrieves details for a specific invitation. When the invitation has been consumed, the response includes
the `user_id` and `consumed_at` fields.

**Path Parameters**:

- `invitation_id`: Unique identifier of the invitation

**Response Format**:

`200 OK` (pending invitation):

```json
{
  "invitation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "token_prefix": "dGhpcyBp",
  "audience_id": "default",
  "status": "pending",
  "claims": {
    "custom_department": "Engineering",
    "role": "admin"
  },
  "note": "Onboarding Jane from the Engineering team",
  "created_by": "admin",
  "created_at": "2026-03-28T10:00:00",
  "expires_at": "2026-04-04T10:00:00"
}
```

`200 OK` (used invitation):

```json
{
  "invitation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "token_prefix": "dGhpcyBp",
  "audience_id": "default",
  "status": "consumed",
  "claims": {
    "custom_department": "Engineering",
    "role": "admin"
  },
  "note": "Onboarding Jane from the Engineering team",
  "created_by": "admin",
  "created_at": "2026-03-28T10:00:00",
  "expires_at": "2026-04-04T10:00:00",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "consumed_at": "2026-03-29T09:15:00"
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

**Properties**:

- `invitation_id`: Unique identifier of the invitation
- `token_prefix`: First 8 characters of the token
- `audience_id`: Audience identifier
- `status`: Invitation status (`pending`, `consumed`, `revoked`, `expired`)
- `claims`: Pre-assigned custom claims
- `note`: Admin note
- `created_by`: Who created the invitation — `admin`, `client`, or `bootstrap`
- `created_at`: When the invitation was created
- `expires_at`: When the invitation expires
- `user_id`: Identifier of the user who redeemed the invitation (only present when `status` is `consumed`)
- `consumed_at`: When the invitation was redeemed (only present when `status` is `consumed`)
- `revoked_at`: When the invitation was revoked (only present when `status` is `revoked`)

`claims`, `note`, `user_id`, `consumed_at` and `revoked_at` are omitted from the response when they hold no value.

**Use Cases**:

- Check whether an invitation has been used and by whom
- Verify invitation details before sharing with the intended user
- Audit invitation lifecycle for compliance

---

#### Revoke Invitation

**Path**: `/api/v1/admin/invitations/{invitation_id}/revoke`

**Method**: POST

**Authentication**: Bearer token with `admin:invitations:write` scope

**Purpose**: Revokes a pending invitation. The invitation can no longer be redeemed. This operation is immediate
and permanent. The response is the full invitation, with `status` now `revoked` and `revoked_at` set.

**Path Parameters**:

- `invitation_id`: Unique identifier of the invitation

**Response Format**:

`200 OK`:

```json
{
  "invitation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "token_prefix": "dGhpcyBp",
  "audience_id": "default",
  "status": "revoked",
  "claims": {
    "custom_department": "Engineering",
    "role": "admin"
  },
  "note": "Onboarding Jane from the Engineering team",
  "created_by": "admin",
  "created_at": "2026-03-28T10:00:00",
  "expires_at": "2026-04-04T10:00:00",
  "revoked_at": "2026-03-30T11:05:00"
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

**Use Cases**:

- Revoke an invitation that was sent to the wrong person
- Cancel an invitation after an employee's offer is rescinded
- Clean up unused invitations as part of a security audit


### Interactive Flow Session Management

Endpoints for observing the [interactive flow](/functional/interactive_flow) sessions the server currently holds.
Requires the `admin:interactive-flow-sessions:read` scope.

::: warning This is not a history
Expired sessions are collected every fifteen minutes, so the window these endpoints see is the session lifetime plus
up to a quarter of an hour. An empty result means *nothing in flight*, not *nothing ever happened*, and a session an
operator read a moment ago may be gone by the time they open it.
:::

#### List Interactive Flow Sessions

**Path**: `/api/v1/admin/interactive-flow-sessions`

**Method**: GET

**Authentication**: Bearer token with `admin:interactive-flow-sessions:read` scope

**Purpose**: Retrieves a paginated list of the interactive flow sessions currently in flight, each with the purpose it
started for, the purpose it is stopped at, the account it identified, and the place it was last driven from.

**Query Parameters**:

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `client` | `enum` — the clients this deployment configures | Yes | Yes |
| `expiration_date` | `date_time` | Yes | — |
| `id` | `uuid` | — | — |
| `ip` | `string` — every address the session was driven from | — | Yes |
| `purpose` | `enum` — `confirm`, `oauth2_authorize`, `mfa_enrollment`, `mfa_challenge`, `reauthentication`, `link_provider` | Yes | — |
| `session_date` | `date_time` | Yes | — |
| `signed_up` | `boolean` — whether the account was created during this session | Yes | — |
| `status` | `enum` — `ongoing`, `completed`, `cancelled`, `failed`, `expired` | Yes | — |
| `user` | `uuid` — the account the session identified | — | — |
| `user_agent` | `string` — every user agent the session was driven with | — | Yes |

`client`, `ip`, `user`, and `user_agent` may be absent, so each also admits `is_null` —
`user.is_null=true` lists the sessions that have identified nobody yet.

`purpose` filters on the purpose that *started* the session — `initiating_purpose` in the response — and not on the
one it is stopped at. `ip` and `user_agent` each read every place the session was driven from, so `ip=203.0.113.42`
keeps a session driven from that address among others, and `ip.ne=203.0.113.42` keeps only the sessions never driven
from it, while the response publishes only the most recent of them.

Two filter names differ from the fields the response publishes them under: `client` filters on what the response calls
`client_id`, and `user` takes the identifier of the account the response publishes as a `user` object.

```
GET /api/v1/admin/interactive-flow-sessions?status=ongoing&purpose=oauth2_authorize&sort=-session_date
```

**Default order**: `session_date`, ascending — the oldest session in flight first.

**Response Format**:

`200 OK`:

```json
{
  "sessions": [
    {
      "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
      "status": "ongoing",
      "initiating_purpose": {
        "value": "oauth2_authorize",
        "display_name": "Signing in at a client's request"
      },
      "current_purpose": {
        "value": "mfa_challenge",
        "display_name": "Checking a second factor"
      },
      "client_id": "my-app",
      "signed_up": false,
      "user": {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "enabled",
        "created_at": "2026-01-15T14:30:00",
        "claims": {
          "email": "jane@example.com"
        }
      },
      "ip": "203.0.113.42",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "session_date": "2026-09-19T09:12:44",
      "expiration_date": "2026-09-19T09:27:44"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 7
}
```

| Field                | Type    | Description                                                                                                        |
|----------------------|---------|----------------------------------------------------------------------------------------------------------------------|
| `client_id`          | string  | The client the session was started for. Absent where an administrator started it, or where nothing named a client. It may name a client this deployment no longer declares. |
| `current_purpose`    | object  | The purpose the session is stopped at. Absent once every purpose has resolved, and for a session that completed, cancelled or failed. |
| `expiration_date`    | string  | When the session expires.                                                                                          |
| `id`                 | string  | Unique identifier of the session.                                                                                  |
| `initiating_purpose` | object  | The purpose that started the session and owns its terminal handoff.                                                |
| `ip`                 | string  | The address the session was last driven from. The places before this one are on the session's own listing.         |
| `session_date`       | string  | When the session started.                                                                                          |
| `signed_up`          | boolean | Whether the account was created during this session. This is what tells a sign-up in progress apart from a person who has not identified themselves at all. |
| `status`             | string  | `ongoing`, `completed`, `cancelled`, `failed` or `expired`.                                                        |
| `user`               | object  | The account the session identified. Absent where it identified nobody, and where the account is one this session is still signing up. |
| `user_agent`         | string  | The user agent observed alongside that address.                                                                    |

`ip` and `user_agent` are the place the session was **last** driven from, not the only place it holds, while `q`
matches any of them. A row whose address does not match what the operator searched for is therefore not a bug — the
match was on an earlier place. Every place a session holds is on
[List Session Security Contexts](#list-session-security-contexts).

A purpose — `initiating_purpose` and `current_purpose` alike — is an object carrying a `value` and a `display_name`.
The `value` is the contract: branch on it, and send it back as the `purpose` filter. The `display_name` is a label
written for a person and may be reworded in any release, so nothing may branch on it.

::: info `expired` never relabels a terminal session
`expired` means the session was still ongoing when its expiration passed — nobody finished it. A session that
completed, cancelled or failed first keeps the status it reached.
:::

**Errors**:

See [Collections](#collections) for the errors a bad page, filter, order or search returns.

**Use Cases**:

- Answer a user who says they clicked sign in and nothing happened, by finding the session they are stuck in
- Watch what is in flight for one client, or for one person, while a release is rolling out
- Find the sessions driven from an address or a user agent an incident named

#### Get Interactive Flow Session

**Path**: `/api/v1/admin/interactive-flow-sessions/{session_id}`

**Method**: GET

**Authentication**: Bearer token with `admin:interactive-flow-sessions:read` scope

**Purpose**: Retrieves one interactive flow session: every purpose it carries, where each one stands, and what the
handler that owns each purpose has to say about it.

**Path Parameters**:

- `session_id`: Unique identifier of the interactive flow session

**Response Format**:

`200 OK`:

```json
{
  "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "status": "ongoing",
  "initiating_purpose": {
    "value": "oauth2_authorize",
    "display_name": "Signing in at a client's request"
  },
  "client_id": "my-app",
  "flow_id": "default",
  "user": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "enabled",
    "created_at": "2026-01-15T14:30:00",
    "claims": {
      "email": "jane@example.com"
    }
  },
  "signed_up": false,
  "session_date": "2026-09-19T09:12:44",
  "expiration_date": "2026-09-19T09:27:44",
  "purposes": [
    {
      "purpose": {
        "value": "oauth2_authorize",
        "display_name": "Signing in at a client's request"
      },
      "status": "completed",
      "debug": [
        { "display_name": "Requested scopes", "value": "openid profile email" },
        { "display_name": "Invitation" },
        { "display_name": "State", "value": "present" },
        { "display_name": "Nonce", "value": "absent" },
        { "display_name": "Code challenge", "value": "present (S256)" }
      ]
    },
    {
      "purpose": {
        "value": "mfa_challenge",
        "display_name": "Checking a second factor"
      },
      "status": "current",
      "debug": [
        { "display_name": "MFA passed date" },
        { "display_name": "Methods available to challenge", "value": "totp" }
      ]
    }
  ]
}
```

| Field                  | Type    | Description                                                                                                      |
|------------------------|---------|--------------------------------------------------------------------------------------------------------------------|
| `error_description_id` | string  | Identifier of the message the end-user was shown. Absent unless the session failed.                              |
| `error_details_id`     | string  | Identifier of the message detailing, technically, what the session failed with. Absent unless the session failed. |
| `error_values`         | object  | Values interpolated into the two messages. Absent unless the session failed.                                     |
| `flow_id`              | string  | Identifier of the interactive flow the person is going through.                                                  |
| `purposes`             | array   | Every purpose the session carries, in the order it drives them.                                                  |

The remaining fields are the ones the listing publishes, with the same meaning.

Each entry of `purposes` carries the `purpose` it is about, its `status` — `completed`, `current` or `pending` — and a
`debug` array of what the handler that owns it has to say. A terminal session has no `current` purpose; a session that
was ongoing when it expired still has one.

**A credential is never published here.** A value an operator may need to know the existence of but not the content
of is reported as `present` or `absent` — the `State`, `Nonce` and `Code challenge` entries above.

::: info The failure messages are keys, not sentences
`error_details_id` and `error_description_id` are published as the message identifiers they are rather than as a
sentence rendered in a locale that may not be the reader's, so an operator can search for them. Each `debug` entry's
`display_name`, by contrast, is a label written for a person and may be reworded in any release, and which entries a
purpose emits is its handler's to change — so nothing may branch on either. A `debug` entry whose field holds nothing
carries no `value`, but the entry itself is never omitted.
:::

**Errors**:

| Error code  | Description                                                                     |
|-------------|-----------------------------------------------------------------------------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

A session that has already been collected answers `not_found` like one that never existed.

**Use Cases**:

- See which step a stalled session is stopped at, and what the handler driving it is looking at
- Read the message identifiers a failed session carries, to find the failure in the logs
- Confirm whether a session signed a new account up or identified an existing one

#### List Session Security Contexts

**Path**: `/api/v1/admin/interactive-flow-sessions/{session_id}/security-contexts`

**Method**: GET

**Authentication**: Bearer token with `admin:interactive-flow-sessions:read` scope

**Purpose**: Retrieves a paginated list of the places one interactive flow session was driven from — one entry per
distinct address and user agent, counting the requests that came from it rather than repeating them.

**Path Parameters**:

- `session_id`: Unique identifier of the interactive flow session

**Query Parameters**:

- `page`, `size`, `sort`, `q` and every filter criterion — see [Collections](#collections)

**Fields**:

| Field | Type | Sortable | Searchable |
|---|---|---|---|
| `city` | `string` | Yes | Yes |
| `country_code` | `string` | Yes | Yes |
| `first_seen_date` | `date_time` | Yes | — |
| `ip` | `string` | — | Yes |
| `last_seen_date` | `date_time` | Yes | — |
| `observation_count` | `number` — how many requests came from here | Yes | — |
| `proven_date` | `date_time` — when a credential was last proven from here | Yes | — |
| `region` | `string` | Yes | Yes |
| `time_zone` | `timezone` | Yes | — |
| `user_agent` | `string` | — | Yes |

Every field but `ip`, `first_seen_date`, `last_seen_date` and `observation_count` may be absent, so each of the others
also admits `is_null` — `proven_date.is_null=false` lists the places a credential was actually proven at.

The `region_code` field the response publishes is not one this listing filters or orders on.

**Default order**: `-last_seen_date` — the place seen most recently first.

::: warning A walk through these pages may skip or repeat an entry
The default order is on the last sighting, and every request the session makes rewrites it. Two calls still agree on a
snapshot, but a walk in progress can see an entry twice or skip one. Order on `first_seen_date` to walk a stable key.
:::

**Response Format**:

`200 OK`:

```json
{
  "security_contexts": [
    {
      "ip": "203.0.113.42",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "country_code": "FR",
      "region_code": "IDF",
      "region": "Île-de-France",
      "city": "Paris",
      "time_zone": "Europe/Paris",
      "first_seen_date": "2026-09-19T09:12:44",
      "last_seen_date": "2026-09-19T09:18:02",
      "observation_count": 11,
      "proven_date": "2026-09-19T09:13:10"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 2
}
```

| Field               | Type    | Description                                                                                                       |
|---------------------|---------|---------------------------------------------------------------------------------------------------------------------|
| `city`              | string  | City the edge placed the address in.                                                                              |
| `country_code`      | string  | Country the edge placed the address in.                                                                           |
| `first_seen_date`   | string  | When this place was first seen driving the session.                                                               |
| `ip`                | string  | Address the requests were observed coming from.                                                                   |
| `last_seen_date`    | string  | When this place was last seen driving the session.                                                                |
| `observation_count` | integer | How many requests of this session came from here. A session driven from one place for eleven requests is one entry saying eleven rather than eleven entries. |
| `proven_date`       | string  | When a credential was last proven from here. Absent for a place only requests were seen from — which anybody holding the session's state can produce, so this is what tells a proven place from a merely observed one. |
| `region`            | string  | Region the edge placed the address in.                                                                            |
| `region_code`       | string  | Region code the edge placed the address in.                                                                       |
| `time_zone`         | string  | Time zone the edge placed the address in.                                                                         |
| `user_agent`        | string  | User agent the requests announced themselves with. Absent when none arrived.                                      |

The geo fields are the words of the edge in front of this server, unaltered, and each is present only where that edge
sent it. See [Security Context](/technical/configuration/security-context) for how the edge's headers are read.

::: warning `proven_date` separates two very different rows
Every request against a session writes a place, and the signed state a flow travels under carries no identity — so
anybody holding a state URL can have an entry recorded. An entry **with** a `proven_date` is one where a credential
verified *and* resolved that session's user; an entry **without** one says a request arrived and nothing more. Only
a proven place is ever folded into the person's own record.

Reading an entry with no `proven_date` as the person's own is reading an attacker's user agent as theirs.
:::

**The collection is bounded and rolls over.** A session holds at most ten places — fixed in the server rather than
configured — and a request from a new one beyond that drops the place seen least recently, never the place a
credential was proven at. A place a reader saw earlier may therefore be gone, and a place rolled out and seen again
returns counting from one.

**Errors**:

| Error code  | Description                                                                     |
|-------------|-----------------------------------------------------------------------------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

See [Collections](#collections) for the errors a bad page, filter, order or search returns.

**Use Cases**:

- Tell a session driven from one browser apart from one being driven from two places at once
- Check whether the request that proved a credential came from the same place as the rest of the flow
- Read the addresses a stalled sign-in was attempted from, before the session is collected
