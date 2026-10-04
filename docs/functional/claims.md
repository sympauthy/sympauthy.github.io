# Claims

A **claim** is a piece of information this authorization server holds about a person — their name, their
email address, a subscription tier, a score a backend computed. When a client needs to know something
about the person who just signed in, it reads it from the claims SympAuthy provides.

SympAuthy acts as a central repository for these claims: a value is held once, and every client sharing
the same authorization server reads it without asking the person again.

**Whose that value is decides who may write it**, and every claim says so for itself: it is
[the person's or an application's](#two-kinds-of-claim). Who may read and write one, party by party, is
[claim access control](/functional/claim_access).

## Two kinds of claim

A claim's **kind** is `personal` — the person's — or `application` — an application's. A name and a credit
score are both claims about one person, and almost nothing else about them is alike:

|                            | A personal claim                                                                                           | An application claim                                              |
|----------------------------|------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| Whose the value is         | the person's                                                                                               | an application's, attached to the person                          |
| Examples                   | `name`, `email`, `birthdate`                                                                               | a credit score, a subscription tier, a flag a backend computes    |
| Who writes it              | the person, in the [interactive flow](/functional/interactive_flow) or through their own access token      | a client, through the scopes the claim's ACL names                |
| A client write             | only where the claim names an [audience](/functional/audience)                                             | wherever the deployment put the claim                             |
| The person typing it       | what the flow asks them for                                                                                | never — a backend answers for the value                           |

**Reading is the same question for both.** The kind decides who may *write* a value; who may be told one is
the [ACL](/functional/claim_access) alone. A person is shown their own credit score wherever the ACL says
so, and a client is told a name or a tier through consent or through its own scopes alike.

### A personal claim

A **personal claim** is the person's: a name, an address, a birth date. It is collected from them in the
[interactive flow](/functional/interactive_flow#collecting-additional-information-optional), disclosed to a
client once they agreed to the [scope](/functional/scope#consentable-scope) that gates it, and about them in
the way nothing an application computes is.

A client of one audience writing a personal claim shared across audiences would be choosing what every
other audience is told a person is called, over the person's head. So **a client writes a personal claim
only where it is restricted to one [audience](/functional/audience)** — the value then leaves this server to
that audience alone — and a shared personal claim granting a client write is refused at startup.

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

A claim's **origin** says whose its *name* is, which is a different question from whose its value is.

Out of the box, SympAuthy supports every claim standardized in the
[OpenID Connect specification](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims) —
`name`, `email`, `phone_number`, `birthdate`, `locale` and the rest. Because they follow a shared
specification, any OpenID Connect-compatible library understands them with no integration work on your
part. They ship disabled: a deployment enables the ones its applications ask for.

Where the specification covers nothing you need, declare a claim of your own — a subscription plan, an
internal role, a `discord_id` — and centralize it between the clients of this authorization server the same
way.

The two questions are independent. A claim of your own can be the person's, and a standard-named one can be
an application's once the deployment strips its scope — so the name's provenance never said who may write
the value. The [Admin API](/technical/api/admin) publishes `kind` beside `origin` for exactly that reason.

## Declaring a claim's kind

A claim says whose its value is in one of two ways, and **a claim saying it nowhere is refused at startup**:

- by naming the shipped [template](/technical/configuration/claim#templates-claims-id) of that kind —
  `template: personal` or `template: application`, which also carry the ACL and the exposure each kind
  usually wants;
- or by declaring [`kind`](/technical/configuration/claim#claims-id-kind) on the claim itself, which
  overrides whatever its template says.

There is no template a claim falls back to, and nothing the server could pick for a claim that names none:
any value it chose would be a guess about whether a person is asked to type the claim.

## Identifier claims

Any enabled claim a deployment lists in [`auth.identifier-claims`](/technical/configuration/authorization#auth) becomes
an **identifier claim** — one of the values a person
[signs in with](/functional/authentication#identifier-and-password). An email address is the usual choice, but a
username, an employee number or any other claim that singles out one person does the job as well. These claims are
collected at sign-up, and an account keeps them.

An identifier claim is a [personal claim](#a-personal-claim), because it is what the account signs in with
and nobody but the person ever types it. Declaring one an application's is refused at startup, and no
client writes one whatever its scopes.

A user signs in with **any one** of them, never with all of them at once: a single typed value is matched against every
claim in the list. That is what makes the uniqueness rule span the list rather than each claim in it — **a value belongs
to one account across the whole set of identifier claims, not within the claim it was entered under.** With
`identifier-claims: [email, preferred_username]`, no account may take as its username a value another account already
holds as its email address, or the other way round; sign-up refuses it, exactly as it refuses an email address somebody
else has registered.

The rule is not tidiness, and what it keeps out is worth spelling out. Let one account hold `email = a` and
`preferred_username = b`, and another hold `email = b` and `preferred_username = a`. Neither account is malformed on its
own — but a login is one value matched against every claim, so typing `a` matches a row of each. The server resolves to
one of them, and the person who owns `a` has their password checked against an account that is not theirs.

One account holding a single value under two of its **own** identifier claims — its address as its username as well — is
a different thing, and it is allowed: both rows name that account, so the login reaches it whichever one matched.

Only completed sign-ups hold a value, though: an
[abandoned one leaves its identifier claims free](/functional/end-user_management#a-sign-up-counts-only-once-the-flow-completes).

## Access control

Whether a party may read or write a claim is decided by the claim's **access control list (ACL)**, and there
are two paths — either one is sufficient:

- **Through consent** — the person consents to a [scope](/functional/scope#consentable-scope), which unlocks
  the claim for the interactive flow, for the person, for the client, or for any combination of them. This is
  what the shipped `personal` template grants.
- **Through client scopes** — the client holds a [client scope](/functional/scope#client-scope) that grants
  access directly, without involving the person. This is what the shipped `application` template grants.

The [kind](#two-kinds-of-claim) is held to the ACL at startup: a key the kind of claim cannot mean is refused
rather than accepted and ignored.

[Claim access control](/functional/claim_access) is the whole of it — every party, every direction and every
key, in one table — and [ACL configuration](/technical/configuration/claim#claims-id-acl) is where the keys
are written.

## Where a claim is exposed

Access control decides **who** may know a claim's value. Where that value travels is a separate decision,
and [`published-in`](/technical/configuration/claim#claims-id-published-in) is the one key that answers it.
There are five places:

| Place                                                                | Carries        |
|----------------------------------------------------------------------|----------------|
| The [ID token](/functional/tokens#id-token)                          | the value      |
| The `/api/openid/userinfo` response                                  | the value      |
| The [access token](/functional/tokens#a-claim-in-an-access-token)    | the value      |
| The [introspection response](/functional/tokens#token-introspection) | the value      |
| `claims_supported` on the discovery document                         | the name alone |

A claim is exposed in the places its configuration names and in no other: one naming none never leaves
through a token, `/userinfo` or introspection, though the [Client API](/technical/api/client) still reads
it where the ACL allows. The shipped `personal` template names the ID token, `/userinfo` and the discovery
document, so a claim taking it travels where a client expects it; a claim on the `application` template
names nothing until you say so.

**Naming a place is not being allowed to reach it.** Publication only narrows what the
[ACL](#access-control) already permits — a claim the ACL refuses the caller is exposed nowhere, whatever it
names, and a claim restricted to another [audience](/functional/audience) is left out everywhere.

Advertising and serving come apart in both directions. `claims_supported` lists exactly the claims naming
`discovery`, so a deployment may serve a claim it does not advertise — and advertise a claim of its own. The
opposite is refused at startup: a claim advertised in no place that carries its value would be a name no
client could ever obtain a value for.

## Configuration

A claim must be enabled in the configuration before SympAuthy uses it. Refer to the
[configuration](/technical/configuration/claim) section for the full list of options, including
[`kind`](/technical/configuration/claim#claims-id-kind),
[claim templates](/technical/configuration/claim#templates-claims-id) and
[ACL settings](/technical/configuration/claim#claims-id-acl).
