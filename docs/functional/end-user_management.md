# End-User Management

This page explains the lifecycle of a user account in SympAuthy: from creation through everyday use to deletion.

## Account creation

A user account is created the first time a user goes through the [interactive flow](interactive_flow) and chooses to
register — and it is not final until that flow finishes.

**With email and password**, the user provides their email address and a password. SympAuthy creates a new account
with these credentials. Depending on the configuration, the user may also be asked to verify their email address
before they can proceed.

**With a third-party provider** such as Google, the user authenticates through that service. SympAuthy receives the
user's basic information (name, email, etc.) from the provider and uses it to create the account automatically. No
password is needed.

**With an [invitation](/functional/invitation)**, an administrator or client application creates a single-use
invitation token and shares it with the intended user. The user redeems the token during the authorize flow and
then registers through the normal sign-up process. Invitations allow self-registration even when open sign-up is
disabled on the [audience](/functional/audience).

### A sign-up counts only once the flow completes

The account takes shape as the user goes: the claims they filled in, the password they chose, the provider they
authenticated with are all recorded as they happen. But they are **provisional** until the
[interactive flow](interactive_flow) that creates the account reaches its end, and a sign-up somebody abandons
half-way leaves nothing behind:

- The unfinished account is collected by a scheduled sweep, so it never becomes a half-created user an administrator
  has to clean up by hand.
- The identifier claims it used — the email address, or whatever
  [`auth.identifier-claims`](/technical/configuration/authorization#auth) names as the login identifier — stay free in
  the meantime. Someone else can register with them, and so can the same person on a second attempt.
- An [invitation](/functional/invitation) redeemed by that sign-up is not spent: the invitee's link still works and
  they can start over with it.

Once the account exists, the user can sign back in at any time using the same method — or any other enabled method
that resolves to the same identifier claims.

## Profile information

SympAuthy stores user information as **[claims](claims)**: pieces of data such as a name, an email address, a
preferred language, or application-specific attributes like a subscription plan.

The claims collected for each user depend on which ones have been enabled in the configuration. When a user signs in
for the first time, they may be asked to fill in any required information that was not automatically supplied — for
example, if a name was not provided by the third-party provider.

## Adding a sign-in method later

The method an account was created with is not the only one it can ever use. A
[third-party provider](/functional/authentication#third-party-providers) can be **linked** to an account that already
exists: someone who registered with an email and a password can attach their Google account afterwards and sign in
either way from then on.

The link is made through an [interactive flow](interactive_flow#linking-a-third-party-provider), started for the user
by an application from an account-settings screen ([Client API](/technical/api/client#provider-linking)) or by an
administrator ([Admin API](/technical/api/admin#start-provider-link)). The user approves the action and proves they
still own the account before the provider is attached to it. Linking never creates a second account, and it is refused
outright if that provider identity already belongs to somebody else.

This is deliberate and explicit, unlike the automatic merging described below.

## Account merging

A user may sign in using different methods over time — for example, once with an email and password, and later using
their Google account — while using the same email address for both.

When account merging is enabled, SympAuthy recognises that these sign-ins come from the same person and merges them
into a single account. The user ends up with one account regardless of which method they used to sign in.

This behavior is controlled by the `auth.user-merging-enabled` configuration key, off unless a deployment turns it on.
For more details, see the [Authentication](authentication#account-merging) page.

## Account deletion

An account can be deleted through the SympAuthy administration API. Once deleted, the user's information and
credentials are permanently removed. Any active sessions or tokens issued for that account are immediately
invalidated.
