# User Authorization

SympAuthy controls what a user can access and what information is shared about them through
[consentable](/functional/scope#consentable-scope) and
[grantable](/functional/scope#grantable-scope) scopes, granted during `authorization_code` flows.

## Consentable scopes

[Consentable scopes](/functional/scope#consentable-scope) are granted through end-user consent during the
authorization flow. When a client requests consentable scopes, the end-user is asked to approve which personal
information they are willing to share.

The authorization server never grants consentable scopes on its own — no scope granting rule or API call can substitute
for the user's explicit approval.

## Grantable scopes

[Grantable scopes](/functional/scope#grantable-scope) are granted by the authorization server through
scope granting rules or by delegating to a third-party through webhook.

### Scope granting rules

Scope granting rules are conditions evaluated during an authorization attempt to automatically grant or deny grantable
scopes. Their expressions evaluate **user claims** to determine whether a scope should be granted.

They are declared in the [Configuration](/technical/configuration) under ```rules.user``` of the
authorization server and look like the following:

```
- scopes:
    - scope
  behavior: grant
  order: 0
  expressions:
    - CLAIM("email") = "test@example.com" && CLAIM_IS_VERIFIED("email")
```

The ```scopes``` is the list of scopes that will be affected by the rule. If multiple rules affect the same scopes, the
order in which they will be applied will be determined by the ```behavior``` and the ```order```.

A rule is **applicable** if one of the listed ```scopes``` is requested during an authorization attempt. However the
ones that are listed in ```scopes``` but not requested will not be granted or denied.

The ```behavior``` is one of the following:

- ```grant```: The ```scopes``` will be included in tokens emitted to the user.
- ```deny```: The ```scopes``` will not be included in tokens emitted to the user.

A rule is **matched** if all the ```expressions``` return ```true``` for a given authorization attempt.

The ```order``` helps you to control how the rules are applied when they have conflicting scopes:

- A **matched** rule with greater ```order``` will override any **matched** rules of lower ```order```.
- A **matched** ```deny``` rule will always win over any number of ```grant``` rules of same or lower ```order```.

> There are no scope granting rules defined in the out-of-the-box configuration.

### Delegating to a third-party through webhook

When the built-in scope granting rules are not sufficient, you can delegate grantable scope decisions to an external
HTTP server — typically the client application's own backend. When an authorization webhook is configured for a client,
SympAuthy calls the external server during the authorization attempt. The external server responds with per-scope
grant/deny decisions, which SympAuthy uses to issue the token.

When an authorization webhook is configured for a client:

1. The user completes authentication and consent normally.
2. SympAuthy determines the set of grantable scopes to evaluate: the intersection of the grantable scopes requested in
   the authorization request and the client's configured `allowed-scopes` list.
3. SympAuthy makes a synchronous HTTP POST to the configured webhook URL, forwarding that filtered scope list along with
   context about the user.
4. The external server evaluates its own business logic and responds with a grant or deny decision for each scope.
5. SympAuthy issues the token using those decisions.

The webhook **replaces** the scope granting rules for that client. If a webhook is configured, rules are not evaluated.

The webhook is not limited to the scopes requested by the client. It may grant additional grantable scopes, as long as
they are within the client's `allowed-scopes` configuration.

Only grantable scopes are sent to the webhook. [Consentable scopes](/functional/scope#consentable-scope) are handled
entirely by the consent flow and are never affected by the webhook.

See the [Authorization Webhook](/technical/authorization_webhook) documentation for the full protocol specification
(request/response format, signature verification, failure behaviour) and
[Configuration](/technical/configuration#clients-id-authorization-webhook) for how to configure it.
