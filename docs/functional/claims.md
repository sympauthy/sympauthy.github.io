# Claims

A **claim** is a piece of information this authorization server holds about a person — their name, their
email address, a subscription tier, a score a backend computed. When a client needs to know something
about the person who just signed in, it reads it from the claims SympAuthy provides.

SympAuthy acts as a central repository for these claims: a value is held once, and every client sharing
the same authorization server reads it without asking the person again.

A deployment answers three questions about every claim it declares:

- **Whose is the value?** The person's, or an application's. That is
  [the kind of the claim](/functional/claim_kinds), and it decides who may write it.
- **Who may read and write it?** The claim's access control list, party by party and direction by
  direction — [claim access control](/functional/claim_access).
- **Where does the value travel?** The tokens and endpoints that carry it, which is
  [where a claim is exposed](#where-a-claim-is-exposed) below.

## Standard and custom claim names

Out of the box, SympAuthy supports every claim standardized in the
[OpenID Connect specification](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims) —
`name`, `email`, `phone_number`, `birthdate`, `locale` and the rest. Because they follow a shared
specification, any OpenID Connect-compatible library understands them with no integration work on your
part. They ship disabled: a deployment enables the ones its applications ask for.

Where the specification covers nothing you need, declare a claim of your own — a subscription plan, an
internal role, a `discord_id` — and centralize it between the clients of this authorization server the
same way.

This is a claim's **origin**, which the [Admin API](/technical/api/admin) publishes as `openid` or
`custom`. It says nothing about [whose the value is](/functional/claim_kinds#the-kind-is-not-the-origin):
a claim of your own can be the person's, and a standard-named one can be an application's.

## Identifier claims

Any enabled claim a deployment lists in [`auth.identifier-claims`](/technical/configuration/authorization#auth) becomes
an **identifier claim** — one of the values a person
[signs in with](/functional/authentication#identifier-and-password). An email address is the usual choice, but a
username, an employee number or any other claim that singles out one person does the job as well. These claims are
collected at sign-up, and an account keeps them.

An identifier claim is a [personal claim](/functional/claim_kinds#a-personal-claim), because it is what the
account signs in with and nobody but the person ever types it. Declaring one an application's is refused at
startup, and no client writes one whatever its scopes.

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

## Where a claim is exposed

[Access control](/functional/claim_access) decides **who** may know a claim's value. Where that value
travels is a separate decision, and
[`published-in`](/technical/configuration/claim#claims-id-published-in) is the one key that answers it.
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

**Naming a place is not being allowed to reach it.** Publication only narrows what the ACL already
permits — a claim the ACL refuses the caller is exposed nowhere, whatever it names, and a claim restricted
to another [audience](/functional/audience) is left out everywhere.

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

## Claims pages

- [Kinds of Claims](/functional/claim_kinds) — whose a claim's value is, and who may write it.
- [Claim Access Control](/functional/claim_access) — every party, every direction, and the ACL key that
  grants it.
