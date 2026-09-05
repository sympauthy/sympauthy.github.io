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

## A key that binds to nothing

Every key written under one of SympAuthy's own prefixes — `advanced`, `auth`, `claims`, `clients`,
`rules`, `scopes`, `templates`, `ui` and the rest — has to bind to a property the server reads. A key
that binds to nothing is an **error**, not a warning: the server starts, reports itself unready, and
refuses to be treated as healthy until that key is corrected or removed.

Each one is named in the startup banner beside every other configuration error, and under `config` in
`/health`, which answers `DOWN`. Both name the file the key was read from:

```
ERROR - One or more errors detected in the configuration. This application will NOT OPERATE PROPERLY.
- templates.clients.default.flow: Nothing is bound to this key, so what it was written to change has
  no effect. Did you mean templates.clients.default.authorization-flow? Read from application.yml.
- ui.mial: Nothing is bound to this key, so what it was written to change has no effect. Correct its
  spelling or remove it. Read from application.yml.
```

The message names the nearest key the server knows when it has one to offer: your own key with a
single segment corrected, offered only where that correction makes the key bind. A key carrying more
than one mistake is named alone.

A misspelt *section* is caught the same way. Writing `scope:` where the key is `scopes:` used to drop
the whole section without a word; every key under it is now reported with its correction.

Three limits are worth knowing:

- **Only SympAuthy's own prefixes.** A key under `micronaut`, `endpoints`, `flyway`, `netty`,
  `javamail` or `r2dbc` belongs to the framework and is not checked. `micronaut.server.prot: 9090` is
  still accepted in silence.
- **Only what is in a file.** Environment variables and system properties are not checked — they
  share a namespace with the whole machine.
- **A prefix resembling none of SympAuthy's is left alone**, so a deployment may keep a top-level key
  of its own to interpolate out of, such as `${my-vars.issuer}`.

::: warning Upgrading an existing deployment
A configuration file that has always started may carry a key that never did anything — a typo, or a
key a past version removed. From the version introducing this check onwards, that key takes readiness
down on the next restart.

Read the startup log or `/health`, then delete or correct every key either one names, and restart.
Everything they report was already having no effect.
:::

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
- [Admin](/technical/configuration/admin) — Admin API, integrated UI, and admin audience binding.
- [Client](/technical/configuration/client) — OAuth client definitions.
- [Audience](/technical/configuration/audience) — Audience grouping and token audience configuration.
- [Authorization](/technical/configuration/authorization) — Authentication, authorization flows, MFA, and rules.
- [Invitation](/technical/configuration/invitation) — Bootstrap invitations declared in configuration.
- [Provider](/technical/configuration/provider) — Third-party authentication provider configuration (OIDC, OAuth2).
- [Claim](/technical/configuration/claim) — Claim collection configuration.
- [Scope](/technical/configuration/scope) — Scope configuration.
- [CORS](/technical/configuration/cors) — Cross-origin request policy and configurable allowed headers.
- [Advanced](/technical/configuration/advanced) — JWT, hashing, pagination bounds, and other advanced settings.
