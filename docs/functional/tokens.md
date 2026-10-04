# Tokens

When SympAuthy successfully authenticates a user, it issues a set of **tokens** to the client application. A token is
a self-contained credential that carries information about the user and their permissions. The client uses these tokens
to know who the user is and to make requests on their behalf.

SympAuthy issues three kinds of tokens, each with a distinct purpose:

- **Access token** — used to access protected resources.
- **Refresh token** — used to obtain a new access token when the current one expires.
- **ID token** — used to identify who the user is.

## Access token

The **access token** is the credential the client presents whenever it wants to access a protected resource. It is
proof that the user has been authenticated and that certain permissions ([scopes](scope)) have been granted.

Access tokens are intentionally short-lived. If one is stolen, it becomes useless quickly. When it expires, the client
uses the [refresh token](#refresh-token) to obtain a new one without asking the user to sign in again.

### Structure of an access token

An access token is encoded as a JSON Web Token (JWT) following
the [JWT Profile for OAuth 2.0 Access Tokens (RFC 9068)](https://datatracker.ietf.org/doc/html/rfc9068). The JWT uses
the `at+jwt` type header and contains the following claims:

| Claim       | Description                                                                                                                                                                                                                                                              | RFC 9068 |
|-------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| `iss`       | Issuer — the URL of this authorization server.                                                                                                                                                                                                                           | MUST     |
| `exp`       | Expiration time.                                                                                                                                                                                                                                                         | MUST     |
| `aud`       | Audience the token is intended for. The value comes from the `token-audience` of the [audience](/functional/audience) the client belongs to.                                                                                                                              | MUST     |
| `sub`       | Subject — the authenticated user's identifier.                                                                                                                                                                                                                           | MUST     |
| `client_id` | The client that requested the token.                                                                                                                                                                                                                                     | MUST     |
| `iat`       | Issued-at time — when *this token* was minted. It moves on every refresh, so it does not say how recently the user signed in; [`auth_time`](#when-the-user-authenticated) does.                                                                                            | MUST     |
| `jti`       | Unique token identifier.                                                                                                                                                                                                                                                 | MUST     |
| `auth_time` | [When the user authenticated](#when-the-user-authenticated), as a Unix timestamp. Absent on `client_credentials` and [delegated](/functional/delegation) (token-exchange) tokens, behind which no user authenticated.                                                      | OPTIONAL |
| `scope`     | Space-separated list of granted scopes. For `authorization_code` tokens: [consentable](/functional/scope#consentable-scope) and [grantable](/functional/scope#grantable-scope) scopes. For `client_credentials` tokens: [client](/functional/scope#client-scope) scopes. For [delegated](/functional/delegation) (token-exchange) tokens: empty — the token is identity-only. | SHOULD   |
| `cnf`       | Confirmation claim. Present when the token is [DPoP-bound](#sender-constrained-tokens-dpop); contains the `jkt` (JWK SHA-256 Thumbprint) of the client's public key.                                                                                                     | OPTIONAL |
| `act`       | Actor claim ([RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693)). Present on [delegated](/functional/delegation) (act-as) tokens; a JSON object whose `sub` is the `client_id` of the client acting on behalf of the user.                                          | OPTIONAL |

The client can read this information directly from the token without making an additional request to SympAuthy.

### A claim in an access token

Beside what it says about its own authorization, an access token can carry [claims](claims) about the
end-user. A deployment names `access-token` in a claim's
[`published-in`](/technical/configuration/claim#claims-id-published-in), and the value then travels under
the claim's own identifier, where
[RFC 9068 section 2.2.3](https://www.rfc-editor.org/rfc/rfc9068#section-2.2.3) defines the profile that
carries an identity claim. What a resource server gets for it is an attribute of the person read off the
credential it already holds, rather than a round trip to `/userinfo` or to introspection on every request.

It is also the place a value travels furthest, and the trade is not the ID token's:

- an access token is a **bearer credential presented on every request**, to every resource server of its
  [audience](/functional/audience), for the whole life of the token — where an ID token is handed over
  once;
- nothing encrypts it, so a claim in one is readable by every party the credential passes through;
- **withdrawing a claim from a token already issued means revoking that token** — editing the
  configuration stops the next token carrying the value and does nothing to the ones already out.

The claim's [ACL](/functional/claim_access) still decides who may be told: it is the client's
half that is asked, exactly as the ID token asks it, and a claim restricted to another audience is left
out. A claim a deployment happens to have named after one of the members above is left out rather than
written over it. A `client_credentials` token carries no claim of an end-user — there is none behind it —
and neither does a [delegated](/functional/delegation) (act-as) one, which holds no scope and so satisfies
no claim's ACL.

### Expiration

Access tokens have a short lifespan — typically minutes to a few hours. The exact duration is controlled by the
`token.access-token.lifespan` configuration key.

Once expired, the access token is rejected. The client must use the refresh token to obtain a new one.

### Acting on behalf of a user

A confidential client can also obtain an access token that acts **on behalf of a user** — without that
user signing in — by exchanging its own token for a delegated one. Such a token carries the user as
`sub`, the acting client in an `act` claim, and no scopes. See [Delegation](/functional/delegation)
for details.

## Refresh token

The **refresh token** is a long-lived credential whose only purpose is to let the client obtain a new access token
when the current one expires. It is never sent to protected resources — only back to SympAuthy.

When the client detects that its access token has expired, it sends the refresh token to SympAuthy. SympAuthy validates
it and issues a fresh access token in return. From the user's perspective, this happens silently: they stay signed in
without being prompted to authenticate again.

### Expiration

Refresh tokens have a much longer lifespan than access tokens — typically hours to days. The exact duration is
controlled by the `token.refresh-token.lifespan` configuration key.

If a refresh token itself expires, the user will need to sign in again from scratch.

## ID token

The **ID token** contains information about the authenticated user — their [claims](claims) such as a name, an email
address, or any custom attributes you have configured. It is intended for the client to read, not for accessing
resources.

While the access token answers "is this user allowed to do this?", the ID token answers "who is this user?"

Which claims it carries is the deployment's decision: a claim reaches the ID token when its
[`published-in`](/technical/configuration/claim#claims-id-published-in) names `id-token` and its ACL lets
the client read it. The OpenID Connect claims ship naming it, so they are where a client expects them.

### Expiration

ID tokens have the same lifespan as access tokens. Once expired, the client should use the refresh token to obtain a
fresh set of tokens.

## When the user authenticated

Every token SympAuthy issues for a user says when that user authenticated, as the `auth_time` claim
[OpenID Connect Core section 2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) defines. It is stated on
every such token, not only when a client asked for it:

- on the **[ID token](#id-token)**, where OpenID Connect defines it;
- on the **[access token](#access-token)**, where
  [RFC 9068 section 2.2.1](https://www.rfc-editor.org/rfc/rfc9068#section-2.2.1) puts it, so a resource server that is
  not SympAuthy can read it too;
- in the **[introspection response](#token-introspection)**, where
  [RFC 9470 section 6.2](https://www.rfc-editor.org/rfc/rfc9470#section-6.2) puts it.

The value is a Unix timestamp — seconds since the epoch. `auth_time` is also always listed in `claims_supported` on the
discovery document (`/.well-known/openid-configuration`), and because nothing configures it, a deployment declaring a
[claim](/technical/configuration/claim#claims-id) under that name is refused at startup.

### It is the moment the credential verified

`auth_time` is the moment the user proved a credential of their account: a password checked, a third-party provider's
callback resolved to the account, or the account created at sign-up. It is **not** the moment the client exchanged the
authorization code for tokens.

Passing a second factor does not move it. `auth_time` says when the credential was proven; whether an
[MFA](/functional/authentication#multi-factor-authentication-mfa) step followed is what the `amr` claim would say, and
SympAuthy publishes no `amr`.

### A refresh reissues it unchanged

This is the whole reason to read `auth_time` rather than `iat`. `iat` is when the token was minted, so it moves on
every [refresh](#refresh-token); `auth_time` is the authentication the refresh descends from, so it does not. An
authentication thirty days old shows an `iat` of a minute ago on a freshly refreshed token — and an `auth_time` of
thirty days ago.

A resource server asking "how recently did this user sign in?" must therefore read `auth_time`. `iat` does not answer
that question.

### Some tokens carry none

A `client_credentials` token and a token obtained through [delegation](/functional/delegation) (token exchange) carry
no `auth_time` at all: the first has no user behind it, and the second asserts an identity nobody proved in that
exchange.

A resource server must treat an absent `auth_time` as **"no user authenticated"** — never as "just now".

## Token introspection

A resource server that receives an access token may need to verify that it is still valid. While JWTs can be verified
locally using the public keys published in the OpenID Connect discovery document, some scenarios require server-side
validation — for example, to check whether a token has been revoked.

SympAuthy provides a token introspection endpoint (`/api/oauth2/introspect`) that accepts a token and returns whether
it is active, along with metadata such as the granted scopes, the client that requested the token, and the
authenticated user. The response also carries the [claims](claims) a deployment
[exposes](/functional/claims#where-a-claim-is-exposed) in the introspection response, each as a top-level
member.

For technical details on the endpoint, authentication requirements, and response format, see the
[Security](../technical/security#token-introspection) documentation.

## Staying signed in

From the user's perspective, being "signed in" means the client holds a valid access token. As long as the client can
silently refresh that token using the refresh token, the user never needs to authenticate again.

The user will be prompted to sign in again when:

- the refresh token has expired (controlled by `token.refresh-token.lifespan`),
- the refresh token has been revoked (for example, following an account action),
- the [consent](/functional/consent) for the user and [audience](/functional/audience) has been revoked by an
  administrator,
- the client explicitly signs the user out.

## Sender-constrained tokens (DPoP)

By default, access tokens are **bearer tokens**: any party that holds the token can use it. If a bearer token is
intercepted, the attacker can use it as if they were the legitimate client.

SympAuthy supports **DPoP** ([Demonstrating Proof of Possession](https://datatracker.ietf.org/doc/html/rfc9449)) as a
way to bind tokens to the client that requested them. When a client presents a DPoP proof during token issuance, the
resulting access token is tied to the client's key pair and cannot be used by another party.

### How it works for the client

When using DPoP, the client must:

1. Generate an asymmetric key pair (e.g., RSA or ECDSA).
2. Include a signed DPoP proof JWT in the `DPoP` header of every token request.
3. Present the access token with `token_type: "DPoP"` to resource servers, along with a new DPoP proof for each
   request.

### Token response differences

When a DPoP proof is accepted, the token response differs from a standard bearer token response:

- `token_type` is `"DPoP"` instead of `"Bearer"`.
- The access token JWT contains a `cnf` claim with a `jkt` field — the SHA-256 thumbprint of the client's public key.

### Refresh tokens

Refresh tokens are also bound to the DPoP key. When refreshing a DPoP-bound token, the client must send a new DPoP
proof signed with the same key that was used during the original token issuance.

For technical details on the DPoP mechanism and configuration, see the
[Security](../technical/security#dpop-demonstrating-proof-of-possession) documentation.
