# Client

A **client** is a software that delegates the authentication and authorization of its users to SympAuthy.

Clients interact with SympAuthy through the [OAuth 2](https://datatracker.ietf.org/doc/html/rfc6749) protocol. SympAuthy supports two kinds of clients:

- **End-user clients**: Applications that authenticate human users through the [authorization code grant flow](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1). **Ex.** a web application, a mobile application.
- **Service accounts**: Non-interactive services that authenticate themselves through the [client credentials grant flow](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4). **Ex.** a background job, a micro-service.

## Registration

Each client must be registered in SympAuthy before it can authenticate users. Registration is done through configuration and consists of:

- **client id**: A unique identifier for the client.
- **client secret**: A secret shared only between SympAuthy and the client, used to verify the authenticity of authentication requests.

Refer to the [configuration](/documentation/technical/configuration#clients-id) section for the full list of options and an example.