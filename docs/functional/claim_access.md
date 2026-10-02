# Who can access a claim

Whether a party may read or write a [claim](/functional/claims) is two questions, and both are settled
before [where the claim is exposed](/functional/claims#where-a-claim-is-exposed) is asked at all:

- **What was this caller authorized to do?** The claim's
  [access control list (ACL)](/technical/configuration/claim#claims-id-acl) answers it in two halves —
  what the person's [consent](/functional/consent) unlocks, and what a client's own
  [client scopes](/functional/scope#client-scope) unlock whatever the person consented to. **Either half
  on its own is enough**, and neither cancels the other.
- **Was the value ever this party's to set?** [The kind of the claim](/functional/claims#two-kinds-of-claim)
  answers it. The kind decides who **writes**, never who reads — a person is told their credit score
  wherever the ACL says so, because being told a value is disclosure and disclosure is the consent half's
  question whatever the value is.

## Every party, in one table

Each row is one party reaching the claim through one channel, in one direction. A cell naming a key means
that key is what opens the door; **Refused** means the key may not be set on a claim of that kind at all,
and a deployment setting it is told [at startup](/technical/configuration/claim#startup-refusals) rather
than by a request failing in production.

| Party                                                                                                           | Direction      | A personal claim                                                                       | An application claim                          |
|-----------------------------------------------------------------------------------------------------------------|----------------|----------------------------------------------------------------------------------------|-----------------------------------------------|
| The person, in the [interactive flow](/functional/interactive_flow#collecting-additional-information-optional)   | read and write | `collected-in-flow-when-consented`                                                     | **Refused** — nobody is asked to type one     |
| The person, through their own access token, at `/api/openid/userinfo`                                            | read           | `readable-by-person-when-consented`                                                    | `readable-by-person-when-consented`           |
| The person, through their own access token                                                                       | write          | `writable-by-person-when-consented`                                                    | **Refused** — a backend answers for the value |
| A [client](/functional/client), through the person's consent                                                     | read           | `readable-by-client-when-consented`                                                    | `readable-by-client-when-consented`           |
| A client, through the person's consent                                                                           | write          | `writable-by-client-when-consented`, and only where the claim [names an audience](#the-audience-is-the-axis) | `writable-by-client-when-consented`           |
| A client, through its own [client scopes](/functional/scope#client-scope)                                        | read           | `readable-with-client-scopes-unconditionally`                                           | `readable-with-client-scopes-unconditionally` |
| A client, through its own client scopes                                                                          | write          | `writable-with-client-scopes-unconditionally`, and only where the claim names an audience | `writable-with-client-scopes-unconditionally` |
| An administrator, through the [Admin API](/technical/api/admin)                                                  | read           | every claim of every audience                                                          | every claim of every audience                 |
| An administrator                                                                                                 | write          | nothing                                                                                | nothing                                       |

A [generated claim](/functional/claims#a-generated-claim) is in no row: this server computes `sub`,
`updated_at` and `auth_time`, so there is nobody to authorize and nothing to configure.

## The person

**The person reaches their own claims through two doors, and only one of them is presence.** In the
interactive flow they are on SympAuthy's own pages having just authenticated. A bearer access token is
the other door, and it says only that a client was authorized to act within some scopes — for as long as
a refresh token lets it — and nothing about the person being there.

**Each door is named for itself, and no flag covers both.** The word *person* on an ACL key always means
the person holding their own access token; the flow is `collected-in-flow-when-consented` and nothing
else. A claim the flow collects is not thereby writable through an API, and a claim an API may write is
not thereby asked for during sign-in.

**The flow reads a claim back through the same key it collects it with.** One door is one permission in
both directions, so the claims the flow offers, the values it shows back, the required ones it holds a
person to and the address it sends a validation code to are all that one key.

**A write through the person's own token can be held to a recent authentication.**
`write-max-authentication-age` is how old the authentication behind the write may be; presented with an
older one, the server answers the [challenge RFC 9470 defines](/functional/tokens#when-the-user-authenticated)
so the client can re-authorize and retry. A read is never challenged, and the flow's own write is presence
by definition and is never challenged either.

**An [identifier claim](/functional/claims#identifier-claims) is collected at sign-up whatever its ACL
says.** It is what the account signs in with, so `collected-in-flow-when-consented` does not apply to one:
sign-up asks for it whether or not any scope was consented to, and the flow's own claim-collection step
leaves identifier claims out.

::: warning Nothing writes a claim through the person's own token yet
`writable-by-person-when-consented` and `write-max-authentication-age` are parsed and validated today, and
nothing reads them: the endpoint that would let a person write their own claim is
[sympauthy#482](https://github.com/sympauthy/sympauthy/issues/482) and does not exist. A deployment may
declare both now, and neither opens anything until that endpoint ships.
:::

## A client

**A client is answered by the person's consent or by its own scopes, and either path is enough.** The
consent path answers a client the person agreed to disclose to; the unconditional path answers a client
holding `users:claims:read` or `users:claims:write`, whatever the person agreed. The shipped
[`application` template](/technical/configuration/claim#templates-claims-id) grants both unconditionally,
which is what a value a backend answers for needs; the shipped `personal` template grants the consent path
alone and no client write.

**A client never writes a personal claim shared across audiences.** A client of one audience setting `name`
would be choosing what every other audience is told a person is called, over the person's head and with
the person never asked. Restricted to one [audience](/functional/audience), the value leaves this server to
that audience alone and the clients of an audience already trust each other with what it owns — so the
grant is allowed there and refused on a shared claim. Reading one is the ordinary ACL question, so the
restriction is about the write alone.

**No client writes an identifier claim, whatever its scopes.** Nothing in a claim write proves the value,
so a client able to set one could repoint an account's sign-in at an address it holds. The
[Client API](/technical/api/client) refuses it by name.

**The place a value travels through asks its own half of the ACL.** The
[ID token](/functional/tokens#id-token), the [access token](/functional/tokens#a-claim-in-an-access-token)
and the [introspection response](/functional/tokens#token-introspection) are issued or answered to a client,
so each asks whether the **client** may read the claim. `/api/openid/userinfo` asks whether the **person**
may, because that endpoint is not client-authenticated: a claim a client holds a read scope for, and whose
`readable-by-person-when-consented` is off, is left out of `/userinfo` and carried by the ID token.

## An administrator

**An administrator reads every claim of every audience, whichever kind, and writes none.** The claim's ACL
does not narrow what the [Admin API](/technical/api/admin) answers — `admin:users:read` is what gates it —
because an administrator answers for the deployment rather than for one of its applications, and the
audience a claim is restricted to is something they are shown rather than something that hides it from them.

The kind decides nothing here, because it decides who writes: an application claim is its application's to
write and a personal claim is the person's, so neither is an operator's, and the administration surface
opens no claim write at all.

## The audience is the axis

Every row above is read inside one [audience](/functional/audience), and a claim restricted to an audience
is answered to no other — left out of every token, of `/userinfo`, of introspection and of the Client API,
and refused to a client naming it in a write. A claim naming no audience is every audience's.

The audience a decision lands in is not always the caller's own. A client is answered for the audience its
credential belongs to; an interactive flow works in the audience of the client that started it; an
[act-as token](/functional/delegation) is issued for the audience the exchange names. The administrator is
the one reader the restriction does not apply to.

## When a consent key names no scope

A consent key opens its door **when the person has consented to `consent-scope`** — and a claim that names
no `consent-scope` has nothing to agree to, so the key opens unconditionally. That is the shape a
deployment wants for a claim every client of an audience may be told without asking, and it is worth
noticing before leaving `consent-scope` out of an `acl` block whose flags are on.

## Configuration

Every key named above is written under
[`claims.<id>.acl`](/technical/configuration/claim#claims-id-acl), on the claim or on the
[template](/technical/configuration/claim#templates-claims-id) it names, and a grant that reaches a claim
through its template is held to the kind exactly like one written on the claim.
