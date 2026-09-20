# Claims

A **claim** is a piece of information about an end-user — their name, email address, preferred language, or any other
detail relevant to your application. When a client needs to know something about the user who just logged in, it reads
it from the claims provided by SympAuthy.

SympAuthy acts as a central repository for these claims: a user fills in their information once, and all clients sharing
the same authorization server can access it without asking the user again.

SympAuthy controls who can access each claim. These defaults can be
[customized per claim](/technical/configuration/claim#claims-id-acl).

Out of the box, SympAuthy supports all claims standardized in
the [OpenID specification](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims). They are referred to
as [OpenID Connect claims](#openid-connect-claims) throughout this documentation.

In addition to [OpenID Connect claims](#openid-connect-claims), you can define your own claims about the end-user to
centralize additional information you want to share between the clients of this authorization server. Those are referred
to as [custom claims](#custom-claims) throughout this documentation.

## OpenID Connect claims

OpenID Connect claims are claims defined by
the [OpenID Connect specification](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims). They cover the
most common pieces of user information: `name`, `email`, `phone_number`, `birthdate`, `locale`, and more.

Because they follow a shared specification, OpenID Connect claims are understood by any OpenID Connect-compatible
library or service without any custom integration work on your part.

SympAuthy supports all OpenID Connect claims out of the box. You only need to enable the ones you want to collect.

By default, OpenID Connect claims require the end-user's [consent](/functional/consent) — a client can only read them
if the user has approved the corresponding [scope](/functional/scope#consentable-scope).

OpenID Connect claims are always shared across all [audiences](/functional/audience) — they cannot be scoped to a
specific audience.

## Custom claims

When the OpenID Connect claims do not cover a piece of information specific to your application — for example, a
subscription plan or an internal user role — you can define your own **custom claims**.

By default, custom claims are not collected from the end-user. They are written by client applications through
the [Client API](/technical/api/client) and represent application-managed metadata about a user — for example, a
department, a subscription tier, or an internal role.

Custom claims can optionally be scoped to an **[audience](/functional/audience)** by setting the `audience` field in
the claim configuration. When set, the claim is only visible to clients within that audience. When `audience` is not
set (the default), the claim is shared across all audiences.

By default, any client with the right [client scope](/functional/scope#client-scope) can read and write custom claims
without user involvement. This default can be overridden — if a custom claim should be consent-gated (for example,
because it contains personal data entered by the user), you can configure its
[ACL](/technical/configuration/claim#claims-id-acl) to require consent, just like an OpenID Connect claim.

## Identifier claims

Any enabled claim a deployment lists in [`auth.identifier-claims`](/technical/configuration/authorization#auth) becomes
an **identifier claim** — one of the values a person
[signs in with](/functional/authentication#identifier-and-password). An email address is the usual choice, but a
username, an employee number or any other claim that singles out one person does the job as well. These claims are
collected at sign-up, and an account keeps them.

A user signs in with **any one** of them, never with all of them at once: a single typed value is matched against every
claim in the list. That is what makes the uniqueness rule span the list rather than each claim in it — **a value belongs
to one account across the whole set of identifier claims, not within the claim it was entered under.** Two accounts
holding one value under different identifier claims would make a login ambiguous.

The practical consequence surprises, so it is worth knowing before configuring a second identifier claim. With
`identifier-claims: [email, preferred_username]`:

- no account may use its own email address as its username;
- no account may take another account's email address as its username.

Sign-up refuses either one, exactly as it refuses an email address somebody else already registered with. Only completed
sign-ups hold a value, though: an
[abandoned one leaves its identifier claims free](/functional/end-user_management#a-sign-up-counts-only-once-the-flow-completes).

## Access control

SympAuthy decides whether a user or client can read or write a claim based on the claim's
**access control list (ACL)**. There are two ways access can be granted:

- **Through consent** — the end-user consents to a [scope](/functional/scope#consentable-scope),
  which unlocks the claim for the user and/or the client. This is the default for OpenID Connect
  claims.
- **Through client scopes** — the client holds a [client scope](/functional/scope#client-scope)
  that grants access directly, without involving the end-user. This is the default for custom claims.

Out of the box, you do not need to configure any ACL — the defaults follow the OpenID Connect
specification. If you need different behavior (for example, consent-gating a custom claim), see
[ACL configuration](/technical/configuration/claim#claims-id-acl).

## Configuration

Both OpenID Connect and custom claims must be enabled in the configuration before SympAuthy uses them. Refer to
the [configuration](/technical/configuration/claim) section for the full list of options, including
[claim templates](/technical/configuration/claim#templates-claims-id) and
[ACL settings](/technical/configuration/claim#claims-id-acl).
