# Claim

This section documents the configuration of the claims this authorization server holds about a person.

Every claim declares whose its value is: [`kind: personal`](#claims-id-kind) for the person's own, or
`kind: application` for an application's. A claim takes that from the [template](#templates-claims-id) it
names — the shipped templates are `personal` and `application`, one per kind — or declares `kind` itself,
and **a claim saying it nowhere is refused at startup**. Each claim also has an
[access control list (ACL)](#claims-id-acl) deciding who may read and write it, and the kind is what the
ACL is held to.

## ```claims.<id>```

| Key                  | Type    | Description                                                                                                                                                                                                                                                                                                                   | Required<br>Default   |
|----------------------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| ```acl```            | object  | [Access control list](#claims-id-acl) that determines who can read and write this claim. See the [dedicated section](#claims-id-acl) below.                                                                                                                                                                                   | **NO**                |
| ```allowed-values``` | array   | List of possible values an user can provide for this claim. If not specified or ```null```, all values will be accepted by the authorization server.<br> **Note**: Changing this configuration will not change the value collected for existing user.                                                                         | **NO**<br>```null```  |
| ```audience```       | string  | The [audience](/functional/audience) this claim is scoped to. When set, the claim is only visible to clients within that audience. When `null`, the claim is shared across all audiences. Required on a `personal` claim whose ACL grants a client write, and refused on an [identifier claim](/functional/claims#identifier-claims). | **NO**<br>```null```  |
| ```enabled```        | boolean | Enable the collection of this claim for end-users. If disabled, the claim will never be stored by this authorization server even if it is made available by a client or a provider. In case this config is changed, it is up to the operator of the authorization server to clear the claim that have been already collected. Every claim the OpenID Connect specification defines ships with ```false```, so a deployment enables the ones its applications ask for. | **NO**<br>```true```  |
| ```group```          | string  | Grouping identifier (e.g. `identity`, `address`). Used to associate related claims.                                                                                                                                                                                                                                           | **NO**<br>```null```  |
| ```kind```           | string  | Whose this claim's value is: `personal` or `application` — see the [dedicated section](#claims-id-kind). Falls back to the one its `template` declares, and a claim declaring it neither way is refused at startup.                                                                                                             | Depends               |
| ```published-in```   | array   | The places this claim is exposed in — see the [dedicated section](#claims-id-published-in). Publication only narrows what the [ACL](#claims-id-acl) permits and never grants: a claim the ACL refuses the caller is exposed nowhere, whatever it names.                                                                       | **NO**<br>```[]```    |
| ```required```       | boolean | The end-user must provide a value for this claim before being allowed to complete an authorization flow.                                                                                                                                                                                                                      | **NO**<br>```false``` |
| ```template```       | string  | Name of a [claim template](#templates-claims-id) to apply. The referenced template provides default values for fields not explicitly set on this claim. A claim takes the template it names and no other, and one naming none is read from its own keys alone — so it must then declare `kind` itself. Naming a template that does not exist is refused at startup. | **NO**                |
| ```type```           | string  | The data type of the claim — see the [dedicated section](#claims-id-type). Predefined for the claims the OpenID Connect specification defines; required for a claim of your own. It can be set on a claim only, never on a template.                                                                                           | Depends               |
| ```verified-id```    | string  | The identifier of the associated boolean claim that indicates whether this claim's value has been verified (e.g. `email` has `verified-id: email_verified`).                                                                                                                                                                  | **NO**<br>```null```  |

### ```claims.<id>```

The identifier must not contain a dot character. `auth_time` is reserved: every token issued for an
end-user already states [when that user authenticated](/functional/tokens#when-the-user-authenticated),
and a deployment declaring a claim under that name is refused at startup. `sub` and `updated_at` are
reserved the same way — this server computes all three, so nothing written under one of those names is
read.

### ```claims.<id>.kind```

Whose a claim's value is decides **who may write it**, and never who may read it. A key the kind cannot
mean is refused at startup rather than accepted and ignored.

| Value         | Whose the value is                                                        | What it refuses                                                                                                                                                              |
|---------------|---------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `application` | an application's, attached to the person. A backend answers for it, and the person is never asked to type it. | `acl.collected-in-flow-when-consented` and `acl.writable-by-person-when-consented`.                                                                                          |
| `personal`    | the person's. Collected in the flow, and disclosed by consent.            | `acl.writable-by-client-when-consented` and `acl.writable-with-client-scopes-unconditionally`, unless the claim names an `audience` — a client of one audience may not choose what every other audience is told. |

The kind is read **resolved**, so a grant, a restriction or a kind reaching the claim through its
[template](#templates-claims-id) is held to this exactly like one written on the claim. An
[identifier claim](/functional/claims#identifier-claims) is always `personal`, and declaring one an
application's is refused.

What each kind is, and the origin it is not, is [kinds of claims](/functional/claim_kinds).

### ```claims.<id>.type```

The data type constrains what values can be stored and how they are validated. For the claims the OpenID
Connect specification defines, the type is predefined and does not need to be set. For a claim of your own,
`type` is required. A template carries no type, because the type decides whether a value may identify a
person and how two values are compared.

| Type             | Description                                                    |
|------------------|----------------------------------------------------------------|
| `boolean`        | A true or false value.                                         |
| `date`           | A date value (ISO 8601 format).                                |
| `email`          | An email address.                                              |
| `number`         | A whole number.                                                |
| `phone-number`   | A phone number.                                                |
| `string`         | A free-form text value.                                        |
| `timezone`       | A timezone identifier (e.g. `Europe/Paris`, `America/New_York`). |

### ```claims.<id>.published-in```

Where a claim is exposed is the deployment's decision, and this is the only key that answers it. Four of
the five places carry the claim's value; the fifth advertises its name.

| Value           | Exposes the claim in                                                                                                                                                                                |
|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `access-token`  | The JWT [access token](/functional/tokens#a-claim-in-an-access-token), where [RFC 9068 section 2.2.3](https://www.rfc-editor.org/rfc/rfc9068#section-2.2.3) puts an identity claim.                  |
| `discovery`     | `claims_supported` on the discovery document — the claim's **name**, never its value. Its `verified-id` companion is listed beside it.                                                               |
| `id-token`      | The [ID token](/functional/tokens#id-token).                                                                                                                                                        |
| `introspection` | The [introspection response](/functional/tokens#token-introspection), as a top-level member.                                                                                                         |
| `userinfo`      | The `/api/openid/userinfo` response.                                                                                                                                                                |

A claim naming no place is exposed in none of them: its value never leaves through a token, `/userinfo` or
introspection, and it stays readable through the [Client API](/technical/api/client) and the
[Admin API](/technical/api/admin), which publication does not narrow. The shipped
[`personal` template](#templates-claims-id) names `[ id-token, userinfo, discovery ]`, and the shipped
`application` template names nothing.

Which half of the [ACL](#claims-id-acl) a place asks is the place's own question: the ID token, the access
token and the introspection response ask whether the **client** may read the claim, and `/userinfo` asks
whether the **end-user** may, because that endpoint is not client-authenticated. A claim restricted to
another [audience](/functional/audience) is left out of every place.

`claims_supported` lists exactly the claims naming `discovery`, whichever half of the specification the
name comes from — so a deployment may serve a claim it does not advertise, and advertise a claim of its
own. The other direction is refused: a claim naming `discovery` and no place that carries the value would
advertise a name no client could obtain a value for, and the server refuses to start on it.

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
for during sign-in. A consent-based key on a claim naming no `consent-scope` has nothing to agree to, and
opens its door unconditionally.

Which keys a claim may set at all depends on [its kind](#claims-id-kind). Party by party and direction by
direction, [claim access control](/functional/claim_access) is the whole of it.

| Key                                               | Type     | Description                                                                                                                                                                                                                                                                       | Required<br>Default   |
|---------------------------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| ```collected-in-flow-when-consented```            | boolean  | The [interactive flow](/functional/interactive_flow#collecting-additional-information-optional) asks the end-user to fill this claim in when the `consent-scope` has been consented to, and shows the stored value back through the same key. Refused on an `application` claim, and it does not apply to an [identifier claim](/functional/claims#identifier-claims), which sign-up collects in any case. | **NO**<br>```false``` |
| ```consent-scope```                               | string   | The [consentable scope](/functional/scope#consentable-scope) that gates consent-based access to this claim. Must be an OpenID Connect scope or a custom consentable scope.                                                                                                        | **NO**<br>```null```  |
| ```readable-by-client-when-consented```           | boolean  | The client can read this claim when the end-user has consented to the `consent-scope`.                                                                                                                                                                                            | **NO**<br>```false``` |
| ```readable-by-person-when-consented```           | boolean  | The end-user's own access token can read this claim, through `/api/openid/userinfo`, when the `consent-scope` has been consented to.                                                                                                                                              | **NO**<br>```false``` |
| ```readable-with-client-scopes-unconditionally``` | array    | List of [client scopes](/functional/scope#client-scope). A client holding any of these scopes can read this claim unconditionally (without end-user consent).                                                                                                                     | **NO**<br>```[]```    |
| ```writable-by-client-when-consented```           | boolean  | The client can write this claim when the end-user has consented to the `consent-scope`. Refused on a `personal` claim naming no `audience`.                                                                                                                                        | **NO**<br>```false``` |
| ```writable-by-person-when-consented```           | boolean  | The end-user's own access token can write this claim when the `consent-scope` has been consented to. Distinct from `collected-in-flow-when-consented`, which is what the interactive flow collects. Refused on an `application` claim.                                            | **NO**<br>```false``` |
| ```writable-with-client-scopes-unconditionally``` | array    | List of [client scopes](/functional/scope#client-scope). A client holding any of these scopes can write this claim unconditionally (without end-user consent). Refused on a `personal` claim naming no `audience`.                                                                | **NO**<br>```[]```    |
| ```write-max-authentication-age```                | duration | How old the end-user's [authentication](/functional/tokens#when-the-user-authenticated) may be behind a write through their own access token. Unset, a write asks nothing of it. Must be greater than 0. Set on a claim `writable-by-person-when-consented` does not open, the server refuses to start. | **NO**<br>*(unset)*   |

::: info
ACL values set directly on a claim always override values inherited from a [template](#templates-claims-id),
and a grant a claim takes from its template is held to the claim's kind exactly like one written on the claim.
Removing a key from the claim falls back to the template's value, so a grant the template carries is closed
by writing `false`, or an empty list, under the claim's own key.
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

**A claim takes the template it names and no other**, through its [`template`](#claims-id) key, and a claim
naming none takes none. There is no template a claim falls back to: the one key a claim cannot be left to
default is [`kind`](#claims-id-kind), so a claim says whose its value is by naming a template that declares
one or by declaring it itself. A template takes no template of its own — one level resolves, and nothing
walks a chain to find out what a claim is.

The server ships one template per kind, named for it:

| Template name | Declares             | What it carries                                                                                                            |
|---------------|----------------------|----------------------------------------------------------------------------------------------------------------------------|
| `application` | `kind: application`  | The client scopes that read and write the claim whatever the person consented to, which is what a value a backend answers for needs. It names no place, so a claim taking it is exposed nowhere until its own file says where. |
| `personal`    | `kind: personal`     | The consent-based keys a profile claim wants, the two OpenID channels and the discovery document. It grants no client write, because it names no audience and a shared personal claim may not have one. |

Custom templates (any name not in the list above) can be defined and explicitly referenced by a claim
via its `template` field. Fields set directly on a claim always override the corresponding template value.

| Key                  | Type    | Description                                                                     | Required<br>Default |
|----------------------|---------|---------------------------------------------------------------------------------|---------------------|
| ```<id>```           | string  | Unique identifier of the template.                                              | **YES**             |
| ```acl.*```          |         | All [ACL fields](#claims-id-acl) can be set in the template as defaults.        | NO                  |
| ```allowed-values``` | array   | Default allowed values, read under each claim's own `type`.                      | NO                  |
| ```audience```       | string  | Default [audience](/functional/audience) for claims using this template.        | NO                  |
| ```enabled```        | boolean | Default value for the claim's `enabled` field.                                  | NO                  |
| ```group```          | string  | Default claim group.                                                            | NO                  |
| ```kind```           | string  | Default [`kind`](#claims-id-kind) for claims using this template.               | NO                  |
| ```published-in```   | array   | Default value for the claim's [`published-in`](#claims-id-published-in) field.   | NO                  |
| ```required```       | boolean | Default value for the claim's `required` field.                                 | NO                  |

A claim's `type` and `verified-id` cannot be defaulted this way: both are the claim's own.

**The shipped templates, as configured:**

```yaml
templates:
  claims:
    personal:
      kind: personal
      published-in:
        - id-token
        - userinfo
        - discovery
      acl:
        readable-by-person-when-consented: true
        collected-in-flow-when-consented: true
        readable-by-client-when-consented: true
        writable-by-client-when-consented: false
    application:
      kind: application
      acl:
        readable-with-client-scopes-unconditionally:
          - "users:claims:read"
        writable-with-client-scopes-unconditionally:
          - "users:claims:write"
```

Neither names `enabled`: every claim the OpenID Connect specification defines carries `enabled: "false"` of
its own, so a deployment turns them on one claim at a time, and a claim of your own on `personal` is enabled
rather than inheriting a flag it never asked for.

## Startup refusals

A declaration that cannot mean anything refuses the server at startup, naming the claim and the key. The
deployment is told in the file it owns, rather than by a client's error log once a write has failed in
production.

| The file says                                                                                                                                 | The line that fixes it                                                                        |
|-----------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| a claim naming no `template` and no `kind`                                                                                                     | `template: personal`, `template: application`, or `kind` on the claim                          |
| a `kind` that is neither `personal` nor `application`                                                                                          | one of the two values                                                                         |
| a `template` no `templates.claims` entry declares                                                                                              | one of the declared template names                                                            |
| a `personal` claim naming no `audience` and granting `acl.writable-by-client-when-consented` or `acl.writable-with-client-scopes-unconditionally` | an `audience` on the claim, the grant written off on the claim — `false`, or an empty list — or `kind: application` |
| an `application` claim setting `acl.collected-in-flow-when-consented` or `acl.writable-by-person-when-consented`                                | the key set to `false`, a template that leaves it off, or `kind: personal`                     |
| an [identifier claim](/functional/claims#identifier-claims) declared `kind: application`                                                        | `kind: personal` — an account signs in with what the person typed                              |
| an identifier claim restricted to an `audience`                                                                                                | the restriction removed — a deployment signs people in across every audience                   |
| `acl.write-max-authentication-age` on a claim `acl.writable-by-person-when-consented` does not open                                            | that key set to `true`, or the age removed                                                    |
| a claim naming `discovery` in `published-in` and no place that carries its value                                                               | a value-carrying place beside `discovery`, or `discovery` removed                              |
| any key under `claims.sub`, `claims.updated_at` or `claims.auth_time`                                                                          | the key removed — this server computes all three                                               |

A name that does not resolve is refused the same way: an `audience` no `audiences` entry declares, a
`consent-scope` that is not an enabled consentable scope, a scope that is not a client scope in either
unconditional list, or a `type` that is not one of [the types](#claims-id-type).

## Examples

### A claim the specification defines

A claim of the OpenID Connect specification is declared on the `personal` template and enabled by the
deployment:

```yaml
claims:
  email:
    template: personal
    enabled: true
    type: email
    verified-id: email_verified
    acl:
      consent-scope: email
```

This claim inherits the `personal` template defaults: the interactive flow collects it, the end-user can
read it through `/api/openid/userinfo` and the client can read it — both after consent — and the client
cannot write it. It is also [exposed](#claims-id-published-in) in the ID token, in `/userinfo` and in
`claims_supported`. The `consent-scope: email` means the end-user must consent to the `email` scope for
access to be granted, and `enabled: true` is the claim's own key, because the template carries none.

### An application claim

A claim a backend answers for — a department, a tier, an internal flag — is declared on the `application`
template:

```yaml
claims:
  department:
    template: application
    type: string
```

Any client holding `users:claims:read` can read it, and any client holding `users:claims:write` can write
it, without end-user consent. The person is never asked to type it, and the template names no place, so the
value leaves this server through the [Client API](/technical/api/client) alone until `published-in` says
otherwise.

### Consent-gating an application claim

An application claim the person has to agree to before a client is told it — consent gates disclosure, and
says nothing about whose the value is:

```yaml
claims:
  subscription_tier:
    template: application
    type: string
    published-in:
      - id-token
    allowed-values:
      - free
      - premium
      - enterprise
    acl:
      consent-scope: account
      readable-by-client-when-consented: true
      readable-with-client-scopes-unconditionally: []
```

The end-user must consent to the `account` scope — which must be defined as a
[custom consentable scope](/functional/scope#custom-scopes) — before a client is told the value. Emptying
`readable-with-client-scopes-unconditionally` is what closes the other path: either path is sufficient, so
leaving the template's `users:claims:read` in place would answer a client holding it whatever the end-user
consented to. The write stays unconditional, because the value is still the application's — and
`collected-in-flow-when-consented` may not be set on it, so the flow never asks anybody to type it.

### A personal claim of your own

A claim the person types that the specification does not define — the account they go by on another
service, under a consentable scope of the deployment's own:

```yaml
claims:
  discord_id:
    template: personal
    type: string
    acl:
      consent-scope: social
```

Naming `personal` is what makes it the person's: the flow collects it, the person and the client read it
after consenting to `social`, and no client writes it. Declaring `kind: personal` on a claim naming no
template says the same thing, and is what a deployment writes when it wants none of the template's other
defaults.

### Publishing a claim in the access token

A claim a resource server reads off the credential it already holds, rather than by calling `/userinfo`
or introspecting on every request:

```yaml
claims:
  employee_number:
    template: personal
    type: string
    published-in:
      - access-token
      - introspection
    acl:
      consent-scope: profile
      readable-by-client-when-consented: true
```

The access token and the introspection response ask the client's half of the ACL, so
`readable-by-client-when-consented` is what lets the value through — a user's access token carries no
[client scope](/functional/scope#client-scope), so `readable-with-client-scopes-unconditionally` does not
open either of them. What an access token costs in exchange is
[the place a value travels furthest](/functional/tokens#a-claim-in-an-access-token).
