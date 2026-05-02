# Invitation

This page documents bootstrap invitations — invitations declared in configuration that are automatically created at
startup. This follows the same Infrastructure-as-Code pattern as
[clients](/technical/configuration/client), [claims](/technical/configuration/claim), and
[scopes](/technical/configuration/scope).

See [Invitation](/functional/invitation) for an overview of the concept.

## ```invitations```

| Key                | Type   | Description                                                                                                          | Required<br>Default |
|--------------------|--------|----------------------------------------------------------------------------------------------------------------------|---------------------|
| ```audience```     | string | Audience the invitation is bound to. Must match an [audience](/technical/configuration/audience) identifier.          | **YES**             |
| ```claims```       | object | Custom claim values to pre-set on the user's account upon registration. Only custom claims are accepted.             | NO                  |
| ```note```         | string | Admin note attached to the invitation.                                                                               | NO                  |
| ```url-template``` | string | URL template with a `{token}` placeholder. Used to generate a clickable URL in the startup log.                      | NO                  |

### ```invitations.audience```

The audience identifier determines which audience the invitation targets. When a user redeems the invitation, the
requesting client must belong to this audience.

### ```invitations.url-template```

When set, SympAuthy replaces `{token}` with the generated invitation token and logs the resulting URL at startup.
This makes it easy to share a direct registration link. When not set, the raw token is logged instead.

### ```invitations.claims```

Custom claims to pre-assign to the user's account upon registration. These can be used by
[scope granting rules](/functional/user_authorization#scope-granting-rules) to control which scopes the user
receives. Only custom claims are accepted — OpenID Connect claims must come from the user.

## Startup behavior

For each configured invitation, SympAuthy checks whether **any user has already consented to any client in the
configured audience**:

- **No user has consented**: the invitation is created. If `url-template` is set, the generated URL is logged to
  stdout; otherwise the raw token is logged.
- **At least one user has consented**: the invitation is skipped — someone already registered for this audience
  and the bootstrap invitation is no longer needed.

On each startup where the invitation is (re)created, a **new token is generated** and the previous bootstrap
invitation for this audience is invalidated. The operator should use the token from the latest startup log.

## Example

Bootstrap the first administrator:

```yaml
invitations:
  - audience: admin
    url-template: "https://admin.example.com/register?invitation_token={token}"
    claims:
      role: admin
    note: Initial admin invitation
```

With the `admin` [environment](/technical/configuration/environments) active, the admin audience has
`sign-up-enabled: false` and `invitation-enabled: true` by default. This bootstrap invitation allows the first
admin to self-register. Once a user has consented to any admin client, subsequent restarts skip the invitation.
