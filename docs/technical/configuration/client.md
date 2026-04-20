# Client

This section holds the configuration of all clients that will be authorized to authenticate their users with this
authorization server.

## ```clients.<id>```

| Key                                    | Type            | Description                                                                                                                                                                                                                                                         | Required<br>Default  |
|----------------------------------------|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------|
| ```<id>```                             | string          | Uniq identifier of the client.                                                                                                                                                                                                                                      | **YES**              |
| ```template```                         | string          | Name of a custom [client template](#templates-clients-id) to apply. The referenced template provides default values for fields not explicitly set on this client. The `default` template cannot be referenced here — it is auto-applied when no `template` is set.  | NO                   |
| ```<authorizationFlow>```              | string          | The identifier of the authorization flow to use for this client. See [authorization flows](/technical/configuration/authorization#flows-id) for more details.                                                                                                                                                                  | **YES**              |
| ```public```                           | boolean         | When `true`, the client is a [public client](/functional/client#confidential-and-public-clients) that does not require a secret. Public clients must use [PKCE](/technical/security#pkce-proof-key-for-code-exchange) and cannot use the client credentials grant.  | NO<br>```false```    |
| ```secret```                           | string          | Secret shared between the client and the authorization server. Required for confidential clients (`public: false`). Must be omitted for public clients.                                                                                                             | Conditional          |
| ```allowed-grant-types```              | array of string | List of OAuth2 grant types this client is allowed to use. Supported values: `authorization_code`, `refresh_token`, `client_credentials`. See [this section](#clients-id-allowed-grant-types) for more details.                                                      | **YES**              |
| ```allowed-scopes```                   | array of string | List of scopes the client is allowed to request. Any scope outside this list will be filtered out by this authorization server and will not be granted. <br>If not set or empty, **all scopes** are **allowed**.                                                    | NO                   |
| ```default-scopes```                   | array of string | List of scopes that will be requested if the ```scope``` parameter is left when calling the authorize endpoint.                                                                                                                                                     | NO                   |
| ```uris```                             | map of string   | Named URIs for this client, usable as `${client.uris.<key>}` templates in `allowed-redirect-uris`. Useful for defining base URLs once and referencing them in multiple redirect URIs.                                                                               | NO                   |
| ```allowed-redirect-uris```            | array of string | A list of URIs where the client is allowed to ask the redirection of the end-user at the end of the OAuth2 authorize grant flow. See [this section](#clients-id-allowed-redirect-uris) for more details.                                                            | Conditional          |
| ```authorization-webhook```            | object          | Delegates grantable scope decisions to an external HTTP server. See [this section](#clients-id-authorization-webhook) for details.                                                                                                                                   | NO                   |

### ```clients.<id>.allowed-grant-types```

Every client must declare at least one grant type. The server rejects any client configuration without
`allowed-grant-types` at startup.

Supported values:

| Value                | Description                                                                                                                                          |
|----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| `authorization_code` | Enables the [authorization code flow](/technical/oauth2_compatibility). The client can redirect end-users to the authorize endpoint.                 |
| `refresh_token`      | Allows the client to exchange a refresh token for new tokens. Requires `authorization_code` to also be present.                                      |
| `client_credentials` | Allows the client to authenticate directly using its own credentials, without an end-user. Only available to confidential clients (`public: false`). |

**Constraints:**

- `refresh_token` cannot be used without `authorization_code`. The server rejects this combination at startup.
- When `authorization_code` is **not** in the allowed grant types, the authorize endpoint rejects the client and
  `allowed-redirect-uris` must not be configured.
- When `refresh_token` is **not** in the allowed grant types, no refresh token is issued in the authorization code flow
  response.

### ```clients.<id>.allowed-redirect-uris```

Clients that support the `authorization_code` grant type must declare at least one redirect URI. The server rejects
the configuration at startup if `allowed-redirect-uris` is missing when `authorization_code` is allowed, or if
`allowed-redirect-uris` is present when `authorization_code` is not allowed.

#### Exact string matching

As required by [OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1#section-7.5.3), redirect URIs
are compared using **exact string matching** — no prefix matching, pattern matching, or normalization is applied.

For native applications using loopback redirects, the port component is ignored when the host is `127.0.0.1` or
`[::1]` and the scheme is `http` or `https`, as recommended by
[RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252). This exception does **not** apply to `localhost` or to
custom-scheme URIs.

#### Template support

Redirect URIs support `${...}` placeholders that are resolved at startup:

| Template               | Description                                                 |
|------------------------|-------------------------------------------------------------|
| `${urls.root}`         | The root URL of the authorization server.                   |
| `${client.uris.<key>}` | A named URI defined in the client's `uris` map (see above). |

Example configuration:

```yaml
clients:
  admin:
    uris:
      app: https://admin.example.com
    allowed-redirect-uris:
      - "${urls.root}/admin/callback"
      - "${client.uris.app}/callback"

  mobile:
    uris:
      app: myapp://
    allowed-redirect-uris:
      - "${client.uris.app}callback"
```

### ```clients.<id>.authorization-webhook```

When configured, SympAuthy delegates grantable scope decisions for this client to an external HTTP server instead of
evaluating scope granting rules.
See [User Authorization](/functional/user_authorization#delegating-to-a-third-party-through-webhook)
for how the webhook fits into the authorization flow and [Authorization Webhook](/technical/authorization_webhook) for
the full protocol specification (request format, response format, signature verification).

| Key          | Type   | Description                                                                                                                                                                                                             | Required<br>Default  |
|--------------|--------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------|
| `url`        | string | The URL SympAuthy will POST to during authorization.                                                                                                                                                                    | **YES**              |
| `secret`     | string | Shared secret used to sign the request body with HMAC-SHA256. The signature is sent in the `X-SympAuthy-Signature` header. Use a random string of at least 32 characters.                                               | **YES**              |
| `on-failure` | string | Behaviour when the external server is unreachable or returns an error. `deny_all` (default): all grantable scopes are denied. `fallback_to_rules`: scope granting rules are evaluated as if no webhook were configured. | NO<br>```deny_all``` |

Example:

```yaml
clients:
  my-app:
    authorization-webhook:
      url: https://my-app.example.com/sympauthy/authorize
      secret: "a3f1b9c7e2d84f6a9b0c1d2e3f4a5b6c"
      on-failure: deny_all
```

## ```templates.clients.<id>```

Client templates provide default field values that are inherited by clients. A template named `default` is auto-applied to every client that does not declare a `template` field. Custom templates (any name other than `default`) must be explicitly referenced by a client via its `template` field.

When a client references a custom template, the `default` template is **not** applied — only the referenced template's values are used as defaults.

Fields set directly on a client always override the corresponding template value.

| Key                         | Type            | Description                                                           | Required<br>Default |
|-----------------------------|-----------------|-----------------------------------------------------------------------|---------------------|
| ```<id>```                  | string          | Unique identifier of the template. Use `default` for the auto-applied template. | **YES**             |
| ```public```                | boolean         | Default value for the client's `public` field.                        | NO                  |
| ```authorization-flow```    | string          | Default authorization flow identifier.                                | NO                  |
| ```uris```                  | map of string   | Default named URIs, usable as `${client.uris.<key>}` in redirect URIs. | NO                  |
| ```allowed-grant-types```   | array of string | Default list of allowed grant types.                                  | NO                  |
| ```allowed-redirect-uris``` | array of string | Default list of allowed redirect URIs.                                | NO                  |
| ```allowed-scopes```        | array of string | Default list of allowed scopes.                                       | NO                  |
| ```default-scopes```        | array of string | Default list of scopes requested when `scope` parameter is omitted.   | NO                  |
| ```authorization-webhook``` | object          | Default authorization webhook configuration.                          | NO                  |

**Constraints:**

- The `default` template is auto-applied when no `template` key is set on a client. It **cannot** be referenced explicitly via the `template` directive.
- When a client references a custom template, only that template is applied — `default` is skipped.

**Example:**

```yaml
templates:
  clients:
    default:
      allowed-grant-types:
        - authorization_code
        - refresh_token
      default-scopes:
        - openid
        - profile

    spa:
      public: true
      allowed-grant-types:
        - authorization_code
        - refresh_token

clients:
  admin:
    # No template key — inherits from templates.clients.default
    secret: "admin-secret"
    allowed-redirect-uris:
      - "https://admin.example.com/callback"

  frontend:
    template: spa
    # Inherits from templates.clients.spa (default template is NOT applied)
    allowed-redirect-uris:
      - "https://app.example.com/callback"
```
