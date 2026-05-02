# Audience

This section documents the configuration of audiences. Each audience defines a grouping boundary for
[clients](/functional/client) and determines the `aud` claim in access tokens issued for clients in that audience.

See [Audience](/functional/audience) for an overview of the concept.

## ```audiences.<id>```

| Key                      | Type    | Description                                                                                                                                       | Required<br>Default |
|--------------------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```<id>```               | string  | Unique identifier of the audience.                                                                                                                | **YES**             |
| ```invitation-enabled``` | boolean | Enable [invitation](/functional/invitation)-based registration for this audience.                                                                  | NO<br>```false```   |
| ```sign-up-enabled```    | boolean | Enable open registration for this audience.                                                                                                       | NO<br>```true```    |
| ```token-audience```     | string  | Value used as the [`aud`](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3) claim in access tokens issued for clients in this audience. | NO<br>```<id>```    |

### ```audiences.<id>```

The identifier is used to reference this audience from [client](/technical/configuration/client),
[scope](/technical/configuration/scope), and [claim](/technical/configuration/claim) configurations.

### ```audiences.<id>.invitation-enabled```

When `true`, [invitations](/functional/invitation) can be created for this audience and redeemed during sign-up.
This flag works in combination with `sign-up-enabled` to control registration behavior:

| `sign-up-enabled` | `invitation-enabled` | Behavior |
|--------------------|----------------------|----------|
| `true` | `false` | Open registration (default) |
| `true` | `true` | Open registration + invitations (invitations can pre-assign claims) |
| `false` | `false` | No self-registration (Admin API only) |
| `false` | `true` | Invitation-only sign-up |

### ```audiences.<id>.sign-up-enabled```

When `true`, any user can create an account during the [interactive flow](/functional/interactive_flow). When
`false`, self-registration is disabled — accounts can only be created through the
[Admin API](/technical/api/admin#create-user) or, if `invitation-enabled` is `true`, through an
[invitation](/functional/invitation).

### ```audiences.<id>.token-audience```

When not set, the audience identifier is used as the `aud` claim value. Set this explicitly when the token audience
must be a URL or a value different from the configuration identifier.

## Example

```yaml
audiences:
  my-app:
    token-audience: "https://api.my-app.com"
  backoffice:
    sign-up-enabled: false
    invitation-enabled: true
    # token-audience defaults to "backoffice"
```
