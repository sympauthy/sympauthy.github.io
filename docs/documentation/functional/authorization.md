# Authorization

SympAuthy manages authorization by controlling [scopes](#scope) that will be included in tokens emitted to the user.

## Scope

Scopes fulfill two roles in the authorization process of SympAuthy:
- as stated on the OAuth 2 specifications, they limit the user information accessible by the client.
- they represent authorizations granted by SympAuthy.

SympAuthy handles two kind of scopes: 
- [Standard scope](#Standard-scope) defined in specifications.
- [Custom scope](#Custom-scope) defined by the operator for the use-cases of its applications.

### Standard scope

As they are granted automatically to all user, standard scope are mainly a way to control which user info will be accessible to the client.

The list of standard scopes supported by SympAuthy is the following:

| Scope | Origin | Description |
| - | - | - |
| profile | OAuth 2 | |
| 

### Custom scope

You can define your own scope to:
- protect the resources of the clients authenticating their users through this authorization server.
- protect the custom claims you defined.
- etc.

They can be declared either by configuration or by API.

#### By configuration 

To create a custom claims using configuration, you simply need to define a name for it and enable it:

```
scope:
- <scope>:
  enabled: true
```

You can refer to the [configuration](/documentation/technical/configuration) to learn more.

## Granting scope

SympAuthy has two mechanism to grant or decline scope requested by a user during an authorization attempt:
- [Scope granting rules](#scope-granting-rules)
- [Delegating to a third-party through API](#delegating-to-a-third-party-through-api)

### Scope granting rules

Scope granting rules are 

As for client and scope, they are declared in the [Configuration](/documentation/technical/configuration) under ```rules.scopes ``` of the authorization server and looks like following:

```
- scopes:
    - scope
  behavior: grant
  order: 0
  expressions:
    - CLAIM("email") = "test@example.com" && CLAIM_IS_VERIFIED("email")
```

The ```scopes```  is the list of scopes that will be affected by the rule. If multiple rules affect the same scopes, the order in which they will be applied will be determined by the ```behavior``` and the ```order```.

A rule is **applicable** if one of the listed ```scopes``` is requested during an authorization attempt. However the ones that are listed in ```scopes``` but not requested will not be granted or denied.

The ```behavior```  is one of the following:
- ```grant```: The ```scopes``` will be included in tokens emitted to the user.
- ```deny```: The ```scopes``` will not be included in tokens emitted to the user.

A rule is **matched** if all the ```expressions```  returns ```true```for 

The ```order``` helps you to control how the rules are applied when they have conflicting scopes:
- A **matched** rule with greater ```order```  will override any **matched** rules of lower ```order```.
-  A **matched** ```deny``` rule will always win over any number of ```grant``` rules of same or lower ```order```.

> There is no scope granting rules defined in out of the box configuration 

### Delegating to a third-party through API

Scopes granted directly by the API overwrite any scope granting rules.

## Debugging

FIXME Provide an API to debug scope.
