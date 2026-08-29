# Invitation

Some scenarios begin with a [**bootstrap invitation**](/functional/invitation#bootstrap-invitations):
a token SympAuthy generates and logs at startup that a user redeems — through a sign-up flow — to
create their account for a given audience. The most common case is creating the first
[admin user](/testcontainers/admin), but the mechanism is general and works for any
audience.

## Declaring an invitation

Declare your own bootstrap invitation for an audience, optionally seeding claims on the created user:

```java
new SympauthyContainer()
    .withBootstrapInvitation("welcome", "my-audience", Map.of("some_claim", "value"));
```

The built-in `admin` environment already ships a `first-admin` invitation — see
[Admin API](/testcontainers/admin).

## Reading the token

`getBootstrapInvitationToken(id)` returns the raw token, reading either log form: the raw `Token:`
line logged by `withBootstrapInvitation`, or the `Registration URL:` the built-in `first-admin`
logs.

```java
String token = sympauthy.getBootstrapInvitationToken("welcome");
```

::: warning
The token is only logged while no user has yet consented for the audience, so read it on a fresh
container before redeeming.
:::

## Redeeming the token

Redeem it through an [interactive sign-up flow](/testcontainers/interactive_flow) with
`withInvitationToken(...)` — signing up with the token creates the invited user and returns their
tokens:

```java
TokenResponse tokens = registry.newFlow()
    .withInvitationToken(token)
    .withSignUpHandler(cfg -> Map.of("email", "ada@example.com", "password", "Str0ngP@ssw0rd!"))
    .run()
    .exchange();
```

See [Admin API](/testcontainers/admin) for a complete end-to-end example that redeems the
`first-admin` invitation and calls the Admin API with the resulting token.
