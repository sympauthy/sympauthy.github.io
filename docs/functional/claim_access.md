# Claim Access Control

Every [claim](/functional/claims) has an **access control list (ACL)** that determines who can read and
write it. Two things decide the outcome: what the caller was authorized to do, and
[which kind of claim](/functional/claim_kinds#two-kinds-of-claim) it is.

The ACL grants access through two paths, and either one is sufficient:

- **Consent-based** — the end-user [consents](/functional/consent) to a
  [scope](/functional/scope#consentable-scope), which unlocks the claim for the interactive flow, for the
  end-user, for the client, or for any combination of them.
- **Unconditional** — the client holds a [client scope](/functional/scope#client-scope) that grants access
  directly, without end-user consent.

The kind of claim determines who can **write** a value, never who can read one. An end-user can be shown
their own credit score wherever the ACL allows it, because being told a value is disclosure, and disclosure
is what the consent-based path decides.

## Who can access what

The table below lists each party, the direction of access, and the ACL key that grants it. **Refused**
means the key cannot be set on a claim of that kind at all: the server refuses to start rather than
failing the request later.

| Party                                                                                                           | Direction      | A personal claim                                                                       | An application claim                          |
|-----------------------------------------------------------------------------------------------------------------|----------------|----------------------------------------------------------------------------------------|-----------------------------------------------|
| The end-user, in the [interactive flow](/functional/interactive_flow#collecting-additional-information-optional) | read and write | `collected-in-flow-when-consented`                                                     | **Refused** — nobody is asked to type one     |
| The end-user, through their own access token, at `/api/openid/userinfo`                                          | read           | `readable-by-person-when-consented`                                                    | `readable-by-person-when-consented`           |
| The end-user, through their own access token                                                                     | write          | `writable-by-person-when-consented`                                                    | **Refused** — a backend answers for the value |
| A [client](/functional/client), through the end-user's consent                                                   | read           | `readable-by-client-when-consented`                                                    | `readable-by-client-when-consented`           |
| A client, through the end-user's consent                                                                         | write          | `writable-by-client-when-consented`, and only when the claim names an [audience](#audience-restrictions) | `writable-by-client-when-consented`           |
| A client, through its own [client scopes](/functional/scope#client-scope)                                        | read           | `readable-with-client-scopes-unconditionally`                                           | `readable-with-client-scopes-unconditionally` |
| A client, through its own client scopes                                                                          | write          | `writable-with-client-scopes-unconditionally`, and only when the claim names an audience | `writable-with-client-scopes-unconditionally` |
| An administrator, through the [Admin API](/technical/api/admin)                                                  | read           | every claim of every audience                                                          | every claim of every audience                 |
| An administrator                                                                                                 | write          | nothing                                                                                | nothing                                       |

[Generated claims](/functional/claim_kinds#a-generated-claim) appear in no row. SympAuthy computes `sub`,
`updated_at` and `auth_time` itself, so there is no caller to authorize and nothing to configure.

## End-user access

The end-user reaches their own claims through two separate channels: the
[interactive flow](/functional/interactive_flow), where they are on SympAuthy's own pages having just
authenticated, and their own access token, which says only that a client was authorized to act within
some scopes.

Each channel has its own ACL key, and no key covers both. `collected-in-flow-when-consented` is what the
interactive flow asks the end-user to fill in; `readable-by-person-when-consented` and
`writable-by-person-when-consented` are what the end-user's own access token may read and write. A claim the
flow collects is not thereby writable through an API, and a claim an API may write is not thereby asked for
during sign-in.

The flow reads a claim back through the same key it collects it with. One channel is one permission in both
directions, so the claims the flow offers, the values it displays back, the required ones it holds the
end-user to and the address it sends a validation code to are all governed by that single key.

A write through the end-user's own access token can be required to sit behind a recent authentication.
`write-max-authentication-age` sets how old the authentication may be; presented with an older one,
SympAuthy returns the [challenge defined by RFC 9470](/functional/tokens#when-the-user-authenticated) so
the client can re-authorize and retry. Reads are never challenged, and neither is the flow's own write.

::: info
`collected-in-flow-when-consented` does not apply to an
[identifier claim](/functional/claims#identifier-claims). An identifier claim is collected at sign-up
because it is what the account signs in with, whether or not any scope was consented to, and the flow's
claim-collection step leaves identifier claims out.
:::

::: warning Nothing writes a claim through the end-user's own token yet
`writable-by-person-when-consented` and `write-max-authentication-age` are parsed and validated today, and
nothing reads them: the endpoint that would let an end-user write their own claim is
[sympauthy#482](https://github.com/sympauthy/sympauthy/issues/482) and does not exist. A deployment may
declare both now, and neither opens anything until that endpoint ships.
:::

## Client access

A client is granted access through the end-user's consent or through its own client scopes, and either path
is sufficient. The consent-based path answers a client the end-user agreed to disclose to; the unconditional
path answers a client holding `users:claims:read` or `users:claims:write`, whatever the end-user agreed to.
The shipped [`application` template](/technical/configuration/claim#templates-claims-id) grants both
unconditionally, which is what a value a backend answers for needs. The shipped `personal` template grants
the consent-based path only, and no client write.

A client cannot write a personal claim that is shared across audiences. A client of one audience setting
`name` would decide what every other audience is told the end-user is called, without the end-user being
asked. When the claim is restricted to one [audience](/functional/audience), the value only reaches that
audience, and the grant is allowed there. Reading is unaffected: a client is told a personal claim of its
audience through consent or through its own scopes like any other claim.

No client can write an [identifier claim](/functional/claims#identifier-claims), whatever its scopes.
Nothing in a claim write verifies the value, so a client able to set one could repoint an account's sign-in
at an address it controls. The [Client API](/technical/api/client) refuses such a claim by name.

Each place a claim is published in asks its own half of the ACL. The [ID token](/functional/tokens#id-token),
the [access token](/functional/tokens#a-claim-in-an-access-token) and the
[introspection response](/functional/tokens#token-introspection) are issued or answered to a client, so each
asks whether the **client** may read the claim. `/api/openid/userinfo` asks whether the **end-user** may,
because that endpoint is not client-authenticated. A claim can therefore be permitted in one place and
refused in another: a claim a client holds a read scope for, with
`readable-by-person-when-consented` disabled, is carried by the ID token and left out of `/userinfo`.

## Administrator access

An administrator reads every claim of every audience, of either kind, and writes none. The claim's ACL does
not narrow what the [Admin API](/technical/api/admin) returns — the `admin:users:read` scope is what gates
it — because an administrator answers for the deployment rather than for one of its applications. The
audience a claim is restricted to is shown to an administrator rather than hidden from them.

The kind of claim decides nothing here, because it decides who writes. An application claim belongs to its
application and a personal claim to the end-user, so neither belongs to an operator, and the administration
surface exposes no claim write at all.

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

## Consent keys without a consent scope

A consent-based key grants access when the end-user has consented to `consent-scope`. A claim that sets no
`consent-scope` has nothing to consent to, so the key grants access unconditionally. That is the intended
behavior for a claim every client of an audience may read without asking, but it is worth knowing before
leaving `consent-scope` unset on a claim whose consent-based keys are enabled.

## Configuration

Every key above is set under [`claims.<id>.acl`](/technical/configuration/claim#claims-id-acl), on the claim
itself or on the [template](/technical/configuration/claim#templates-claims-id) it references. A grant
inherited from a template is held to the claim's kind exactly like one set on the claim. Each refusal above,
and the line that fixes it, is listed in
[startup refusals](/technical/configuration/claim#startup-refusals).
