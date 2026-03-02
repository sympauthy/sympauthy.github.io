# End-User Management

This page explains the lifecycle of a user account in SympAuthy: from creation through everyday use to deletion.

## Account creation

A user account is created the first time a user goes through the [interactive sign-in flow](interactive_flow) and
chooses to register.

**With email and password**, the user provides their email address and a password. SympAuthy creates a new account
with these credentials. Depending on the configuration, the user may also be asked to verify their email address
before they can proceed.

**With a third-party provider** such as Google, the user authenticates through that service. SympAuthy receives the
user's basic information (name, email, etc.) from the provider and uses it to create the account automatically. No
password is needed.

Once the account exists, the user can sign back in at any time using the same method — or any other enabled method
that uses the same email address.

## Profile information

SympAuthy stores user information as **[claims](claims)**: pieces of data such as a name, an email address, a
preferred language, or application-specific attributes like a subscription plan.

The claims collected for each user depend on which ones have been enabled in the configuration. When a user signs in
for the first time, they may be asked to fill in any required information that was not automatically supplied — for
example, if a name was not provided by the third-party provider.

## Account merging

A user may sign in using different methods over time — for example, once with an email and password, and later using
their Google account — while using the same email address for both.

By default, SympAuthy recognises that these sign-ins come from the same person and merges them into a single account.
The user ends up with one account regardless of which method they used to sign in.

This behavior can be adjusted via the `advanced.user-merging-strategy` configuration key. For more details, see the
[Authentication](authentication#account-merging) page.

## Account deletion

An account can be deleted through the SympAuthy administration API. Once deleted, the user's information and
credentials are permanently removed. Any active sessions or tokens issued for that account are immediately
invalidated.
