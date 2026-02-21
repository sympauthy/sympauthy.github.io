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
  Default configuration.
- [```by-mail```](https://github.com/sympauthy/sympauthy/blob/main/server/src/main/resources/application-by-mail.yml):
  Allow the end-user to sign in/sign-up using a login/password with the login being an email address.
- [Well-known providers](/documentation/technical/well-known_providers)

The micronaut environments you are using can be set using the ```MICRONAUT_ENVIRONMENTS``` environment variable.
**ex** ```MICRONAUT_ENVIRONMENTS=default,by-mail,google```

> The ```default``` configuration is recommended if you want to use SympAuthy out-of-the-box.

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

## ```advanced```

This section holds configuration that will change the general behavior of the server.

| Key                            | Type   | Description                                                                                                                                                                                                                                                      | Required<br>Default        |
|--------------------------------|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------|
| ```jwt```                      | object |                                                                                                                                                                                                                                                                  | YES                        |
| ```user-merging-strategy```    | string | - ```by-mail```: a person connecting using multiple provider (email+password, any third-party provider) will be merged as long as they have used the same email.<br> - ```none```: a person connecting using multiple provider will have a end-user by provider. | YES<br>```by-mail```       |
| ```keys-generation-strategy``` | string |                                                                                                                                                                                                                                                                  | YES<br>```autoincrement``` |
| ```validation-code```          | object | See [advanced.validation-code](#advanced.validation-code).                                                                                                                                                                                                       | YES                        |

### ```advanced.hash```

| Key                             | Type | Description                                                                          | Required<br>Default |
|---------------------------------|------|--------------------------------------------------------------------------------------|---------------------|
| ```block-size```                | int  |                                                                                      | YES<br>```8```      |
| ```cost-parameter```            | int  |                                                                                      | YES<br>```16384```  |
| ```key-length```                | int  | Number of bytes generated as output of the hashing algorithm.                        | YES<br>```32```     |
| ```parallelization-parameter``` | int  |                                                                                      | YES<br>```1```      |
| ```salt-length```               | int  | Number of random bytes to generate and then use as a salt for the hashing algorithm. | YES<br>```256```    |

### ```advanced.jwt```

| Key               | Type   | Description                                                                                                      | Required<br>Default |
|-------------------|--------|------------------------------------------------------------------------------------------------------------------|---------------------|
| ```public-alg```  | string | Algorithm used to encrypt keys shared publicly. The algorithm **MUST** be asymmetric and support a public   key. | YES<br>```rs256```  |
| ```private-alg``` | string | Algorithm used to encrypt internal keys. The algorithm only have to support public key.                          | YES<br>```rs256```  |

### ```advanced.validation-code```

| Key                | Type     | Description                                                                                      | Required<br>Default |
|--------------------|----------|--------------------------------------------------------------------------------------------------|---------------------|
| ```expiration```   | duration | Duration, after the validation code has been generated, where the server will accept it.         | YES<br>```10m```    |
| ```length```       | int      | Number of digit expected in validation code generate by this authorization server.               | YES<br>```6```      |
| ```resend-delay``` | duration | Duration the end-user has to wait before being able to request a new validation code to be sent. | YES<br>```1m```     |

## ```auth```

| Key            | Type   | Description                                                                                                                                                          | Required<br>Default      |
|----------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------|
| ```issuer```   | string | [Issuer](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1) of each JWT tokens issued by this app.                                                         | YES<br>```<urls.root>``` |
| ```audience``` | string | [Audience](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3) of the JWT tokens issued for end-user authentication (ex. OAuth2 access and refresh tokens). | NO                       |
| ```token```    | object | Configuration related to authentication tokens issued by this app. See [auth.token](#auth.token) for more details.                                                   | NO                       |

### ```auth.token```

| Key                      | Type     | Description                                                                                                                                                               | Required<br>Default |
|--------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```access-expiration```  | duration | Amount of time the end-user can be considered authenticated after the access token has been issued.                                                                       | YES<br>```1h```     |
| ```refresh-enabled```    | boolean  | If set to ```true```, this app will issue refresh tokens that can be used to obtain a new access token without the end-user having to go through the authentication flow. | YES<br>```true```   |
| ```refresh-expiration``` | duration | Amount of time the refresh token can be used to obtain an access token after it has been issued. The refresh token will never expire if this key is not present.          | NO                  |

## ```claims.<id>```

This section holds the configuration of claim that can be collected by this authorization server.

There are two types of claims that can be collected by this authorization server:

- [Standard claims](#standard-claims).
- [Custom claims](#custom-claims).

### Common for both claim types

| Key                  | Type    | Description                                                                                                                                                                                                                                                                                                                   | Required<br>Default   |
|----------------------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| ```allowed-values``` | array   | List of possible values an user can provide for this claim. If not specified or ```null```, all values will be accepted by the authorization server.<br> **Note**: Changing this configuration will not change the value collected for existing user.                                                                         | **NO**<br>```null```  |
| ```enabled```        | boolean | Enable the collection of this claim for end-users. If disabled, the claim will never be stored by this authorization server even if it is made available by a client or a provider. In case this config is changed, it is up to the operator of the authorization server to clear the claim that have been already collected. | **NO**<br>```false``` |
| ```required```       | boolean | The end-user must provide a value for this claim before being allowed to complete an authorization flow.                                                                                                                                                                                                                      | **NO**<br>```false``` |

### Standard claims

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

| Key                         | Type            | Description                                                                                                                                                                                                      | Required<br>Default |
|-----------------------------|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```<id>```                  | string          | Uniq identifier of the client.                                                                                                                                                                                   | **YES**             |
| ```<authorizationFlow>```   | string          | The identifier of the authorization flow to use for this client. See [authorization flows](#authorization-flows) for more details.                                                                               | **YES**             |
| ```secret```                | string          | Secret shared between the client and the authorization server.                                                                                                                                                   | **YES**             |
| ```allowed-scopes```        | array of string | List of scopes the client is allowed to request. Any scope outside this list will be filtered out by this authorization server and will not be granted. <br>If not set or empty, **all scopes** are **allowed**. | NO                  |
| ```default-scopes```        | array of string | List of scopes that will be requested if the ```scope``` parameter is left when calling the authorize endpoint.                                                                                                  | NO                  |  
| ```allowed-redirect-uris``` | array of URL    | A list of URLs where the client is allowed to ask the redirection of the end-user at the end of the OAuth2 authorize grant flow. See [this section](#clients.<id>.allowed-redirect-uris) for more details.       | NO                  |

### ```clients.<id>.allowed-redirect-uris```

If the list is empty, the client will be authorized to use any redirect uri. It is **RECOMMENDED** to configure a list
for production environment to avoid known attacks.

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

## ```features```

This section holds configuration related to features that can be enabled or disabled.

| Key                                        | Type    | Description                                                                                                                               | Required<br>Default |
|--------------------------------------------|---------|-------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```allow-access-to-client-without-scope``` | boolean | Allow the end-user to be redirected back to the client application even when none of the requested authorization scopes have been granted | NO<br>```false```   |
| ```email-validation```                     | boolean | Enforce the validation of the end-user's emails. A SMTP must be configured (see [javamail](#javamail)) to enable this feature.            | NO<br>```false```   |

## ```flows.<id>```

This configuration holds the URL where the end-user will be redirected during its authentication. Sympathy already
includes a complete [authentication flow](https://github.com/sympauthy/sympauthy-flow).

### Web

The flow may be completely customized and served by a completely different server than the authorization server.

:::details
All the domains listed in this configuration will automatically be added to the CORS for the flow API.
:::

| Key           | Type | Description                                                                                                           | Required<br>Default |
|---------------|------|-----------------------------------------------------------------------------------------------------------------------|---------------------|
| ```sign-in``` | uri  | The URL where the end-user will be enabled to sign-in using any supported methods (password or third party providers) | YES<br>/sign-in     |
| ```error```   | uri  | The URL where the end-user will be redirected if an error occurs during the authentication.                           | YES<br>/error       |

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

| Key | Type | Description | Required<br>Default |
|-----|------|-------------|---------------------|

## ```urls```

| Key        | Type         | Description                                                                                       | Required<br>Default  |
|------------|--------------|---------------------------------------------------------------------------------------------------|----------------------|
| ```root``` | absolute url | The url at which the end-user can access the root of the application.                             | **YES**              |
| ```flow``` | object       | The urls where the end-user will be redirected during authentication. See [urls.flow](#urls.flow) | YES<br>Internal flow |

## ```rules```

This section holds the configuration of
the [scope granting rules](/documentation/functional/authorization#scope-granting-rules).

| Key | Type | Description | Required<br>Default |
|-----|------|-------------|---------------------|
