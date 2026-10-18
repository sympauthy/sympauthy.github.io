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

`withFlows(registry)` applies that definition as program-argument overrides, so it wins over any
flow config you set elsewhere, and tells the frontend the container's URLs.

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

`run()` returns an `AuthorizationResult`: the authorization `code()`, the `state()` echoed back on
the client redirect, the PKCE `codeVerifier()` the run sent, and `exchange()` to trade the code for
tokens (or [exchange it yourself](#exchanging-the-code-yourself)). To assert on the path a flow took, read `flow.stepTypes()` — the `List<FlowStep.Type>` it traversed
(e.g. `[SIGN_UP, COMPLETED]`) — instead of accumulating them through a `StepListener`. For
lower-level access, `FlowApiClient` wraps each Flow API endpoint directly.

## Authorization request parameters

The driver assembles the `/authorize` request that starts a run.
`withAuthorizationParam(name, value)` adds an extra query parameter to it — the escape hatch for a
parameter the module does not model ([`max_age`](/functional/authentication), `claims`, `prompt`,
`login_hint`, `acr_values`, …). Call it once per parameter; the value is url-encoded, so one that
needs it — a JSON object, a space-separated list — reaches the server intact. The run stays an
ordinary `run()`: the driver still generates the PKCE pair and the `AuthorizationResult` still
`exchange()`s.

```java
TokenResponse tokens = registry.newFlow()
    .withSignInHandler(cfg -> Credentials.of(email, password))
    .withAuthorizationParam("max_age", "60")
    .withAuthorizationParam("prompt", "login")
    .run()
    .exchange();
```

The parameters the driver computes — `response_type`, `client_id`, `redirect_uri`, `scope`
(from the registry's `withScopes(...)`), `state`, `code_challenge` and `code_challenge_method` —
are what make that exchange possible, so setting one raises `IllegalArgumentException` rather than
being honoured; a test that needs one of them malformed has to issue the authorization request
itself. A test that only needs to send the token request itself does not: it reads
[`codeVerifier()`](#exchanging-the-code-yourself) instead. `nonce` and `invitation_token` may be set
this way too, but `withNonce(...)` and [`withInvitationToken(...)`](/testcontainers/invitation) spell
them better; set both ways, the value given here wins.

## Exchanging the code yourself

`exchange()` sends the token request through the module's own client. A test that has to prove
something about that request sends it through a client of its own instead — a client generated from
the server's OpenAPI document, for example. The result answers the `code()` and its
`codeVerifier()`; the registry answers `clientId()`, `redirectUri()` and, for a
[confidential client](/testcontainers/clients#confidential-client), `clientSecret()`:

```java
AuthorizationResult result = registry.newFlow()
    .withSignInHandler(cfg -> Credentials.of(email, password))
    .run();

// grant_type=authorization_code, sent through the test's own client
Map<String, String> form = Map.of(
    "grant_type", "authorization_code",
    "code", result.code(),
    "redirect_uri", registry.redirectUri(),
    "code_verifier", result.codeVerifier(),
    "client_id", registry.clientId());
```

The token endpoint refuses the code without that verifier: it is the secret behind the `S256`
`code_challenge` the run sent on `/authorize`. Reading it beats issuing `/authorize` by hand, because
the run keeps everything it adds to the authorization request — the registry's scopes,
`withNonce(...)`, `withAuthorizationParam(...)`, the invitation token.

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
