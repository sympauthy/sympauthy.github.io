# Database

This authorization server accesses its database through
[Micronaut R2DBC](https://micronaut-projects.github.io/micronaut-r2dbc/6.2.0/guide/).

The database **must exist** before starting SympAuthy. Only the schema (tables, indexes, etc.) is created
automatically on first startup.

## ```r2dbc.datasources.default```

| Key            | Type   | Description                                    | Required<br>Default |
|----------------|--------|------------------------------------------------|---------------------|
| ```url```      | string | R2DBC connection URL to the database.          | **YES**             |
| ```username``` | string | Username used to authenticate to the database. | **YES**             |
| ```password``` | string | Password used to authenticate to the database. | NO                  |

## Supported databases

### PostgreSQL

```yaml
r2dbc:
  datasources:
    default:
      url: r2dbc:postgresql://<host>:<port>/<database>
      username: <username>
      password: <password>
```

### H2 (in-memory, for development only)

```yaml
r2dbc:
  datasources:
    default:
      url: r2dbc:h2:mem:///sympauthy
```
