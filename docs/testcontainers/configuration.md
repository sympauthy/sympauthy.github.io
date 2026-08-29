# Configuration

SympAuthy is heavily [configuration-driven](/technical/configuration/). The container exposes its
full surface through a few generic escape hatches mapping onto the three mechanisms the server
understands: program-argument property overrides, `MICRONAUT_ENVIRONMENTS` profiles, and bulk
`MICRONAUT_CONFIG_FILES`.

## Property overrides

For targeted scalar overrides, passed as Micronaut program arguments:

```java
new SympauthyContainer()
    .withProperty("auth.by-password.enabled", "true")
    .withProperties(Map.of("claims.email.enabled", "true"));
```

## Environment profiles

Select which [Micronaut environments](/technical/configuration/environments) SympAuthy runs with
(sets `MICRONAUT_ENVIRONMENTS`):

```java
new SympauthyContainer()
    .withEnvironments("default", "admin"); // replaces the set; here: baseline + Admin API/UI
```

Common profiles: `default` (baseline), `by-mail` (email/password auth), `admin` (Admin API + UI and
a pre-provisioned admin client), and well-known providers such as `google`. Include `default`
whenever you replace the set — it supplies the baseline configuration.

## Config files

For nested configuration (lists and nested objects such as `rules`, providers or clients that
flattened program arguments cannot express), mount or inline a YAML/JSON file via
`MICRONAUT_CONFIG_FILES`:

```java
new SympauthyContainer()
    // a nested map, serialized to a JSON file:
    .withConfig(Map.of(
        "auth", Map.of(
            "by-password", Map.of("enabled", true),
            "identifier-claims", List.of("email")),
        "claims", Map.of("email", Map.of("enabled", true))))
    .withConfigFile(MountableFile.forClasspathResource("sympauthy.yml")) // mount an existing file
    .withYamlConfig("""
        auth:
          by-password:
            enabled: true
        """)                                                             // or inline content
    .withJsonConfig("{\"claims\":{\"email\":{\"enabled\":true}}}");
```

## Datasource

Point the container at an external database instead of the default in-memory H2:

```java
new SympauthyContainer()
    .withDatasource("r2dbc:postgresql://db:5432/sympauthy", "user", "pass");
```

::: tip
The referenced database must be reachable from inside the container. For a companion PostgreSQL
container, put both on the same `Network` and use its network alias as the host.
:::

## Precedence

Highest wins:

1. The container-managed issuer / root URL (`auth.issuer` and `urls.root` are always pinned so the
   issuer stays reachable from host-side test code).
2. Property overrides (`withProperty` / `withProperties`).
3. `MICRONAUT_ENVIRONMENTS` profiles (`withEnvironments`).
4. Mounted config files (`withConfig` / `withConfigFile` / `withConfigContent`; later files override
   earlier ones).
5. The image's bundled defaults.
