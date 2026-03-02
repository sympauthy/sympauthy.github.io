# How SympAuthy Works

## The problem it solves

Every application that has users needs to answer the same questions: How do users create an account? How do they sign
in? How does the application know who they are and what they are allowed to do?

Building this from scratch is time-consuming and error-prone. Most teams end up with each application having its own
separate user database and login system, which means users need separate accounts for each one, and any change to the
authentication logic must be repeated everywhere.

SympAuthy solves this by acting as a dedicated, shared authentication and authorization service. Your applications stop
managing users themselves — they delegate that responsibility to SympAuthy.

## The three actors

Understanding SympAuthy requires understanding the three parties involved in every interaction:

**The end-user** is the person who wants to access an application. They open a website or a mobile app, click "Sign in",
and go through a login screen.

**The client** is the application that the end-user wants to use. It could be a website, a mobile app, or a background
service. The client does not verify the user's identity itself — it asks SympAuthy to do it.

**SympAuthy** is the authentication server sitting between clients and end-users. It owns the user accounts, handles
sign-in, and tells clients who the user is and what they are allowed to do.

```
  End-user  ──────►  Client application
                            │
                            │ "Who is this user?"
                            ▼
                        SympAuthy
```

## What happens when a user signs in

Here is the sequence of events when an end-user signs into a client application backed by SympAuthy:

1. **The user clicks "Sign in"** in the client application.
2. **The client redirects the user** to SympAuthy's login page.
3. **The user authenticates** on SympAuthy — by entering an email and password, or by using a third-party service like
   Google.
4. **SympAuthy redirects the user back** to the client application, along with a short-lived code proving the
   authentication succeeded.
5. **The client exchanges that code** for a set of tokens. Those tokens tell the client who the user is and what they
   are allowed to do.
6. **The user is now signed in.** The client uses the tokens to personalize the experience and protect its resources.

From the user's perspective, steps 2–5 are nearly invisible: they click "Sign in", authenticate once, and are sent back
to the application.

## Sharing users across multiple applications

One of the key benefits of SympAuthy is that a single instance can serve multiple client applications at the same time.
All those clients share the same pool of user accounts.

This means a user creates their account once and can then sign into any of the connected applications without
registering again. SympAuthy recognises them and issues the appropriate tokens for each client.

```
  Web app  ─┐
             ├──► SympAuthy ◄── User accounts
  Mobile app ─┘
```

## What SympAuthy stores about users

SympAuthy collects and stores pieces of information about each user, called **[claims](claims)**. A claim can be
something simple like a name or an email address, or something specific to your application like a subscription plan or
a role.

When a client needs to know something about the currently signed-in user, it reads it from the claims that SympAuthy
provides — rather than maintaining its own copy.

## What users are allowed to do

SympAuthy also manages **[authorization](authorization)**: what a signed-in user is permitted to do within a client
application. This is controlled through **scopes** — named permissions that are included in the tokens SympAuthy issues.

A client can check whether the user's token includes a given scope before allowing access to a protected feature or
resource.

## Summary

| Concept              | What it means in plain terms                                                                          |
|----------------------|-------------------------------------------------------------------------------------------------------|
| Authorization server | SympAuthy itself — the service that authenticates users and issues tokens                             |
| Client               | An application that uses SympAuthy for its login                                                      |
| End-user             | A person signing into a client application                                                            |
| Provider             | A trusted third-party service (e.g. Google) that can authenticate a user on SympAuthy's behalf       |
| Claim                | A piece of information about the user (name, email, role…)                                            |
| Scope                | A permission controlling what the user can access                                                     |
| Token                | A credential the client receives after authentication, containing the user's identity and permissions |
