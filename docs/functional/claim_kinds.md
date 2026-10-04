# Kinds of Claims

Every [claim](/functional/claims) declares whose its value is: the person's, or an application's. It is the
one thing about a claim that decides **who may write it**, and a claim that says it nowhere is refused at
startup.

A name and a credit score are both claims about one person, and almost nothing else about them is alike.

## Two kinds of claim

A claim's **kind** is `personal` — the person's — or `application` — an application's.

|                            | A personal claim                                                                                           | An application claim                                              |
|----------------------------|------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| Whose the value is         | the person's                                                                                               | an application's, attached to the person                          |
| Examples                   | `name`, `email`, `birthdate`                                                                               | a credit score, a subscription tier, a flag a backend computes    |
| Who writes it              | the person, in the [interactive flow](/functional/interactive_flow) or through their own access token      | a client, through the scopes the claim's ACL names                |
| A client write             | only where the claim names an [audience](/functional/audience)                                             | wherever the deployment put the claim                             |
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
that audience alone — and a shared personal claim granting a client write is refused at startup.

An [identifier claim](/functional/claims#identifier-claims) is always a personal claim, because it is what
the account signs in with and nobody but the person ever types it. Declaring one an application's is
refused at startup, and no client writes one whatever its scopes.

### An application claim

An **application claim** is an application's, attached to the person: a credit score, a subscription tier,
a flag a backend computes. The person never types it, because a backend answers for the value, and
**no flow asks for one and no access token of the person's writes one**.

It may still carry a consent scope, where the person has to agree before a client is told their score:
consent gates disclosure and says nothing about whose the value is.

A client reads and writes an application claim through the [client scopes](/functional/scope#client-scope)
its ACL names, whether the deployment restricted the claim to an audience or left it shared — the value is
the application's, and the deployment chose which applications have it.

### A generated claim

`sub`, `updated_at` and `auth_time` are computed by this server rather than collected, belong to every
audience, and are written by nobody — so they are of neither kind, and a deployment configures nothing
about them. A file declaring a key under one of those names is refused at startup.

## The kind is not the origin

A claim's **origin** says whose its *name* is — the OpenID Connect specification's, or
[the deployment's own](/functional/claims#standard-and-custom-claim-names). That is a different question
from whose the value is.

The two are independent. A claim of your own can be the person's, and a standard-named one can be an
application's once the deployment strips its scope — so the name's provenance never said who may write the
value. The [Admin API](/technical/api/admin) publishes `kind` beside `origin` for exactly that reason.

## Declaring a claim's kind

A claim says whose its value is in one of two ways, and **a claim saying it nowhere is refused at startup**:

- by naming the shipped [template](/technical/configuration/claim#templates-claims-id) of that kind —
  `template: personal` or `template: application`, which also carry the ACL and the exposure each kind
  usually wants;
- or by declaring [`kind`](/technical/configuration/claim#claims-id-kind) on the claim itself, which
  overrides whatever its template says.

There is no template a claim falls back to, and nothing the server could pick for a claim that names none:
any value it chose would be a guess about whether a person is asked to type the claim.
