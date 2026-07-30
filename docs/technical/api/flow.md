# Flow API

The Flow API provides a set of endpoints to implement custom authentication flows. Each endpoint represents a step in
the authentication process and follows consistent patterns for state management, error handling, and flow progression.

### Core Concepts

#### CORS

The Flow API enforces a strict CORS policy. Cross-origin requests are only allowed from origins (`scheme://host:port`)
that match a URI registered in a configured [flow](/technical/configuration/authorization#flows-id). Any other origin receives no CORS headers
and the browser blocks the request.

This means that if you serve your custom flow from a different server than SympAuthy, you must declare its URL in the
`flows.<id>` configuration. OPTIONS preflight requests from an allowed origin are handled automatically before
authentication, so no additional setup is needed on your side.

See the [Security](/technical/security#cors-restriction-on-the-flow-api) page for a full description of this policy.

#### State Management

All Flow API endpoints require a state token that identifies the ongoing interactive flow session.

Every URL the server returns in a response — `redirect_url`, cross-links such as `sign_up_redirect_url` and
`sign_in_redirect_url`, and provider `authorize_url` — already includes the `state`, so you can follow it directly. You
only attach the `state` yourself to the requests your UI originates.

How you transmit the state on those requests depends on the HTTP method:

| Request type                     | State location                      |
|----------------------------------|-------------------------------------|
| `GET /flow/**` (page navigation) | `?state=` query parameter           |
| `GET /api/v1/flow/**` (AJAX)     | `?state=` query parameter           |
| `POST /api/v1/flow/**` (AJAX)    | `Authorization: State <jwt>` header |

For GET requests, the state is passed as a URL query parameter so that browsers can follow server-side redirects and
single-page applications can read it on page load.

For POST requests, the state must be sent in the `Authorization` header using the custom `State` scheme:

```http
Authorization: State <jwt>
```

Sending the state in a custom `Authorization` header rather than the URL provides CSRF protection: this header cannot be
included in a cross-origin request without triggering a CORS preflight. Combined with the
strict [CORS policy](/technical/security#cors-restriction-on-the-flow-api) that allows only registered flow origins, a forged
cross-origin POST is rejected before it can execute.

See the [Security](/technical/security#csrf-protection-on-flow-post-endpoints) page for a full description of this mechanism.

#### Redirect Pattern

All endpoints follow a consistent redirect pattern:

```
Operation Complete → Determine Next Step → Return redirect_url
```

The `redirect_url` property will be present in responses when:

- The user has completed the current step and should proceed to the next one
- An unrecoverable error occurred (e.g., the session expired)
- The flow is complete and the user should be redirected back to the client application

> All server-side redirects use HTTP 303 (See Other), never 307 (Temporary Redirect).
> [OAuth 2.1 (section 7.5.3)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-7.5.3) prohibits 307
> because it preserves the original HTTP method and request body — a POST carrying user credentials would be forwarded
> as-is to the redirect target, risking credential leakage. HTTP 303 forces the browser to issue a GET, which strips the
> request body and prevents this class of vulnerability.

#### Response Patterns

Endpoints return one of two response patterns:

1. **Simple Response** - Contains only `redirect_url` (used when operation always redirects to next step)
2. **Complex Response** - Contains data AND optionally `redirect_url`:
    - When `redirect_url` is **present**: User must be redirected (step can be skipped)
    - When `redirect_url` is **absent**: User must complete an action on the current step

The `GET` steps that render sign-in and sign-up return either the step's config **or** a `redirect_url`. When
`redirect_url` is present every config field is `null`, so check `redirect_url` first and only read the config fields
when it is absent.

#### Invitation Token

When [invitation](/functional/invitation)-based registration is enabled, the OAuth 2 authorize endpoint
(`GET /api/v1/flow/authorize`) accepts an optional `invitation_token` query parameter. When present, SympAuthy
validates the token (exists, not expired, not revoked, not used, client belongs to the invitation's audience) and
binds the invitation to the flow state. If validation fails, an OAuth error response (`invalid_request`) is
returned.

When an invitation is bound and the user is not yet registered, the flow redirects to the sign-up page instead of
the sign-in page. Since the invitation is bound at the authorize step, both password and provider sign-up paths
work seamlessly — no further token handling is needed by the flow UI.

## Flow Endpoints

### 1. Sign-In Endpoint

**Path**: `/api/v1/flow/sign-in`

**Authentication**: GET requires `?state=` query parameter; POST requires `Authorization: State <jwt>` header

**Purpose**: Renders the sign-in step and authenticates existing users with login and password credentials.

#### GET Request

Returns the configuration needed to render the sign-in screen — the available password and provider sign-in methods and
the cross-link to sign-up — **or** a `redirect_url` when the user does not belong on the sign-in step. The response is
specific to the client that initiated the authorize flow and to the current interactive flow session.

**Response Format**:

```json
{
  "password": {
    "identifier_claims": [
      {
        "id": "email",
        "required": true,
        "name": "Email",
        "type": "string",
        "group": null
      }
    ]
  },
  "providers": [
    {
      "id": "google",
      "name": "Google",
      "authorize_url": "/api/v1/flow/providers/google/authorize?state=..."
    }
  ],
  "sign_up_redirect_url": "/sign-up?state=...",
  "redirect_url": null
}
```

**Properties**:

- `password`: Password sign-in configuration, or `null` when password sign-in is disabled
    - `identifier_claims`: Claims accepted as the login identifier (typically `email`). Each entry describes one claim:
        - `id`: Claim identifier
        - `required`: Whether the claim must be provided
        - `name`: Localized display name
        - `type`: Data type (`string`, `number`, or `date`)
        - `group`: Group this claim belongs to (e.g. `identity`), or `null` if ungrouped
- `providers`: Third-party identity providers to offer, or `null`/empty when none are configured
    - `id`: Provider identifier
    - `name`: Localized display name
    - `authorize_url`: URL that starts the provider's OAuth flow (already includes `state`)
- `sign_up_redirect_url`: Link to the sign-up step, used to render the "Create an account" link. Present only when
  sign-up is allowed for this interactive flow session (in a normal, non-invitation sign-in: when open registration is enabled), and
  `null` otherwise
- `redirect_url`: Set when the user should **not** be on the sign-in step — e.g. an
  [invitation](/functional/invitation) flow (→ sign-up page) or an already-authenticated user (→ next step). When set,
  every other field is `null`; follow it instead of rendering the form

#### POST Request

Validates user credentials and establishes an authenticated session.

**Request Format**:

```json
{
  "login": "user@example.com",
  "password": "securePassword123"
}
```

**Properties**:

- `login`: User identifier (matched against the claims listed in `password.identifier_claims`)
- `password`: User's password

**Response Format**:

```json
{
  "redirect_url": "/api/v1/flow/claims?state=..."
}
```

**Workflow**:

1. Validates login/password combination
2. Identifies user by matching login against the configured `identifier_claims`
3. Returns redirect to next step (typically claims collection or flow completion)

---

### 2. Sign-Up Endpoint

**Path**: `/api/v1/flow/sign-up`

**Authentication**: GET requires `?state=` query parameter; POST requires `Authorization: State <jwt>` header

**Purpose**: Renders the sign-up step and handles new user registration with password-based authentication.

#### GET Request

Returns the configuration needed to render the sign-up screen — the password requirements and the identifier claims to
collect, and the cross-link to sign-in — **or** a `redirect_url` when the user does not belong on the sign-up step.

**Response Format**:

```json
{
  "password": {
    "identifier_claims": [
      {
        "id": "email",
        "required": true,
        "name": "Email",
        "type": "string",
        "group": null
      }
    ]
  },
  "sign_in_redirect_url": "/sign-in?state=...",
  "redirect_url": null
}
```

**Properties**:

- `password`: Password sign-up configuration, or `null` when password sign-up is disabled
    - `identifier_claims`: Claims that uniquely identify the account and are collected on the sign-up form. Each entry
      describes one claim:
        - `id`: Claim identifier
        - `required`: Whether the claim must be provided
        - `name`: Localized display name
        - `type`: Data type (`string`, `number`, or `date`)
        - `group`: Group this claim belongs to (e.g. `identity`), or `null` if ungrouped
- `sign_in_redirect_url`: Link to the sign-in step, used to render the "Already have an account?" link. Present only
  when sign-in is allowed, and therefore **`null` during an [invitation](/functional/invitation) flow** (invitations do
  not allow signing into an existing account)
- `redirect_url`: Set when the user should **not** be on the sign-up step — e.g. sign-up is disabled for the audience
  (→ sign-in page) or an already-authenticated user (→ next step). When set, every other field is `null`

#### POST Request

Creates a new user account with the provided password and identifier claims.

**Request Format**:

```json
{
  "password": "securePassword123",
  "email": "user@example.com"
}
```

The request accepts:

- `password`: User's chosen password (required)
- The identifier claims from `password.identifier_claims`, as dynamic properties

Only identifier claims are saved on the created account. Any other claim present in the request is **discarded** —
additional information is gathered later, at the [claims collection step](#_4-claims-endpoint).

**Response Format**:

```json
{
  "redirect_url": "/api/v1/flow/claims?state=..."
}
```

**Workflow**:

1. Validates the password and the required identifier claims
2. Creates the user account (saving only the identifier claims)
3. If an [invitation](/functional/invitation) is bound to the flow state, its pre-assigned claims are applied to
   the new account and the invitation is marked as used
4. Returns redirect to the next step (typically claims collection or validation)

**Invitation behavior**:

- When `sign-up-enabled: false` and `invitation-enabled: true` on the [audience](/functional/audience): sign-up
  requires a bound invitation (from the `invitation_token` on the authorize endpoint). Returns **403 Forbidden**
  if no invitation is bound.
- When `sign-up-enabled: true` and `invitation-enabled: true`: sign-up works normally. If an invitation is bound,
  its pre-assigned claims are applied.
- The same behavior applies when a user signs up through a third-party provider (if no account exists and
  `sign-up-enabled` is `false`, an invitation must be bound).

---

### 3. Providers Endpoints

**Base Path**: `/api/v1/flow/providers/{providerId}`

**Purpose**: Handles OAuth 2 authorization with third-party identity providers.

#### Authorize Endpoint

**Path**: `/api/v1/flow/providers/{providerId}/authorize`

**Method**: GET

**Authentication**: Requires valid `state` parameter

**Response**: HTTP 303 redirect to the provider's authorization page

**Parameters**:

- `providerId`: Identifier of the OAuth provider (from configuration)

#### Callback Endpoint

**Path**: `/api/v1/flow/providers/{providerId}/callback`

**Method**: GET

**Authentication**: None required (anonymous access)

**Query Parameters**:

- `code`: OAuth authorization code (provided by the provider)
- `state`: Flow state parameter

**Response**: HTTP 303 redirect to the next flow step

**Workflow**:

1. **Authorize**: User clicks provider button → redirected to provider's authorization page
2. **Provider Authentication**: User authenticates with the third-party provider
3. **Callback**: Provider redirects back with authorization code
4. **Token Exchange**: Server exchanges code for user information
5. **Redirect**: User redirected to next step in the flow

---

### 4. Claims Endpoint

**Path**: `/api/v1/flow/claims`

**Authentication**: GET requires `?state=` query parameter; POST requires `Authorization: State <jwt>` header

**Purpose**: Handles collection of additional user information (claims) during the authentication flow.

#### GET Request

Returns all collectable claims with their metadata, any already-collected values, and suggested values from external
providers. Only claims within the user's consented scopes are returned; identifier claims (used for sign-in/sign-up) are
excluded.

This single endpoint provides everything needed to build the claims collection form — the claim metadata is included in
the response, so there is nothing else to fetch.

**Response Format**:

When claims need to be collected:

```json
{
  "claims": [
    {
      "id": "phone",
      "required": true,
      "name": "Phone Number",
      "type": "phone_number",
      "group": "identity",
      "collected": false,
      "value": null,
      "suggested_value": "+1234567890"
    },
    {
      "id": "birthdate",
      "required": false,
      "name": "Date of Birth",
      "type": "date",
      "group": null,
      "collected": true,
      "value": "1990-01-15",
      "suggested_value": null
    }
  ]
}
```

When no claims need collection (auto-skip):

```json
{
  "redirect_url": "/client/callback?code=..."
}
```

**Claim Properties**:

- `id`: Claim identifier
- `required`: Whether this claim must be provided
- `name`: Localized display name (depends on `Accept-Language` header)
- `type`: Data type (e.g. `string`, `date`, `phone_number`, `timezone`)
- `group`: Group this claim belongs to (e.g. `identity`, `address`), or `null` if ungrouped
- `collected`: Whether the user has already been presented with this claim during a previous flow step
- `value`: Current value provided by the user (`null` if not yet collected or user declined)
- `suggested_value`: Value from a third-party provider, suggested as a default

**Behavior**:

- If `redirect_url` is present: No collectable claims, proceed to next step automatically
- If `claims` array is present: User must provide or confirm the listed claims

#### POST Request

Saves claims collected from the user.

**Request Format**:

```json
{
  "phone": "+1234567890",
  "birthdate": "1990-01-15",
  "address": null
}
```

The request accepts dynamic claim properties. Set a claim to `null` or omit it to indicate the user chose not to provide
it.

**Response Format**:

```json
{
  "redirect_url": "/api/v1/flow/claims/validation/EMAIL?state=..."
}
```

**Workflow**:

1. **GET**: Check if claims need collection
    - If no collectable claims: Returns `redirect_url` to skip this step
    - If claims needed: Returns all collectable claims with metadata, collected values, and suggested values
2. **POST**: Save claim values
    - The server filters updates to only collectable claims (user-inputted, non-identifier, within consented scopes)
    - Null/empty values indicate claim not provided
    - Returns redirect to next step

**Notes**:

- Identifier claims are excluded (already collected during sign-in/sign-up)
- Only claims within the user's consented scopes are returned
- Pre-filled values from providers can be edited by the user

---

### 5. Claims Validation Endpoints

**Base Path**: `/api/v1/flow/claims/validation`

**Authentication**: GET requires `?state=` query parameter; POST requires `Authorization: State <jwt>` header

**Purpose**: Handles validation of user claims (e.g., email verification) via codes sent through various media channels.

#### Get Validation Code

**Path**: `/api/v1/flow/claims/validation/{media}`

**Method**: GET

**Parameters**:

- `media`: Media type for code delivery (e.g., `EMAIL`, `SMS`)

**Response Format**:

When validation is needed:

```json
{
  "media": "EMAIL",
  "code": {
    "id": "abc123",
    "media": "EMAIL",
    "reasons": [
      "EMAIL_CLAIM"
    ],
    "resendDate": "2026-02-14T10:43:30Z"
  }
}
```

When no validation needed (auto-skip):

```json
{
  "redirect_url": "/client/callback?code=..."
}
```

**Code Properties**:

- `id`: Unique identifier for this validation code
- `media`: Media through which code was sent
- `reasons`: Why validation is required (e.g., `EMAIL_CLAIM`, `PHONE_CLAIM`)
- `resendDate`: ISO 8601 timestamp (UTC) when code can be resent

**Behavior**:

- First call: Sends validation code to user
- Subsequent calls: Returns existing code info without resending (anti-spam)
- If `redirect_url` is present: No validation needed, skip this step

#### Validate Code

**Path**: `/api/v1/flow/claims/validation`

**Method**: POST

**Request Format**:

```json
{
  "media": "EMAIL",
  "code": "123456"
}
```

**Properties**:

- `media`: Media through which code was received
- `code`: Code entered by the user

**Response Format**:

```json
{
  "redirect_url": "/client/callback?code=..."
}
```

**Workflow**:

1. Validates the provided code matches what was sent
2. Marks the associated claim(s) as validated
3. Returns redirect to next step

#### Resend Validation Code

**Path**: `/api/v1/flow/claims/validation/resend`

**Method**: POST

**Request Format**:

```json
{
  "media": "EMAIL"
}
```

**Response Format**:

When code was resent:

```json
{
  "media": "EMAIL",
  "resent": true,
  "code": {
    "id": "def456",
    "media": "EMAIL",
    "reasons": [
      "EMAIL_CLAIM"
    ],
    "resendDate": "2026-02-14T10:48:30Z"
  }
}
```

When resend was blocked (anti-spam):

```json
{
  "media": "EMAIL",
  "resent": false
}
```

**Properties**:

- `media`: Media type for the resent code
- `resent`: Whether a new code was actually sent
- `code`: New code information (only present if `resent` is `true`)

**Workflow**:

1. Check if enough time has passed since last send (based on `resendDate`)
2. If allowed: Send new code and return new code information
3. If blocked: Return `resent: false` to prevent spam

**Supported Media Types**: `EMAIL`, `SMS`

---

### 6. MFA Endpoints

**Base Path**: `/api/v1/flow/mfa`

**Purpose**: Handles multi-factor authentication during the interactive flow. These endpoints are only active when at
least one MFA method is enabled in the [configuration](/technical/configuration/authorization#mfa).

#### MFA Router

**Path**: `/api/v1/flow/mfa`

**Method**: GET

**Authentication**: Requires `?state=` query parameter

**Purpose**: Determines the next MFA step based on the server configuration and the user's enrollment state. The UI
should call this endpoint and follow the returned redirect.

**Routing Logic**:

| `mfa.required` | Methods enrolled  | Behavior                                              |
|----------------|-------------------|-------------------------------------------------------|
| `false`        | None              | Method selection with enrollment offers + skip option |
| `true`         | None              | Auto-redirect to TOTP enrollment                      |
| any            | Exactly one       | Auto-redirect to challenge for that method            |
| any            | Multiple (future) | Method selection without skip                         |

**Response Format**:

When the step can be auto-skipped or auto-redirected:

```json
{
  "redirect_url": "/api/v1/flow/mfa/totp/enroll?state=..."
}
```

When method selection is needed:

```json
{
  "methods": [
    "totp"
  ],
  "skip_redirect_url": "/api/v1/flow/mfa/skip?state=..."
}
```

**Properties**:

- `redirect_url`: URL to redirect to (enrollment, challenge, or next step)
- `methods`: Array of available MFA method identifiers (only when user must choose or may enrol)
- `skip_redirect_url`: URL to skip MFA (only present when `mfa.required` is `false` **and** the user has not enrolled in
  any MFA method)

#### TOTP Enrollment

**Path**: `/api/v1/flow/mfa/totp/enroll`

**Authentication**: GET requires `?state=` query parameter; POST requires `Authorization: State <jwt>` header

**Purpose**: Handles first-time TOTP setup. The user scans a QR code or enters the secret manually into their
authenticator app, then confirms by entering the first valid code.

##### GET Request

Returns the enrollment data needed to register the TOTP secret with an authenticator app.

**Response Format**:

```json
{
  "otpauth_uri": "otpauth://totp/SympAuthy:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SympAuthy",
  "secret": "JBSWY3DPEHPK3PXP"
}
```

**Properties**:

- `otpauth_uri`: A URI following the `otpauth://` scheme that can be rendered as a QR code. Scanning this QR code with
  an authenticator app registers the secret automatically.
- `secret`: The base32-encoded TOTP secret, displayed for users who prefer to enter it manually.

##### POST Request

Confirms the TOTP enrollment by validating the first code entered by the user. A successful confirmation also marks MFA
as passed for the current session.

**Request Format**:

```json
{
  "code": "123456"
}
```

**Response Format**:

```json
{
  "redirect_url": "/api/v1/flow/claims?state=..."
}
```

**Workflow**:

1. User scans QR code or enters secret into their authenticator app
2. User enters the 6-digit code shown by the app
3. Server validates the code against the pending enrollment
4. On success: enrollment is confirmed, MFA is marked as passed, redirect to next step
5. On failure: recoverable error, user can retry

#### TOTP Challenge

**Path**: `/api/v1/flow/mfa/totp`

**Authentication**: Requires `Authorization: State <jwt>` header

**Purpose**: Validates a TOTP code for users who have already enrolled. This is the screen returning users see on
subsequent sign-ins.

##### POST Request

**Request Format**:

```json
{
  "code": "123456"
}
```

**Response Format**:

```json
{
  "redirect_url": "/api/v1/flow/claims?state=..."
}
```

**Workflow**:

1. User enters the 6-digit code from their authenticator app
2. Server validates the code against the user's enrolled TOTP secret
3. On success: MFA is marked as passed, redirect to next step
4. On failure: recoverable error, user can retry

#### MFA Skip

**Path**: `/api/v1/flow/mfa/skip`

**Method**: GET

**Authentication**: Requires `?state=` query parameter

**Purpose**: Marks MFA as passed without completing a challenge. This endpoint is only available when `mfa.required` is
`false` **and** the user has not enrolled in any MFA method. Calling it when `mfa.required` is `true`, or when the user
has already enrolled in at least one MFA method, returns an error.

**Response Format**:

```json
{
  "redirect_url": "/api/v1/flow/claims?state=..."
}
```

---

## Implementing a Custom Flow

### Recommended Implementation Steps

1. **Render the Sign-In Step**
   ```http
   GET /api/v1/flow/sign-in?state={state}
   ```
    - Requires the `state` obtained from the authorize redirect
    - Returns the sign-in config (`password`, `providers`, `sign_up_redirect_url`) **or** a `redirect_url`
    - If `redirect_url` is set, follow it — e.g. an invitation flow sends the user to the sign-up step
    - Otherwise build the UI from the returned config and determine the available authentication methods

2. **Authenticate User** (choose one path)

   **Option A - Password Sign-In**:
   ```http
   POST /api/v1/flow/sign-in
   Authorization: State {state}
   ```

   **Option B - Password Sign-Up**:
   ```http
   POST /api/v1/flow/sign-up
   Authorization: State {state}
   ```

   **Option C - Provider Authentication**:
   ```
   Redirect to the provider's authorize_url from the sign-in response
   (the URL already includes the state)
   ```

3. **Multi-Factor Authentication** (if MFA is enabled)

   ```http
   GET /api/v1/flow/mfa?state={state}
   ```
    - Follow the returned `redirect_url` — it points to enrollment, challenge, or the next step
    - If redirected to enrollment: display QR code and secret from `GET /api/v1/flow/mfa/totp/enroll`, then POST the
      confirmation code
    - If redirected to challenge: display code input, POST to `/api/v1/flow/mfa/totp`
    - If method selection is returned: show available methods and optional skip button

4. **Collect Additional Claims**
   ```http
   GET /api/v1/flow/claims?state={state}

   POST /api/v1/flow/claims
   Authorization: State {state}
   ```
    - GET returns all collectable claims with full metadata (`required`, `name`, `type`, `group`), collected values,
      and suggested values — build the entire form from this single response
    - May auto-redirect if no claims need collection
    - Pre-fill with `value` or `suggested_value` from GET response
    - POST collected values

5. **Validate Claims** (for each required media)
   ```http
   GET /api/v1/flow/claims/validation/{media}?state={state}

   POST /api/v1/flow/claims/validation
   Authorization: State {state}

   POST /api/v1/flow/claims/validation/resend    (if needed)
   Authorization: State {state}
   ```
    - GET to trigger code sending
    - Display code input form with resend option
    - POST code for validation
    - Use resend endpoint if user didn't receive code

6. **Follow Redirects**

   After each step, check the `redirect_url` property:
    - If points to another flow endpoint: Continue to that step
    - If points to client application: Flow complete, handle success
    - If points to error endpoint: Handle error appropriately

### Example Flow Sequence

```
1. GET /api/v1/flow/sign-in?state=abc123
   → Returns: {"password": {...}, "providers": [...], "sign_up_redirect_url": "/sign-up?state=abc123"}
   ↓
2. POST /api/v1/flow/sign-in   [Authorization: State abc123]
   → Returns: {"redirect_url": "/api/v1/flow/mfa?state=abc123"}
   ↓
3. GET /api/v1/flow/mfa?state=abc123
   → Returns: {"redirect_url": "/api/v1/flow/mfa/totp?state=abc123"}
   ↓
4. POST /api/v1/flow/mfa/totp   [Authorization: State abc123]   {"code": "123456"}
   → Returns: {"redirect_url": "/api/v1/flow/claims?state=abc123"}
   ↓
5. GET /api/v1/flow/claims?state=abc123
   → Returns: {"claims": [...]}
   ↓
6. POST /api/v1/flow/claims   [Authorization: State abc123]
   → Returns: {"redirect_url": "/api/v1/flow/claims/validation/EMAIL?state=abc123"}
   ↓
7. GET /api/v1/flow/claims/validation/EMAIL?state=abc123
   → Returns: {"media": "EMAIL", "code": {...}}
   ↓
8. POST /api/v1/flow/claims/validation   [Authorization: State abc123]
   → Returns: {"redirect_url": "https://client.app/callback?code=xyz789"}
   ↓
9. Redirect to client application (flow complete)
```

### Error Handling

The Flow API implements two types of error handling:

**Recoverable Errors** (HTTP 4xx):

- User can modify their request and retry
- Example: Invalid password, validation code incorrect
- Display error message to user and allow retry

**Unrecoverable Errors** (HTTP 303 redirect):

- Session expired, configuration error, etc.
- User automatically redirected to error page
- Flow must be restarted from the beginning

### Best Practices

1. **Always follow redirects**: The server controls flow progression through `redirect_url`
2. **Check for auto-skip**: Some GET endpoints may return only `redirect_url` if the step can be skipped
3. **Preserve state**: Attach the state token to every request your UI originates — as `?state=` query parameter for
   GET requests, and as `Authorization: State <jwt>` header for POST requests. URLs the server returns
   (`redirect_url`, cross-links, provider `authorize_url`) already include the state, so follow them as-is
4. **Handle dynamic claims**: Claims are configuration-driven; don't hardcode which claims to collect
5. **Respect resend limits**: Honor the `resendDate` to prevent spam and improve deliverability
6. **Pre-fill values**: Use `value` and `suggested_value` from responses to improve user experience
7. **Localization**: Send appropriate `Accept-Language` header for localized claim names and messages
