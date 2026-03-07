# How to design an API endpoint

This guide defines the API design conventions used across all SympAuthy APIs (Admin, Client, Flow). Contributors
adding new endpoints should follow these standards to maintain consistency. The
[Admin API](../../technical/admin_api), [Client API](../../technical/client_api), and
[Flow API](../../technical/flow_api) are examples of these conventions in action.

::: tip
The Flow API is a specialized workflow API that uses step-based URLs and state-driven navigation rather than
resource-oriented CRUD. The conventions in this guide apply primarily to resource-oriented APIs (Admin, Client).
:::

## URL structure and naming

All API endpoints follow a versioned, resource-oriented URL structure:

```
/api/v1/{api-name}/{resource}
```

- **API name**: identifies the API (`admin`, `client`, `flow`)
- **Version**: embedded in the URL (`v1`). Increment the version segment when introducing breaking changes.

::: warning
OAuth 2.1 and OpenID Connect endpoints follow their respective RFC paths (`/api/oauth2/`, `/.well-known/`) and
do not use the `/api/v1/` prefix.
:::

### Resource naming rules

- Use **plural nouns** for collections: `users`, `clients`, `sessions`
- Use **kebab-case** for multi-word URL segments: `reset-password`, `sign-in`
- Use **path parameters** for identifiers: `{user_id}`, `{client_id}`, `{session_id}`

### URL patterns

| Pattern | Usage | Example |
|---------|-------|---------|
| `/api/v1/{api}/{resource}` | Collection | `GET /api/v1/admin/users` |
| `/api/v1/{api}/{resource}/{id}` | Individual resource | `GET /api/v1/admin/users/{user_id}` |
| `/api/v1/{api}/{resource}/{id}/{action}` | Action on a resource | `POST /api/v1/admin/users/{user_id}/disable` |
| `/api/v1/{api}/{resource}/{id}/{sub-resource}` | Nested resource | `GET /api/v1/admin/users/{user_id}/consents` |

## HTTP methods

| Method | Usage | Request Body | Idempotent | Example |
|--------|-------|-------------|------------|---------|
| GET | Retrieve a resource or collection | None | Yes | `GET /api/v1/admin/users` |
| POST | Create a resource or trigger an action | Yes | No | `POST /api/v1/admin/users` |
| PATCH | Partial update of a resource | Yes (partial) | No | `PATCH /api/v1/admin/users/{user_id}` |
| DELETE | Remove a resource | None | Yes | `DELETE /api/v1/admin/users/{user_id}` |

PUT is not used. PATCH is preferred because SympAuthy APIs use partial updates — only provided fields are modified,
omitted fields remain unchanged.

POST is used for actions that do not map cleanly to CRUD operations (e.g., `disable`, `enable`, `reset-password`,
`logout`). These actions use a sub-path on the resource: `POST /api/v1/admin/users/{user_id}/disable`.

## HTTP status codes

| Status | When to use | Example |
|--------|-------------|---------|
| 200 OK | Successful GET, PATCH, action POST, DELETE | Return the resource or confirmation |
| 201 Created | Successful resource creation (POST) | Return the created resource |
| 400 Bad Request | Invalid input, business rule violation | Default for all `BusinessException` |
| 401 Unauthorized | Missing or invalid authentication token | `{"error": "unauthorized", ...}` |
| 403 Forbidden | Valid token but insufficient scope | `{"error": "forbidden", ...}` |
| 404 Not Found | Resource does not exist | `{"error": "not_found", ...}` |
| 409 Conflict | Resource already exists or state conflict | `{"error": "conflict", ...}` |
| 500 Internal Server Error | Unexpected server error | `{"error": "internal_server_error", ...}` |

DELETE operations return `200` with a confirmation body so the caller can verify which resource was affected:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "deleted": true
}
```

## Request and response format

### Content type

All API requests and responses use `application/json`.

::: warning
The OAuth 2.1 token endpoint uses `application/x-www-form-urlencoded` as required by the RFC specification.
:::

### Property naming and data types

- **Property names**: `snake_case` (`user_id`, `created_at`, `granted_scopes`)
- **Timestamps**: ISO 8601 in UTC with `Z` suffix (`"2026-03-06T10:00:00Z"`)
- **Identifiers**: lowercase UUID with hyphens (`"550e8400-e29b-41d4-a716-446655440000"`)
- **Booleans**: JSON native `true`/`false` (never strings)
- **Null handling**: include the property with `null` value rather than omitting it when the property is part of the schema

### Collection responses

Collection responses wrap the array in a key matching the resource name (plural). Pagination metadata sits at the
same level as the array:

```json
{
  "users": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "enabled",
      "created_at": "2026-01-15T14:30:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 42
}
```

### Single resource responses

Single resource responses return the object directly, not wrapped in a key:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "enabled",
  "created_at": "2026-01-15T14:30:00Z"
}
```

## Pagination

All list endpoints use page-based pagination.

### Query parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `0` | Zero-indexed page number |
| `size` | integer | `20` | Number of results per page |

### Response metadata

The response includes pagination metadata alongside the data array:

| Property | Description |
|----------|-------------|
| `page` | Current page number |
| `size` | Current page size |
| `total` | Total number of records matching the query |

### Example

```http
GET /api/v1/admin/users?page=1&size=10
```

```json
{
  "users": [ ... ],
  "page": 1,
  "size": 10,
  "total": 42
}
```

## Filtering and sorting

### Filtering

Filtering uses query parameters named after the property being filtered:

```http
GET /api/v1/admin/users?status=enabled
GET /api/v1/admin/sessions?user_id=550e8400-e29b-41d4-a716-446655440000
```

Filtering and pagination parameters can be combined:

```http
GET /api/v1/admin/users?status=enabled&page=0&size=10
```

Only add filtering to an endpoint when there is a concrete use case for it.

### Sorting

When sorting is needed, use the following query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sort` | string | — | Property to sort by |
| `order` | string | `asc` | Sort direction (`asc` or `desc`) |

```http
GET /api/v1/admin/users?sort=created_at&order=desc
```

## Error responses

All errors follow a consistent format:

```json
{
  "error": "<error_code>",
  "error_description": "<human-readable description>"
}
```

- `error`: machine-readable code (lowercase, underscores)
- `error_description`: human-readable message for debugging

Authentication and authorization errors use standardized codes:

```json
{
  "error": "unauthorized",
  "error_description": "Missing or invalid access token."
}
```

```json
{
  "error": "forbidden",
  "error_description": "The access token does not include the required scope: admin:users:read"
}
```

Business errors follow the structured error code pattern defined in
[How to throw an exception](how-to-throw-an-exception). See that guide for details on `detailsId`,
`descriptionId`, and the distinction between recoverable and unrecoverable exceptions.

::: warning
Never expose internal stack traces or implementation details in error responses. The `error_description` should help
troubleshoot without revealing system internals.
:::

## Authentication

All endpoints require authentication by default using a Bearer token in the `Authorization` header:

```http
GET /api/v1/admin/users
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

Anonymous access is the exception, not the rule. Only endpoints where the caller cannot yet have a token (e.g.,
flow configuration, OAuth authorize) should allow unauthenticated access.

The Flow API uses a dedicated state-based authentication mechanism:

| Request type | State location |
|-------------|----------------|
| `GET /api/v1/flow/**` | `?state=` query parameter |
| `POST /api/v1/flow/**` | `Authorization: State <jwt>` header |

See [Security](../../technical/security) for the full description of authentication mechanisms and the
[Flow API](../../technical/flow_api#state-management) for details on state management.

## Endpoint documentation template

When adding a new endpoint, document it in the relevant API doc file
([Admin API](../../technical/admin_api), [Client API](../../technical/client_api), or
[Flow API](../../technical/flow_api)) using this template:

```markdown
#### <Endpoint Name>

**Path**: `/api/v1/{api}/{resource}`

**Method**: GET | POST | PATCH | DELETE

**Authentication**: <Bearer token with `scope:name` scope | State token | None>

**Purpose**: <One sentence describing what the endpoint does>

**Path Parameters** (if applicable):

- `param_name`: Description

**Query Parameters** (if applicable):

- `param_name` (optional|required): Description (default: `value`)

**Request Format** (if applicable):

\`\`\`json
{ ... }
\`\`\`

**Response Format**:

\`\`\`json
{ ... }
\`\`\`

**Properties**:

- `property_name`: Description
    - `nested_property`: Description

**Use Cases**:

- Use case 1
- Use case 2
- Use case 3
```

Separate endpoints with a horizontal rule (`---`). Group related endpoints under a shared heading
(e.g., "User Management", "Access Control").
