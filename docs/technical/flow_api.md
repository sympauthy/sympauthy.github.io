# Flow API

The Flow API provides a set of endpoints to implement custom authentication flows. Each endpoint represents a step in
the authentication process and follows consistent patterns for state management, error handling, and flow progression.

### Core Concepts

#### CORS

The Flow API enforces a strict CORS policy. Cross-origin requests are only allowed from origins (`scheme://host:port`)
that match a URI registered in a configured [flow](configuration#flows-id). Any other origin receives no CORS headers
and the browser blocks the request.

This means that if you serve your custom flow from a different server than SympAuthy, you must declare its URL in the
`flows.<id>` configuration. OPTIONS preflight requests from an allowed origin are handled automatically before
authentication, so no additional setup is needed on your side.

See the [Security](security#cors-restriction-on-the-flow-api) page for a full description of this policy.

#### State Management

All authenticated endpoints require a state token that identifies the ongoing authorization attempt and session (all
endpoints except the initial configuration call require it).

How the state is transmitted depends on the HTTP method:

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
strict [CORS policy](security#cors-restriction-on-the-flow-api) that allows only registered flow origins, a forged
cross-origin POST is rejected before it can execute.

See the [Security](security#csrf-protection-on-flow-post-endpoints) page for a full description of this mechanism.

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

## Flow Endpoints

### 1. Configuration Endpoint

**Path**: `/api/v1/flow/configuration`

**Authentication**: None required (anonymous access)

**Purpose**: Provides initial configuration for the authentication flow. This should be the first call made by a custom
flow.

#### GET Request

Returns the flow configuration including enabled features, collectable claims, and available authentication providers.

**Response Format**:

```json
{
  "claims": [
    {
      "id": "email",
      "required": true,
      "name": "Email Address",
      "type": "string"
    }
  ],
  "features": {
    "password_sign_in": true,
    "sign_up": true
  },
  "password": {
    "identifier_claims": [
      "email"
    ]
  },
  "providers": [
    {
      "id": "google",
      "name": "Google",
      "authorize_url": "/api/v1/flow/providers/google/authorize"
    }
  ]
}
```

**Properties**:

- `claims`: Array of claims that can be collected from users
    - `id`: Unique claim identifier
    - `required`: Whether the claim must be provided
    - `name`: Localized display name
    - `group`: Optional grouping identifier
    - `type`: Data type (`string`, `number`, or `date`)

- `features`: Enabled authentication features
    - `password_sign_in`: Whether password-based sign-in is available
    - `sign_up`: Whether user registration is available

- `password`: Password authentication configuration
    - `identifier_claims`: Claims used as login identifiers and required during registration

- `providers`: Available OAuth 2 identity providers
    - `id`: Provider identifier
    - `name`: Display name
    - `authorize_url`: URL to initiate OAuth flow (state parameter must be added)

**Important Notes**:

- This configuration is cacheable across users (client-specific, not user-specific)
- URLs in the configuration require the `state` parameter to be manually added before use
- The configuration determines which other endpoints are available

---

### 2. Sign-Up Endpoint

**Path**: `/api/v1/flow/sign-up`

**Authentication**: Requires valid state in `Authorization: State <jwt>` header

**Purpose**: Handles new user registration with password-based authentication.

#### POST Request

Creates a new user account with the provided password and claims.

**Request Format**:

```json
{
  "password": "securePassword123",
  "email": "user@example.com",
  "username": "johndoe"
}
```

The request accepts:

- `password`: User's chosen password (required)
- Additional claims as configured in `identifier_claims` (dynamic properties)

**Response Format**:

```json
{
  "redirect_url": "/api/v1/flow/claims?state=..."
}
```

**Workflow**:

1. Validates the password and required claims
2. Creates the user account
3. Returns redirect to the next step (typically claims collection or validation)

---

### 3. Sign-In Endpoint

**Path**: `/api/v1/flow/sign-in`

**Authentication**: Requires valid state in `Authorization: State <jwt>` header

**Purpose**: Authenticates existing users with login and password credentials.

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

- `login`: User identifier (matched against claims configured in `identifier_claims`)
- `password`: User's password

**Response Format**:

```json
{
  "redirect_url": "/api/v1/flow/claims?state=..."
}
```

**Workflow**:

1. Validates login/password combination
2. Identifies user by matching login against configured `identifier_claims`
3. Returns redirect to next step (typically claims collection or flow completion)

---

### 4. Providers Endpoints

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

### 5. Claims Endpoint

**Path**: `/api/v1/flow/claims`

**Authentication**: GET requires `?state=` query parameter; POST requires `Authorization: State <jwt>` header

**Purpose**: Handles collection of additional user information (claims) during the authentication flow.

#### GET Request

Retrieves claims that need to be collected from the user.

**Response Format**:

When claims need to be collected:

```json
{
  "claims": [
    {
      "claim": "phone",
      "collected": false,
      "value": null,
      "suggested_value": "+1234567890"
    },
    {
      "claim": "birthdate",
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

- `claim`: Claim identifier
- `collected`: Whether the claim was already collected from a first-party source
- `value`: Current collected value (if any)
- `suggested_value`: Value obtained from a third-party provider (if any)

**Behavior**:

- If `redirect_url` is present: No claims to collect, proceed to next step automatically
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
    - If no claims needed: Returns `redirect_url` to skip this step
    - If claims needed: Returns list with current/suggested values
2. **POST**: Save claim values
    - Filters to only user-inputted claims
    - Null/empty values indicate claim not provided
    - Returns redirect to next step

**Notes**:

- Identifier claims are filtered out (already collected during registration)
- Pre-filled values from providers can be edited by the user

---

### 6. Claims Validation Endpoints

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

### 7. MFA Endpoints

**Base Path**: `/api/v1/flow/mfa`

**Purpose**: Handles multi-factor authentication during the interactive flow. These endpoints are only active when at
least one MFA method is enabled in the [configuration](/technical/configuration#mfa).

#### MFA Router

**Path**: `/api/v1/flow/mfa`

**Method**: GET

**Authentication**: Requires `?state=` query parameter

**Purpose**: Determines the next MFA step based on the server configuration and the user's enrollment state. The UI
should call this endpoint and follow the returned redirect.

**Routing Logic**:

| `mfa.required` | Methods enrolled | Behavior                                                 |
|-----------------|-----------------|----------------------------------------------------------|
| `false`         | None            | Auto-skip — redirects to the next flow step              |
| `true`          | None            | Auto-redirect to TOTP enrollment                         |
| `true`          | Exactly one     | Auto-redirect to challenge for that method               |
| `false`         | One or more     | Show method selection with a skip option                  |
| `true`          | Multiple        | Show method selection without skip                        |

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
  "methods": ["totp"],
  "skip_redirect_url": "/api/v1/flow/mfa/skip?state=..."
}
```

**Properties**:

- `redirect_url`: URL to redirect to (enrollment, challenge, or next step)
- `methods`: Array of enrolled MFA method identifiers (only when user must choose)
- `skip_redirect_url`: URL to skip MFA (only present when `mfa.required` is `false`)

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
`false`. Calling it when `mfa.required` is `true` returns an error.

**Response Format**:

```json
{
  "redirect_url": "/api/v1/flow/claims?state=..."
}
```

---

## Implementing a Custom Flow

### Recommended Implementation Steps

1. **Initialize Session**
   ```
   GET /api/v1/flow/configuration
   ```
    - No state parameter required
    - Cache configuration for the session
    - Determine available authentication methods
    - Build UI based on enabled features

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
   Redirect to provider's authorize_url from configuration
   (add state parameter to the URL)
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
    - GET to check if claims are needed (may auto-redirect if not)
    - Display form with required claims
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
1. GET /api/v1/flow/configuration
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
3. **Preserve state**: Include the state token in all authenticated requests — as `?state=` query parameter for GET
   requests, and as `Authorization: State <jwt>` header for POST requests
4. **Handle dynamic claims**: Claims are configuration-driven; don't hardcode which claims to collect
5. **Respect resend limits**: Honor the `resendDate` to prevent spam and improve deliverability
6. **Pre-fill values**: Use `value` and `suggested_value` from responses to improve user experience
7. **Localization**: Send appropriate `Accept-Language` header for localized claim names and messages
