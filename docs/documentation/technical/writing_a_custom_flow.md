# Writing a custom flow

## Flow API

The Flow API provides a set of endpoints to implement custom authentication flows. Each endpoint represents a step in the authentication process and follows consistent patterns for state management, error handling, and flow progression.

### Core Concepts

#### State Management

All authenticated endpoints require a `state` query parameter that identifies the ongoing authorization attempt and session. This parameter must be included in all requests except for the initial configuration call.

#### Redirect Pattern

All endpoints follow a consistent redirect pattern:
```
Operation Complete → Determine Next Step → Return redirect_url
```

The `redirect_url` property will be present in responses when:
- The user has completed the current step and should proceed to the next one
- An unrecoverable error occurred (e.g., the session expired)
- The flow is complete and the user should be redirected back to the client application

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

**Purpose**: Provides initial configuration for the authentication flow. This should be the first call made by a custom flow.

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
      "group": "contact",
      "type": "string"
    }
  ],
  "features": {
    "password_sign_in": true,
    "sign_up": true
  },
  "password": {
    "login_claims": ["email", "username"],
    "sign_up_claims": ["email", "password"]
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
  - `login_claims`: Claims that can be used as login identifiers
  - `sign_up_claims`: Claims required during registration

- `providers`: Available OAuth 2.0 identity providers
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

**Authentication**: Requires valid `state` parameter

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
- Additional claims as configured in `sign_up_claims` (dynamic properties)

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

**Authentication**: Requires valid `state` parameter

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
- `login`: User identifier (matched against claims configured in `login_claims`)
- `password`: User's password

**Response Format**:
```json
{
  "redirect_url": "/api/v1/flow/claims?state=..."
}
```

**Workflow**:
1. Validates login/password combination
2. Identifies user by matching login against configured `login_claims`
3. Returns redirect to next step (typically claims collection or flow completion)

---

### 4. Providers Endpoints

**Base Path**: `/api/v1/flow/providers/{providerId}`

**Purpose**: Handles OAuth 2.0 authorization with third-party identity providers.

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

**Authentication**: Requires valid `state` parameter

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

The request accepts dynamic claim properties. Set a claim to `null` or omit it to indicate the user chose not to provide it.

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
- Sign-up claims are filtered out (already collected during registration)
- Pre-filled values from providers can be edited by the user

---

### 6. Claims Validation Endpoints

**Base Path**: `/api/v1/flow/claims/validation`

**Authentication**: Requires valid `state` parameter

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
    "reasons": ["EMAIL_CLAIM"],
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
    "reasons": ["EMAIL_CLAIM"],
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
   ```
   POST /api/v1/flow/sign-in?state={state}
   ```

   **Option B - Password Sign-Up**:
   ```
   POST /api/v1/flow/sign-up?state={state}
   ```

   **Option C - Provider Authentication**:
   ```
   Redirect to provider's authorize_url from configuration
   (add state parameter to the URL)
   ```

3. **Collect Additional Claims**
   ```
   GET /api/v1/flow/claims?state={state}
   POST /api/v1/flow/claims?state={state}
   ```
   - GET to check if claims are needed (may auto-redirect if not)
   - Display form with required claims
   - Pre-fill with `value` or `suggested_value` from GET response
   - POST collected values

4. **Validate Claims** (for each required media)
   ```
   GET /api/v1/flow/claims/validation/{media}?state={state}
   POST /api/v1/flow/claims/validation?state={state}
   POST /api/v1/flow/claims/validation/resend?state={state}  (if needed)
   ```
   - GET to trigger code sending
   - Display code input form with resend option
   - POST code for validation
   - Use resend endpoint if user didn't receive code

5. **Follow Redirects**

   After each step, check the `redirect_url` property:
   - If points to another flow endpoint: Continue to that step
   - If points to client application: Flow complete, handle success
   - If points to error endpoint: Handle error appropriately

### Example Flow Sequence

```
1. GET /api/v1/flow/configuration
   ↓
2. POST /api/v1/flow/sign-in?state=abc123
   → Returns: {"redirect_url": "/api/v1/flow/claims?state=abc123"}
   ↓
3. GET /api/v1/flow/claims?state=abc123
   → Returns: {"claims": [...]}
   ↓
4. POST /api/v1/flow/claims?state=abc123
   → Returns: {"redirect_url": "/api/v1/flow/claims/validation/EMAIL?state=abc123"}
   ↓
5. GET /api/v1/flow/claims/validation/EMAIL?state=abc123
   → Returns: {"media": "EMAIL", "code": {...}}
   ↓
6. POST /api/v1/flow/claims/validation?state=abc123
   → Returns: {"redirect_url": "https://client.app/callback?code=xyz789"}
   ↓
7. Redirect to client application (flow complete)
```

### Error Handling

The Flow API implements two types of error handling:

**Recoverable Errors** (HTTP 4xx):
- User can modify their request and retry
- Example: Invalid password, validation code incorrect
- Display error message to user and allow retry

**Unrecoverable Errors** (HTTP 3xx redirect):
- Session expired, configuration error, etc.
- User automatically redirected to error page
- Flow must be restarted from the beginning

### Best Practices

1. **Always follow redirects**: The server controls flow progression through `redirect_url`
2. **Check for auto-skip**: Some GET endpoints may return only `redirect_url` if the step can be skipped
3. **Preserve state**: Include the `state` parameter in all authenticated requests
4. **Handle dynamic claims**: Claims are configuration-driven; don't hardcode which claims to collect
5. **Respect resend limits**: Honor the `resendDate` to prevent spam and improve deliverability
6. **Pre-fill values**: Use `value` and `suggested_value` from responses to improve user experience
7. **Localization**: Send appropriate `Accept-Language` header for localized claim names and messages
