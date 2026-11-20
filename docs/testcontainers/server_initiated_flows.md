# Server-initiated Flows

A [client](/functional/client) or an administrator can start an
[interactive flow](/functional/interactive_flow) **on a user's behalf** — an application's "add a second
factor" button in its account settings, for example. The flow opens with a
[confirmation](/functional/interactive_flow#an-action-started-on-the-user-s-behalf) step, where the user
approves or declines the action started for them, and it does not begin at `/authorize` but at a link
the start request answers with. The server starts such flows to enrol MFA (`enroll_mfa`) and to link a
third-party provider (`link_provider`). The module drives the MFA enrollment through to the end; a
provider link goes on to the provider's own pages, which the mock frontend does not serve.

## Entry points

The MFA enrollment starts from either of these endpoints, each answering with a `redirect_url` that
points at the confirm page:

- **Client-initiated:** [`POST /api/v1/client/mfa/enrollment`](/technical/api/client#start-mfa-enrollment),
  with a `client_credentials` token — the token a client obtains for itself, with no user — holding
  the [client scope](/functional/scope#client-scope) `users:mfa:write`. The body carries the user's
  `access_token`, which must have been issued to the same client (otherwise **400**
  `client.mfa.enrollment.invalid_access_token`), and optionally `return_uri` and `return_state`.
- **Admin-initiated:** [`POST /api/v1/admin/users/{user_id}/mfa/enrollment`](/technical/api/admin#start-mfa-enrollment),
  with an admin token holding `admin:users:write`. The body names the client the user returns to as
  `client_id`, and optionally `return_uri` and `return_state`. See
  [The admin-initiated enrollment](#the-admin-initiated-enrollment).

Both answer **400** — `client.mfa.enrollment.mfa_disabled` or `admin.users.mfa.enrollment.mfa_disabled` —
when the container has no `withMfa()`.

The module stays out of that start request: **you** send it, then hand the `redirect_url` and the
return URL to `driveFrom(startUrl, returnUrl)` and call `drive()`. It walks the flow — driving the
confirm and MFA steps with the [handlers described under Multi-factor Authentication](/testcontainers/mfa)
— to the return URL and returns a `FlowResult`.

## Where the flow returns

The return URL is the `return_uri` the start request names or, when it names none, the client's
`return-uri` configuration key. Declare it on the client, as its `return-uri` or in its
`allowed-return-uris` to name it per request; any other is refused with **400**
`client.return_uri.missing` (none named, and no `return-uri`) or `client.return_uri.not_allowed`.
`allowed-redirect-uris` is never read for it: it serves authorizations, the sign-ins that end with an
authorization code. See [Returning to the client](/technical/api/client#returning-to-the-client) and
the [client configuration](/technical/configuration/client).

## Reading the outcome

The server sends the user to the return URL when the flow completes or the user leaves it, and says
which in the return's [parameters](/technical/api/client#returning-to-the-client), so
`result.outcome()` comes from `sympauthy_flow_error`, not from the path:

| `sympauthy_flow_error` on the return                                      | `result.outcome()`          |
|---------------------------------------------------------------------------|-----------------------------|
| absent                                                                    | `SUCCESS` (`isSuccess()`)   |
| `auth.interactive_flow_session.cancelled`                                 | `CANCELED` (`isCanceled()`) |
| any other code: the user left a session that had already failed or expired | `FAILED` (`isFailed()`)     |

A flow that fails or expires while the driver goes through it is sent to the flow's `error` page
instead, which the mock frontend serves and the driver goes no further than: `drive()` throws, as
below, rather than returning `FAILED`.

`result.returnState()` reads the `return_state` the start request sent, echoed as
`sympauthy_return_state` (`null` when it sent none). The return is a plain redirect anyone can
reproduce, so an application checks that value to tell a return it asked for from a forged one;
asserting on it is your test's job. `result.terminalParam(name)` reads any other return parameter —
`sympauthy_flow` is `mfa_enrollment`, while the confirm step's `action()` is `enroll_mfa`.
`result.terminalUrl()` is the path and query of the return reached, such as
`/mfa-return?sympauthy_flow=mfa_enrollment&sympauthy_return_state=xyz`, and `result.stepTypes()` the
steps the run went through: `CONFIRM`, then an `MFA` for each MFA page it answered.

`drive()` throws instead of returning a result, for example when:

- the return carries no `sympauthy_flow`, so SympAuthy did not send the browser there (`FlowException`);
- the flow reached its error page (`FlowException`, naming the page's query, which carries only the
  `state`);
- the server refused a step, such as a wrong TOTP code (`FlowException`);
- the flow reached a step with no handler for it, such as the confirm step without
  `withConfirmHandler` (`UnsupportedFlowStepException`);
- the start or return URL is not a page of the mock frontend (`IllegalArgumentException`).

A handler's own exception, a failed assertion included, is rethrown as is.

## Driving the flow

Call the entry point and drive the link:

```java
InteractiveFlowRegistry registry = InteractiveFlowRegistry       // confidential: client_credentials needs a secret
    .forClient(Client.confidentialClient("mfa-app", "s3cr3t")).withScopes("openid");

String returnUrl = registry.frontendUrl() + "/mfa-return";   // where the flow returns the user, however it ends

try (registry;
     SympauthyContainer sympauthy = new SympauthyContainer()
        .withMfa()                                            // enables TOTP, which the entry point requires
        .withConfig(Map.of(
            "auth",     Map.of("by-password", Map.of("enabled", true), "identifier-claims", List.of("email")),
            "claims",   Map.of("email", Map.of("enabled", true)),
            "features", Map.of("grant-unhandled-scopes", true),               // grant users:mfa:write (see below)
            "templates", Map.of("clients", Map.of("default",                  // route the flow to our pages
                Map.of("authorization-flow", registry.flowId()))),
            "clients",  Map.of(registry.clientId(), Map.of(
                "secret", registry.clientSecret(),
                "authorization-flow", registry.flowId(),
                "allowed-grant-types", List.of("authorization_code", "client_credentials"), // the token in step 1
                "allowed-scopes", List.of("openid", "users:mfa:write"),
                "default-scopes", List.of("openid"),                        // for a request naming no scope
                "allowed-redirect-uris", List.of(registry.redirectUri()),   // for the sign-up below
                "return-uri", returnUrl))))                                 // where the enrollment returns
        .withFlows(registry)) {

    sympauthy.start();

    // A user exists and holds an access token issued to this client (e.g. from a prior sign-up flow).
    String userToken = /* registry.newFlow().withSignUpHandler(...).run().exchange().accessToken() */;

    // 1. A client_credentials token for the calling client. TokenClient is in
    //    com.sympauthy.testcontainers.client; a refused request throws SympauthyApiException.
    String tokenEndpoint = /* the "token_endpoint" field of the document at sympauthy.getOpenIdConfigurationUrl() */;
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
        .withConfirmHandler(resource -> ConfirmDecision.CONFIRM)    // or CANCEL to decline
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

The TOTP handlers and the `Totp` helper are described under
[Multi-factor Authentication](/testcontainers/mfa#the-totp-helper).

Declining at the confirm step — the handler returning `ConfirmDecision.CANCEL` — sends the browser to
that step's [`cancel_url`](/technical/api/flow#leaving-the-flow), which the server redirects to the
return URL with `sympauthy_flow_error=auth.interactive_flow_session.cancelled`: the run reports
`CANCELED`, and its `stepTypes()` are `[CONFIRM, CANCEL]`, `CANCEL` being the module's record of
leaving rather than a page.

## The admin-initiated enrollment

An administrator names the user in the path and the client the user returns to in the body, so no
user access token is involved. One registry can play both parts, its client signing the administrator
in and receiving the return:

1. Configure the container as for [the first admin user](/testcontainers/admin#creating-the-first-admin-user),
   with `withAdminClient(registry, "admin:users:write")` — without that scope the endpoint answers
   **403** — and add `withMfa()`, the default template shown above, and a return URL on that client:
   `withProperty("clients." + registry.clientId() + ".return-uri", returnUrl)`.
2. Create the first admin user and keep their access token.
3. Find the user to enrol: their `user_id` is the `sub` of their tokens, and
   [List Users](/technical/api/admin#list-users) answers it too, with `admin:users:read`.
4. Send `POST /api/v1/admin/users/{user_id}/mfa/enrollment` with the admin token and
   `{"client_id": "<registry.clientId()>", "return_state": "xyz"}`. The response carries only the
   `redirect_url`; an unknown user or client answers **404** `not_found`.
5. Drive the link with `driveFrom(redirectUrl, returnUrl).drive()`, as above. The confirm step's
   `client()` is `null`: no client started the action.

::: warning Server-side settings a server-initiated flow needs
- **MFA**, with `withMfa()`, for either entry point.
- **A return URL** declared on the client the flow returns to: see
  [Where the flow returns](#where-the-flow-returns).
- **The default client template.** The flow ignores the client's own `authorization-flow` and takes its
  pages from the `default` [client template](/technical/configuration/client#templates-clients-id),
  so set `templates.clients.default.authorization-flow: <registry.flowId()>`. Without it the link
  points at the container's own pages, and `drive()` refuses it with `IllegalArgumentException`. The
  `default` template also applies to every client that names no `template`.
- **For the client-initiated entry point**, the `users:mfa:write` scope: in the client's
  `allowed-scopes` when it sets that key, and granted, by
  [`features.grant-unhandled-scopes: true`](/technical/configuration/authorization#features) or by a
  [`rules.client`](/functional/client_authorization#scope-granting-rules) rule granting it. The flag is
  for development only and applies to the whole container: it also grants every
  [grantable scope](/functional/scope#grantable-scope) no rule decides on, in every sign-in the
  container serves.
:::
