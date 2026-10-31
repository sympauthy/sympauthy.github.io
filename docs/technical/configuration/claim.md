# Claim

This section documents the configuration of the claims this authorization server holds about a person.

Every claim declares whose its value is: [`kind: personal`](#claims-id-kind) for the person's own, or
`kind: application` for an application's. A claim takes that from the [template](#templates-claims-id) it
names — the shipped templates are `personal` and `application`, one per kind — or declares `kind` itself. Each
claim also has an
[access control list (ACL)](#claims-id-acl) deciding who may read and write it, and the kind is what the
ACL is held to.

## ```claims.<id>```

| Key                  | Type    | Description                                                                                                                                                                                                                                                                                                                   | Required<br>Default   |
|----------------------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| ```acl```            | object  | [Access control list](#claims-id-acl) that determines who can read and write this claim. See the [dedicated section](#claims-id-acl) below. Each door the claim writes overrides its [template](#templates-claims-id)'s, door by door; one it writes nothing for takes the template's, and `"false"` — in any case — shuts a door the template opens. | **NO**                |
| ```allowed-values``` | array   | List of possible values an user can provide for this claim. If not specified or ```null```, all values will be accepted by the authorization server.                                                                         | **NO**<br>```null```  |
| ```audience```       | string  | The [audience](/functional/audience) this claim is scoped to. When set, the claim is only visible to clients within that audience. When `null`, the claim is shared across all audiences. Required on a `personal` claim whose ACL opens `writable-by-client`, and refused on an [identifier claim](/functional/claims#identifier-claims). | **NO**<br>```null```  |
| ```enabled```        | boolean | Whether this claim is in use. A disabled claim is collected, written, read and published nowhere — it is never stored even when a client or a provider offers it, and it is served in no token, no `/userinfo` response and no API answer. Every claim the OpenID Connect specification defines ships with ```false```, so a deployment enables the ones its applications ask for. | **NO**<br>```true```  |
| ```group```          | string  | Grouping identifier (e.g. `identity`, `address`). Used to associate related claims.                                                                                                                                                                                                                                           | **NO**<br>```null```  |
| ```kind```           | string  | Whose this claim's value is: `personal` or `application` — see the [dedicated section](#claims-id-kind). Falls back to the one its `template` declares.                                                                                                                                                                                | **YES**<br>on the claim or its `template` |
| ```published-in```   | array   | The places this claim is exposed in — see the [dedicated section](#claims-id-published-in). Publication only narrows what the [ACL](#claims-id-acl) permits and never grants: a claim the ACL refuses the caller is exposed nowhere, whatever it names.                                                                       | **NO**<br>```[]```    |
| ```published-in-when-requested``` | array | The places this claim is exposed in **only for an authorization that asked for it by name** — see the [dedicated section](#claims-id-published-in-when-requested). Only `id-token` and `userinfo` can be named, and a place named here and in `published-in` is refused at startup.                                      | **NO**<br>```[]```    |
| ```required```       | boolean | The end-user must provide a value for this claim before being allowed to complete an authorization flow.                                                                                                                                                                                                                      | **NO**<br>```false``` |
| ```template```       | string  | Name of a [claim template](#templates-claims-id) to apply. The referenced template provides default values for fields not explicitly set on this claim. A claim takes the template it names and no other, and one naming none is read from its own keys alone — so it must then declare `kind` itself. Naming a template that does not exist is refused at startup. | **NO**                |
| ```type```           | string  | The data type of the claim — see the [dedicated section](#claims-id-type). Predefined for the claims the OpenID Connect specification defines; required for a claim of your own. It can be set on a claim only, never on a template.                                                                                           | Depends               |
| ```verified-id```    | string  | The identifier of the boolean companion, published beside this claim, that indicates whether its value has been verified (e.g. `email` has `verified-id: email_verified`).                          | **NO**<br>```null```  |

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
| `application` | an application's, attached to the person. A backend answers for it, and the person is never asked to type it. | `acl.collected-in-flow` and `acl.writable-by-person`, opened by anything but the literal `"false"`.                                                                        |
| `personal`    | the person's. Collected in the flow, and disclosed by consent.            | `acl.writable-by-client` opened by anything but the literal `"false"`, unless the claim names an `audience` — a client of one audience may not choose what every other audience is told. |

The kind is read **resolved**, so a [door](/functional/claim_access#doors), a restriction or a kind reaching the claim through its
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

Where a claim is exposed is the deployment's decision, and this key answers it for every authorization alike —
[`published-in-when-requested`](#claims-id-published-in-when-requested) answers it for the ones that ask. Every place
but `discovery` carries the claim's value; `discovery` advertises its name.

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

Which door of the [ACL](#claims-id-acl) a place asks is the place's own question: the ID token, the access
token and the introspection response ask `readable-by-client`, and `/userinfo` asks `readable-by-person`,
because that endpoint is not client-authenticated. A claim restricted to
another [audience](/functional/audience) is left out of every place.

`claims_supported` lists exactly the claims naming `discovery`, whichever half of the specification the
name comes from — so a deployment may serve a claim it does not advertise, and advertise a claim of its
own. The other direction is refused: a claim naming `discovery` and no place that carries the value would
advertise a name no client could obtain a value for, and the server starts unready on it. A place named
in [`published-in-when-requested`](#claims-id-published-in-when-requested) counts as a carrier here — a
client can reach it — so advertising such a claim is allowed.

### ```claims.<id>.published-in-when-requested```

A place named here carries the claim's value **only for an authorization whose
[`claims` request parameter](/functional/claims#asking-for-a-claim-in-the-request) asked for the claim in
that place**. It is the deployment opening a door rather than the client forcing one: a request can add a
claim to a place this list names and to no other, so a deployment that names nothing here answers every
request as if it had asked for nothing.

| Value       | Exposes the claim in                       |
|-------------|--------------------------------------------|
| `id-token`  | The [ID token](/functional/tokens#id-token). |
| `userinfo`  | The `/api/openid/userinfo` response.        |

Those two are the whole of it — they are the places [OpenID Connect Core
section 5.5](https://openid.net/specs/openid-connect-core-1_0.html#ClaimsParameter) defines a member for.
Naming `access-token`, `introspection` or `discovery` here states a condition no request could ever
satisfy, and **the server starts unready on it**. Naming the same place in both `published-in` and
`published-in-when-requested` is refused at startup too, naming the claim and the place: always and
on request are two answers for one place, and only one of them can be meant.

The request is asked **last**. The [ACL](#claims-id-acl) decides whether the caller may know the value at
all, the [audience](/functional/audience) whether it is this audience's to know, and publication which
place carries it — only then does the request decide whether an on-request place opens. A claim the first
three withhold stays withheld, whatever a request asks for.

## ```claims.<id>.acl```

The ACL has one key per **[door](/functional/claim_access#doors)** — a party reading or writing the claim —
and each holds an [expression](/technical/expressions/) answering whether that door is open to the caller in
front of it. **A door is open when its expression is true**, and a door no expression opens is shut to everybody. The
scope a door opens on is the door's own, so a claim's doors may name different scopes or none: a claim can be
readable under `profile` and writable only under `profile:write`.

A door's value is a string. Write `"true"` and `"false"` quoted, and quote any expression that starts with `!` —
unquoted, YAML reads `!SCOPE_IS_CONSENTED("profile")` as a tag rather than as the expression.

Which doors a claim may open at all depends on [its kind](#claims-id-kind). Party by party and direction by
direction, [claim access control](/functional/claim_access) is the whole of it.

| Key                        | Type       | Description                                                                                                                                                                                                                                                                                                                                                                                                             | Required<br>Default    |
|----------------------------|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------|
| ```collected-in-flow```    | expression | The [interactive flow](/functional/interactive_flow#collecting-additional-information-optional) asks the end-user to fill this claim in, and shows the stored value back through the same door. Only `SCOPE_IS_CONSENTED` and `CLIENT` can be called in it — the flow has no token behind it, and grants its scopes after collecting. Refused on an `application` claim, and accepted but ignored on an [identifier claim](/functional/claims#identifier-claims), which sign-up collects in any case. | **NO**<br>*(shut)*     |
| ```readable-by-client```   | expression | A client may read this claim: in the ID token, the access token, the introspection response and the [Client API](/technical/api/client).                                                                                                                                                                                                                                                                              | **NO**<br>*(shut)*     |
| ```readable-by-person```   | expression | The end-user's own access token may read this claim, through `/api/openid/userinfo`.                                                                                                                                                                                                                                                                                                                                    | **NO**<br>*(shut)*     |
| ```writable-by-client```   | expression | A client may write this claim through the [Client API](/technical/api/client). Refused on a `personal` claim naming no `audience`.                                                                                                                                                                                                                                                                                       | **NO**<br>*(shut)*     |
| ```writable-by-person```   | expression | The end-user's own access token may write this claim. Distinct from `collected-in-flow`, which is what the interactive flow collects. Refused on an `application` claim.                                                                                                                                                                                                                                                | **NO**<br>*(shut)*     |

The doors a token comes through — every door but `collected-in-flow` — evaluate that token, so they offer
every function a claim's ACL may call; which ones those are, and what each answers, is
[functions](/technical/expressions/functions).

Each place evaluates a door against its own token and client:

| Place                                  | Token the door is evaluated against                           | Client `CLIENT` answers for                      |
|----------------------------------------|---------------------------------------------------------------|--------------------------------------------------|
| ID token, access token                 | the authorization they are issued for                         | the client they are issued to                    |
| Introspection response                 | the token being introspected                                  | the client it was issued to, not the one asking  |
| `/api/openid/userinfo`                 | the end-user's access token presented                         | the client it was issued to                      |
| [Client API](/technical/api/client)    | the calling client's own `client_credentials` token, with the consent the end-user recorded for its audience | the calling client |

::: warning Nothing writes a claim through the end-user's own token yet
`writable-by-person` is parsed and validated today, and nothing reads it: the endpoint that would let an
end-user write their own claim is [sympauthy#482](https://github.com/sympauthy/sympauthy/issues/482) and does
not exist. A deployment may open the door now, and it lets nothing through until that endpoint ships.
:::

## ```templates.claims.<id>```

Claim templates provide default field values that are inherited by claims. Templates help avoid
repeating the same configuration across many claims.

**A claim takes the template it names and no other**, through its [`template`](#claims-id) key, and a claim
naming none takes none. There is no template a claim falls back to. A template takes no template of its own — one level resolves, and nothing
walks a chain to find out what a claim is.

The server ships one template per kind, named for it:

| Template name | Declares             | What it carries                                                                                                            |
|---------------|----------------------|----------------------------------------------------------------------------------------------------------------------------|
| `application` | `kind: application`  | `readable-by-client` and `writable-by-client` opened to the client scopes `users:claims:read` and `users:claims:write`, whatever the person consented to, which is what a value a backend answers for needs. It names no place, so a claim taking it is exposed nowhere until its own file says where. |
| `personal`    | `kind: personal`     | `published-in: [ id-token, userinfo, discovery ]` — the ID token, `/userinfo` and the discovery document. It opens no door, because a door opens on a scope and the template names none, so a claim taking it opens its own under the scope it belongs to. |

Custom templates (any name not in the list above) can be defined and explicitly referenced by a claim
via its `template` field. Fields set directly on a claim always override the corresponding template value.

| Key                  | Type    | Description                                                                     | Required<br>Default |
|----------------------|---------|---------------------------------------------------------------------------------|---------------------|
| ```<id>```           | string  | Unique identifier of the template.                                              | **YES**             |
| ```acl.*```          |         | All [ACL fields](#claims-id-acl) can be set in the template as defaults, each overridden by the claim's own key for the same door. | NO                  |
| ```allowed-values``` | array   | Default allowed values, read under each claim's own `type`.                      | NO                  |
| ```audience```       | string  | Default [audience](/functional/audience) for claims using this template.        | NO                  |
| ```enabled```        | boolean | Default value for the claim's `enabled` field.                                  | NO                  |
| ```group```          | string  | Default claim group.                                                            | NO                  |
| ```kind```           | string  | Default [`kind`](#claims-id-kind) for claims using this template.               | NO                  |
| ```published-in```   | array   | Default value for the claim's [`published-in`](#claims-id-published-in) field.   | NO                  |
| ```published-in-when-requested``` | array | Default value for the claim's [`published-in-when-requested`](#claims-id-published-in-when-requested) field. A place no request can name is refused on the template that writes it. | NO                  |
| ```required```       | boolean | Default value for the claim's `required` field.                                 | NO                  |

A claim's `type` and `verified-id` cannot be defaulted this way: both are the claim's own.

**The shipped templates, as configured:**

```yaml
templates:
  claims:
    personal:
      kind: personal
      published-in: [ id-token, userinfo, discovery ]
    application:
      kind: application
      acl:
        readable-by-client: SCOPE_IS_GRANTED("users:claims:read")
        writable-by-client: SCOPE_IS_GRANTED("users:claims:write")
```

Each shipped claim opens its own doors on top of the template, under the scope the specification puts it in:

```yaml
claims:
  given_name:
    template: personal
    enabled: "false"
    type: string
    group: identity
    acl:
      collected-in-flow:  SCOPE_IS_CONSENTED("profile")
      readable-by-person: SCOPE_IS_CONSENTED("profile")
      readable-by-client: SCOPE_IS_CONSENTED("profile")
```

Neither template names `enabled`: every claim the OpenID Connect specification defines carries `enabled: "false"` of
its own — quoted in the shipped file, though a bare `false` reads the same — so a deployment turns them on one claim at a time, and a claim of your own on `personal` is enabled
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
| a `personal` claim naming no `audience` and opening `acl.writable-by-client`                                                                    | an `audience` on the claim, `"false"` under the claim's own key, or `kind: application`        |
| an `application` claim opening `acl.collected-in-flow` or `acl.writable-by-person`                                                              | the key set to `"false"`, a template that leaves it shut, or `kind: personal`                  |
| an [identifier claim](/functional/claims#identifier-claims) declared `kind: application`                                                        | `kind: personal` — an account signs in with what the person typed                              |
| an identifier claim restricted to an `audience`                                                                                                | the restriction removed — a deployment signs people in across every audience                   |
| an `acl` expression that does not parse, answers anything but a boolean, or calls a function its door does not offer                           | an expression of [the door's functions](/technical/expressions/functions)     |
| a scope or a duration given to an `acl` function as anything but a string literal                                                              | the scope or the duration written as a literal — `SCOPE_IS_CONSENTED("profile")`               |
| an `AUTHENTICATION_IS_YOUNGER_THAN` duration that does not read, or of zero or less                                                            | a duration greater than zero, written the way every duration key is — `5m`, `1h`, `PT5M`       |
| a claim naming `discovery` in `published-in` and no place that carries its value                                                               | a value-carrying place beside `discovery`, or `discovery` removed                              |
| a `published-in-when-requested` naming `access-token`, `introspection` or `discovery`, on a claim or a template                                | `id-token` or `userinfo`, or the place removed — no request can name the others               |
| a place named in both `published-in` and `published-in-when-requested`                                                                          | the place removed from one of the two                                                          |
| any key under `claims.sub`, `claims.updated_at` or `claims.auth_time`                                                                          | the key removed — this server computes all three                                               |

A name that does not resolve is refused the same way: an `audience` no `audiences` entry declares, a
`SCOPE_IS_CONSENTED` scope that is not an enabled consentable scope, a `SCOPE_IS_GRANTED` scope that is not
an enabled grantable or client scope — so a consentable scope written there is refused, since no rule grants it — or a `type` that
is not one of [the types](#claims-id-type). These checks run on every declared claim, enabled or not, and each
refusal names the key the expression was written under.

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
      collected-in-flow:  SCOPE_IS_CONSENTED("email")
      readable-by-person: SCOPE_IS_CONSENTED("email")
      readable-by-client: SCOPE_IS_CONSENTED("email")
```

Once the end-user consents to the `email` scope, the interactive flow collects it, the end-user can read it
through `/api/openid/userinfo` and the client can read it; no door lets a client write it. The `personal`
template [exposes](#claims-id-published-in) it in the ID token, in `/userinfo` and in `claims_supported`, and
`enabled: true` is the claim's own key, because the template carries none. `verified-id: email_verified` names the
boolean companion published beside `email`, which is not declared as a claim of its own.

### An application claim

A claim a backend answers for — a department, a tier, an internal flag — is declared on the `application`
template:

```yaml
claims:
  department:
    template: application
    type: string
```

The template's doors let any client holding `users:claims:read` read it, and any client holding
`users:claims:write` write it, without end-user consent. The person is never asked to type it, and the template
names no place, so the value leaves this server through the [Client API](/technical/api/client) alone. Naming a
place in `published-in` is not enough to change that: the template's doors ask for a client scope, which an
end-user's token never holds, so a token carries the claim only once a door opens for it as well — as the next
example does with consent.

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
    acl:
      readable-by-client: SCOPE_IS_CONSENTED("account")
```

The end-user must consent to the `account` scope — which must be defined as a
[custom consentable scope](/functional/scope#custom-scopes) — before a client is told the value. The claim's
`readable-by-client` replaces the template's, so `users:claims:read` no longer opens it; a deployment keeping
both would write `SCOPE_IS_CONSENTED("account") || SCOPE_IS_GRANTED("users:claims:read")`. The write is still
the template's, because the value is still the application's — and `collected-in-flow` may not be opened on
it, so the flow never asks anybody to type it.

### Asking a client scope beside consent

The [Client API](/technical/api/client#claims) answers any client token, so a door opened on consent alone
answers every client of the audience the end-user consented to. A deployment that wants only the clients holding
`users:claims:read` told the claim joins the two terms with `&&`:

```yaml
claims:
  given_name:
    acl:
      readable-by-client: SCOPE_IS_CONSENTED("profile") && SCOPE_IS_GRANTED("users:claims:read")
```

An end-user's token holds no [client scope](/functional/scope#client-scope), so the second term also keeps
`given_name` out of the ID token and the access token — a door asks the same of every place it answers.

### A personal claim of your own

A claim the person types that the specification does not define — the account they go by on another
service, under a consentable scope of the deployment's own:

```yaml
claims:
  discord_id:
    template: personal
    type: string
    acl:
      collected-in-flow:  SCOPE_IS_CONSENTED("social")
      readable-by-person: SCOPE_IS_CONSENTED("social")
      readable-by-client: SCOPE_IS_CONSENTED("social")
```

Naming `personal` is what makes it the person's, and the three doors are what the template leaves to the
claim: the flow collects it, the person and the client read it after consenting to `social`, and no client
writes it. Declaring `kind: personal` on a claim naming no
template says the same thing, and is what a deployment writes when it wants none of the template's other
defaults.

### Publishing a claim in the access token

A claim a resource server reads off the credential it already holds, rather than by calling `/userinfo`
or introspecting on every request:

```yaml
claims:
  employee_number:
    template: application
    type: string
    published-in:
      - access-token
      - introspection
    acl:
      readable-by-client: SCOPE_IS_CONSENTED("profile") || SCOPE_IS_GRANTED("users:claims:read")
```

A backend writes the value through the [Client API](/technical/api/client), under the template's
`writable-by-client`. The access token and the introspection response ask `readable-by-client`, so consent to
`profile` is what lets the value through — a user's access token carries no
[client scope](/functional/scope#client-scope), so `SCOPE_IS_GRANTED("users:claims:read")` opens neither of them
and is there for the backend reading it back. A claim's `published-in` replaces its template's list rather than
adding to it. What an access token costs in exchange is
[the place a value travels furthest](/functional/tokens#a-claim-in-an-access-token).

### A door opened on more than a scope

A door's expression may ask more than one thing, and each door asks its own:

```yaml
claims:
  phone_number:
    template: personal
    acl:
      collected-in-flow:  SCOPE_IS_CONSENTED("phone")
      readable-by-person: SCOPE_IS_CONSENTED("phone")
      readable-by-client: SCOPE_IS_CONSENTED("phone") && TOKEN_IS_BOUND() && AUTHENTICATION_IS_YOUNGER_THAN("1h")
  tier:
    template: application
    type: string
    published-in: [ id-token ]
    acl:
      readable-by-client: SCOPE_IS_GRANTED("users:claims:read") || CLIENT("client_id") = "billing"
```

`phone_number` is collected and shown to the end-user under `phone`, and told to a client only through a token
bound with [DPoP](/functional/tokens#sender-constrained-tokens-dpop), behind an authentication no older than an
hour: it is in the ID token the code exchange mints, absent from one a refresh mints later, and never answered
through the Client API, whose token no end-user authenticated behind. `tier` is read by a client holding `users:claims:read`, and by the `billing` client whatever it holds. In
the ID token issued to `billing`, the second term is the one that opens the door: an end-user's token holds no client
scope.
