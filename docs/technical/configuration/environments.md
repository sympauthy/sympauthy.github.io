# Environments

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
