# Well-known providers

SympAuthy includes default configurations for some well-known third-party providers.

You can enable them by adding the [Micronaut environments](https://docs.micronaut.io/latest/guide/index.html#environments) associated to them to your configuration.

## Google

**Environment:** `google`
**Protocol:** OpenID Connect (OIDC)

Google is configured via [OpenID Connect Discovery](/technical/configuration#oidc-keys). Enabling the `google`
environment provides a default configuration that uses Google's OIDC issuer — you only need to supply your client
credentials.

```yaml
providers:
  google:
    oidc:
      client-id: ${GOOGLE_CLIENT_ID}
      client-secret: ${GOOGLE_CLIENT_SECRET}
```

The default configuration requests the `openid`, `email`, and `profile` scopes and extracts claims from the ID token
(no UserInfo call).

To obtain a client ID and secret, create an OAuth 2.0 credential in the
[Google Cloud Console](https://console.cloud.google.com/apis/credentials).

## Discord

**Environment:** `discord`
**Protocol:** OAuth2

Discord does not support OpenID Connect, so it is configured via [OAuth2](/technical/configuration#oauth2-keys) with
explicit endpoint URLs and claim mappings. Enabling the `discord` environment provides a default configuration — you
only need to supply your client credentials.

```yaml
providers:
  discord:
    oauth2:
      client-id: ${DISCORD_CLIENT_ID}
      client-secret: ${DISCORD_CLIENT_SECRET}
```

To obtain a client ID and secret, create an application in the
[Discord Developer Portal](https://discord.com/developers/applications).

## Custom providers

Any OAuth 2-compatible service can be configured manually using the [`providers.<id>.oauth2`](/technical/configuration#oauth2-keys) keys. Any OpenID Connect-compatible service can be configured using the [`providers.<id>.oidc`](/technical/configuration#oidc-keys) keys — only the issuer URL and client credentials are required.
