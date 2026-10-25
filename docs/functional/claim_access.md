# Claim Access Control

A [claim](/functional/claims) — a name, an email address, a subscription tier — is reached by several parties:
the end-user it is about, the applications they sign in to (the [clients](/functional/client)), and the
administrators of the deployment. Each claim has an **access control list (ACL)** deciding which of them may
read it and which may change it, so that an application is told only what the end-user agreed to share with
it, or what the deployment chose to give it. This page covers:

- the [doors](#doors) an ACL is made of, and what opens one;
- who can access what, for each kind of claim;
- giving each door a scope of its own;
- what the end-user, a client and an administrator can each read and write;
- how audiences restrict every one of those decisions.

## Doors

The ACL is made of **doors**. A door is one way of reaching a claim: one party reading it or writing it.
A client reading the claim is a door, and a client writing it is another; the end-user reading it through
their own access token is a door, and the interactive flow asking them to fill it in is another. Each door is
one key of the ACL, named after who goes through it and in which direction — `readable-by-client`,
`writable-by-client`, `readable-by-person` and so on — and [the table below](#who-can-access-what) lists
them all.

Each door holds an [expression](/technical/expressions/), the language
[scope granting rules](/functional/user_authorization#scope-granting-rules) and
[act-as rules](/functional/delegation#act-as-rules) are written in. **A door is open to a caller when its expression is true**, and shut to
everybody when no expression opens it. A door usually asks about scopes, and may combine several conditions:

```
SCOPE_IS_CONSENTED("profile") || SCOPE_IS_GRANTED("users:claims:read")
```

The first condition lets through a caller the end-user [consented](/functional/consent) to disclose the
claim to, under a [consentable scope](/functional/scope#consentable-scope); the second lets through a client
holding a [client scope](/functional/scope#client-scope) of its own, whatever the end-user agreed to. Either
is sufficient, because they are joined by `||`.

## Who can access what

Two things decide the outcome: what the caller was authorized to do, and
[which kind of claim](/functional/claim_kinds#two-kinds-of-claim) it is. The kind of claim determines who can
**write** a value, never who can read one. An end-user can be shown their own credit score wherever the ACL
allows it, because being told a value is disclosure, and disclosure is what the ACL decides.

The table below lists each party, the direction of access, and the door that decides it. **Refused** means
the only value that door accepts on a claim of that kind is the literal `"false"`: any other expression refuses
the server at startup rather than failing the request later.

| Party                                                                                                           | Direction      | A personal claim                                                                 | An application claim                          |
|-----------------------------------------------------------------------------------------------------------------|----------------|----------------------------------------------------------------------------------|-----------------------------------------------|
| The end-user, in the [interactive flow](/functional/interactive_flow#collecting-additional-information-optional) | read and write | `collected-in-flow`                                                              | **Refused** — nobody is asked to type one     |
| The end-user, through their own access token, at `/api/openid/userinfo` — the endpoint an application calls for the end-user's profile | read           | `readable-by-person`                                                             | `readable-by-person`                          |
| The end-user, through their own access token                                                                     | write          | `writable-by-person`                                                             | **Refused** — a backend answers for the value |
| A [client](/functional/client)                                                                                   | read           | `readable-by-client`                                                             | `readable-by-client`                          |
| A client                                                                                                         | write          | `writable-by-client`, and only when the claim names an [audience](#audience-restrictions) | `writable-by-client`                          |
| An administrator, through the [Admin API](/technical/api/admin)                                                  | read           | every claim of every audience                                                    | every claim of every audience                 |
| An administrator                                                                                                 | write          | nothing                                                                          | nothing                                       |

[Generated claims](/functional/claim_kinds#a-generated-claim) appear in no row. SympAuthy computes `sub`,
`updated_at` and `auth_time` itself, so there is no caller to authorize and nothing to configure.

## A scope per door

The scope a door opens on is the door's own, so a claim's doors may name different scopes or none. A claim
restricted to one [audience](#audience-restrictions) can be read under `profile` and written only under
`profile:write`, a [custom consentable scope](/functional/scope#custom-scopes) the deployment declares: a client of
that audience authorized for `profile` is told the value and refused the write, until the end-user also agrees
to `profile:write`.

### A door open to every caller

A door written as the literal `"true"` is open to every caller that reaches it within the claim's
[audience](#audience-restrictions), with nothing to consent to. That is the intended behavior for a claim
every client of an audience may read without asking, and worth knowing before writing it on any other.

## End-user access

The end-user reaches their own claims through two separate channels: the
[interactive flow](/functional/interactive_flow), where they are on SympAuthy's own pages having just
authenticated, and their own access token, which says only that a client was authorized to act within
some scopes.

The end-user's own [access token](/functional/tokens#access-token) is the one SympAuthy issues when they sign in
to an application: the application holds it and presents it on the end-user's behalf, for instance to
`/api/openid/userinfo`, the endpoint that answers with the claims of the person the token was issued for. The
token proves the end-user's authorization and nothing about the application itself, which is why what it reads
is the person's door rather than the client's.

Each channel has its own door, and no door covers both. `collected-in-flow` is what the interactive flow
asks the end-user to fill in; `readable-by-person` and `writable-by-person` are what the end-user's own
access token may read and write. A claim the flow collects is not thereby writable through an API, and a
claim an API may write is not thereby asked for during sign-in.

### The interactive flow

The flow reads a claim back through the same door it collects it through. One channel is one permission in
both directions, so the claims the flow offers, the values it displays back, the required ones it holds the
end-user to and the address it sends a validation code to are all governed by that single door. The flow has
no token behind it, so its door asks about consent and the client and nothing else; it does not offer
`SCOPE_IS_GRANTED` either, because [grantable scopes](/functional/scope#grantable-scope) are granted after the flow
has collected.

`collected-in-flow` is accepted on an [identifier claim](/functional/claims#identifier-claims) and ignored there.
An identifier claim is collected at sign-up because it is what the account signs in with, whether or not any
scope was consented to, and the flow's claim-collection step leaves identifier claims out.

### The end-user's own token

The doors a token comes through can ask about the token as well: whether a rule granted it a scope, how long
ago the end-user [authenticated](/functional/tokens#when-the-user-authenticated) behind it, and whether it is
[bound to a key](/functional/tokens#sender-constrained-tokens-dpop).

**A read narrows, and is never challenged.** A *challenge* is what a refused request carries to tell the client
how to obtain a token that would succeed — the scope its token lacks, or how recent an authentication it needs —
so the client can send the end-user back through an authorization and retry. A read carries none: it is answered
with the claims whose door is open and nothing about the others. A claim whose `readable-by-client` asks for an
authentication younger than an hour is in the ID token issued when the end-user signs in, and absent from the
one a [refresh](/functional/tokens#refresh-token) issues a day later — a refresh
[reissues `auth_time` unchanged](/functional/tokens#a-refresh-reissues-it-unchanged).

::: warning Nothing writes a claim through the end-user's own token yet
`writable-by-person` is parsed and validated today, and nothing reads it: the endpoint that would let an
end-user write their own claim is [sympauthy#482](https://github.com/sympauthy/sympauthy/issues/482) and does
not exist. A deployment may open the door now, and it lets nothing through until that endpoint ships, together
with the challenge a write it refuses will carry.
:::

## Client access

A client is let through `readable-by-client` and `writable-by-client` by the end-user's consent, by its own
client scopes, by who it is, or by any combination the expression writes. On the
[Client API](/technical/api/client), `SCOPE_IS_CONSENTED` answers from the consent the end-user recorded for
the client's audience. The shipped [`application` template](/technical/configuration/claim#templates-claims-id)
opens both doors to `users:claims:read` and `users:claims:write`, whatever the end-user consented to, which is
what a value a backend answers for needs. The shipped `personal` template opens no door, and each shipped
claim opens its read doors under the scope the specification puts it in — never a client write.

### Each place asks its own door

The [ID token](/functional/tokens#id-token), the [access token](/functional/tokens#a-claim-in-an-access-token),
the [introspection response](/functional/tokens#token-introspection) and the Client API are issued or answered to
a client, so each asks `readable-by-client`. `/api/openid/userinfo` asks `readable-by-person`, because that
endpoint is not client-authenticated. A claim can therefore be permitted in one place and refused in another:
a claim whose `readable-by-client` is open and whose `readable-by-person` is shut is carried by the ID token
and left out of `/userinfo`.

### A personal claim shared across audiences

A client cannot write a personal claim that is shared across audiences. A client of one audience setting
`name` would decide what every other audience is told the end-user is called, without the end-user being
asked. When the claim is restricted to one [audience](/functional/audience), the value only reaches that
audience, and the door may be opened there. Reading is unaffected: a client is told a personal claim of its
audience through consent or through its own scopes like any other claim.

### Identifier claims

No client can write an [identifier claim](/functional/claims#identifier-claims), whatever its scopes.
Nothing in a claim write verifies the value, so a client able to set one could repoint an account's sign-in
at an address it controls. The [Client API](/technical/api/client) refuses such a claim by name — as it
refuses every write a door shuts, with no challenge, since a client refused a claim has nothing to
re-authorize for.

### A write clears verification

Because a write verifies nothing, **a write that changes a value clears whatever verification the old one
held**: the [`verified-id`](/technical/configuration/claim#claims-id) companion goes back to `false`, and
the end-user is asked to validate the new value at their next authorization. This holds for every write there
is — a client's, the flow's, and one collected from a [third-party provider](/functional/authentication#third-party-providers) — and will hold for the end-user's own once it
ships.

## Administrator access

An administrator reads every claim of every audience, of either kind, and writes none. The claim's ACL does
not narrow what the [Admin API](/technical/api/admin) returns — the `admin:users:read` scope is what gates
it — because an administrator answers for the deployment rather than for one of its applications. The
audience a claim is restricted to is shown to an administrator rather than hidden from them.

The kind of claim decides nothing here, because it decides who writes. An application claim belongs to its
application and a personal claim to the end-user, so neither belongs to an operator, and the administration
surface exposes no claim write at all.

### Which scopes a claim is listed under

SympAuthy reads, out of each door's expression, the consentable scopes consent to which can open the door, and
lists the claim under them: that is the `claims` the [Admin API](/technical/api/admin#list-scopes) returns for
each consentable scope. A scope counts only where consenting to it can open the door — where nothing but `&&`
and `||` joins it to the rest of the expression:

- `SCOPE_IS_CONSENTED("profile") || SCOPE_IS_GRANTED("users:claims:read")` lists the claim under `profile`.
- `!SCOPE_IS_CONSENTED("marketing")` does not list it under `marketing`: consenting to that scope shuts the
  door.
- `SCOPE_IS_CONSENTED("profile") = CLIENT("public")` does not list it under `profile` either: inside a
  comparison, what consenting does is the expression's to say.

## Audience restrictions

Every access decision above is made within one [audience](/functional/audience). A claim restricted to an
audience is never answered to another one: it is left out of every token, of `/userinfo`, of the
introspection response and of the [Client API](/technical/api/client), and a client naming it in a write is
refused. A claim with no `audience` set is shared across all audiences.

The audience a decision is made for is not always the caller's own:

- A client is answered for the audience its own credential belongs to.
- An interactive flow works in the audience of the client that started it.
- An [act-as token](/functional/delegation) is issued for the audience the token exchange names.

An administrator is the only reader that audience restrictions do not apply to.

## Configuration

Every door above is set under [`claims.<id>.acl`](/technical/configuration/claim#claims-id-acl), on the claim
itself or on the [template](/technical/configuration/claim#templates-claims-id) it references; a claim's key
overrides its template's door by door. A door inherited from a template is held to the claim's kind exactly
like one set on the claim. Each refusal above,
and the line that fixes it, is listed in
[startup refusals](/technical/configuration/claim#startup-refusals).
