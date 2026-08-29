# Admin API

SympAuthy's [Admin API](/technical/api/admin) (`/api/v1/admin/*`) unlocks advanced test scenarios —
create/list/disable users, manage invitations, inspect config. It is reached with an access token
carrying admin scopes, and the *first* admin user can only be created by redeeming a
[bootstrap invitation](/testcontainers/invitation).

## Enabling the Admin API

`withAdmin()` enables the `admin` environment, which ships everything needed except a flow-driveable
client: the Admin API/UI, an `admin` audience, the `is_sympauthy_admin` claim, a scope-granting rule,
and a `first-admin` bootstrap invitation. `withAdminClient(registry, scopes…)` adds a public client
bound to the `admin` audience and wired to the interactive-flow mock frontend (and requests those
same scopes).

## Creating the first admin user

Read the invitation token from the logs, redeem it through a sign-up flow with
`withInvitationToken(...)`, and use the resulting access token against the Admin API:

```java
try (InteractiveFlowRegistry registry = InteractiveFlowRegistry.forClient(Client.publicClient("admin-app"))
        .withFlowId("admin-flow");
     SympauthyContainer sympauthy = new SympauthyContainer()
        .withAdmin()                                    // Admin API + audience + claim + rule + first-admin invitation
        .withAdminClient(registry, "admin:users:read")  // public admin-audience client wired to the frontend
        .withConfig(Map.of(                             // password auth so the invited admin can sign up
            "auth",   Map.of("by-password", Map.of("enabled", true), "identifier-claims", List.of("email")),
            "claims", Map.of("email", Map.of("enabled", true))))
        .withFlows(registry)) {

    sympauthy.start();

    // 1. Read the bootstrap invitation token SympAuthy logged at startup.
    String token = sympauthy.getBootstrapInvitationToken("first-admin");

    // 2. Redeem it: signing up with the token creates the first admin user.
    TokenResponse admin = registry.newFlow()
        .withInvitationToken(token)
        .withSignUpHandler(cfg -> Map.of("email", "admin@example.com", "password", "Str0ngP@ssw0rd!"))
        .run()
        .exchange();

    // 3. Call the Admin API with the admin-scoped access token.
    HttpResponse<String> users = HttpClient.newHttpClient().send(
        HttpRequest.newBuilder(URI.create(sympauthy.getBaseUrl() + "/api/v1/admin/users"))
            .header("Authorization", "Bearer " + admin.accessToken())
            .GET().build(),
        HttpResponse.BodyHandlers.ofString());
    assertEquals(200, users.statusCode());
}
```

::: tip
`getBootstrapInvitationToken(id)` reads either log form — the raw `Token:` from
`withBootstrapInvitation`, or the `Registration URL:` the built-in `first-admin` logs. Declare your
own invitation for other audiences with `withBootstrapInvitation(...)` (see
[Invitation](/testcontainers/invitation)). The token is only logged while no user has yet
consented for the audience, so read it on a fresh container before redeeming.
:::
