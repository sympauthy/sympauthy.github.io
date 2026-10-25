# Expressions

SympAuthy makes several authorization decisions — whether to grant a scope, to allow a delegation, or to
open a [door](/functional/claim_access#doors) of a [claim's ACL](/functional/claim_access) — by evaluating
**expressions** that you write in configuration. Expressions are evaluated with
[EvalEx](https://github.com/ezylang/EvalEx), a lightweight expression engine, and must return a **boolean**.

On top of EvalEx's built-in operators and functions, SympAuthy provides custom
[functions](/technical/expressions/functions) that expose the current context — the end-user's
[claims](/functional/claims), the [client](/functional/client) involved, and the scopes and the token a claim
is read or written through.

## Where expressions are used

Each place below takes expressions and exposes its own set of [functions](/technical/expressions/functions).
Its functional documentation explains what it decides, and its configuration documentation how to write it.

| Where                      | Decides                                                                                                                                       | Functional documentation                                                      | Configuration                                                                          |
|----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| User scope granting rule   | Grant or deny [grantable scopes](/functional/scope#grantable-scope) during an `authorization_code` flow, based on the authenticating user.    | [User Authorization](/functional/user_authorization#scope-granting-rules)     | [```rules.user```](/technical/configuration/authorization#rules-user-rules-client)     |
| Client scope granting rule | Grant or deny [client scopes](/functional/scope#client-scope) during a `client_credentials` flow, based on the requesting client.             | [Client Authorization](/functional/client_authorization#scope-granting-rules) | [```rules.client```](/technical/configuration/authorization#rules-user-rules-client)   |
| Act-as rule                | Allow or deny a client to [act on behalf of a user](/functional/delegation) through token exchange.                                           | [Delegation](/functional/delegation#act-as-rules)                             | [```rules.act_as```](/technical/configuration/authorization#rules-act-as)              |
| Claim ACL door             | Let a caller read or write a [claim](/functional/claims) through one [door](/functional/claim_access#doors) of its ACL.                       | [Claim Access Control](/functional/claim_access)                              | [```claims.<id>.acl```](/technical/configuration/claim#claims-id-acl)                  |

## Built-in operators and functions

Because every rule starts from the default EvalEx configuration, all of EvalEx's built-in operators and
functions are available in addition to SympAuthy's [functions](/technical/expressions/functions). The
operators most useful in rules are:

- Comparison: `=` (equality), `!=`, `>`, `>=`, `<`, `<=`
- Boolean: `&&` (and), `||` (or), `!` (not)

See the [EvalEx documentation](https://ezylang.github.io/EvalEx/) for the full list of operators and
functions.

Two rules apply to every expression, regardless of type:

- An expression must evaluate to a **boolean**. An expression that returns anything else is rejected as
  invalid configuration.
- A rule is **matched** only when **all** of its ```expressions``` evaluate to `true`; a door of a claim's
  ACL holds one expression, and is open when it does.

## Writing an expression in YAML

An expression is a YAML string, and most need no quotes. Quote one that YAML would otherwise read as something
else: an expression that starts with `!`, which YAML reads as a tag, and the literals `"true"` and `"false"`.

```yaml
acl:
  readable-by-person: SCOPE_IS_CONSENTED("profile")
  readable-by-client: '!CLIENT("public")'
  collected-in-flow: "false"
```

Single quotes keep the double quotes of a function's argument as they are.

## Examples

A user scope granting rule that grants an admin scope to a specific verified email:

```yaml
rules:
  user:
    - scopes:
        - admin:users:read
      behavior: grant
      order: 0
      expressions:
        - CLAIM("email") = "admin@example.com" && CLAIM_IS_VERIFIED("email")
```

A client scope granting rule that grants a client scope to a specific client:

```yaml
rules:
  client:
    - scopes:
        - users:claims:write
      behavior: grant
      order: 0
      expressions:
        - CLIENT("client_id") = "backoffice"
```

An act-as rule that lets a bot act on behalf of users with a verified Discord identity — combining
```CLIENT``` and ```CLAIM_IS_VERIFIED```:

```yaml
rules:
  act_as:
    - behavior: allow
      order: 0
      expressions:
        - CLIENT("client_id") = "discord-bot" && CLAIM_IS_VERIFIED("discord_id")
```

A claim a client reads by its own scope or by the end-user's consent, and that the end-user writes only
through a bound token behind a recent authentication:

```yaml
claims:
  phone_number:
    template: personal
    acl:
      readable-by-client: SCOPE_IS_CONSENTED("phone") || SCOPE_IS_GRANTED("users:claims:read")
      writable-by-person: SCOPE_IS_CONSENTED("phone:write") && TOKEN_IS_BOUND() && AUTHENTICATION_IS_YOUNGER_THAN("5m")
```
