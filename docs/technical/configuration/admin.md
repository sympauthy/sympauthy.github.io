# Admin

This section documents the configuration of the [Admin API](/technical/api/admin) and its scopes.

## ```admin```

| Key                  | Type    | Description                                                                                                                                                                                                | Required<br>Default |
|----------------------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```audience```       | string  | ID of the [audience](/functional/audience) that [admin scopes](/functional/scope#admin-scopes) are bound to. Must reference an existing audience. Only clients in this audience can request admin scopes.   | Conditional         |
| ```enabled```        | boolean | Enable the Admin API and admin scopes.                                                                                                                                                                     | NO<br>```false```   |
| ```integrated-ui```  | boolean | Enable the integrated admin UI served at `/admin`.                                                                                                                                                         | NO<br>```false```   |

### ```admin.audience```

Required when `enabled` is `true`. The referenced audience must be declared in the
[audience configuration](/technical/configuration/audience). Admin scopes are bound to this audience — only
clients belonging to it can request or receive them. This prevents clients in unrelated audiences from obtaining
administrative access.

### ```admin.enabled```

When `true`, admin scopes are registered and the Admin API endpoints become available. When `false` (the default),
no admin scopes exist and Admin API endpoints are not served.

### ```admin.integrated-ui```

When `true`, SympAuthy serves a built-in admin dashboard at `/admin`. Requires `enabled` to also be `true`.

## Example

```yaml
admin:
  enabled: true
  integrated-ui: true
  audience: admin
```

This configuration enables the Admin API with the integrated UI and binds admin scopes to the `admin` audience.
The `admin` audience must be declared separately in the [audience configuration](/technical/configuration/audience).

::: tip
The [`admin` Micronaut environment](/technical/configuration/environments) pre-configures all of this automatically,
including creating the `admin` audience and a default admin client. You only need manual configuration if you want
to customize the setup.
:::
