# Authorization

This page covers authentication and authorization configuration: identity settings, token behaviour, feature flags, MFA, interactive flows, third-party providers, and scope granting rules.

## ```auth```

| Key                        | Type            | Description                                                                                                                                                                                                                                                                                                                                    | Required<br>Default      |
|----------------------------|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------|
| ```issuer```               | string          | The public URL of this authorization server, embedded as the [`iss`](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1) claim in every JWT token it issues. Clients use it to verify that a token was issued by the expected server and to discover the OpenID Connect configuration at `<issuer>/.well-known/openid-configuration`. | YES<br>```<urls.root>``` |
| ```identifier-claims```    | array of string | List of [claim](/technical/configuration/claim) identifiers that uniquely identify a person. These claims are used as the login identifier for password authentication and, when [`user-merging-enabled`](#auth) is `true`, as the key for merging accounts across authentication methods.                                                 | NO<br>```[]```           |
| ```user-merging-enabled``` | boolean         | When `true`, accounts that share the same value for any configured `identifier-claims` are automatically merged across authentication methods (password, third-party providers). When `false`, each authentication method creates a separate account.                                                                                          | NO<br>```false```        |
| ```authorization-code```   | object          | Configuration for the authorization code grant flow. See [auth.authorization-code](#auth-authorization-code) for more details.                                                                                                                                                                                                                 | NO                       |
| ```token```                | object          | Configuration related to authentication tokens issued by this app. See [auth.token](#auth-token) for more details.                                                                                                                                                                                                                             | NO                       |

### ```auth.authorization-code```

| Key              | Type     | Description                                                                                                                                                              | Required<br>Default |
|------------------|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```expiration``` | duration | Maximum duration an authorization attempt is valid before it expires. The end-user must complete the entire authorization flow (sign-in, claims collection, MFA, etc.) within this time. | YES<br>```30m```    |

### ```auth.by-password```

| Key           | Type    | Description                           | Required<br>Default |
|---------------|---------|---------------------------------------|---------------------|
| ```enabled``` | boolean | Enable password-based authentication. | NO<br>```false```   |

### ```auth.token```

| Key                      | Type     | Description                                                                                                                                                                                                                                                  | Required<br>Default |
|--------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```access-expiration```  | duration | Amount of time the end-user can be considered authenticated after the access token has been issued.                                                                                                                                                          | YES<br>```1h```     |
| ```dpop-required```      | boolean  | When `true`, all token requests must include a [DPoP](/technical/security#dpop-demonstrating-proof-of-possession) proof. When `false`, DPoP is opt-in: clients may send a proof to receive a sender-constrained token, or omit it to receive a bearer token. | NO<br>```false```   |
| ```refresh-enabled```    | boolean  | If set to ```true```, this app will issue refresh tokens that can be used to obtain a new access token without the end-user having to go through the authentication flow.                                                                                    | YES<br>```true```   |
| ```refresh-expiration``` | duration | Amount of time the refresh token can be used to obtain an access token after it has been issued. The refresh token will never expire if this key is not present.                                                                                             | NO                  |

## ```features```

This section holds configuration related to features that can be enabled or disabled.

| Key                                        | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Required<br>Default |
|--------------------------------------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```allow-access-to-client-without-scope``` | boolean | Allow the end-user to be redirected back to the client application even when none of the requested authorization scopes have been granted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | NO<br>```false```   |
| ```email-validation```                     | boolean | Enforce the validation of the end-user's emails. A SMTP must be configured (see [Mail](/technical/configuration/mail)) to enable this feature.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | NO<br>```false```   |
| ```grant-unhandled-scopes```               | boolean | ⚠️ **UNSAFE - DEVELOPMENT ONLY**. Automatically grant ALL [grantable scopes](/functional/scope#grantable-scope) requested by the client that are not explicitly granted nor declined by any scope granting rule.<br>When enabled: Any grantable scope not explicitly granted nor declined is automatically granted.<br>When disabled: Grantable scopes not explicitly granted are rejected (secure default).<br>This feature only applies to grantable scopes. [Consentable scopes](/functional/scope#consentable-scope) always require end-user consent and [client scopes](/functional/scope#client-scope) have their own [granting rules](/functional/client_authorization#scope-granting-rules).<br>To know more about scope granting rules, see this [documentation](/functional/user_authorization#scope-granting-rules). | NO<br>```false```   |

## ```mfa```

This section controls multi-factor authentication (MFA). MFA adds an extra verification step after the user has
authenticated with their primary method (password or third-party provider).

| Key                | Type    | Description                                                                                                             | Required<br>Default |
|--------------------|---------|-------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```required```     | boolean | When ```true```, every user must complete MFA before the flow can proceed. When ```false```, users may skip MFA.        | NO<br>```false```   |
| ```totp.enabled``` | boolean | Enable TOTP (Time-based One-Time Password, [RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238)) as an MFA method. | NO<br>```false```   |

> When `mfa.totp.enabled` is `true`, the corresponding flow URLs (`mfa`, `mfa-totp-enroll`, `mfa-totp-challenge`) must
> be configured in the [`flows.<id>`](#flows-id) section. SympAuthy validates this at startup and refuses to start if
> any required URL is missing.

## ```flows.<id>```

This configuration holds the URL where the end-user will be redirected during its authentication. Sympathy already
includes a complete [authentication flow](https://github.com/sympauthy/sympauthy-flow).

### Web

The flow may be completely customized and served by a completely different server than the authorization server.

> SympAuthy derives the allowed CORS origins for the Flow API (`/api/v1/flow/**`) from the URIs declared here. For each
> URI, the origin (`scheme://host:port`) is extracted and whitelisted. Requests from any other origin are refused. See
> the [Security](/technical/security#cors-restriction-on-the-flow-api) documentation for details.

| Key                      | Type | Description                                                                                                           | Required<br>Default |
|--------------------------|------|-----------------------------------------------------------------------------------------------------------------------|---------------------|
| ```sign-in```            | uri  | The URL where the end-user will be enabled to sign-in using any supported methods (password or third party providers) | YES<br>/sign-in     |
| ```mfa```                | uri  | The URL of the MFA router/method-selection page.                                                                      | NO                  |
| ```mfa-totp-enroll```    | uri  | The URL of the TOTP enrollment page.                                                                                  | NO                  |
| ```mfa-totp-challenge``` | uri  | The URL of the TOTP challenge page.                                                                                   | NO                  |
| ```error```              | uri  | The URL where the end-user will be redirected if an error occurs during the authentication.                           | YES<br>/error       |

> The `mfa`, `mfa-totp-enroll`, and `mfa-totp-challenge` URLs are required when [`mfa.totp.enabled`](#mfa) is `true`.
> SympAuthy validates this at startup and fails fast if they are missing.

## ```rules```

This section holds the configuration of scope granting rules.

| Key          | Type            | Description                                                                                                                                                                                                                                                                                   | Required<br>Default |
|--------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```user```   | array of object | [Scope granting rules](/functional/user_authorization#scope-granting-rules) evaluated during `authorization_code` flows to grant or deny [grantable scopes](/functional/scope#grantable-scope). Expressions evaluate **user claims** using ```CLAIM(...)``` and ```CLAIM_IS_VERIFIED(...)```. | NO                  |
| ```client``` | array of object | [Scope granting rules](/functional/client_authorization#scope-granting-rules) evaluated during `client_credentials` flows to grant or deny [client scopes](/functional/scope#client-scope). Expressions evaluate **client attributes** using ```CLIENT(...)```.                               | NO                  |

### ```rules.user``` / ```rules.client```

Both ```user``` and ```client``` arrays share the same rule structure:

| Key               | Type            | Description                                                                                                                                                                                                          | Required<br>Default |
|-------------------|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```scopes```      | array of string | Scopes affected by this rule. Only requested scopes that appear in this list are granted or denied.                                                                                                                  | **YES**             |
| ```behavior```    | string          | ```grant``` to include the scopes in tokens, ```deny``` to exclude them.                                                                                                                                             | **YES**             |
| ```order```       | int             | Precedence when multiple rules affect the same scope. A matched rule with greater order overrides matched rules of lower order. A matched ```deny``` rule always wins over ```grant``` rules of same or lower order. | NO<br>```0```       |
| ```expressions``` | array of string | Conditions that must all evaluate to ```true``` for the rule to match.                                                                                                                                               | **YES**             |

**Example**:

```yaml
rules:
  user:
    - scopes:
        - admin:config:read
        - admin:users:read
        - admin:users:write
      behavior: grant
      order: 0
      expressions:
        - CLAIM("email") = "admin@example.com" && CLAIM_IS_VERIFIED("email")
  client:
    - scopes:
        - users:claims:write
      behavior: grant
      order: 0
      expressions:
        - CLIENT("name") = "backoffice"
```
