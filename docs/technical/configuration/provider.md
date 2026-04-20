# Provider

This section holds the configuration of a third-party provider (identified by ```id```) the end-user can go through to
authenticate itself.

## ```providers.<id>```

| Key             | Type   | Description                                                                                                                   | Required<br>Default                         |
|-----------------|--------|-------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| ```id```        | string | Identifier of the provider. **ex.** ```google```                                                                              | **YES**                                     |
| ```name```      | string | Name of the provider that will be displayed to users by UI. **ex.** ```Google```                                              | **YES**                                     |
| ```oauth2```    | object | Info to initiate an OAuth2 authorization code grant flow with the provider. See [OAuth2 keys](#oauth2-keys) for more details. | NO                                          |
| ```oidc```      | object | Info to initiate an OpenID Connect flow with the provider. See [OIDC keys](#oidc-keys) for more details.                      | NO                                          |
| ```ui```        | object |                                                                                                                               | NO                                          |
| ```user-info``` | object | Endpoint called to obtain end-user info from the provider. See [user info keys](#user-info-keys) for more details.            | - OAuth2: ***YES***<br>- OpenID Connect: NO |

> Each provider must have exactly one of `oauth2` or `oidc` configured — not both.
> OIDC providers use [OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) to
> automatically resolve endpoints from the `issuer` URL. This means you do not need to specify endpoint URLs or claim
> mappings manually.

### ```providers.<id>.oidc```  {#oidc-keys}

| Key                    | Type     | Description                                                                                                                                         | Required<br>Default  |
|------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------|----------------------|
| ```issuer```           | url      | The OpenID Connect issuer URL. SympAuthy will fetch the discovery document at `{issuer}/.well-known/openid-configuration` to resolve all endpoints. | **YES**              |
| ```client-id```        | string   | An identifier provided by the provider to identify authentication initiated by this authorization server.                                           | **YES**              |
| ```client-secret```    | string   | A secret provided by the provider. It must only be shared between the provider and this authorization server.                                       | **YES**              |
| ```scopes```           | string[] | Scopes requested to the provider. The `openid` scope is always included automatically.                                                              | NO<br>```[openid]``` |
| ```userinfo-enabled``` | boolean  | Whether to also call the provider's UserInfo endpoint to fetch additional claims. When `false`, claims are extracted from the ID token only.        | NO<br>```false```    |

> The discovery document is fetched at startup. If the issuer URL is invalid or unreachable, SympAuthy will fail fast
> with a clear error message.

> When `userinfo-enabled` is `false` (the default), SympAuthy extracts user claims directly from the ID token returned
> by the provider. This is sufficient for most providers (Google, Microsoft, Auth0, etc.) and avoids an extra HTTP call.

### ```providers.<id>.oauth2```  {#oauth2-keys}

| Key               | Type   | Description                                                                                                   | Required<br>Default |
|-------------------|--------|---------------------------------------------------------------------------------------------------------------|---------------------|
| client-id         | string | An identifier provided by the provider to identify authentication initiated by this authorization server.     | **YES**             |
| client-secret     | string | A secret provided by the provider. It must only be shared between the provider and this authorization server. | **YES**             |
| scopes            | string | Scope requested to the provider to access the info of the user.                                               | **YES**             |
| authorization-url | url    | The OAuth2 authorize url where to redirect the end-user to initiate an authentication with this provider.     | **YES**             |
| token-url         | url    | The OAuth2 token endpoint this authorization server should contact to obtain an access tokens                 | **YES**             |
| token-auth-method | string | How this authorization server should pass the client id and the client secret to the token endpoint.          | **YES**             |

### ```providers.<id>.user-info```  {#user-info-keys}

| Key         | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                  | Required<br>Default |
|-------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```url```   | url    | Endpoint URL to get end-user information from the provider.                                                                                                                                                                                                                                                                                                                                                                                  | **YES**             |
| ```paths``` | object | Object containing [JSONPath](https://goessner.net/articles/JsonPath/) to use to extract the end-user info from the response of the [UserInfo endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo) of the provider. The **key** is one of the [OpenID defined claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims). The **value** is the [JSONPath](https://goessner.net/articles/JsonPath/) used to extract the claim value from the response. | **YES**             |
