# Security

SympAuthy is designed with security as a first-class concern. This article describes the technical security measures
built into SympAuthy, covering password storage, token signing, OAuth 2.0 flow protections, CORS restriction, and
default safe configurations.

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

The active public key is exposed through the OpenID Connect discovery endpoint (`/.well-known/openid-configuration`),
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

## Authorization code security

The OAuth 2.0 authorization code is a short-lived, single-use credential. SympAuthy enforces the following protections:

- **One-time use**: Each authorization code can only be exchanged for tokens once. Any subsequent attempt to reuse it is
  rejected.
- **State parameter required**: The `state` parameter is mandatory on every authorization request, protecting against
  cross-site request forgery (CSRF)
  attacks ([RFC 6749 section 10.12](https://datatracker.ietf.org/doc/html/rfc6749#section-10.12)).
- **Nonce support**: The `nonce` parameter is supported in OpenID Connect flows. Clients can use it to bind a token to a
  specific authentication session and detect replay attacks.

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

## Redirect URI validation

After authentication, SympAuthy redirects the user back to the client application. Without restriction, an attacker
could manipulate this redirect to send users to a malicious URL.

The `clients.<id>.allowed-redirect-uris` configuration key lets you restrict each client to an explicit list of
permitted redirect URIs. Any request using a URI outside that list is rejected.

> Always configure `allowed-redirect-uris` for production deployments. If the list is left empty, any redirect URI is
> accepted, which opens the authorization server to open redirect attacks.

## Secure grant types

SympAuthy deliberately supports only the grant types that follow current security best practices:

| Grant Type                          | Status        | Reason                                                     |
|-------------------------------------|---------------|------------------------------------------------------------|
| Authorization Code Grant            | Supported     | Recommended secure flow                                    |
| Refresh Token Grant                 | Supported     | Standard mechanism for session continuity                  |
| Client Credentials Grant            | Supported     | For service-to-service authentication                      |
| Implicit Grant                      | Not Supported | Exposes tokens in the browser URL; deprecated by OAuth 2.1 |
| Resource Owner Password Credentials | Not Supported | Requires clients to handle user credentials directly       |

By not supporting the Implicit Grant and Resource Owner Password Credentials flows, SympAuthy prevents patterns that
expose credentials or tokens to third parties.

## Scope restriction per client

A client can be limited to a specific subset of scopes through `clients.<id>.allowed-scopes`. Any scope requested
outside this list is silently removed before processing, preventing a misconfigured or compromised client from obtaining
unintended access.

The `features.grant-unhandled-scopes` option is `false` by default. When disabled, any scope that is not explicitly
granted by a rule or the API is rejected rather than automatically granted. Enabling this setting is marked as unsafe
and intended for development use only.

See the [Authorization](../functional/authorization) documentation for details on scope granting rules.

## Client authentication

Every client must authenticate itself to SympAuthy using a shared secret configured under `clients.<id>.secret`. Two
methods are supported:

- **Client Secret Basic** — credentials passed in the HTTP `Authorization` header.
- **Client Secret Post** — credentials passed in the POST request body.

Public clients (clients without a secret) are not supported, ensuring that all token requests come from an identified
and authenticated client.

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

## Third-party authentication

When a user authenticates through a third-party provider (such as Google or Discord), SympAuthy acts as an OAuth 2.0
client towards that provider. The user authenticates directly on the provider's login page — their credentials are never
shared with SympAuthy or with the client application.

See [Authentication](../functional/authentication#third-party-providers) for a description of the provider flow.