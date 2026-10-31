# Authorization Webhook

When the built-in [scope granting rules](/functional/user_authorization#scope-granting-rules) are not sufficient, you
can delegate [grantable scope](/functional/scope#grantable-scope) decisions to an external HTTP server — typically the
client application's own backend. When an authorization webhook is configured for a client, SympAuthy calls the external
server during the authorization request. The external server responds with per-scope grant/deny decisions, which
SympAuthy uses to issue the token.

The webhook receives the grantable scopes requested by the client, but is not limited to them. It may grant additional
grantable scopes that the client did not request, as long as they are within the client's `allowed-scopes`
configuration. Any scope outside `allowed-scopes` is ignored. This is consistent with
[RFC 6749 Section 3.3](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3), which allows the authorization
server to issue a scope different from the one requested by the client.

See [User Authorization](/functional/user_authorization#delegating-to-a-third-party-through-webhook) for how the
webhook fits into the authorization flow and [Configuration](/technical/configuration/client#clients-id-webhooks-authorization)
for how to configure it.

## Request

SympAuthy sends the following request to the configured URL:

```http
POST https://my-app.example.com/sympauthy/authorize
Content-Type: application/json
X-SympAuthy-Signature: sha256=<hmac-hex>
traceparent: 00-<trace id>-<span id>-00

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "my-app",
  "requested_scopes": ["read:orders", "write:orders"],
  "claims": {
    "email": "user@example.com",
    "name": "Jane Doe",
    "custom_plan": "premium"
  }
}
```

The `traceparent` header is sent only when [telemetry](/technical/monitoring/) is on: it carries the trace of the
request that made the call, so a webhook that is traced too can continue it. Its last field, the trace flags, is `01`
when that request is [traced](/technical/monitoring/traces#turning-traces-on), and `00` when it is not, which is every
request while traces are off, the default. A webhook whose tracer follows its caller's flags, as an OpenTelemetry SDK
does by default, records no span for a call flagged `00`.

### Properties

- `user_id`: Unique identifier of the end-user attempting authorization.
- `client_id`: Identifier of the client application that initiated the authorization request.
- `requested_scopes`: The grantable scopes to evaluate. This list is the intersection of the grantable scopes requested
  in the authorization request and the client's `allowed-scopes` configuration. Scopes outside that configured list are
  filtered out before the webhook is called, so the external server can trust that every scope in this list is a
  legitimate scope for this client.
- `claims`: Every claim of the client's [audience](/functional/audience) the user holds a value for — those
  restricted to that audience and those shared across audiences — keyed by claim identifier. They are sent
  **regardless of consent and of each claim's [ACL](/functional/claim_access)**, so the external server can decide on
  information the user never agreed to disclose to the client: treat it as a trusted backend of the deployment. A
  claim's [`verified-id`](/technical/configuration/claim#claims-id) companion, such as `email_verified`, is not sent.

### Signature

The `X-SympAuthy-Signature` header contains the HMAC-SHA256 of the raw request body, formatted as
`sha256=<hex-digest>`. The shared secret configured under `webhooks.authorization.secret` is used as the HMAC key.

The external server **should** verify this signature before processing the request, to ensure it originates from
SympAuthy and the payload has not been tampered with.

## Response

The external server must respond with HTTP 2xx and a JSON body:

```json
{
  "scopes": {
    "read:orders": "grant",
    "write:orders": "deny"
  }
}
```

### Properties

- `scopes`: An object mapping scope names to decisions. Each value must be either `"grant"` or `"deny"`.

Any scope present in `requested_scopes` but absent from the response is treated as `deny`.

To refuse a person, answer `2xx` with `deny` decisions. A `4xx` is not a refusal: it is a failure of the webhook,
handled as the next section describes.

## Failure behavior

If the external server is unreachable, does not answer within its
[`timeout`](/technical/configuration/advanced#advanced-webhooks-authorization) (five seconds by default), or returns a
non-2xx status, SympAuthy applies the `on-failure` policy configured for the webhook:

| Value                  | Behavior                                                                                                                                                                                                |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `deny_all` *(default)* | All requested grantable scopes are denied. The authorization flow completes but no grantable scopes are granted. Fail-safe: users may lose access but the system does not grant unintended permissions. |
| `fallback_to_rules`    | SympAuthy evaluates scope granting rules as if no webhook were configured. Keeps users working during outages, but may grant permissions that the external server would have denied.                    |

The server keeps calling the webhook after a failure, and the first failure degrades the webhook's
[condition](/technical/monitoring/conditions): the operator sees it on the console and on `/health` until the webhook
answers again.
