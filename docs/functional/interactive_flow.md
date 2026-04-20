# How an Interactive Flow Works

An interactive flow is the sequence of steps a user goes through when signing in or creating an account via a custom
authentication UI built on the [Flow API](/technical/api/flow). This page explains the concepts behind that sequence and how the
different parts fit together.

## What is an interactive flow?

When a client application (a website, a mobile app, etc.) needs to authenticate a user, it redirects them to the
authorization server, which then presents an authentication interface to the user.

SympAuthy ships with a built-in authentication UI that is used by default. It handles all the steps described on this
page out of the box, so no additional setup is required to get a working authentication experience.

If the built-in interface does not fit the needs of your application — for example, because you want a fully branded
sign-in page — you can replace it with your own custom UI. This is done by configuring the `urls.flow` key in the
[configuration](/technical/configuration/authorization#urls-flow) to point to your own page instead of the built-in one.

A custom UI communicates with the [Flow API](/technical/api/flow) to guide the user through
authentication step by step. The Flow API drives the experience: after each action the user takes, the server tells the
UI which screen to show next. The UI never decides on its own what comes after — it always follows the server's
instructions.

## The session state

When the user arrives on the authentication page, the URL contains a `state` token. This token identifies the ongoing
authorization session and must be passed along with every subsequent call. It is what allows the server to keep track of
where this particular user is in the flow and what has already been completed.

## How the flow progresses

Each step in the flow ends with the server returning a pointer to the next step. The UI simply follows those pointers
until it reaches the end of the flow.

Some steps can be skipped automatically. For instance, if the user signed in via a third-party provider that already
supplied their email address, there is nothing to collect — the server skips straight past the claim collection screen.
The UI does not need any logic to decide this: it just follows the pointer and ends up at the right place.

## The steps

### 1. Loading the configuration

Before showing anything, the UI asks the server what options are available for this instance of SympAuthy. The server
describes:

- whether password-based sign-in is enabled,
- whether new users can register,
- which third-party providers (Google, GitHub, etc.) are configured,
- whether multi-factor authentication is enabled and which methods are available.

The UI uses this information to decide which buttons and forms to display. An instance with only Google sign-in
configured will not show a password form.

### 2. Authenticating the user

The user chooses how they want to authenticate. There are up to three options depending on the configuration:

**Sign in with a password** — The user provides the identifier they registered with (typically their email address) and
their password. If the credentials are valid, the flow moves to the next step.

**Create a new account** — The user provides a password and the basic information required to create an account (e.g.
their email address). Once the account is created, the flow continues.

**Sign in with a third-party provider** — The user is redirected to an external service (such as Google) to authenticate
there. Once they return, the flow resumes automatically from where it left off.

### 3. Multi-factor authentication (optional)

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

### 4. Collecting additional information (optional)

After authentication (and MFA, if applicable), the server may still need information about the user that wasn't provided
during sign-up or wasn't available from the third-party provider. The user is presented with a form to fill in the
missing details.

If the third-party provider already supplied some of this information (for example, a name or a profile picture URL),
the form is pre-filled with those values so the user just has to confirm them.

If no additional information is needed, this step is skipped entirely.

### 5. Verifying the user's contact details (optional)

Some pieces of information must be verified before they can be trusted. A common example is an email address: the server
sends a one-time code to that address, and the user must enter it to prove they have access to it.

If the configuration requires this kind of verification, the user is shown a screen where they can enter the code they
received. They can also request a new code if they did not receive the first one.

If no verification is required (for instance because the email was already confirmed by a trusted third-party provider),
this step is skipped.

### 6. Returning to the application

Once all required steps have been completed, the user is redirected back to the client application. The client
application receives an authorization code that it exchanges for tokens to access the user's account.

From the user's perspective, they are simply sent back to wherever they came from, now signed in.

## Error handling

If the user makes a mistake at any step — entering a wrong password, typing an incorrect verification code — they
receive an error message on the same screen and can try again. The session remains active and the flow does not restart.

In more serious situations (for example if the session has expired), the user is automatically redirected to an error
page. The flow must then be restarted from the beginning.
