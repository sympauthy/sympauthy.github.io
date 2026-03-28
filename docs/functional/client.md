# Client

A **client** is a software that delegates the authentication and authorization of its users to SympAuthy.

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
- **public** *(optional)*: Set to `true` to declare the client as a public client. Defaults to `false`.
- **client secret**: A secret shared only between SympAuthy and the client, used to verify the authenticity of authentication requests. Required for confidential clients; omitted for public clients.

Refer to the [configuration](/technical/configuration#clients-id) section for the full list of options and an example.