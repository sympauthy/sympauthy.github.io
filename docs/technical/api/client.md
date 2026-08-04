# Client API

The Client API provides endpoints allowing client applications to query the authorization server for information about
end-users. This API enables client applications to retrieve user data and manage custom claims.

All Client API endpoints are under `/api/v1/client/` and require client authentication.

## Client Scopes

Client scopes follow the `{resource}:{action}` naming convention. They control what operations a client application
can perform through the Client API. See [Scope](/functional/scope#client-scope) for details on how client scopes
are granted.

| Scope                | Description                                              |
|----------------------|----------------------------------------------------------|
| `invitations:read`   | List and view [invitations](/functional/invitation) created by this client |
| `invitations:write`  | Create and revoke [invitations](/functional/invitation)  |
| `users:read`         | List users with consented scopes                         |
| `users:claims:read`  | Read claims the client is authorized to access           |
| `users:claims:write` | Write claims the client is authorized to modify          |
| `users:mfa:read`     | *(Reserved)* Read a user's MFA enrollment status — no endpoint consumes it yet |
| `users:mfa:write`    | Start [MFA enrollment](#multi-factor-authentication-mfa) for a signed-in user |
| `users:providers:write` | Start [provider linking](#provider-linking) for a signed-in user      |

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

**Errors**:

| Error code | Description |
|------------|-------------|
| `client.subject_without_provider` | The `subject` query parameter requires a `provider_id` to be specified. |

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

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

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

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

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

**Errors**:

| Error code | Description |
|------------|-------------|
| `client.invalid_claim` | The claim `{claim}` cannot be modified by the client. Either the claim does not exist or the client does not hold the required scopes. |
| `not_found` | The resource you are looking for is not available on this authorization server. |

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

---

### Multi-Factor Authentication (MFA)

Endpoint for starting [multi-factor authentication](/functional/authentication#multi-factor-authentication-mfa)
enrollment for a signed-in end-user on demand — outside of a sign-in flow. This lets an application offer MFA
enrollment from, for example, an account-settings or security screen. Requires the `users:mfa:write` scope.

#### Start MFA Enrollment

**Path**: `/api/v1/client/mfa/enrollment`

**Method**: POST

**Authentication**: Bearer token with `users:mfa:write` scope, **plus** the end-user's access token in the request
body (see **Dual authentication** below)

**Purpose**: Starts a standalone MFA enrollment [interactive flow](/functional/interactive_flow) for an
already-signed-in end-user and returns a URL to send them to. When the user completes enrollment, they are redirected
to the `return_uri` supplied by the client; if the client also supplies an optional `cancel_uri`, the user may instead
abandon the enrollment and be sent there. Unlike enrollment offered during sign-in, a standalone enrollment started
through this endpoint cannot be skipped.

**Dual authentication**: This endpoint acts on behalf of an end-user, so it identifies **two** parties and requires
**two** credentials:

1. **The client** — authenticates with its client-credentials Bearer token, like every other Client API endpoint, and
   must hold the `users:mfa:write` scope.
2. **The end-user** — identified by their own access token, passed in the request body as `access_token`. The server
   validates this token and derives the user to enroll from it.

The end-user's access token must have been **issued to the calling client**: a client cannot start enrollment using a
token minted for another client. It must also be a user token — a client-credentials token, which has no associated
user, is rejected.

**Request Format**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "return_uri": "https://app.example.com/account/security",
  "cancel_uri": "https://app.example.com/account/security"
}
```

**Properties**:

- `access_token`: A valid, non-expired access token belonging to the end-user to enroll. It must have been issued to
  the calling client.
- `return_uri`: URI the end-user is redirected to once enrollment completes. It must match one of the calling client's
  [registered redirect URIs](/technical/configuration/client) — validated with the same OAuth 2.1 redirect-URI rules
  as the authorization endpoint — to prevent open redirects.
- `cancel_uri` (optional): URI the end-user is redirected to if they cancel the enrollment via the flow's
  [Cancel Endpoint](/technical/api/flow#_7-cancel-endpoint). Like `return_uri`, it must match one of the calling
  client's [registered redirect URIs](/technical/configuration/client) and is validated with the same OAuth 2.1
  redirect-URI rules. When omitted, the enrollment offers no way to cancel and the end-user must complete it.

**Response Format**:

`200 OK`:

```json
{
  "state": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "redirect_url": "https://auth.example.com/flow/mfa?state=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `client.mfa.enrollment.mfa_disabled` | This authorization server is not configured to support multi-factor authentication, so an enrollment cannot be started. Please contact the support of the application to report this issue. |
| `client.mfa.enrollment.invalid_access_token` | The access token identifying the end-user is missing, expired, revoked, not associated with an end-user, or was not issued to your client. Obtain a fresh access token for the end-user and try again. |

An invalid `return_uri` or `cancel_uri` — one that does not match the client's registered redirect URIs — is rejected
the same way.

**Properties**:

- `state`: Signed token identifying the enrollment [interactive flow](/technical/api/flow#state-management) session.
- `redirect_url`: URL to navigate the end-user's browser to in order to run the enrollment steps. The `state` is
  already included in the URL.

The client is responsible for navigating the end-user's browser to `redirect_url`. The endpoint returns JSON rather
than issuing a `303` redirect because the caller is a client backend holding a bearer token, not the browser itself.

**Important Notes**:

- The MFA-not-enabled check happens up front: if no MFA method is enabled in the server configuration
  ([`mfa.totp.enabled`](/technical/configuration/authorization#mfa)), the endpoint fails immediately with a `400`
  error before any enrollment session is created.
- Enrollment reuses the same steps as the sign-in flow — method selection, then TOTP enrollment. See
  [How an Interactive Flow Works](/functional/interactive_flow).

**Use Cases**:

- Offer MFA enrollment from an application's account-settings or security screen.
- Prompt existing users to add a second factor without sending them through a full re-authentication.
- Drive MFA enrollment from a custom, branded UI.

---

### Provider Linking

Endpoint for starting an identity-provider link for a signed-in end-user on demand — outside of a sign-in flow. This
lets an application offer a "connect another sign-in method" action from, for example, an account-settings or security
screen. Requires the `users:providers:write` scope.

#### Start Provider Link

**Path**: `/api/v1/client/providers/{providerId}/link`

**Method**: POST

**Authentication**: Bearer token with `users:providers:write` scope, **plus** the end-user's access token in the
request body (see **Dual authentication** below)

**Purpose**: Starts a standalone provider-link [interactive flow](/functional/interactive_flow) for an
already-signed-in end-user and returns a URL to send them to. In the flow the end-user is asked to **confirm** the
action and to **re-authenticate**, then to authorize the target provider; the resolved provider identity is attached to
their existing account. When the link completes, they are redirected to the `return_uri` supplied by the client; if the
client also supplies an optional `cancel_uri`, the user may instead abandon the link and be sent there.

**Why re-authentication is required**: linking a provider mints a **durable login credential** — anyone who can
subsequently sign in through that provider gains access to the account. Requiring the browser to prove it owns the
account before the link commits prevents a leaked end-user access token from silently attaching a new way to sign in.
This step is not optional and cannot be skipped.

**Path Parameters**:

- `providerId`: Identifier of the [provider](/technical/configuration/provider) to link (e.g. `discord`, `google`). It
  must be a known, enabled provider.

**Dual authentication**: This endpoint acts on behalf of an end-user, so it identifies **two** parties and requires
**two** credentials:

1. **The client** — authenticates with its client-credentials Bearer token, like every other Client API endpoint, and
   must hold the `users:providers:write` scope.
2. **The end-user** — identified by their own access token, passed in the request body as `access_token`. The server
   validates this token and derives the user to link the provider to from it.

The end-user's access token must have been **issued to the calling client**: a client cannot start a link using a
token minted for another client. It must also be a user token — a client-credentials token, which has no associated
user, is rejected.

**Request Format**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "return_uri": "https://app.example.com/account/security",
  "cancel_uri": "https://app.example.com/account/security"
}
```

**Properties**:

- `access_token`: A valid, non-expired access token belonging to the end-user the provider will be linked to. It must
  have been issued to the calling client.
- `return_uri`: URI the end-user is redirected to once the link completes. It must match one of the calling client's
  [registered redirect URIs](/technical/configuration/client) — validated with the same OAuth 2.1 redirect-URI rules as
  the authorization endpoint — to prevent open redirects.
- `cancel_uri` (optional): URI the end-user is redirected to if they cancel the link via the flow's
  [Cancel Endpoint](/technical/api/flow#_7-cancel-endpoint). Like `return_uri`, it must match one of the calling
  client's [registered redirect URIs](/technical/configuration/client) and is validated with the same OAuth 2.1
  redirect-URI rules. When omitted, the link offers no way to cancel and the end-user must complete it.

**Response Format**:

`200 OK`:

```json
{
  "state": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "redirect_url": "https://auth.example.com/flow/confirm?state=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `client.providers.link.invalid_access_token` | The access token identifying the end-user is missing, expired, revoked, not associated with an end-user, or was not issued to your client. Obtain a fresh access token for the end-user and try again. |
| `provider.missing` | The provider `{providerId}` does not exist. |
| `provider.disabled` | The provider `{providerId}` is disabled by configuration. |

An invalid `return_uri` or `cancel_uri` — one that does not match the client's registered redirect URIs — is rejected
the same way (**400 Bad Request**).

**Properties**:

- `state`: Signed token identifying the provider-link [interactive flow](/technical/api/flow#state-management) session.
- `redirect_url`: URL to navigate the end-user's browser to in order to run the link steps (confirmation,
  re-authentication, then provider authorization). The `state` is already included in the URL.

The client is responsible for navigating the end-user's browser to `redirect_url`. The endpoint returns JSON rather
than issuing a `303` redirect because the caller is a client backend holding a bearer token, not the browser itself.

**Important Notes**:

- The provider is validated up front: an unknown (`provider.missing`) or disabled (`provider.disabled`) provider fails
  immediately with a `400` error before any link session is created.
- The link is attached to the end-user's existing account — it never creates a new account. If the target provider
  identity (its subject, or an identifier claim it carries) is **already linked to a different account**, the flow
  hard-fails and the link cannot be completed. Otherwise, if that identity is already linked to *this* account, the
  operation is idempotent.
- The link is committed only after the end-user authorizes the target provider at the end of the flow. See
  [How an Interactive Flow Works](/functional/interactive_flow).

**Use Cases**:

- Offer a "connect another sign-in method" action from an application's account-settings or security screen.
- Let users add a social or enterprise identity provider to an account they originally created with a password.
- Drive provider linking from a custom, branded UI.

---

### Invitation Management

Endpoints for creating, viewing, and revoking [invitations](/functional/invitation). Invitations allow
invitation-only registration for [audiences](/functional/audience) where open sign-up is disabled.
Requires `invitations:read` for read operations and `invitations:write` for creation and revocation.

A client can only see and manage invitations it created. The [Admin API](/technical/api/admin#invitation-management)
can manage all invitations regardless of creator.

#### Create Invitation

**Path**: `/api/v1/client/invitations`

**Method**: POST

**Authentication**: Bearer token with `invitations:write` scope

**Purpose**: Creates a single-use invitation for the client's [audience](/functional/audience). The audience is
automatically set to the requesting client's audience — there is no `audience` field in the request. The invitation
token is returned only in this response — it cannot be retrieved later.

**Request Format**:

```json
{
  "expires_at": "2026-04-15T00:00:00Z",
  "claims": {
    "custom_department": "Engineering"
  },
  "note": "Onboarding Jane"
}
```

**Properties**:

- `expires_at` (optional): Expiration date as an ISO 8601 timestamp (UTC). Defaults to
  `now + default-expiration`. Capped at `now + max-expiration`. See
  [advanced configuration](/technical/configuration/advanced#advanced-invitation) for these values.
- `claims` (optional): Custom [claim](/functional/claims) values to pre-set on the user's account upon
  registration. Only custom claims are accepted — OpenID Connect claims must come from the user. The client must
  have unconditional write access to each claim via the claim's
  [ACL](/technical/configuration/claim#claims-id-acl).
- `note` (optional): Note attached to the invitation.

**Response Format**:

`201 Created`:

```json
{
  "invitation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "token": "dGhpcyBpcyBhIHNlY3VyZSByYW5kb20gdG9rZW4",
  "audience": "default",
  "status": "pending",
  "claims": {
    "custom_department": "Engineering"
  },
  "note": "Onboarding Jane",
  "created_at": "2026-03-28T10:00:00Z",
  "expires_at": "2026-04-04T10:00:00Z"
}
```

**Properties**:

- `invitation_id`: Unique identifier of the invitation
- `token`: The invitation token. **Returned only at creation** — subsequent reads show `token_prefix` instead.
  The client application is responsible for building the authorize URL with the `invitation_token` parameter.
- `audience`: Audience identifier (automatically set to the client's audience)
- `status`: Invitation status (`pending`)
- `claims`: Pre-assigned custom claims, or `null` if none
- `note`: Note, or `null` if none
- `created_at`: ISO 8601 timestamp (UTC) when the invitation was created
- `expires_at`: ISO 8601 timestamp (UTC) when the invitation expires

**Errors**:

| Error code | Description |
|------------|-------------|
| `invitation.unknown_claim` | The claim `{claim}` does not exist or is not enabled. Please check the available claims and try again. |
| `invitation.claim_not_writable` | The claim `{claim}` cannot be pre-assigned by this client. The client does not hold the required scopes. |

**Use Cases**:

- Application-driven invitation flow where the client manages who can register
- Onboarding workflows that create invitations as part of a larger process
- Self-service invite features within an application

---

#### List Invitations

**Path**: `/api/v1/client/invitations`

**Method**: GET

**Authentication**: Bearer token with `invitations:read` scope

**Purpose**: Retrieves a paginated list of invitations created by the requesting client. Invitations created by
other clients or by administrators are not returned.

**Query Parameters**:

- `page` (optional): Zero-indexed page number (default: `0`)
- `size` (optional): Number of results per page (default: `20`)
- `status` (optional): Filter by invitation status (`pending`, `used`, `revoked`, `expired`)

**Response Format**:

```json
{
  "invitations": [
    {
      "invitation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "token_prefix": "dGhpcyBp",
      "audience": "default",
      "status": "pending",
      "claims": {
        "custom_department": "Engineering"
      },
      "note": "Onboarding Jane",
      "created_at": "2026-03-28T10:00:00Z",
      "expires_at": "2026-04-04T10:00:00Z"
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
    - `token_prefix`: First 8 characters of the token, for identification purposes
    - `audience`: Audience identifier
    - `status`: Invitation status. Possible values: `"pending"` | `"used"` | `"revoked"` | `"expired"`
    - `claims`: Pre-assigned custom claims, or `null`
    - `note`: Note, or `null`
    - `created_at`: ISO 8601 timestamp (UTC) when the invitation was created
    - `expires_at`: ISO 8601 timestamp (UTC) when the invitation expires
- `page`: Current page number
- `size`: Number of results per page
- `total`: Total number of invitations matching the filters

**Use Cases**:

- Display pending invitations in an application's admin panel
- Track invitation usage and redemption
- Manage invitations within the application's own workflow

---

#### Get Invitation

**Path**: `/api/v1/client/invitations/{invitation_id}`

**Method**: GET

**Authentication**: Bearer token with `invitations:read` scope

**Purpose**: Retrieves details for a specific invitation created by the requesting client. Returns 404 if the
invitation was not created by this client.

**Path Parameters**:

- `invitation_id`: Unique identifier of the invitation

**Response Format**:

`200 OK` (pending invitation):

```json
{
  "invitation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "token_prefix": "dGhpcyBp",
  "audience": "default",
  "status": "pending",
  "claims": {
    "custom_department": "Engineering"
  },
  "note": "Onboarding Jane",
  "created_at": "2026-03-28T10:00:00Z",
  "expires_at": "2026-04-04T10:00:00Z"
}
```

`200 OK` (used invitation):

```json
{
  "invitation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "token_prefix": "dGhpcyBp",
  "audience": "default",
  "status": "used",
  "claims": {
    "custom_department": "Engineering"
  },
  "note": "Onboarding Jane",
  "created_at": "2026-03-28T10:00:00Z",
  "expires_at": "2026-04-04T10:00:00Z",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "used_at": "2026-03-29T09:15:00Z"
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |

**Properties**:

- `invitation_id`: Unique identifier of the invitation
- `token_prefix`: First 8 characters of the token
- `audience`: Audience identifier
- `status`: Invitation status (`pending`, `used`, `revoked`, `expired`)
- `claims`: Pre-assigned custom claims, or `null`
- `note`: Note, or `null`
- `created_at`: ISO 8601 timestamp (UTC) when the invitation was created
- `expires_at`: ISO 8601 timestamp (UTC) when the invitation expires
- `user_id`: Identifier of the user who redeemed the invitation (only present when `status` is `used`)
- `used_at`: ISO 8601 timestamp (UTC) when the invitation was redeemed (only present when `status` is `used`)

**Use Cases**:

- Check whether a specific invitation has been redeemed
- Display invitation status in the application's admin panel
- Correlate invitation redemption with user onboarding steps

---

#### Revoke Invitation

**Path**: `/api/v1/client/invitations/{invitation_id}/revoke`

**Method**: POST

**Authentication**: Bearer token with `invitations:write` scope

**Purpose**: Revokes a pending invitation created by the requesting client. The invitation can no longer be
redeemed. Returns 404 if the invitation was not created by this client. This operation is immediate and permanent.

**Path Parameters**:

- `invitation_id`: Unique identifier of the invitation

**Response Format**:

`200 OK`:

```json
{
  "invitation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "revoked"
}
```

**Errors**:

| Error code | Description |
|------------|-------------|
| `not_found` | The resource you are looking for is not available on this authorization server. |
| `invitation.cannot_revoke` | The invitation cannot be revoked because it is in status `{status}`; only pending invitations can be revoked. |

**Use Cases**:

- Cancel an invitation that is no longer needed
- Revoke access before the invitation is redeemed
- Clean up invitations as part of an application's lifecycle management
