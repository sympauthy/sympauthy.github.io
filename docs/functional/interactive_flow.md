# How an Interactive Flow Works

An interactive flow is the sequence of steps a user goes through in an authentication interface — the one SympAuthy
ships with, or a custom one built on the [Flow API](/technical/api/flow). This page explains the concepts behind that
sequence and how the different parts fit together.

## What is an interactive flow?

A flow runs for a **purpose**: something that can only be settled with the user in person, in a browser, because only
they can settle it. Signing in is the most common one, but it is not the only one:

- **signing a user in** so a client application can act on their behalf;
- **approving an action** an application or an administrator started on the user's behalf;
- **proving the user still owns** the account they are already identified as;
- **enrolling a second factor**, or challenging one that is already enrolled;
- **linking a third-party provider** to an account that already exists.

When a client application (a website, a mobile app, etc.) needs to authenticate a user, it redirects them to the
authorization server, which then presents an authentication interface to the user. That is a flow with a single
purpose. But a flow can carry several at once, and the server can add more while it runs — approving an action, then
signing in to prove ownership of the account, then a second factor, then the provider, all in one visit. The steps the
user walks through are derived from the purposes; they are not a fixed list.

SympAuthy ships with a built-in authentication UI that is used by default. It handles all the steps described on this
page out of the box, so no additional setup is required to get a working authentication experience.

If the built-in interface does not fit the needs of your application — for example, because you want a fully branded
sign-in page — you can replace it with your own custom UI. This is done by configuring the `flows.<id>` key in the
[configuration](/technical/configuration/authorization#flows-id) to point to your own pages instead of the built-in one.

A custom UI communicates with the [Flow API](/technical/api/flow) to guide the user through
the flow step by step. The Flow API drives the experience: after each action the user takes, the server tells the
UI which screen to show next. The UI never decides on its own what comes after — it always follows the server's
instructions. That rule is what allows one flow to serve several purposes: the UI does not have to know why it is
showing a screen, only which screen the server pointed it at.

## The session state

When the user arrives on the authentication page, the URL contains a `state` token. This token identifies the ongoing
flow session and must be passed along with every subsequent call. It is what allows the server to keep track of
where this particular user is in the flow and what has already been completed.

The token is in the URL whichever way the flow was started — whether the user landed there because an application
redirected them to sign in, or because an application or an administrator
[started an action on their behalf](#an-action-started-on-the-user-s-behalf) and handed them the resulting link.

## How the flow progresses

Each step in the flow ends with the server returning a pointer to the next step. The UI simply follows those pointers
until it reaches the end of the flow.

Those pointers come from the flow's purposes: each purpose contributes the steps it needs, and a step can pull further
ones in behind it. A gate always runs before the thing it protects — [proving ownership of the
account](#proving-you-still-own-the-account) comes before a provider is linked, and if that account has a second factor
enrolled, the challenge for it is added too. So the number of screens ahead of the user is not settled when the flow
starts, and the application that started the flow does not get to say what they are.

Some steps can be skipped automatically. For instance, if the user signed in via a third-party provider that already
supplied their email address, there is nothing to collect — the server skips straight past the claim collection screen.
The UI does not need any logic to decide this: it just follows the pointer and ends up at the right place.

## The steps of a sign-in

Signing a user in for an application is the purpose most flows serve, and these are the steps it implies. They are
presented in the order a sign-in normally runs through them, but that order belongs to this purpose rather than to
flows in general: another purpose implies a different set of steps, in a different order, and may add more once the
flow is already running.

### Loading the sign-in options

Before showing anything, the UI asks the server what the current step offers. Each step describes itself rather than
relying on one global configuration call: the sign-in screen advertises whether password sign-in is enabled, which
third-party providers (Google, GitHub, etc.) are configured, and whether new users can register. The later steps do the
same — the sign-up screen lists the information to collect, and the multi-factor step decides which verification to
show.

The UI uses this information to decide which buttons and forms to display. An instance with only Google sign-in
configured will not show a password form.

### Authenticating the user

The user chooses how they want to authenticate. There are up to three options depending on the configuration:

**Sign in with a password** — The user provides the identifier they registered with (typically their email address) and
their password. If the credentials are valid, the flow moves to the next step.

**Create a new account** — The user provides a password and the basic information required to create an account (e.g.
their email address). Once the account is created, the flow continues.

**Sign in with a third-party provider** — The user is redirected to an external service (such as Google) to authenticate
there. Once they return, the flow resumes automatically from where it left off.

### Multi-factor authentication (optional)

After authentication, the server may require an additional verification step if multi-factor authentication (MFA) is
enabled. The server decides what happens next based on the MFA configuration and the user's enrollment state:

- If MFA is disabled, this step is **skipped automatically**.
- If the user has already enrolled in exactly one MFA method, they are **redirected directly to the challenge screen**
  where they enter the code from their authenticator app — regardless of whether MFA is required or optional.
- If MFA is required and the user has not yet enrolled, they are shown an **enrollment screen**. For TOTP, this means
  scanning a QR code with an authenticator app and confirming the setup by entering a first valid code.
- If MFA is optional and the user has not enrolled, they are shown a **method selection screen** with enrollment offers
  and the option to skip.
- If multiple methods are enrolled (future), a **method selection screen** is shown without skip.

As with every other step, the UI does not decide which screen to show — it follows the pointer returned by the server.

### Collecting additional information (optional)

After authentication (and MFA, if applicable), the server may still need information about the user that wasn't provided
during sign-up or wasn't available from the third-party provider. The user is presented with a form to fill in the
missing details.

If the third-party provider already supplied some of this information (for example, a name or a profile picture URL),
the form is pre-filled with those values so the user just has to confirm them.

If no additional information is needed, this step is skipped entirely.

### Verifying the user's contact details (optional)

Some pieces of information must be verified before they can be trusted. A common example is an email address: the server
sends a one-time code to that address, and the user must enter it to prove they have access to it.

If the configuration requires this kind of verification, the user is shown a screen where they can enter the code they
received. They can also request a new code if they did not receive the first one.

If no verification is required (for instance because the email was already confirmed by a trusted third-party provider),
this step is skipped.

### Returning to the application

Once all required steps have been completed, the user is redirected back to the client application. The client
application receives an authorization code that it exchanges for tokens to access the user's account.

From the user's perspective, they are simply sent back to wherever they came from, now signed in.

A flow that an application or an administrator started on the user's behalf ends differently: no authorization code is
issued, and the user is returned to the destination its initiator named.

## An action started on the user's behalf

Not every flow begins with an application asking someone to sign in. An application can start one for a user who is
already signed into it — "add a second factor", "connect your Google account", offered from an account-settings or
security screen — and so can an administrator, from an admin dashboard or during a support interaction. In both cases
the initiator receives a link and sends the user to it; the flow opens there rather than on a sign-in page, and the
user is already identified.

What the user meets first is a **confirmation**: a screen naming the action and saying who asked for it. When an
application started it, that application is named. When an administrator started it, the screen says an administrator
did — an administrator is identified as such, never dressed up as an application.

From there the user either approves, and the flow continues into whatever steps the action needs, or declines. Declining
is a [cancellation](#cancelling-the-flow), not an error: nothing went wrong, the user simply chose not to go ahead.

Such a flow does not end with an authorization code. It ends by returning the user to the destination its initiator
named when it started the flow — typically the screen they came from.

Two actions can be started this way today: enrolling in
[multi-factor authentication](/functional/authentication#multi-factor-authentication-mfa), and
[linking a third-party provider](#linking-a-third-party-provider). Note that an enrollment started this way cannot be
skipped, unlike the optional enrollment offered during a sign-in.

## Proving you still own the account

Some actions are too consequential to run on the strength of "this browser signed in a while ago". Before them, the
server inserts a **re-authentication** step: the user signs in again, on the screen they already know, to prove they
still control the account.

It looks like a sign-in, but it confirms rather than establishes — the account is fixed before the step runs, and the
step cannot change it:

- **Only that account's own methods are offered** — its password if it has one, and the providers already linked to it.
  Nothing else appears.
- **There is no way to register.** The "create an account" link is absent, because creating an account would be
  answering a different question.
- **Authenticating as a different account is refused.** Valid credentials belonging to somebody else do not switch the
  flow over to that account: they are rejected on the same screen, like a wrong password, and the user can try again as
  the right one.
- **A second factor is asked for again** when the account has one enrolled, so the proof is at least as strong as an
  ordinary sign-in to that account.

Users are asked for this while they are already signed in, which is surprising unless it is explained: an interface
should say that the action ahead is one only the account holder should be able to take.

## Linking a third-party provider

A [third-party provider](/functional/authentication#third-party-providers) is normally a way to sign in, or a way to
register. It is also a way to add a sign-in method to an account that already exists. The user authorizes Google,
Discord or whichever provider exactly as they would when signing in with it, but the outcome is a **link** to the
account they already have, not a sign-in and not a new account. From then on, that provider is another way into the
same account.

A link is always preceded by [proof that the user still owns the account](#proving-you-still-own-the-account), because
it mints a durable credential: from that point on, anyone who can authenticate with that provider reaches the account.
When an application or an administrator started the link, the [confirmation](#an-action-started-on-the-user-s-behalf)
comes first as well — so a single visit can run confirmation, then sign-in, then a second factor, then the provider,
before returning the user to the application.

Linking can fail, and when it does it fails outright. If the provider identity the user authorized — or an
[identifier claim](/functional/claims) it carries, such as an email address — already belongs to a different account,
the link is refused and the flow ends without it. Nothing is merged and nothing is moved: the user keeps the two
separate accounts they had.

## Cancelling the flow

A user does not have to see the flow through to the end. If your custom UI offers a way out — a "Cancel" button on the
sign-in page, for example — the user can deliberately abandon the flow before completing it. This is different from an
error: nothing went wrong, the user simply chose to stop.

Where the user ends up depends on how the flow was started:

- **A sign-in requested by an application** — the user is sent back to the application that asked them to authenticate,
  which is told that the user declined. No authorization code is issued, so the application does not gain access to the
  user's account. This is the standard way to report that a user backed out of signing in.
- **[An action started on the user's behalf](#an-action-started-on-the-user-s-behalf)** — for example, enrolling in
  [multi-factor authentication](/functional/authentication#multi-factor-authentication-mfa) from an account-settings
  screen. Here the user is returned to wherever the initiator designated when it started that action, typically the
  screen they came from. Declining the confirmation that opens such a flow is a cancellation of this kind.

Whether a flow can be cancelled at all depends on the initiator providing somewhere to send the user back to. A sign-in
requested by an application can always be cancelled, because the application always provides a return destination. An
action started on the user's behalf can only be cancelled if its initiator supplied a cancellation destination when it
started the flow; otherwise the user must complete it.

## Error handling

If the user makes a mistake at any step — entering a wrong password, typing an incorrect verification code — they
receive an error message on the same screen and can try again. The session remains active and the flow does not restart.

In more serious situations (for example if the session has expired), the user is automatically redirected to an error
page. The flow must then be restarted from the beginning.
