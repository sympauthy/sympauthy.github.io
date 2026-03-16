# User Authorization

SympAuthy controls what a user can access and what information is shared about them through
[consentable](/documentation/functional/scope#consentable-scope) and
[grantable](/documentation/functional/scope#grantable-scope) scopes, granted during `authorization_code` flows.

## Consentable scopes

[Consentable scopes](/documentation/functional/scope#consentable-scope) are granted through end-user consent during the
authorization flow. When a client requests consentable scopes, the end-user is asked to approve which personal
information they are willing to share.

The authorization server never grants consentable scopes on its own — no scope granting rule or API call can substitute
for the user's explicit approval.

## Grantable scopes

[Grantable scopes](/documentation/functional/scope#grantable-scope) are granted by the authorization server through
scope granting rules or by delegating to a third-party through API.

### Scope granting rules

Scope granting rules are conditions evaluated during an authorization attempt to automatically grant or deny grantable
scopes. Their expressions evaluate **user claims** to determine whether a scope should be granted.

They are declared in the [Configuration](/documentation/technical/configuration) under ```rules.scopes``` of the
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

### Delegating to a third-party through API

Scopes granted directly by the API overwrite any scope granting rules.

## Debugging

FIXME Provide an API to debug scope.
