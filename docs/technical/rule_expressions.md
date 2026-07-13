# Rule Expressions

SympAuthy makes several authorization decisions — such as whether to grant a scope or to allow a
delegation — by evaluating **rules**. Each rule carries one or more **expressions** that you write in
configuration. Expressions are evaluated with [EvalEx](https://github.com/ezylang/EvalEx), a lightweight
expression engine, and must return a **boolean**.

On top of EvalEx's built-in operators and functions, SympAuthy provides a few custom functions that
expose the current context — the end-user's [claims](/functional/claims) and the
[client](/functional/client) involved. This page lists those functions and, importantly, **which rule
types each one is available in**.

For how rules are structured and configured (their `scopes`, `behavior`, `order`, and `expressions`
fields), see the [`rules` configuration](/technical/configuration/authorization#rules).

## Rule types

There are three rule types, each configured under `rules` and each exposing a different set of functions:

| Rule type                  | Configured under   | Purpose                                                                                                                                    | Documented in                                                                 |
|----------------------------|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| User scope granting rule   | ```rules.user```   | Grant or deny [grantable scopes](/functional/scope#grantable-scope) during an `authorization_code` flow, based on the authenticating user. | [User Authorization](/functional/user_authorization#scope-granting-rules)     |
| Client scope granting rule | ```rules.client``` | Grant or deny [client scopes](/functional/scope#client-scope) during a `client_credentials` flow, based on the requesting client.          | [Client Authorization](/functional/client_authorization#scope-granting-rules) |
| Act-as rule                | ```rules.act_as``` | Allow or deny a client to [act on behalf of a user](/functional/delegation) through token exchange.                                        | [Delegation](/functional/delegation#act-as-rules)                             |

## Custom functions

### ```CLAIM```

```
CLAIM("<claim-id>")
```

Returns the value of a [claim](/functional/claims) as a **string**.

- Returns an empty string (`""`) if the claim was collected but has no value.
- Returns `NULL` if the claim was not collected for the user (or if no argument is given).

Depending on the rule type, the claim is read from the **authenticating** user (user scope granting
rules) or the **target** user (act-as rules).

```yaml
expressions:
  - CLAIM("email") = "admin@example.com"
```

### ```CLAIM_IS_VERIFIED```

```
CLAIM_IS_VERIFIED("<claim-id>")
```

Returns a **boolean**: `true` only if the claim was collected **and** marked as verified; `false`
otherwise (including when the claim was not collected).

```yaml
expressions:
  - CLAIM_IS_VERIFIED("email")
```

### ```CLIENT```

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

Depending on the rule type, the client is the **requesting** client (client scope granting rules) or the
**acting** client (act-as rules).

```yaml
expressions:
  - CLIENT("audience") = "admin"
```

## Function availability by rule type

Each rule type is evaluated in its own context, so a custom function is only available in the rule types
where it is meaningful. **Using a function in a rule type where it is not available makes the
configuration invalid** — SympAuthy rejects it when validating the configuration.

| Function                | ```rules.user```      | ```rules.client```  | ```rules.act_as``` |
|-------------------------|-----------------------|---------------------|--------------------|
| ```CLAIM```             | ✅ authenticating user | ❌                   | ✅ target user      |
| ```CLAIM_IS_VERIFIED``` | ✅ authenticating user | ❌                   | ✅ target user      |
| ```CLIENT```            | ❌                     | ✅ requesting client | ✅ acting client    |

In short:

- **User scope granting rules** (```rules.user```) evaluate the authenticating user's claims, so they
  expose ```CLAIM``` and ```CLAIM_IS_VERIFIED```.
- **Client scope granting rules** (```rules.client```) evaluate the requesting client, so they expose
  ```CLIENT```.
- **Act-as rules** (```rules.act_as```) evaluate both the acting client and the target user, so all three
  functions are available.

## Built-in operators and functions

Because every rule starts from the default EvalEx configuration, all of EvalEx's built-in operators and
functions are available in addition to the custom functions above. The operators most useful in rules
are:

- Comparison: `=` (equality), `!=`, `>`, `>=`, `<`, `<=`
- Boolean: `&&` (and), `||` (or), `!` (not)

See the [EvalEx documentation](https://ezylang.github.io/EvalEx/) for the full list of operators and
functions.

Two rules apply to every expression, regardless of type:

- An expression must evaluate to a **boolean**. An expression that returns anything else is rejected as
  invalid configuration.
- A rule is **matched** only when **all** of its ```expressions``` evaluate to `true`.

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
