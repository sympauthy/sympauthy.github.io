# Kinds of Claims

A [claim](/functional/claims) is a piece of information about a person, but not every claim is theirs to set.
A name is the person's own: they type it, and they agree to which applications are told it. A credit score or a
subscription tier is about the person too, but an application computes it and the person never types it. A
claim's **kind** says whose its value is, and that decides **who may write it**. This page covers:

- the kinds of claim, and who writes each of them;
- the claims SympAuthy computes itself, which are of no kind;
- how the kind differs from where a claim's name comes from;
- how a claim declares its kind.

## Two kinds of claim

A claim's **kind** is `personal` — the person's — or `application` — an application's.

|                            | A personal claim                                                                                           | An application claim                                              |
|----------------------------|------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| Whose the value is         | the person's                                                                                               | an application's, attached to the person                          |
| Examples                   | `name`, `email`, `birthdate`                                                                               | a credit score, a subscription tier, a flag a backend computes    |
| Who writes it              | the person, in the [interactive flow](/functional/interactive_flow) — and, [once that endpoint ships](/functional/claim_access#end-user-access), through their own access token | a client, through the claim's `writable-by-client` [door](/functional/claim_access#doors) |
| A client write             | only where the claim names an [audience](/functional/audience)                                             | whether the claim is restricted to an audience or shared          |
| The person typing it       | what the flow asks them for                                                                                | never — a backend answers for the value                           |

**Reading is the same question for both.** The kind decides who may *write* a value; who may be told one is
[access control](/functional/claim_access) alone. A person is shown their own credit score wherever the ACL
says so, and a client is told a name or a tier through consent or through its own scopes alike.

### A personal claim

A **personal claim** is the person's: a name, an address, a birth date. It is collected from them in the
[interactive flow](/functional/interactive_flow#collecting-additional-information-optional), disclosed to a
client once they agreed to the [scope](/functional/scope#consentable-scope) that gates it, and about them in
the way nothing an application computes is.

A client of one audience writing a personal claim shared across audiences would be choosing what every
other audience is told a person is called, over the person's head. So **a client writes a personal claim
only where it is restricted to one [audience](/functional/audience)** — the value then leaves this server to
that audience alone. On a shared personal claim, the only value `writable-by-client` accepts is the literal
`"false"`: anything else is refused at startup.

An [identifier claim](/functional/claims#identifier-claims) is always a personal claim, because it is what
the account signs in with and nobody but the person ever types it. Declaring one an application's is
refused at startup, and no client writes one whatever its scopes.

### An application claim

An **application claim** is an application's, attached to the person: a credit score, a subscription tier,
a flag a backend computes. The person never types it, because a backend answers for the value, and
**no flow asks for one and no access token of the person's writes one**: on an application claim, the only
value `collected-in-flow` and `writable-by-person` accept is the literal `"false"`, and anything else is refused
at startup.

Its read doors may still ask for consent to a scope, where the person has to agree before a client is told
their score: consent gates disclosure and says nothing about whose the value is.

A client reads and writes an application claim through whatever its `readable-by-client` and
`writable-by-client` doors ask; on the shipped template, those are the [client scopes](/functional/scope#client-scope)
`users:claims:read` and `users:claims:write`. A client may write it whether the claim is restricted to an audience
or shared: the value is the application's, and the deployment chose which applications have it.

### A generated claim

`sub`, `updated_at` and `auth_time` are computed by this server rather than collected, belong to every
audience, and are written by nobody — so they are of neither kind, and a deployment configures nothing
about them. A file declaring a key under one of those names is refused at startup.

## The kind is not the origin

A claim's **origin** says whose its *name* is — the OpenID Connect specification's, or
[the deployment's own](/functional/claims#standard-and-custom-claim-names). That is a different question
from whose the value is.

The two are independent. A claim of your own can be the person's, and a standard-named one can be an
application's once the deployment declares it `kind: application` and opens its doors to a client scope instead
of to consent — so the name's provenance never said who may write the
value. The [Admin API](/technical/api/admin) publishes `kind` beside `origin` for exactly that reason.

## Declaring a claim's kind

A claim says whose its value is in one of two ways, and **a claim saying it nowhere is refused at startup**:

- by naming the shipped [template](/technical/configuration/claim#templates-claims-id) of that kind —
  `template: personal` or `template: application`, which also carry
  [where a claim of that kind is usually exposed](/functional/claims#where-a-claim-is-exposed) and, for an
  application claim, its client doors;
- or by declaring [`kind`](/technical/configuration/claim#claims-id-kind) on the claim itself, which
  overrides whatever its template says.

There is no template a claim falls back to, and nothing the server could pick for a claim that names none:
any value it chose would be a guess about whether a person is asked to type the claim.

Each refusal of the kind is made on the ACL as the claim resolves it, its template included, so a door a template
opens is refused on every claim taking it. The refusal names the claim, not the template, and writing `"false"`
under the claim's own `acl.<door>` key is what shuts the inherited door.
