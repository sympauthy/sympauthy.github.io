# Interactive Flow

The `com.sympauthy.testcontainers.flow` package drives SympAuthy's
[interactive login flow](/functional/interactive_flow) programmatically — from the OAuth authorize
endpoint to an authorization code and tokens — without a browser.

`InteractiveFlowRegistry` is a **mock of the flow frontend**: it stands up a small local HTTP server
that plays the flow's pages (sign-in, collect-claims, …) plus the client's callback. One registry
hosts one `flows.<id>` definition and one client, but any number of `InteractiveFlow`s — each a
single scripted run (a sign-up, a sign-in, …) minted with `registry.newFlow()`. SympAuthy still owns
the orchestration — it decides, through the redirects it issues, which page comes next — while your
callbacks "render" each page by submitting to the Flow API.

## Running a flow

Create the registry first (it binds a local port immediately), hand it to the container with
`withFlows`, then mint a flow, start, and `run()`:

```java
Client client = ...;                       // a public or confidential client — see Clients
InteractiveFlowRegistry registry = InteractiveFlowRegistry.forClient(client).withScopes("openid");
Map<String, Object> clientConfig = ...;    // the matching clients.<id> config — see Clients

try (registry;
     SympauthyContainer sympauthy = new SympauthyContainer()
        .withConfig(Map.of(
            "auth",    Map.of("by-password", Map.of("enabled", true), "identifier-claims", List.of("email")),
            "claims",  Map.of("email", Map.of("enabled", true)),
            "clients", Map.of(client.id(), clientConfig)))   // you own the client (see Clients)
        .withFlows(registry)) {   // contributes only the flows.<id> definition

    InteractiveFlow signUp = registry.newFlow()
        .withSignUpHandler(config -> Map.of("email", "ada@example.com", "password", "Str0ngP@ssw0rd!"))
        .withStepListener(step -> System.out.println("reached " + step.type()));  // optional, react live

    sympauthy.start();

    TokenResponse tokens = signUp.run()   // -> AuthorizationResult (holds the authorization code)
        .exchange();                      // -> TokenResponse (access_token, id_token, …)

    // Assert on the path taken, no listener needed:
    assertEquals(List.of(SIGN_UP, COMPLETED), signUp.stepTypes());
}
```

`withFlows(registry)` contributes only the `flows.<id>` definition (the mock frontend's pages),
applied as program-argument overrides so it wins over any flow config you set elsewhere, and tells
the frontend the container's URLs.

**You own the client:** give it `registry.clientId()`, set its `authorizationFlow` to
`registry.flowId()`, and include `registry.redirectUri()` in its redirect URIs (see
[Clients](/testcontainers/clients)). Then `/authorize` redirects a redirect-following
client through the mock frontend's pages to its `/callback`, which captures the code.

## Handlers

Register only the pages a flow reaches — each callback is an independent functional interface:

| Callback | Purpose |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `withSignInHandler(SignInHandler)`          | supply credentials for an existing user |
| `withSignUpHandler(SignUpHandler)`          | supply sign-up fields (password + identifier claims) for a new user |
| `withClaimsHandler(ClaimsHandler)`          | supply values when the collect-claims page is reached |
| `withStepListener(StepListener)`            | react to every page as the flow reaches it (read its `data()`, call the Flow API) — does not influence it |

[Multi-factor authentication](/testcontainers/mfa) adds three more callbacks for the
confirm and TOTP steps.

`run()` returns an `AuthorizationResult` (the authorization code, plus `exchange()` for tokens). To
assert on the path a flow took, read `flow.stepTypes()` — the `List<FlowStep.Type>` it traversed
(e.g. `[SIGN_UP, COMPLETED]`) — instead of accumulating them through a `StepListener`. For
lower-level access, `FlowApiClient` wraps each Flow API endpoint directly.

## Chaining scenarios

Register a flow per run and run them in order to chain scenarios against one container — for example
a sign-up that creates a user, then a sign-in as that same user (both share the one client and flow):

```java
InteractiveFlow signUp = registry.newFlow().withSignUpHandler(cfg -> Map.of("email", email, "password", password));
InteractiveFlow signIn = registry.newFlow().withSignInHandler(cfg -> Credentials.of(email, password));
sympauthy.start();
signUp.run().exchange();                          // creates the user
TokenResponse tokens = signIn.run().exchange();   // signs in as that user
```

::: tip
The frontend covers the password happy path (sign-in/sign-up → collect claims → code), the confirm
step, and [TOTP multi-factor auth](/testcontainers/mfa). Enforced email/SMS claim
validation raises `UnsupportedFlowStepException`.
:::
