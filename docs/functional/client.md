# Client

A **client** is a software that delegates the authentication and authorization of its users to SympAuthy.

Every client belongs to an **[audience](/functional/audience)**. The audience determines the consent grouping
boundary — clients in the same audience share end-user [consents](/functional/consent) — and the
[`aud` claim](/functional/tokens#structure-of-an-access-token) in access tokens.

Clients interact with SympAuthy through the [OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) protocol. SympAuthy supports two kinds of clients:

- **End-user clients**: Applications that authenticate human users through the [authorization code grant flow](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.1). **Ex.** a web application, a mobile application.
- **Service accounts**: Non-interactive services that authenticate themselves through the [client credentials grant flow](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-4.2). **Ex.** a background job, a micro-service.

## Confidential and public clients

SympAuthy distinguishes between two categories of clients based on their ability to keep a secret:

- **Confidential clients** can securely store a shared secret. They authenticate to SympAuthy using a `client_id` and a `client_secret`. **Ex.** a server-side web application, a backend service.
- **Public clients** cannot safely store a secret — their code is exposed to the end-user. They authenticate using only their `client_id`. **Ex.** a single-page application (SPA), a mobile application, a CLI tool.

Public clients can only use the authorization code grant flow. The client credentials grant — which requires a shared secret — is not available to them.

Both confidential and public clients must use [PKCE](/technical/security#pkce-proof-key-for-code-exchange) when using the authorization code flow, as required by OAuth 2.1.

## Registration

Each client must be registered in SympAuthy before it can authenticate users. Registration is done through configuration and consists of:

- **client id**: A unique identifier for the client.
- **audience**: The [audience](/functional/audience) this client belongs to. Set explicitly or inherited from a client template.
- **public** *(optional)*: Set to `true` to declare the client as a public client. Defaults to `false`.
- **client secret**: A secret shared only between SympAuthy and the client, used to verify the authenticity of authentication requests. Required for confidential clients; omitted for public clients.
- **allowed redirect URIs**: The list of URIs the client is allowed to redirect end-users to after authentication. At least one URI must be configured.

Refer to the [configuration](/technical/configuration/client) section for the full list of options and an example.

## What a client can do

Beyond delegating sign-in, a client can act on the users of its [audience](/functional/audience) through the
[Client API](/technical/api/client) — a set of endpoints the client calls as itself, authenticated with the
[client credentials grant](/functional/authentication#service-account-authentication) and gated by
[client scopes](/functional/scope#client-scope). What a given client is allowed to do depends on the scopes it has been
[granted](/functional/client_authorization):

- **Look up its users** — list the end-users who have [consented](/functional/consent) to its audience and read their
  identity information. Requires `users:read`.
- **Read and write claims** — read the [claims](/functional/claims) it is authorized to see and update the ones it is
  authorized to modify, according to each claim's access control list. Requires `users:claims:read` /
  `users:claims:write`.
- **Manage invitations** — create, list, and revoke [invitations](/functional/invitation) for audiences where open
  sign-up is disabled. Requires `invitations:read` / `invitations:write`.
- **Start MFA enrollment on demand** — let a signed-in user add a second factor from within the application
  (see [below](#enrolling-mfa-on-demand)). Requires `users:mfa:write`.
- **Link an identity provider on demand** — let a signed-in user connect an additional identity provider to their
  account (see [below](#linking-an-identity-provider-on-demand)). Requires `users:providers:write`.

For the request and response details of every operation, see the [Client API](/technical/api/client) reference.

### Enrolling MFA on demand

Normally an end-user enrolls in [multi-factor authentication](/functional/authentication#multi-factor-authentication-mfa)
during sign-in — the first time they authenticate after MFA is enabled. A client can also let an **already-signed-in**
user enroll a second factor **on their own initiative** — for example, from an account-settings or security screen —
without sending them through a full sign-in.

The client asks SympAuthy to start an enrollment on behalf of one of its users and gets back a URL to send that user
to. The user goes through the same enrollment steps as during sign-in — choosing a method, then setting up TOTP — and
once finished is redirected back to the application. An enrollment started this way cannot be skipped.

Because the action is performed for a specific user, the client identifies **both itself and the user** when making the
request. The address the user is returned to is restricted to the client's registered redirect URIs, so users can only
ever be sent back to the application they came from.

This is exposed through the [Start MFA Enrollment](/technical/api/client#multi-factor-authentication-mfa) endpoint of
the Client API.

### Linking an identity provider on demand

An account can be associated with one or more external [identity providers](/technical/configuration/provider), letting
the user sign in through them. A client can let an **already-signed-in** user connect an **additional** provider to
their account — for example, adding a "Sign in with Google" option to an account they originally created with a
password — from an account-settings or security screen, without sending them through a full sign-in.

The client asks SympAuthy to start a link on behalf of one of its users and gets back a URL to send that user to. The
user is asked to **confirm** the action and to **re-authenticate**, then authorizes the target provider; once the link
is created they are redirected back to the application. The provider identity is attached to their existing account — it
never creates a new one.

Re-authentication is required and cannot be skipped: linking a provider mints a **durable login credential**, so the
user must prove they own the account before the link is created. This prevents a leaked access token from silently
attaching a new way to sign in.

Because the action is performed for a specific user, the client identifies **both itself and the user** when making the
request. The address the user is returned to is restricted to the client's registered redirect URIs, so users can only
ever be sent back to the application they came from.

This is exposed through the [Start Provider Link](/technical/api/client#provider-linking) endpoint of the Client API.