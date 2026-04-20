# Client Authorization

SympAuthy controls what operations a client application itself can perform through
[client scopes](/functional/scope#client-scope), granted during `client_credentials` flows. Unlike
[user authorization](/functional/user_authorization), there is no end-user involved — the client
authenticates as itself and receives tokens reflecting its own capabilities.

## Client scopes

[Client scopes](/functional/scope#client-scope) are granted by the authorization server through scope
granting rules or by delegating to a third-party through webhook.

### Scope granting rules

Scope granting rules for client scopes follow the same structure as
[user authorization rules](/functional/user_authorization#scope-granting-rules) — with scopes, behavior,
order, and expressions — but their expressions evaluate **client attributes** instead of user claims.

They are declared in the [Configuration](/technical/configuration/authorization#rules) under ```rules.client``` of the
authorization server and look like the following:

```
- scopes:
    - users:claims:write
  behavior: grant
  order: 0
  expressions:
    - CLIENT("name") = "backoffice"
```

The ```scopes```, ```behavior```, and ```order``` fields work identically to user authorization rules. See
[User Authorization — Scope granting rules](/functional/user_authorization#scope-granting-rules) for a
detailed description of these fields.

The key difference is in the ```expressions```: instead of evaluating user claims with ```CLAIM(...)```, client scope
rules evaluate client attributes with ```CLIENT(...)```.

> There are no client scope granting rules defined in the out-of-the-box configuration.

### Delegating to a third-party through webhook

Webhook delegation for client scopes is not yet supported. See
[sympauthy#209](https://github.com/sympauthy/sympauthy/issues/209) for tracking.
