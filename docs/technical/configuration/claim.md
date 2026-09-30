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
| ```audience```       | string  | The [audience](/functional/audience) this claim is scoped to. When set, the claim is only visible to clients within that audience. When `null`, the claim is shared across all audiences. OpenID Connect claims are always unscoped.                                                                                           | **NO**<br>```null```  |
| ```enabled```        | boolean | Enable the collection of this claim for end-users. If disabled, the claim will never be stored by this authorization server even if it is made available by a client or a provider. In case this config is changed, it is up to the operator of the authorization server to clear the claim that have been already collected. | **NO**<br>```false``` |
| ```group```          | string  | Grouping identifier (e.g. `identity`, `address`). Used to associate related claims.                                                                                                                                                                                                                                           | **NO**<br>```null```  |
| ```required```       | boolean | The end-user must provide a value for this claim before being allowed to complete an authorization flow.                                                                                                                                                                                                                      | **NO**<br>```false``` |
| ```template```       | string  | Name of a [claim template](#templates-claims-id) to apply. The referenced template provides default values for fields not explicitly set on this claim. The built-in `default` template is auto-applied when no explicit template is set — see [templates](#templates-claims-id) for details.                                 | **NO**                |
| ```type```           | string  | The data type of the claim. Predefined for OpenID Connect claims; required for custom claims. Supported types include `string`, `email`, `phone-number`, `date`, `boolean`, `number`.                                                                                                                                         | Depends               |
| ```verified-id```    | string  | The identifier of the associated boolean claim that indicates whether this claim's value has been verified (e.g. `email` has `verified-id: email_verified`).                                                                                                                                                                  | **NO**<br>```null```  |

### ```claims.<id>```

The identifier must not contain a dot character. `auth_time` is reserved: every token issued for an
end-user already states [when that user authenticated](/functional/tokens#when-the-user-authenticated),
and a deployment declaring a claim under that name is refused at startup.

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

- **Consent-based** — the end-user [consents](/functional/consent) to a scope, which unlocks the claim
  for the [interactive flow](/functional/interactive_flow), for the end-user, for the client, or for any
  combination of them.
- **Unconditional** — the client holds a [client scope](/functional/scope#client-scope) that grants
  access directly, without end-user consent.

Each consent-based key names **one door**, and none of them covers two. `collected-in-flow-when-consented`
is what the interactive flow asks the end-user to type; `readable-by-person-when-consented` and
`writable-by-person-when-consented` are what the end-user's own **access token** may read and write. A claim
the flow collects is not thereby writable through an API, and a claim an API may write is not thereby asked
for during sign-in.

| Key                                               | Type     | Description                                                                                                                                                                                                                                                                       | Required<br>Default   |
|---------------------------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| ```collected-in-flow-when-consented```            | boolean  | The [interactive flow](/functional/interactive_flow) asks the end-user to fill this claim in when the `consent-scope` has been consented to.                                                                                                                                       | **NO**<br>```false``` |
| ```consent-scope```                               | string   | The [consentable scope](/functional/scope#consentable-scope) that gates consent-based access to this claim. Must be an OpenID Connect scope or a custom consentable scope.                                                                                                        | **NO**<br>```null```  |
| ```readable-by-client-when-consented```           | boolean  | The client can read this claim when the end-user has consented to the `consent-scope`.                                                                                                                                                                                            | **NO**<br>```false``` |
| ```readable-by-person-when-consented```           | boolean  | The end-user's own access token can read this claim, through `/api/openid/userinfo`, when the `consent-scope` has been consented to.                                                                                                                                              | **NO**<br>```false``` |
| ```readable-with-client-scopes-unconditionally``` | array    | List of [client scopes](/functional/scope#client-scope). A client holding any of these scopes can read this claim unconditionally (without end-user consent).                                                                                                                     | **NO**<br>```[]```    |
| ```writable-by-client-when-consented```           | boolean  | The client can write this claim when the end-user has consented to the `consent-scope`.                                                                                                                                                                                           | **NO**<br>```false``` |
| ```writable-by-person-when-consented```           | boolean  | The end-user's own access token can write this claim when the `consent-scope` has been consented to. Distinct from `collected-in-flow-when-consented`, which is what the interactive flow collects.                                                                                | **NO**<br>```false``` |
| ```writable-with-client-scopes-unconditionally``` | array    | List of [client scopes](/functional/scope#client-scope). A client holding any of these scopes can write this claim unconditionally (without end-user consent).                                                                                                                    | **NO**<br>```[]```    |
| ```write-max-authentication-age```                | duration | How old the end-user's [authentication](/functional/tokens#when-the-user-authenticated) may be behind a write through their own access token. Unset, a write asks nothing of it. Set on a claim `writable-by-person-when-consented` does not open, the server refuses to start.    | **NO**<br>*(unset)*   |

::: info
ACL values set directly on a claim always override values inherited from a [template](#templates-claims-id).
:::

::: warning Nothing writes a claim through the end-user's own token yet
`writable-by-person-when-consented` and `write-max-authentication-age` are parsed and validated today, and
nothing reads them: the endpoint that would let an end-user write their own claim is
[sympauthy#482](https://github.com/sympauthy/sympauthy/issues/482) and does not exist. A deployment may
declare both now, and neither opens anything until that endpoint ships.
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
| ```audience```       | string  | Default [audience](/functional/audience) for claims using this template.  | NO                  |
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
        readable-by-person-when-consented: true
        collected-in-flow-when-consented: true
        readable-by-client-when-consented: true
        writable-by-client-when-consented: false
```

With these defaults:

- **Custom claims** (no explicit template) inherit from `default` — they are readable and writable by
  any client holding `users:claims:read` or `users:claims:write`, without requiring end-user consent.
- **OpenID Connect claims** (using `template: openid`) are disabled by default and must be explicitly
  enabled. When enabled, they are consent-gated: the interactive flow collects them, the end-user and the
  client can read them after consent, and the client cannot write them.

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

This claim inherits the `openid` template defaults: the interactive flow collects it, the end-user can
read it through `/api/openid/userinfo` and the client can read it — both after consent — and the client
cannot write it. The `consent-scope: email` means the end-user must consent to the `email` scope for
access to be granted.

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
      readable-by-person-when-consented: true
      readable-by-client-when-consented: true
      writable-by-client-when-consented: false
```

This claim requires the end-user to consent to the `account` scope (which must be defined as a
[custom consentable scope](/functional/scope#custom-scopes)) before the client can read it. Consent
does not make it writable: `writable-by-client-when-consented: false` closes the client's door, and
`collected-in-flow-when-consented` is left unset, so the interactive flow never asks for it either.
