# Functions

On top of EvalEx's built-in operators and functions, SympAuthy provides custom functions that an
[expression](/technical/expressions/) may call. They expose the context the expression is evaluated in —
the end-user's [claims](/functional/claims), the [client](/functional/client) involved, and the scopes and
the token a claim is read or written through.

| Function                                                               | Returns | Answers                                                                     |
|------------------------------------------------------------------------|---------|-----------------------------------------------------------------------------|
| [```AUTHENTICATION_IS_YOUNGER_THAN```](#authentication-is-younger-than) | boolean | Whether the end-user authenticated behind the token recently enough.        |
| [```CLAIM```](#claim)                                                  | string  | The value of one of the end-user's claims.                                  |
| [```CLAIM_IS_VERIFIED```](#claim-is-verified)                          | boolean | Whether one of the end-user's claims was collected and verified.            |
| [```CLIENT```](#client)                                                | varies  | A property of the client.                                                   |
| [```SCOPE_IS_CONSENTED```](#scope-is-consented)                        | boolean | Whether the end-user consented to a scope.                                  |
| [```SCOPE_IS_GRANTED```](#scope-is-granted)                            | boolean | Whether the server granted a scope to the token.                            |
| [```TOKEN_IS_BOUND```](#token-is-bound)                                | boolean | Whether the token is bound to a key with DPoP.                              |

Each rule type and each [door](/functional/claim_access#doors) of a claim's ACL is evaluated in its own
context, so a function is only available where it is meaningful, and each function below lists where that is.
**Using a function anywhere else makes the configuration invalid** — SympAuthy rejects it when validating the
configuration.

Every function is named for its subject, then for what is asked of it. A function returning a value is named
for its subject alone, with what to return as its argument — `CLIENT("audience")`. A function answering yes or
no is named `<SUBJECT>_IS_<STATE>(…)` — `CLAIM_IS_VERIFIED("email")`. The scope functions are named after how
the scope reached the token — consented to by the end-user, or granted by the server — never after who holds it.

None of the scope, authentication and token functions ever returns `NULL`: each answers `false` where the
token has no such thing. **Their scope and duration arguments are string literals**, because they are
checked when the configuration is read — a scope against the scopes the deployment declares, a duration for
being one. Anything else, such as a `CLAIM(...)` in their place, makes the configuration invalid.

## ```AUTHENTICATION_IS_YOUNGER_THAN```

```
AUTHENTICATION_IS_YOUNGER_THAN("<duration>")
```

Returns a **boolean**: `true` when the end-user's [authentication](/functional/tokens#when-the-user-authenticated)
behind the token is no older than the duration, and `false` behind a token no end-user authenticated behind: a
`client_credentials` token, or one obtained by [token exchange](/functional/delegation), which asserts an identity
nobody proved. The duration is written the way every duration key of the configuration is — `5m`, `1h`, `PT5M` —
and must be greater than zero. On the [Client API](/technical/api/client) the token is the calling client's own,
which no end-user authenticated behind, so a door requiring this is shut there.

```yaml
acl:
  readable-by-client: SCOPE_IS_CONSENTED("profile") && AUTHENTICATION_IS_YOUNGER_THAN("1h")
```

| Available in             | Evaluated against                              |
|--------------------------|------------------------------------------------|
| ```readable-by-person``` | the end-user's authentication behind the token |
| ```writable-by-person``` | the end-user's authentication behind the token |
| ```readable-by-client``` | the end-user's authentication behind the token |
| ```writable-by-client``` | the end-user's authentication behind the token |

## ```CLAIM```

```
CLAIM("<claim-id>")
```

Returns the value of a [claim](/functional/claims) as a **string**.

- Returns `NULL` if the claim was not collected for the user, or if it was collected without a value.
  `CLAIM()` with no argument is refused when the configuration is read. There is no case in which it answers an empty string, so testing
  `CLAIM("x") = ""` never matches.

```yaml
expressions:
  - CLAIM("email") = "admin@example.com"
```

| Available in       | Evaluated against                                                         |
|--------------------|---------------------------------------------------------------------------|
| ```rules.user```   | the authenticating user's claims of the audience the authorization is for |
| ```rules.act_as``` | the target user's claims of the audience the token exchange names         |

A claim restricted to another [audience](/functional/audience) answers as if it was never collected.

## ```CLAIM_IS_VERIFIED```

```
CLAIM_IS_VERIFIED("<claim-id>")
```

Returns a **boolean**: `true` only if the claim was collected **and** marked as verified; `false`
otherwise (including when the claim was not collected).

```yaml
expressions:
  - CLAIM_IS_VERIFIED("email")
```

| Available in       | Evaluated against                                                         |
|--------------------|---------------------------------------------------------------------------|
| ```rules.user```   | the authenticating user's claims of the audience the authorization is for |
| ```rules.act_as``` | the target user's claims of the audience the token exchange names         |

A claim restricted to another [audience](/functional/audience) answers as if it was never collected.

## ```CLIENT```

```
CLIENT("<property>")
```

Returns the value of a property of the client. Only the following properties are supported — any other
property returns `NULL`:

| Property                   | Returns | Description                                                                                                       |
|----------------------------|---------|-------------------------------------------------------------------------------------------------------------------|
| ```id``` / ```client_id``` | string  | The [client](/functional/client)'s identifier.                                                                    |
| ```audience```             | string  | The identifier of the [audience](/functional/audience) the client belongs to.                                     |
| ```public```               | boolean | `true` for a [public client](/functional/client#confidential-and-public-clients), `false` for a confidential one. |

```yaml
expressions:
  - CLIENT("audience") = "admin"
```

| Available in             | Evaluated against                  |
|--------------------------|------------------------------------|
| ```rules.client```       | the requesting client              |
| ```rules.act_as```       | the acting client                  |
| ```collected-in-flow```  | the client that started the flow   |
| ```readable-by-person``` | the client the token was issued to |
| ```writable-by-person``` | the client the token was issued to |
| ```readable-by-client``` | the client the token was issued to |
| ```writable-by-client``` | the client the token was issued to |

## ```SCOPE_IS_CONSENTED```

```
SCOPE_IS_CONSENTED("<scope>")
```

Returns a **boolean**: `true` when the end-user [consented](/functional/consent) to that
[consentable scope](/functional/scope#consentable-scope), for the audience the read or write is for. On the
[Client API](/technical/api/client), it answers from the consent the end-user recorded for the client's
audience.

```yaml
acl:
  readable-by-client: SCOPE_IS_CONSENTED("profile")
```

| Available in             | Evaluated against                        |
|--------------------------|------------------------------------------|
| ```collected-in-flow```  | the scopes consented to in the flow      |
| ```readable-by-person``` | the scopes consented to for the audience |
| ```writable-by-person``` | the scopes consented to for the audience |
| ```readable-by-client``` | the scopes consented to for the audience |
| ```writable-by-client``` | the scopes consented to for the audience |

## ```SCOPE_IS_GRANTED```

```
SCOPE_IS_GRANTED("<scope>")
```

Returns a **boolean**: `true` when the server granted that scope to the token — the client's own
[client scope](/functional/scope#client-scope) on a `client_credentials` token, a
[grantable scope](/functional/scope#grantable-scope) on an end-user's, whether a
[scope granting rule](/functional/user_authorization#scope-granting-rules), the
[authorization webhook](/technical/authorization_webhook) or
[`grant-unhandled-scopes`](/technical/configuration/authorization#features) granted it. It never answers for a scope
the end-user consented to, so a door opened on it is opened to what the deployment decided, never to what a
client asked for. `SCOPE_IS_GRANTED("users:claims:read")` is `false` on an end-user's token, which carries no
client scope.

```yaml
acl:
  readable-by-client: SCOPE_IS_GRANTED("users:claims:read")
```

| Available in             | Evaluated against                |
|--------------------------|----------------------------------|
| ```readable-by-person``` | the scopes granted to the token  |
| ```writable-by-person``` | the scopes granted to the token  |
| ```readable-by-client``` | the scopes granted to the token  |
| ```writable-by-client``` | the scopes granted to the token  |

## ```TOKEN_IS_BOUND```

```
TOKEN_IS_BOUND()
```

Returns a **boolean**: `true` when the token is bound to a key with
[DPoP](/functional/tokens#sender-constrained-tokens-dpop), `false` for a bearer token. On the
[Client API](/technical/api/client), it asks about the calling client's own token.

```yaml
acl:
  readable-by-client: SCOPE_IS_CONSENTED("profile") && TOKEN_IS_BOUND()
```

| Available in             | Evaluated against |
|--------------------------|-------------------|
| ```readable-by-person``` | the token         |
| ```writable-by-person``` | the token         |
| ```readable-by-client``` | the token         |
| ```writable-by-client``` | the token         |
