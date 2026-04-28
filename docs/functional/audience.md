# Audience

An **audience** is a grouping boundary for [clients](/functional/client). Every client belongs to exactly one
audience. An audience represents a logical application — or a set of related services — that shares the same pool of
end-user [consents](/functional/consent).

## Why audiences exist

When multiple clients serve the same logical application — for example, a web frontend and a mobile app for the same
product — it makes sense for them to share end-user consent. Without audiences, each client would require its own
consent, forcing users to approve the same permissions separately for each client.

Audiences solve this by grouping clients together. When a user consents to scopes through any client in an audience,
that consent covers all clients in the same audience. The user is never asked to re-approve scopes they have already
granted to another client in the same audience.

Audiences also determine the `aud` claim in [access tokens](/functional/tokens#access-token), ensuring that tokens
issued for clients in the same audience carry the same audience identifier.

```
  Web app  ─┐                     ┌─ audience: "my-app"
             ├──► same audience ◄──┤
  Mobile app ─┘                    └─ shared consent
```

## How audiences affect consent

[Consent](/functional/consent) is recorded per user and audience — not per user and client. This has two consequences:

- **Shared consent**: when a user authorizes one client in an audience, the consent applies to all clients in that
  audience. Any other client in the same audience can access the consented scopes without prompting the user again.
- **Scope merging**: if the user later authorizes another client in the same audience that requests additional scopes,
  the new scopes are merged into the existing consent. Previously consented scopes are preserved — they are never
  replaced.

A single end-user can have at most one active consent per audience at any given time.

## Audience-scoped resources

[Scopes](/functional/scope) and [claims](/functional/claims) can optionally be scoped to an audience. When scoped,
they only apply within that audience — clients in other audiences cannot request or see them.

- A scope with `audience: my-app` is only available to clients in the `my-app` audience.
- A claim with `audience: admin` is only visible to clients in the `admin` audience.

When `audience` is not set (the default), the scope or claim is shared across all audiences.

Built-in [OpenID Connect](/functional/scope#openid-connect-scopes) and
[client](/functional/scope#client-scope) scopes are always unscoped and available to all audiences.
[Admin scopes](/functional/scope#admin-scopes) are scoped to the audience configured in
[`admin.audience`](/technical/configuration/admin).

## Token audience

Each audience has a `token-audience` value that becomes the
[`aud` claim](/functional/tokens#structure-of-an-access-token) in access tokens issued for clients in that audience.
This value defaults to the audience identifier if not set explicitly.

This means all clients in the same audience produce access tokens with the same `aud` claim, making it easy for
resource servers to validate tokens regardless of which specific client requested them.

## Configuration

Audiences are declared in the `audiences` configuration section. Refer to the
[configuration](/technical/configuration/audience) for the full list of options and examples.
