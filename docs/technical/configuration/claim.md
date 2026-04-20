# Claim

This section holds the configuration of claim that can be collected by this authorization server.

There are two types of claims that can be collected by this authorization server:

- [OpenID Connect claims](#openid-connect-claims).
- [Custom claims](#custom-claims).

## ```claims.<id>```

### Common for both claim types

| Key                  | Type    | Description                                                                                                                                                                                                                                                                                                                   | Required<br>Default   |
|----------------------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| ```allowed-values``` | array   | List of possible values an user can provide for this claim. If not specified or ```null```, all values will be accepted by the authorization server.<br> **Note**: Changing this configuration will not change the value collected for existing user.                                                                         | **NO**<br>```null```  |
| ```enabled```        | boolean | Enable the collection of this claim for end-users. If disabled, the claim will never be stored by this authorization server even if it is made available by a client or a provider. In case this config is changed, it is up to the operator of the authorization server to clear the claim that have been already collected. | **NO**<br>```false``` |
| ```required```       | boolean | The end-user must provide a value for this claim before being allowed to complete an authorization flow.                                                                                                                                                                                                                      | **NO**<br>```false``` |

### OpenID Connect claims

| Key        | Type   | Description                                                                                               | Required<br>Default |
|------------|--------|-----------------------------------------------------------------------------------------------------------|---------------------|
| ```<id>``` | string | One of the [OpenID defined claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims). | **YES**             |

### Custom claims

| Key        | Type   | Description                                                    | Required<br>Default |
|------------|--------|----------------------------------------------------------------|---------------------|
| ```<id>``` | string | A string identifying this claim.                               | **YES**             |
| ```type``` | string | The type of data the user is expected to input for this claim. | **YES**             |

#### ```claims.<id>```

The identifier must not contain a dot character.

#### ```claims.<id>.type```
