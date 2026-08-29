# Clients

An [interactive flow](/testcontainers/interactive_flow) runs against a client you own: you
create a `Client`, declare a matching `clients.<id>` configuration on the container, and wire it to
the mock frontend with `registry.clientId()`, `registry.flowId()` and `registry.redirectUri()`.

## Public client

A public client (PKCE only, no secret):

```java
Client client = Client.publicClient("test-app");
Map<String, Object> clientConfig = Map.of(
    "public", true,
    "authorizationFlow", registry.flowId(),
    "allowed-grant-types", List.of("authorization_code"),
    "allowed-scopes", List.of("openid"),
    "allowed-redirect-uris", List.of(registry.redirectUri()));
```

## Confidential client

Authenticates at the token endpoint with a secret (`client_secret_post`, or `client_secret_basic`):

```java
Client client = Client.confidentialClient("test-app", "s3cr3t");  // + Client.ClientAuthMethod.BASIC for HTTP Basic
Map<String, Object> clientConfig = Map.of(
    "public", false,
    "secret", client.secret(),
    "authorizationFlow", registry.flowId(),
    "allowed-grant-types", List.of("authorization_code"),
    "allowed-scopes", List.of("openid"),
    "allowed-redirect-uris", List.of(registry.redirectUri()));
```
