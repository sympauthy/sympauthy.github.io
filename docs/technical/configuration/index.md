# Configuration

A key concept of SympAuthy is to allow you to deploy a fully configured instance of it without requiring you
to connect to an interface. Therefore, all the configurations of SympAuthy must be text-based and deployed alongside it.

For this matter, SympAuthy relies on the configuration mechanism
of [Micronaut](https://docs.micronaut.io/latest/guide/#config).

Everything is configurable through the use of:

- YAML or JSON configuration files.
- environment variables.
- parameters passed to the binary.

**Example**: configuring the server port using each method:

::: code-group

```yaml [application.yml]
micronaut:
  server:
    port: 9090
```

```sh [Environment variable]
export MICRONAUT_SERVER_PORT=9090
```

```sh [Command-line argument]
java -jar sympauthy.jar --micronaut.server.port=9090
```

:::

## Micronaut

Since SympAuthy is constructed using the [Micronaut framework](https://micronaut.io/), it shares the configuration keys
of all Micronaut-based applications to configure some basic features.
The table below provides examples of commonly used keys:

| Key                         | Type | Description                               | Required<br>Default |
|-----------------------------|------|-------------------------------------------|---------------------|
| ```micronaut.server.port``` | int  | TCP port the server will be listening to. | NO<br>```8080```    |

The full list is available in
the [Micronaut documentation](https://docs.micronaut.io/latest/guide/configurationreference.html).

## ```urls```

SympAuthy needs to know its own public URL so it can build correct redirect URIs, populate the `iss` claim in JWT tokens, and serve the OpenID Connect discovery document. This URL must be the address that end-users and client applications use to reach the server.

| Key        | Type         | Description                                                           | Required<br>Default |
|------------|--------------|-----------------------------------------------------------------------|---------------------|
| ```root``` | absolute url | The url at which the end-user can access the root of the application. | **YES**             |

**Example**:

```yaml
urls:
  root: https://auth.example.com
```

## Configuration pages

- [Environments](/technical/configuration/environments) — Micronaut environments for out-of-the-box configurations.
- [Database](/technical/configuration/database) — Database connection (PostgreSQL, H2).
- [Mail](/technical/configuration/mail) — Email / SMTP configuration.
- [Client](/technical/configuration/client) — OAuth client definitions.
- [Authorization](/technical/configuration/authorization) — Authentication, authorization flows, MFA, and rules.
- [Provider](/technical/configuration/provider) — Third-party authentication provider configuration (OIDC, OAuth2).
- [Claim](/technical/configuration/claim) — Claim collection configuration.
- [Scope](/technical/configuration/scope) — Scope configuration.
- [Advanced](/technical/configuration/advanced) — JWT, hashing, URLs, and other advanced settings.
