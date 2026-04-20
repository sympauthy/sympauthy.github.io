# Scope

## ```scopes.<id>```

| Key            | Type    | Description                                                                                                                                                                                                                                                                                          | Required<br>Default   |
|----------------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| ```template``` | string  | Name of a custom [scope template](#templates-scopes-id) to apply. The referenced template provides default values for fields not explicitly set on this scope. Default template names (`default_openid`, `default_admin`, `default_client`, `default_custom`) cannot be referenced here — they are auto-applied based on scope category. | NO                    |
| ```enabled```  | boolean | Enable the scope.                                                                                                                                                                                                                                                                                    | NO<br>```false```     |
| ```type```     | string  | The scope type. Either [`consentable`](/functional/scope#consentable-scope) or [`grantable`](/functional/scope#grantable-scope). Custom [`client`](/functional/scope#client-scope) scopes are not supported.                                                                                         | NO<br>```grantable``` |

## ```templates.scopes.<id>```

Scope templates provide default field values that are inherited by scopes. The following default templates are auto-applied based on scope category:

| Template name    | Auto-applied to            |
|------------------|----------------------------|
| `default_openid` | OpenID Connect scopes      |
| `default_custom` | Custom scopes              |
| `default_admin`  | Admin scopes               |
| `default_client` | Client scopes              |

Custom templates (any name not in the list above) must be explicitly referenced by a scope via its `template` field.

When a scope references a custom template, the matching default template is **not** applied — only the referenced template's values are used as defaults.

Fields set directly on a scope always override the corresponding template value.

| Key           | Type    | Description                                    | Required<br>Default |
|---------------|---------|------------------------------------------------|---------------------|
| ```<id>```    | string  | Unique identifier of the template.             | **YES**             |
| ```enabled``` | boolean | Default value for the scope's `enabled` field. | NO                  |
| ```type```    | string  | Default scope type (`consentable`, `grantable`, or `client`). | NO                  |

**Constraints:**

- Default template names (`default_openid`, `default_admin`, `default_client`, `default_custom`) **cannot** be referenced explicitly via the `template` directive — they are auto-applied.

**Example:**

```yaml
templates:
  scopes:
    default_custom:
      enabled: true
      type: grantable

    my-admin-scopes:
      enabled: true
      type: grantable

scopes:
  my-custom-scope:
    # Auto-inherits from templates.scopes.default_custom

  special-admin-scope:
    template: my-admin-scopes
    # Inherits from templates.scopes.my-admin-scopes (default_custom is NOT applied)
```
