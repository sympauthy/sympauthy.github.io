# Server-initiated Flows

A client or an administrator can **initiate** an interactive flow on a user's behalf. The flow opens
with a **confirm** step — the user approves or cancels the action that was started for them — and,
unlike a normal sign-in, does not begin at `/authorize` but at a link the initiating API hands back.
Today the only action is enrolling **TOTP MFA** (`ENROLL_MFA`); the mechanism is general and more
actions will follow.

## Entry points

Two entry points start such a flow and return that link (a `redirect_url` pointing at the confirm
page):

- **Client-initiated:** `POST /api/v1/client/mfa/enrollment` with a `client_credentials` token
  holding `users:mfa:write`, and the target user's access token in the body.
- **Admin-initiated:** `POST /api/v1/admin/users/{userId}/mfa/enrollment` with an admin token (see
  [Admin API](/testcontainers/admin)).

The module stays out of that initiation call: **you** invoke the entry point, then hand the returned
link plus the success/cancel URLs you passed to `driveFrom(startUrl, successUrl, cancelUrl)` and call
`drive()`. It walks the flow — driving the confirm and MFA steps with the
[handlers described under Multi-factor Authentication](/testcontainers/mfa) — to a terminal
and returns a `FlowResult`: `SUCCESS` if it reached the success URL, `CANCELED` if it reached the
cancel URL.

## Driving the flow

Enable MFA on the container with `withMfa()` (today's action enrols MFA), then call the entry point
and drive the link:

```java
InteractiveFlowRegistry registry = InteractiveFlowRegistry
    .forClient(Client.confidentialClient("mfa-app", "s3cr3t")).withScopes("openid");

String successUrl = registry.frontendUrl() + "/mfa-return";   // the return_uri you pass the API
String cancelUrl  = registry.frontendUrl() + "/mfa-cancel";   // the cancel_uri you pass the API

try (registry;
     SympauthyContainer sympauthy = new SympauthyContainer()
        .withMfa()                                            // optional TOTP
        .withConfig(Map.of(
            "auth",     Map.of("by-password", Map.of("enabled", true), "identifier-claims", List.of("email")),
            "claims",   Map.of("email", Map.of("enabled", true)),
            "features", Map.of("grant-unhandled-scopes", true),               // grant users:mfa:write (see note)
            "templates", Map.of("clients", Map.of("default",                  // route the standalone flow to our pages
                Map.of("authorization-flow", registry.flowId()))),
            "clients",  Map.of(registry.clientId(), Map.of(
                "secret", registry.clientSecret(),
                "authorizationFlow", registry.flowId(),
                "allowed-grant-types", List.of("authorization_code", "client_credentials"),
                "allowed-scopes", List.of("openid", "users:mfa:write"),
                "default-scopes", List.of("openid"),
                "allowed-redirect-uris", List.of(registry.redirectUri(), successUrl, cancelUrl)))))
        .withFlows(registry)) {

    sympauthy.start();

    // A user exists and holds an access token issued to this client (e.g. from a prior sign-up flow).
    String userToken = /* registry.newFlow().withSignUpHandler(...).run().exchange().accessToken() */;

    // 1. A client_credentials token for the calling client (the token_endpoint is in the discovery doc).
    TokenClient tokenClient = new TokenClient(tokenEndpoint, HttpClient.newHttpClient(), registry.client());
    String clientToken = tokenClient.clientCredentials("users:mfa:write").accessToken();

    // 2. Call the entry point yourself; read redirect_url from its JSON response.
    HttpResponse<String> init = HttpClient.newHttpClient().send(
        HttpRequest.newBuilder(URI.create(sympauthy.getBaseUrl() + "/api/v1/client/mfa/enrollment"))
            .header("Authorization", "Bearer " + clientToken)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(
                "{\"access_token\":\"" + userToken + "\",\"return_uri\":\"" + successUrl
                    + "\",\"cancel_uri\":\"" + cancelUrl + "\"}"))
            .build(),
        HttpResponse.BodyHandlers.ofString());
    String startUrl = /* the "redirect_url" field of init.body() */;

    // 3. Drive the returned link. Approve and auto-enrol TOTP; capture the secret for a later challenge.
    AtomicReference<String> secret = new AtomicReference<>();
    FlowResult result = registry.newFlow()
        .withConfirmHandler(action -> ConfirmDecision.CONFIRM)      // or CANCEL to decline
        .withTotpEnrollmentHandler(data -> {                        // optional: observe the secret
            secret.set(data.secret());
            return Totp.code(data.secret());                        // (this is also the default)
        })
        .driveFrom(startUrl, successUrl, cancelUrl)
        .drive();

    assertEquals(FlowOutcome.SUCCESS, result.outcome());            // CANCELED if the handler returned CANCEL
}
```

`driveFrom(startUrl, successUrl, cancelUrl)` verifies all three URLs belong to the mock frontend; the
`successUrl` / `cancelUrl` are the `return_uri` / `cancel_uri` you pass the initiating API — register
them as the client's redirect URIs. The **admin-initiated** endpoint works the same way with an admin
token instead of a client-credentials one.

::: warning Two server-side settings a server-initiated flow needs
Both are shown in the example above:

- A standalone flow resolves its pages from the **default client template**, so point it at your flow
  with `templates.clients.default.authorization-flow: <registry.flowId()>`; otherwise it falls back
  to pages on the container itself.
- A `client_credentials` request for the built-in `users:mfa:write` scope needs the scope in the
  client's `allowed-scopes` **and** `features.grant-unhandled-scopes: true` (or a `rules.client`
  granting it).
:::
