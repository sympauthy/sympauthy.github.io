# Configuration

A key concept of SympAuthy is to allow you to deploy a fully configured instance of it without requiring you
to connect to an interface. Therefore, all the configurations of SympAuthy must be text-based and deployed alongside it.

For this matter, SympAuthy relies on the configuration mechanism
of [Micronaut](https://docs.micronaut.io/latest/guide/#config).

Everything is configurable through the use of:

- YAML or JSON configuration files.
- environment variables.
- parameters passed to the binary.

# Micronaut Environments

SympAuthy uses [Micronaut Environments](https://docs.micronaut.io/latest/guide/#environments) to allow you to use
well-crafted configurations out-of-the-box.

- [```default```](https://github.com/sympauthy/sympauthy/blob/main/server/src/main/resources/application-default.yml):
  Configure every configuration keys listed below with the value indicated in the **Default** column of the table.
  It does not enable any feature that is considered unsecure.
- [```by-mail```](https://github.com/sympauthy/sympauthy/blob/main/server/src/main/resources/application-by-mail.yml):
  Allow the end-user to sign in/sign-up using a login/password with the login being an email address.
- [Well-known providers](/technical/well-known_providers):
  Pre-built configurations for common third-party providers (Google, Discord, etc.). Activating one by its environment
  name automatically configures the OAuth2 URLs, scopes, and claim mappings for that provider.

The micronaut environments you are using can be set using the ```MICRONAUT_ENVIRONMENTS``` environment variable.
**ex** ```MICRONAUT_ENVIRONMENTS=default,by-mail,google```

# Configuration keys

This section describes all the configuration key allowing to configure your instance of SympAuthy.

> The configuration key in the sections and in the tables are sorted by alphanumerical order.

## Micronaut

Since SympAuthy is constructed using the [Micronaut framework](https://micronaut.io/), it shares the configuration keys
of all Micronaut-based applications to configure some basic features.
The table below provides examples of commonly used keys:

| Key                         | Type | Description                               | Required<br>Default |
|-----------------------------|------|-------------------------------------------|---------------------|
| ```micronaut.server.port``` | int  | TCP port the server will be listening to. | NO<br>```8080```    |

The full list is available in
the [Micronaut documentation](https://docs.micronaut.io/latest/guide/configurationreference.html).

## ```r2dbc```

This authorization server accesses its database through
[Micronaut R2DBC](https://micronaut-projects.github.io/micronaut-r2dbc/6.2.0/guide/).

The database **must exist** before starting SympAuthy. Only the schema (tables, indexes, etc.) is created
automatically on first startup.

### ```r2dbc.datasources.default```

| Key            | Type   | Description                                    | Required<br>Default |
|----------------|--------|------------------------------------------------|---------------------|
| ```url```      | string | R2DBC connection URL to the database.          | **YES**             |
| ```username``` | string | Username used to authenticate to the database. | **YES**             |
| ```password``` | string | Password used to authenticate to the database. | NO                  |

### Supported databases

#### PostgreSQL

```yaml
r2dbc:
  datasources:
    default:
      url: r2dbc:postgresql://<host>:<port>/<database>
      username: <username>
      password: <password>
```

#### H2 (in-memory, for development only)

```yaml
r2dbc:
  datasources:
    default:
      url: r2dbc:h2:mem:///sympauthy
```

## ```javamail```

This authorization server can email a user through the use
of [Micronaut Email](https://micronaut-projects.github.io/micronaut-email/latest/guide/).

The SMTP client implementation was chosen because it can be easily integrated with the most commonly used mailing
solutions on the market:

- [Amazon Simple Email Service](https://docs.aws.amazon.com/en_us/ses/latest/dg/send-email-smtp.html).
- [Sendgrid](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api).
- etc.

| Key                  | Type    | Description                                                                                                                                                                                                   | Required<br>Default |
|----------------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```enabled```        | boolean | Set to ```true``` to enable sending emails. If mails are enable but the configuration is missing, it will fail to start with the following message: *JavaMail configuration does not contain any properties.* | NO                  |
| ```authentication``` | object  | Contains the username and the password to authenticate to the SMTP server.                                                                                                                                    | NO                  |
| ```properties```     | object  | Configuration of the SMTP library using its [properties](https://eclipse-ee4j.github.io/angus-mail/docs/api/org.eclipse.angus.mail/org/eclipse/angus/mail/smtp/package-summary.html#properties).              | **YES**             |

**Example**:

```yaml
javamail:
  enabled: true
  authentication:
    username: username
    password: password
  properties:
    mail:
      from: noreply@example.com
      smtp:
        host: ssl.smtp.example.com
        port: 465
        ssl:
          enable: true
```

### ```javamail.authentication```

| Key                         | Type         | Description                                                                                                                                                                                                | Required<br>Default |
|-----------------------------|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```<id>```                  | string       | Uniq identifier of the client.                                                                                                                                                                             | **YES**             |
| ```secret```                | string       | A secret shared between the client and the authorization server.                                                                                                                                           | **YES**             |
| ```allowed-redirect-uris``` | array of URL | A list of URLs where the client is allowed to ask the redirection of the end-user at the end of the OAuth2 authorize grant flow. See [this section](#clients.<id>.allowed-redirect-uris) for more details. | NO                  |

## ```advanced```

This section holds configuration that will change the general behavior of the server.

| Key                            | Type   | Description                                                        | Required<br>Default        |
|--------------------------------|--------|--------------------------------------------------------------------|----------------------------|
| ```jwt```                      | object |                                                                    | YES                        |
| ```user-merging-strategy```    | string | **Deprecated** — replaced by [`auth.user-merging-enabled`](#auth). | YES<br>```by-mail```       |
| ```keys-generation-strategy``` | string |                                                                    | YES<br>```autoincrement``` |
| ```validation-code```          | object | See [advanced.validation-code](#advanced.validation-code).         | YES                        |

### ```advanced.hash```

| Key                             | Type | Description                                                                          | Required<br>Default |
|---------------------------------|------|--------------------------------------------------------------------------------------|---------------------|
| ```block-size```                | int  |                                                                                      | YES<br>```8```      |
| ```cost-parameter```            | int  |                                                                                      | YES<br>```16384```  |
| ```key-length```                | int  | Number of bytes generated as output of the hashing algorithm.                        | YES<br>```32```     |
| ```parallelization-parameter``` | int  |                                                                                      | YES<br>```1```      |
| ```salt-length```               | int  | Number of random bytes to generate and then use as a salt for the hashing algorithm. | YES<br>```256```    |

### ```advanced.jwt```

| Key               | Type   | Description                                                                                                                                                                                                                                | Required<br>Default |
|-------------------|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```access-alg```  | string | Algorithm used to sign access tokens. The algorithm **MUST** be asymmetric and support a public key. Access tokens are signed with a dedicated key, separate from ID tokens per [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068). | YES<br>```rs256```  |
| ```public-alg```  | string | Algorithm used to sign ID tokens and other keys shared publicly. The algorithm **MUST** be asymmetric and support a public key.                                                                                                            | YES<br>```rs256```  |
| ```private-alg``` | string | Algorithm used to encrypt internal keys. The algorithm only have to support public key.                                                                                                                                                    | YES<br>```rs256```  |

### ```advanced.validation-code```

| Key                | Type     | Description                                                                                      | Required<br>Default |
|--------------------|----------|--------------------------------------------------------------------------------------------------|---------------------|
| ```expiration```   | duration | Duration, after the validation code has been generated, where the server will accept it.         | YES<br>```10m```    |
| ```length```       | int      | Number of digit expected in validation code generate by this authorization server.               | YES<br>```6```      |
| ```resend-delay``` | duration | Duration the end-user has to wait before being able to request a new validation code to be sent. | YES<br>```1m```     |

## ```auth```

| Key                        | Type            | Description                                                                                                                                                                                                                                                                                                                                    | Required<br>Default      |
|----------------------------|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------|
| ```issuer```               | string          | The public URL of this authorization server, embedded as the [`iss`](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1) claim in every JWT token it issues. Clients use it to verify that a token was issued by the expected server and to discover the OpenID Connect configuration at `<issuer>/.well-known/openid-configuration`. | YES<br>```<urls.root>``` |
| ```audience```             | string          | [Audience](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3) of the JWT tokens issued for end-user authentication (ex. OAuth2 access and refresh tokens). Required by [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068) in access tokens.                                                                                   | NO<br>```<urls.root>```  |
| ```identifier-claims```    | array of string | List of [claim](/technical/configuration#claims-id) identifiers that uniquely identify a person. These claims are used as the login identifier for password authentication and, when [`user-merging-enabled`](#auth) is `true`, as the key for merging accounts across authentication methods.                                                 | NO<br>```[]```           |
| ```user-merging-enabled``` | boolean         | When `true`, accounts that share the same value for any configured `identifier-claims` are automatically merged across authentication methods (password, third-party providers). When `false`, each authentication method creates a separate account.                                                                                          | NO<br>```false```        |
| ```token```                | object          | Configuration related to authentication tokens issued by this app. See [auth.token](#auth.token) for more details.                                                                                                                                                                                                                             | NO                       |

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

## ```claims.<id>```

This section holds the configuration of claim that can be collected by this authorization server.

There are two types of claims that can be collected by this authorization server:

- [OpenID Connect claims](#openid-connect-claims).
- [Custom claims](#custom-claims).

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

## ```clients.<id>```

This section holds the configuration of all clients that will be authorized to authenticate their users with this
authorization server.

| Key                         | Type            | Description                                                                                                                                                                                                                                                        | Required<br>Default |
|-----------------------------|-----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```<id>```                  | string          | Uniq identifier of the client.                                                                                                                                                                                                                                     | **YES**             |
| ```<authorizationFlow>```   | string          | The identifier of the authorization flow to use for this client. See [authorization flows](#authorization-flows) for more details.                                                                                                                                 | **YES**             |
| ```public```                | boolean         | When `true`, the client is a [public client](/functional/client#confidential-and-public-clients) that does not require a secret. Public clients must use [PKCE](/technical/security#pkce-proof-key-for-code-exchange) and cannot use the client credentials grant. | NO<br>```false```   |
| ```secret```                | string          | Secret shared between the client and the authorization server. Required for confidential clients (`public: false`). Must be omitted for public clients.                                                                                                            | Conditional         |
| ```allowed-scopes```        | array of string | List of scopes the client is allowed to request. Any scope outside this list will be filtered out by this authorization server and will not be granted. <br>If not set or empty, **all scopes** are **allowed**.                                                   | NO                  |
| ```default-scopes```        | array of string | List of scopes that will be requested if the ```scope``` parameter is left when calling the authorize endpoint.                                                                                                                                                    | NO                  |
| ```allowed-redirect-uris``` | array of URL    | A list of URLs where the client is allowed to ask the redirection of the end-user at the end of the OAuth2 authorize grant flow. See [this section](#clients.<id>.allowed-redirect-uris) for more details.                                                         | NO                  |

### ```clients.<id>.allowed-redirect-uris```

If the list is empty, the client will be authorized to use any redirect uri. It is **RECOMMENDED** to configure a list
for production environment to avoid known attacks.

## ```features```

This section holds configuration related to features that can be enabled or disabled.

| Key                                        | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Required<br>Default |
|--------------------------------------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```allow-access-to-client-without-scope``` | boolean | Allow the end-user to be redirected back to the client application even when none of the requested authorization scopes have been granted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | NO<br>```false```   |
| ```email-validation```                     | boolean | Enforce the validation of the end-user's emails. A SMTP must be configured (see [javamail](#javamail)) to enable this feature.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | NO<br>```false```   |
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
> the [Security](security#cors-restriction-on-the-flow-api) documentation for details.

| Key                      | Type | Description                                                                                                           | Required<br>Default |
|--------------------------|------|-----------------------------------------------------------------------------------------------------------------------|---------------------|
| ```sign-in```            | uri  | The URL where the end-user will be enabled to sign-in using any supported methods (password or third party providers) | YES<br>/sign-in     |
| ```mfa```                | uri  | The URL of the MFA router/method-selection page.                                                                      | NO                  |
| ```mfa-totp-enroll```    | uri  | The URL of the TOTP enrollment page.                                                                                  | NO                  |
| ```mfa-totp-challenge``` | uri  | The URL of the TOTP challenge page.                                                                                   | NO                  |
| ```error```              | uri  | The URL where the end-user will be redirected if an error occurs during the authentication.                           | YES<br>/error       |

> The `mfa`, `mfa-totp-enroll`, and `mfa-totp-challenge` URLs are required when [`mfa.totp.enabled`](#mfa) is `true`.
> SympAuthy validates this at startup and fails fast if they are missing.

## ```providers.<id>```

This section holds the configuration of a third-party provider (identified by ```id```) the end-user can go through to
authenticate itself.

| Key             | Type   | Description                                                                                                                   | Required<br>Default                         |
|-----------------|--------|-------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| ```id```        | string | Identifier of the provider. **ex.** ```google```                                                                              | **YES**                                     |
| ```name```      | string | Name of the provider that will be displayed to users by UI. **ex.** ```Google```                                              | **YES**                                     |
| ```oauth2```    | object | Info to initiate an OAuth2 authorization code grant flow with the provider. See [OAuth2 keys](#oauth2-keys) for more details. | NO                                          |
| ```ui```        | object |                                                                                                                               | NO                                          |
| ```user-info``` | object | Endpoint called to obtain end-user info from the provider. See [user info keys](#user-info-keys) for more details.            | - OAuth2: ***YES***<br>- OpenID connect: NO |

### ```providers.<id>.oauth2```

| Key               | Type   | Description                                                                                                   | Required<br>Default |
|-------------------|--------|---------------------------------------------------------------------------------------------------------------|---------------------|
| client-id         | string | An identifier provided by the provider to identify authentication initiated by this authorization server.     | **YES**             |
| client-secret     | string | A secret provided by the provider. It must only be shared between the provider and this authorization server. | **YES**             |
| scopes            | string | Scope requested to the provider to access the info of the user.                                               | **YES**             |
| authorization-url | url    | The OAuth2 authorize url where to redirect the end-user to initiate an authentication with this provider.     | **YES**             |
| token-url         | url    | The OAuth2 token endpoint this authorization server should contact to obtain an access tokens                 | **YES**             |
| token-auth-method | string | How this authorization server should pass the client id and the client secret to the token endpoint.          | **YES**             |

### ```providers.<id>.user-info```

| Key         | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Required<br>Default |
|-------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```url```   | url    | Endpoint URL to get end-user information from the provider.                                                                                                                                                                                                                                                                                                                                                                                                                                  | **YES**             |
| ```paths``` | object | Object containing [JSONPath](https://goessner.net/articles/JsonPath/) to use to extract the end-user info from the response of the [UserInfo endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo) of the provider. The **key** is one of the [OpenID defined claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims). The **value** is the [JSONPath](https://goessner.net/articles/JsonPath/) used to extract the claim value from the response. | **YES**             |

## ```scopes.<id>```

| Key           | Type    | Description                                                                                                                                                                                                  | Required<br>Default   |
|---------------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| ```enabled``` | boolean | Enable the scope.                                                                                                                                                                                            | NO<br>```false```     |
| ```type```    | string  | The scope type. Either [`consentable`](/functional/scope#consentable-scope) or [`grantable`](/functional/scope#grantable-scope). Custom [`client`](/functional/scope#client-scope) scopes are not supported. | NO<br>```grantable``` |

## ```urls```

| Key        | Type         | Description                                                                                       | Required<br>Default  |
|------------|--------------|---------------------------------------------------------------------------------------------------|----------------------|
| ```root``` | absolute url | The url at which the end-user can access the root of the application.                             | **YES**              |
| ```flow``` | object       | The urls where the end-user will be redirected during authentication. See [urls.flow](#urls.flow) | YES<br>Internal flow |

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
