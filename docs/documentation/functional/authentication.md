# Authentication

Authentication is the process of verifying who a user is. SympAuthy handles this on behalf of your applications so
they do not have to manage it themselves.

There are two kinds of authentication depending on who is trying to connect:

- **End-user authentication** — A person signs into a client application.
- **Service account authentication** — A non-interactive service authenticates itself to access protected resources.

## End-user authentication

When an end-user wants to access a client application, they go through an authentication flow:

1. The client application redirects the user to SympAuthy.
2. The user proves their identity (see [authentication methods](#authentication-methods) below).
3. SympAuthy redirects the user back to the client application with proof of successful authentication.

For a detailed walkthrough of each step from the user's perspective, see [How an Interactive Flow Works](interactive_flow).

### Authentication methods

SympAuthy supports two ways for an end-user to authenticate:

#### Email and password

The user enters the email address and password they registered with. This method must be explicitly enabled in the
configuration using the `by-mail` environment.

#### Third-party providers

The user authenticates through an external service — such as Google — that SympAuthy trusts. This is often shown to
users as a "Sign in with Google" button.

When the user chooses this method:

1. SympAuthy redirects them to the provider's login page.
2. The user authenticates on the provider's side.
3. The provider confirms the authentication to SympAuthy and shares basic user information (name, email, etc.).
4. SympAuthy redirects the user back to the client application.

The user never shares their provider password with SympAuthy or with the client application.

##### Supported providers

SympAuthy ships with built-in configurations for the following providers, which can be enabled directly from their
Micronaut environment:

| Provider | Environment |
|----------|-------------|
| Google   | `google`    |
| Discord  | `discord`   |

Any other OAuth 2-compatible service can also be configured manually. Refer to the
[configuration](/documentation/technical/configuration#providers-id) section for the full list of options.

##### Account merging

A user may authenticate with multiple methods over time — for example, first with email and password, then later with
Google — while using the same email address for both.

By default, SympAuthy recognises that these are the same person and merges the two into a single account. The user ends
up with one account regardless of the method they used to sign in.

This behavior is controlled by the `advanced.user-merging-strategy` configuration key. Refer to the
[configuration](/documentation/technical/configuration#advanced) section for available options.

## Service account authentication

A service account is used by a non-interactive service — such as a background job or a micro-service — that needs to
authenticate itself to access protected resources, without any human user involved.

Service accounts authenticate using their client credentials (a client ID and a client secret) and receive a token that
grants them the requested access.

For setup details, see the [Client](client) page.