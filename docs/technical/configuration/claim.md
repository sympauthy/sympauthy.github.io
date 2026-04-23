# Claim

This section documents the configuration of claims that can be collected by this authorization server.

Claims can be [OpenID Connect claims](/functional/claims#openid-connect-claims) (standardized) or
[custom claims](/functional/claims#custom-claims) (operator-defined). Both use the same configuration
structure. Each claim has an [access control list (ACL)](#claims-id-acl) that determines who can read
and write it and under what conditions.

Default values for claim fields can be provided through [claim templates](#templates-claims-id).

## ```claims.<id>```

| Key                  | Type    | Description                                                                                                                                                                                                                                                                                                                   | Required<br>Default   |
|----------------------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| ```acl```            | object  | [Access control list](#claims-id-acl) that determines who can read and write this claim. See the [dedicated section](#claims-id-acl) below.                                                                                                                                                                                   | **NO**                |
| ```allowed-values``` | array   | List of possible values an user can provide for this claim. If not specified or ```null```, all values will be accepted by the authorization server.<br> **Note**: Changing this configuration will not change the value collected for existing user.                                                                         | **NO**<br>```null```  |
| ```enabled```        | boolean | Enable the collection of this claim for end-users. If disabled, the claim will never be stored by this authorization server even if it is made available by a client or a provider. In case this config is changed, it is up to the operator of the authorization server to clear the claim that have been already collected. | **NO**<br>```false``` |
| ```group```          | string  | Grouping identifier (e.g. `identity`, `address`). Used to associate related claims.                                                                                                                                                                                                                                           | **NO**<br>```null```  |
| ```required```       | boolean | The end-user must provide a value for this claim before being allowed to complete an authorization flow.                                                                                                                                                                                                                      | **NO**<br>```false``` |
| ```template```       | string  | Name of a [claim template](#templates-claims-id) to apply. The referenced template provides default values for fields not explicitly set on this claim. The built-in `default` template is auto-applied when no explicit template is set — see [templates](#templates-claims-id) for details.                                 | **NO**                |
| ```type```           | string  | The data type of the claim. Predefined for OpenID Connect claims; required for custom claims. Supported types include `string`, `email`, `phone-number`, `date`, `boolean`, `number`.                                                                                                                                         | Depends               |
| ```verified-id```    | string  | The identifier of the associated boolean claim that indicates whether this claim's value has been verified (e.g. `email` has `verified-id: email_verified`).                                                                                                                                                                  | **NO**<br>```null```  |

### ```claims.<id>```

The identifier must not contain a dot character.

### ```claims.<id>.type```

The data type constrains what values can be stored and how they are validated. For OpenID Connect
claims, the type is predefined and does not need to be set. For custom claims, `type` is required.

| Type             | Description                                                    |
|------------------|----------------------------------------------------------------|
| `date`           | A date value (ISO 8601 format).                                |
| `email`          | An email address.                                              |
| `phone-number`   | A phone number.                                                |
| `string`         | A free-form text value.                                        |
| `timezone`       | A timezone identifier (e.g. `Europe/Paris`, `America/New_York`). |

## ```claims.<id>.acl```

The ACL controls who can read and write the claim. There are two access paths, and either one is
sufficient:

- **Consent-based** — the end-user [consents](/functional/consent) to a scope, which unlocks
  read/write access for the user and/or the client.
- **Unconditional** — the client holds a [client scope](/functional/scope#client-scope) that grants
  access directly, without end-user consent.

| Key                                               | Type    | Description                                                                                                                                                                | Required<br>Default   |
|---------------------------------------------------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| ```consent-scope```                               | string  | The [consentable scope](/functional/scope#consentable-scope) that gates consent-based access to this claim. Must be an OpenID Connect scope or a custom consentable scope. | **NO**<br>```null```  |
| ```readable-by-user-when-consented```             | boolean | The end-user can read this claim when the `consent-scope` has been consented to.                                                                                           | **NO**<br>```false``` |
| ```writable-by-user-when-consented```             | boolean | The end-user can write this claim when the `consent-scope` has been consented to.                                                                                          | **NO**<br>```false``` |
| ```readable-by-client-when-consented```           | boolean | The client can read this claim when the end-user has consented to the `consent-scope`.                                                                                     | **NO**<br>```false``` |
| ```writable-by-client-when-consented```           | boolean | The client can write this claim when the end-user has consented to the `consent-scope`.                                                                                    | **NO**<br>```false``` |
| ```readable-with-client-scopes-unconditionally``` | array   | List of [client scopes](/functional/scope#client-scope). A client holding any of these scopes can read this claim unconditionally (without end-user consent).              | **NO**<br>```[]```    |
| ```writable-with-client-scopes-unconditionally``` | array   | List of [client scopes](/functional/scope#client-scope). A client holding any of these scopes can write this claim unconditionally (without end-user consent).             | **NO**<br>```[]```    |

::: info
ACL values set directly on a claim always override values inherited from a [template](#templates-claims-id).
:::

## ```templates.claims.<id>```

Claim templates provide default field values that are inherited by claims. Templates help avoid
repeating the same configuration across many claims.

The following built-in templates are provided:

| Template name | Applied to                                                                                  |
|---------------|---------------------------------------------------------------------------------------------|
| `default`     | Auto-applied to claims that do not reference an explicit template via the `template` field. |
| `openid`      | Referenced by OpenID Connect claims. Must be explicitly set via `template: openid`.         |

Custom templates (any name not in the list above) can be defined and explicitly referenced by a claim
via its `template` field.

When a claim references a custom template, the `default` template is **not** applied — only the
referenced template's values are used as defaults.

Fields set directly on a claim always override the corresponding template value.

| Key                  | Type    | Description                                                              | Required<br>Default |
|----------------------|---------|--------------------------------------------------------------------------|---------------------|
| ```<id>```           | string  | Unique identifier of the template.                                       | **YES**             |
| ```enabled```        | boolean | Default value for the claim's `enabled` field.                           | NO                  |
| ```required```       | boolean | Default value for the claim's `required` field.                          | NO                  |
| ```group```          | string  | Default claim group.                                                     | NO                  |
| ```allowed-values``` | array   | Default allowed values.                                                  | NO                  |
| ```acl.*```          |         | All [ACL fields](#claims-id-acl) can be set in the template as defaults. | NO                  |

**Constraints:**

- The `default` template is applied automatically and **cannot** be referenced explicitly via the `template` property —
  remove the `template` property to use it.

**Built-in template defaults:**

```yaml
templates:
  claims:
    default:
      acl:
        readable-with-client-scopes-unconditionally:
          - "users:claims:read"
        writable-with-client-scopes-unconditionally:
          - "users:claims:write"
    openid:
      enabled: false
      acl:
        readable-by-user-when-consented: true
        writable-by-user-when-consented: true
        readable-by-client-when-consented: true
        writable-by-client-when-consented: false
```

With these defaults:

- **Custom claims** (no explicit template) inherit from `default` — they are readable and writable by
  any client holding `users:claims:read` or `users:claims:write`, without requiring end-user consent.
- **OpenID Connect claims** (using `template: openid`) are disabled by default and must be explicitly
  enabled. When enabled, they are consent-gated: the end-user and client can read them after consent,
  the end-user can write them, but the client cannot write them.

## Examples

### OpenID Connect claim

A typical OpenID Connect claim references the `openid` template and sets its consent scope:

```yaml
claims:
  email:
    template: openid
    enabled: true
    type: email
    verified-id: email_verified
    acl:
      consent-scope: email
```

This claim inherits the `openid` template defaults: it is readable and writable by the end-user after
consent, and readable (but not writable) by the client after consent. The `consent-scope: email` means
the end-user must consent to the `email` scope for access to be granted.

### Custom claim with unconditional access

A custom claim that uses the default template — accessible to any client with the right client scopes:

```yaml
claims:
  department:
    enabled: true
    type: string
```

This claim inherits from the `default` template: any client holding `users:claims:read` can read it,
and any client holding `users:claims:write` can write it, without requiring end-user consent.

### Consent-gating a custom claim

A custom claim that requires end-user consent, like personal data the user enters:

```yaml
claims:
  subscription_tier:
    enabled: true
    type: string
    allowed-values:
      - free
      - premium
      - enterprise
    acl:
      consent-scope: account
      readable-by-user-when-consented: true
      readable-by-client-when-consented: true
      writable-by-client-when-consented: false
```

This claim requires the end-user to consent to the `account` scope (which must be defined as a
[custom consentable scope](/functional/scope#custom-scopes)) before the client can read it. The claim
is not writable by the client — only the end-user can set its value.
