# Invitation

This page documents bootstrap invitations — invitations declared in configuration that are automatically created at
startup. This follows the same Infrastructure-as-Code pattern as
[clients](/technical/configuration/client), [claims](/technical/configuration/claim), and
[scopes](/technical/configuration/scope).

See [Invitation](/functional/invitation) for an overview of the concept.

## ```invitations.<id>```

| Key                | Type   | Description                                                                                                          | Required<br>Default |
|--------------------|--------|----------------------------------------------------------------------------------------------------------------------|---------------------|
| ```<id>```         | string | Unique identifier of the invitation.                                                                                 | **YES**             |
| ```audience```     | string | Audience the invitation is bound to. Must match an [audience](/technical/configuration/audience) identifier.          | **YES**             |
| ```claims```       | object | Claim values to pre-set on the user's account upon registration. Each key must match an enabled claim.               | NO                  |
| ```note```         | string | Admin note attached to the invitation. Defaults to `Bootstrap invitation '<id>'`.                                    | NO                  |
| ```url-template``` | string | URL template with a `{token}` placeholder. Used to generate a clickable URL in the startup log.                      | NO                  |

### ```invitations.<id>```

The identifier appears in the startup log and is used as the invitation's default `note` when none is set.

### ```invitations.<id>.audience```

The audience identifier determines which audience the invitation targets. When a user redeems the invitation, the
requesting client must belong to this audience.

### ```invitations.<id>.url-template```

When set, SympAuthy replaces `{token}` with the generated invitation token and logs the resulting URL at startup.
This makes it easy to share a direct registration link. When not set, the raw token is logged instead.

### ```invitations.<id>.claims```

Claims to pre-assign to the user's account upon registration. Each key must match the identifier of an **enabled**
[claim](/technical/configuration/claim); an unknown or disabled key fails configuration validation at startup. Keys
are matched case-insensitively, treating `_` and `-` as equivalent (so `is_admin` matches `is-admin`).

In practice these are custom claims, because OpenID Connect claims (`email`, `name`, …) are disabled by default. If
you explicitly enable an OpenID Connect claim, it may be pre-assigned here as well.

Pre-assigned claims are commonly consumed by
[scope granting rules](/functional/user_authorization#scope-granting-rules) to control which scopes the user
receives.

## Startup behavior

For each configured invitation, SympAuthy checks whether **any user holds an active (non-revoked) consent for a
client in the configured audience**:

- **No active consent**: the invitation is created. If `url-template` is set, the resulting URL is logged to
  stdout; otherwise the raw token is logged.
- **At least one active consent**: the invitation is skipped — someone already registered for this audience and
  the bootstrap invitation is no longer needed.

On each startup where the invitation is (re)created, a **new token is generated** and any previous pending
bootstrap invitations for this audience are revoked. The operator should use the token from the latest startup log.

## Example

Bootstrap the first administrator:

```yaml
invitations:
  first-admin:
    audience: admin
    url-template: "https://admin.example.com/register?invitation_token={token}"
    claims:
      role: admin
    note: Initial admin invitation
```

With the `admin` [environment](/technical/configuration/environments) active, the admin audience has
`sign-up-enabled: false` and `invitation-enabled: true` by default. This bootstrap invitation allows the first
admin to self-register. Once a user has consented to any admin client, subsequent restarts skip the invitation.
