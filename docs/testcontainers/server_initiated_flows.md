# Server-initiated Flows

A client or an administrator can **initiate** an interactive flow on a user's behalf. The flow opens
with a **confirm** step — the user approves or cancels the action that was started for them — and,
unlike a normal sign-in, does not begin at `/authorize` but at a link the initiating API hands back.
Today the only action is enrolling **TOTP MFA** (`enroll_mfa`); the mechanism is general and more
actions will follow.

## Entry points

Two entry points start such a flow and return that link (a `redirect_url` pointing at the confirm
page):

- **Client-initiated:** `POST /api/v1/client/mfa/enrollment` with a `client_credentials` token
  holding `users:mfa:write`, and the target user's access token in the body.
- **Admin-initiated:** `POST /api/v1/admin/users/{userId}/mfa/enrollment` with an admin token (see
  [Admin API](/testcontainers/admin)).

The module stays out of that initiation call: **you** invoke the entry point, then hand the returned
link and the URL the flow returns the user to — the `return_uri` you passed the entry point, or the
client's `return-uri` when you passed none — to `driveFrom(startUrl, returnUrl)` and call `drive()`. It
walks the flow — driving the confirm and MFA steps with the
[handlers described under Multi-factor Authentication](/testcontainers/mfa) — to that URL and returns
a `FlowResult`.

## Reading the outcome

The server returns the user to the same URL however the flow ended, and says how in the return's
[parameters](/technical/api/client#returning-to-the-client), so `result.outcome()` comes from
`sympauthy_flow_error`, not from the path:

| `sympauthy_flow_error` on the return       | `result.outcome()`              |
|--------------------------------------------|---------------------------------|
| absent                                     | `SUCCESS` (`isSuccess()`)       |
| `auth.interactive_flow_session.cancelled`  | `CANCELED` (`isCanceled()`)     |
| any other code                             | `FAILED` (`isFailed()`)         |

`result.returnState()` reads the `return_state` your start request sent, echoed as
`sympauthy_return_state` (`null` when you sent none); asserting on it is your test's job.
`result.terminalParam(name)` reads any other return parameter, such as `sympauthy_flow`, and
`result.terminalUrl()` is the URL reached, query string included.

`drive()` throws a `FlowException` instead of returning a result when:

- the return carries no `sympauthy_flow`, so it did not come through SympAuthy's hand-back;
- the flow failed or expired and the server showed its error page, which the driver does not follow
  any further;
- a confirm handler returned `ConfirmDecision.CANCEL` at a step that offers no `cancel_url`.

## Driving the flow

Enable MFA on the container with `withMfa()` (today's action enrols MFA), then call the entry point
and drive the link:

```java
InteractiveFlowRegistry registry = InteractiveFlowRegistry
    .forClient(Client.confidentialClient("mfa-app", "s3cr3t")).withScopes("openid");

String returnUrl = registry.frontendUrl() + "/mfa-return";   // where the flow returns the user, however it ends

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
                "allowed-redirect-uris", List.of(registry.redirectUri()),   // authorizations only
                "return-uri", returnUrl))))                                 // where the enrollment returns
        .withFlows(registry)) {

    sympauthy.start();

    // A user exists and holds an access token issued to this client (e.g. from a prior sign-up flow).
    String userToken = /* registry.newFlow().withSignUpHandler(...).run().exchange().accessToken() */;

    // 1. A client_credentials token for the calling client (the token_endpoint is in the discovery doc).
    TokenClient tokenClient = new TokenClient(tokenEndpoint, HttpClient.newHttpClient(), registry.client());
    String clientToken = tokenClient.clientCredentials("users:mfa:write").accessToken();

    // 2. Call the entry point yourself; read redirect_url from its JSON response. With no return_uri,
    //    the flow returns to the client's return-uri, echoing the return_state.
    HttpResponse<String> init = HttpClient.newHttpClient().send(
        HttpRequest.newBuilder(URI.create(sympauthy.getBaseUrl() + "/api/v1/client/mfa/enrollment"))
            .header("Authorization", "Bearer " + clientToken)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(
                "{\"access_token\":\"" + userToken + "\",\"return_state\":\"xyz\"}"))
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
        .driveFrom(startUrl, returnUrl)
        .drive();

    assertEquals(FlowOutcome.SUCCESS, result.outcome());            // CANCELED if the handler returned CANCEL
    assertEquals("xyz", result.returnState());                      // the return_state sent in step 2
}
```

`driveFrom(startUrl, returnUrl)` verifies both URLs belong to the mock frontend. Declare the return
URL on the client as its `return-uri`, as above, or list it in its `allowed-return-uris` and name it
per request as `return_uri`: the server refuses a start request that returns anywhere else, and never
reads `allowed-redirect-uris`, which serves authorizations only (see the
[client configuration](/technical/configuration/client)).

Declining at the confirm step — the handler returning `ConfirmDecision.CANCEL` — sends the browser to
that step's `cancel_url`, which the server redirects to the return URL with
`sympauthy_flow_error=auth.interactive_flow_session.cancelled`: the run reports `CANCELED` and its
`stepTypes()` are `[CONFIRM, CANCEL]`.

The **admin-initiated** endpoint works the same way with an admin token instead of a
client-credentials one. It takes no user access token: it names the client the user returns to as
`client_id` in the body, and the return URL is checked against that client's `return-uri` and
`allowed-return-uris`.

::: warning Two server-side settings a server-initiated flow needs
Both are shown in the example above:

- A standalone flow resolves its pages from the **default client template**, so point it at your flow
  with `templates.clients.default.authorization-flow: <registry.flowId()>`; otherwise it falls back
  to pages on the container itself.
- A `client_credentials` request for the built-in `users:mfa:write` scope needs the scope in the
  client's `allowed-scopes` **and** `features.grant-unhandled-scopes: true` (or a `rules.client`
  granting it).
:::
