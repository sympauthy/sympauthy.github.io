# Security

SympAuthy is designed with security as a first-class concern. This article describes the technical security measures
built into SympAuthy, covering password storage, token signing, OAuth 2.1 flow protections, sender-constrained tokens,
CORS restriction, and default safe configurations.

## Secure defaults

The `default` [Micronaut environment](configuration#micronaut-environments) enables only features considered safe.
Potentially risky options — such as automatically granting unhandled scopes — are explicitly disabled unless an operator
turns them on.

Configuration keys that have security implications are documented with warnings in the [Configuration](configuration)
reference.

## Password hashing

SympAuthy never stores passwords in plaintext. Every password is hashed using **scrypt** — a memory-hard function that
makes brute-force and dictionary attacks computationally expensive — before being persisted to the database.

A random salt of configurable length is generated for each password, ensuring that two users sharing the same password
produce different hash outputs.

The scrypt parameters are configurable under `advanced.hash`:

| Key                         | Description                                                                                            | Default |
|-----------------------------|--------------------------------------------------------------------------------------------------------|---------|
| `cost-parameter`            | CPU and memory cost of the algorithm. A higher value slows hashing and raises the cost of brute-force. | `16384` |
| `block-size`                | Block size, affecting memory usage.                                                                    | `8`     |
| `parallelization-parameter` | Degree of parallelism.                                                                                 | `1`     |
| `key-length`                | Number of bytes produced as output.                                                                    | `32`    |
| `salt-length`               | Number of random bytes used as salt.                                                                   | `256`   |

> Raising `cost-parameter` hardens the server against brute-force but increases the CPU cost of every login. Tune it to
> match the performance characteristics of your deployment.

## Token signing

SympAuthy issues [tokens](../functional/tokens) as JSON Web Tokens (JWTs). Each token is cryptographically signed so
that its integrity can be verified by any party holding the corresponding public key.

Two categories of keys are used:

- **Public-key tokens** — issued to external parties (clients, providers). The algorithm must be asymmetric so that a
  recipient can verify the signature with the public key alone, without being able to forge tokens. Configured with
  `advanced.jwt.public-alg` (default: `RS256`).
- **Private-key tokens** — used for internal operations. Configured with `advanced.jwt.private-alg` (default: `RS256`).

Access tokens and ID tokens are signed with **separate keys** as recommended
by [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068). This prevents a token intended for one purpose from being
accepted as the other. The access token key uses the `kid` value `access`, while the ID token key uses a distinct `kid`.

Both public keys are exposed through the OpenID Connect discovery endpoint (`/.well-known/openid-configuration`),
allowing clients to verify tokens without a round-trip to SympAuthy.

## Token expiration

Tokens are intentionally short-lived. If a token is intercepted, it becomes useless once it expires.

| Token              | Default lifespan                         | Configuration key               |
|--------------------|------------------------------------------|---------------------------------|
| Access token       | 1 hour                                   | `auth.token.access-expiration`  |
| Refresh token      | None (does not expire unless configured) | `auth.token.refresh-expiration` |
| Authorization code | Single use                               | Enforced                        |

It is strongly recommended to configure `auth.token.refresh-expiration` in production. Without it, a compromised refresh
token remains valid indefinitely.

For more detail on the purpose and lifecycle of each token, see the [Tokens](../functional/tokens) documentation.

## Token revocation

SympAuthy implements
the [OAuth 2.0 Token Revocation specification (RFC 7009)](https://datatracker.ietf.org/doc/html/rfc7009) at
`/api/oauth2/revoke`. Clients can proactively revoke tokens — for example, when a user signs out — so that they are
rejected immediately rather than waiting for expiration.

## Token introspection

SympAuthy implements
the [OAuth 2.0 Token Introspection specification (RFC 7662)](https://datatracker.ietf.org/doc/html/rfc7662) at
`/api/oauth2/introspect`. Resource servers and other authorized parties can submit a token to this endpoint to determine
whether it is still active and to retrieve metadata about it. The endpoint requires client authentication (Client Secret
Basic or Client Secret Post).

## Authorization code security

The authorization code is a short-lived, single-use credential. SympAuthy enforces the following protections:

- **One-time use**: Each authorization code can only be exchanged for tokens once. Any subsequent attempt to reuse it is
  rejected.
- **State parameter required**: The `state` parameter is mandatory on every authorization request, protecting against
  cross-site request forgery (CSRF)
  attacks ([RFC 6749 section 10.12](https://datatracker.ietf.org/doc/html/rfc6749#section-10.12)).
- **Nonce support**: The `nonce` parameter is supported in OpenID Connect flows. Clients can use it to bind a token to a
  specific authentication session and detect replay attacks.

## PKCE (Proof Key for Code Exchange)

SympAuthy implements [PKCE (RFC 7636)](https://www.rfc-editor.org/rfc/rfc7636) to protect the authorization code
exchange
against interception attacks — particularly for [public clients](/functional/client#confidential-and-public-clients)
that cannot store a client secret.

The mechanism works as follows:

1. Before starting the authorization flow, the client generates a random string called the `code_verifier`.
2. The client computes a challenge: `code_challenge = BASE64URL(SHA256(code_verifier))`.
3. The client sends the `code_challenge` and `code_challenge_method=S256` as parameters to the authorization endpoint.
4. SympAuthy stores the challenge alongside the authorization attempt.
5. At token exchange, the client sends the original `code_verifier`.
6. SympAuthy recomputes the challenge from the verifier and compares it to the stored value. If they do not match, the
   request is rejected with `invalid_grant`.

Only the `S256` challenge method is supported. The `plain` method is deliberately not implemented because it does not
protect against interception — [RFC 7636 section 7.2](https://www.rfc-editor.org/rfc/rfc7636#section-7.2) recommends
`S256` for all deployments.

OAuth 2.1 requires PKCE for all clients using the authorization code flow. SympAuthy enforces this — any authorization
request that omits the `code_challenge` parameter is rejected, regardless of whether the client is public or
confidential.

## DPoP (Demonstrating Proof of Possession)

SympAuthy implements [DPoP (RFC 9449)](https://datatracker.ietf.org/doc/html/rfc9449) to bind access tokens to the
client that requested them. Unlike bearer tokens — which can be used by anyone who possesses them — a DPoP-bound token
is only usable by a client that can prove ownership of the private key used during issuance. This mitigates token theft
and replay attacks.

The mechanism works as follows:

1. The client generates an asymmetric key pair and creates a **DPoP proof** — a signed JWT with type `dpop+jwt`.
2. The proof contains the HTTP method (`htm`) and URL (`htu`) of the request, a unique identifier (`jti`), an issued-at
   timestamp (`iat`), and the client's public key in the `jwk` header.
3. The client sends the proof in the `DPoP` HTTP header when calling the token endpoint (`/api/oauth2/token`).
4. SympAuthy validates the proof: it verifies the signature against the embedded public key, checks that `htm` and `htu`
   match the current request, and confirms that `iat` is within 60 seconds.
5. If valid, the issued access token includes a `cnf.jkt` claim containing the SHA-256 thumbprint of the client's public
   key ([RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638)). The token response returns `token_type: "DPoP"`
   instead of `"Bearer"`.
6. Refresh tokens are also DPoP-bound. When refreshing a DPoP-bound token, the client must present a new DPoP proof
   signed with the same key.

The following asymmetric algorithms are supported for DPoP proof signatures:

| Family | Algorithms          |
|--------|---------------------|
| RSA    | RS256, RS384, RS512 |
| EC     | ES256, ES384, ES512 |
| RSA-PS | PS256, PS384, PS512 |

DPoP is configured under `auth.token`:

| Key             | Type    | Description                                                                              | Default |
|-----------------|---------|------------------------------------------------------------------------------------------|---------|
| `dpop-required` | boolean | When `true`, all token requests must include a DPoP proof. When `false`, DPoP is opt-in. | `false` |

> DPoP is opt-in by default. Enabling `dpop-required` forces all clients to present a DPoP proof, which is recommended
> when all clients support it. Even when not required, any client that sends a valid DPoP proof receives a
> sender-constrained token.

The supported DPoP signing algorithms are advertised in the OpenID Connect discovery document
(`/.well-known/openid-configuration`) under the `dpop_signing_alg_values_supported` field.

SympAuthy does not currently implement DPoP server-provided nonces or `jti` replay detection. These are tracked for a
future release.

## CORS restriction on the Flow API

Browsers enforce the Same-Origin Policy: a web page cannot make API requests to a different origin (scheme + host +
port) unless the server explicitly permits it via CORS headers.

SympAuthy disables the global Micronaut CORS filter and replaces it with a narrower, flow-aware policy scoped to the
Flow API (`/api/v1/flow/**`). Only requests whose `Origin` header matches an origin derived from a registered
[flow](configuration#flows-id) are granted CORS access. All other origins receive no CORS headers and their requests are
blocked by the browser.

The allowed origins are computed at startup by extracting the `scheme://host:port` from every URI declared in each
configured `flows.<id>` entry (sign-in, collect-claims, validate-claims, and error URIs). The result is an immutable
set cached for the lifetime of the application.

This policy is **fail-secure**: if no flows are configured, the allowed-origins set is empty and no CORS headers are
ever added.

OPTIONS preflight requests from an allowed origin are short-circuited with a `200` response before the authentication
filter runs, so browsers receive the necessary permission headers even for endpoints that require a token.

## CSRF protection on flow POST endpoints

The Flow API uses a JWT-encoded state token to protect against cross-site request forgery. When an authorization request
is received, SympAuthy generates a signed JWT (containing the `AuthorizeAttempt` ID) and passes it through all flow
redirect URIs as the `state` query parameter. This token is required on every subsequent flow request.

For GET requests (page navigation and initial data fetching), the state is read from the `?state=` URL query parameter.
This is necessary because browsers follow server-side redirects and single-page applications need to read the state on
page load.

For POST requests (form submissions, user actions), the state must be sent in the `Authorization` header using the
custom `State` scheme:

```http
Authorization: State <jwt>
```

This distinction provides true CSRF protection for POST requests. A custom `Authorization` header cannot be sent in a
cross-origin request without triggering a CORS preflight. Combined with the
strict [CORS policy](#cors-restriction-on-the-flow-api) that only allows origins derived from registered flow URIs, a
forged cross-origin POST cannot carry a valid state header and is rejected before it reaches the application.

See the [Flow API](flow_api#state-management) page for a description of how to pass the state in practice.

## Redirect URI validation

After authentication, SympAuthy redirects the user back to the client application. Without restriction, an attacker
could manipulate this redirect to send users to a malicious URL.

Every client must declare at least one permitted redirect URI via the `clients.<id>.allowed-redirect-uris`
configuration key. The server rejects any client configuration without it at startup. Any authorization request using
a URI outside that list is rejected at runtime.

As required by OAuth 2.1
([section 7.5.3](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-7.5.3)), SympAuthy enforces
exact string matching when comparing the redirect URI in the authorization request against registered URIs. No prefix
matching, pattern matching, or normalization is applied.

For native applications using loopback redirects, [RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252)
recommends ignoring the port component. SympAuthy follows this recommendation for redirect URIs whose host is
`127.0.0.1` or `[::1]` over `http` or `https`. This exception does **not** apply to `localhost` or to custom-scheme
URIs, which always require an exact match.

## Secure grant types

SympAuthy supports only the grant types retained by the OAuth 2.1 specification:

| Grant Type                          | Status        | Reason                                                  |
|-------------------------------------|---------------|---------------------------------------------------------|
| Authorization Code Grant            | Supported     | Recommended secure flow                                 |
| Refresh Token Grant                 | Supported     | Standard mechanism for session continuity               |
| Client Credentials Grant            | Supported     | For service-to-service authentication                   |
| Implicit Grant                      | Not Supported | Exposes tokens in the browser URL; removed by OAuth 2.1 |
| Resource Owner Password Credentials | Not Supported | Requires clients to handle user credentials directly    |

The Implicit Grant and Resource Owner Password Credentials flows have been removed from OAuth 2.1. By not supporting
them, SympAuthy prevents patterns that expose credentials or tokens to third parties.

## Scope restriction per client

A client can be limited to a specific subset of scopes through `clients.<id>.allowed-scopes`. Any scope requested
outside this list is silently removed before processing, preventing a misconfigured or compromised client from obtaining
unintended access.

The `features.grant-unhandled-scopes` option is `false` by default. When disabled, any
[grantable scope](/functional/scope#grantable-scope) that is not explicitly granted by a rule or
the API is rejected rather than automatically granted. This setting does not affect
[consentable scopes](/functional/scope#consentable-scope), which are always granted through
end-user consent. Enabling this setting is marked as unsafe and intended for development use only.

See the [User Authorization](../functional/user_authorization)
and [Client Authorization](../functional/client_authorization) documentation for details on scope granting rules.

## Client authentication

SympAuthy supports two categories of clients:

- **Confidential clients** authenticate using a shared secret configured under `clients.<id>.secret`. Two transport
  methods are available:
    - **Client Secret Basic** — credentials passed in the HTTP `Authorization` header.
    - **Client Secret Post** — credentials passed in the POST request body.

- **Public clients** (`clients.<id>.public: true`) do not have a secret. They identify themselves using only their
  `client_id`. To secure the authorization code exchange, public clients must use
  [PKCE](#pkce-proof-key-for-code-exchange). Public clients can only use the authorization code and refresh token
  grants — the client credentials grant requires a secret and is not available to them.

See the [Client](/functional/client#confidential-and-public-clients) documentation for more details.

## Email validation

When `features.email-validation` is enabled, SympAuthy sends a one-time validation code to the user's email address and
requires the user to enter it before completing authentication. This confirms that the user controls the address they
provided and defends against account enumeration and impersonation.

Validation codes include several abuse-prevention measures:

| Setting                                 | Description                                         | Default |
|-----------------------------------------|-----------------------------------------------------|---------|
| `advanced.validation-code.length`       | Number of digits in each code.                      | `6`     |
| `advanced.validation-code.expiration`   | How long the code remains valid after being issued. | `10m`   |
| `advanced.validation-code.resend-delay` | Minimum delay before a new code can be requested.   | `1m`    |

## TOTP multi-factor authentication

When [MFA is enabled](/technical/configuration#mfa), SympAuthy can require users to verify their identity
with a TOTP code ([RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238)) after their primary authentication.

Several safeguards are in place:

- **Confirmed enrollment only**: When a user sets up TOTP, the enrollment is not activated until they enter a valid code
  generated by their authenticator app. This prevents incomplete setups where a secret is registered but the user never
  configured their app.
- **Skip guard**: The skip endpoint (`GET /api/v1/flow/mfa/skip`) is protected. Attempting to skip MFA returns an error
  when `mfa.required` is `true` or when the user has already enrolled in at least one MFA method, ensuring no enrolled
  user can bypass the requirement.
- **Per-session enforcement**: The MFA step is recorded on the authorization attempt (`mfa_passed_date` column). Each
  new sign-in session requires a fresh MFA verification — passing MFA once does not carry over to future sessions.
- **Server-side secrets**: TOTP secrets are stored in the `totp_enrollments` database table. They are never exposed to
  the client after the initial enrollment.

## Third-party authentication

When a user authenticates through a third-party provider (such as Google or Discord), SympAuthy acts as an OAuth 2
client towards that provider. The user authenticates directly on the provider's login page — their credentials are never
shared with SympAuthy or with the client application.

See [Authentication](../functional/authentication#third-party-providers) for a description of the provider flow.
