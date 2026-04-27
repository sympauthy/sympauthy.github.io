# Audience

This section documents the configuration of audiences. Each audience defines a grouping boundary for
[clients](/functional/client) and determines the `aud` claim in access tokens issued for clients in that audience.

See [Audience](/functional/audience) for an overview of the concept.

## ```audiences.<id>```

| Key                  | Type   | Description                                                                                                                                       | Required<br>Default |
|----------------------|--------|---------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```<id>```           | string | Unique identifier of the audience.                                                                                                                | **YES**             |
| ```token-audience``` | string | Value used as the [`aud`](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3) claim in access tokens issued for clients in this audience. | NO<br>```<id>```    |

### ```audiences.<id>```

The identifier is used to reference this audience from [client](/technical/configuration/client),
[scope](/technical/configuration/scope), and [claim](/technical/configuration/claim) configurations.

### ```audiences.<id>.token-audience```

When not set, the audience identifier is used as the `aud` claim value. Set this explicitly when the token audience
must be a URL or a value different from the configuration identifier.

## Example

```yaml
audiences:
  my-app:
    token-audience: "https://api.my-app.com"
  backoffice:
    # token-audience defaults to "backoffice"
```
