# CORS

SympAuthy disables Micronaut's global CORS filter and applies its own cross-origin policy, split across
three tiers of endpoints. Each tier decides which origins it allows on its own; the request **headers** a
browser may send are shared across all three and are the only part you configure here.

## Cross-origin tiers

| Endpoints                           | Allowed origins                                                                                            |
|-------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `/api/v1/flow/**`                   | Origins derived from the URIs of every configured [flow](/technical/configuration/authorization#flows-id). |
| `/api/v1/admin/**`                  | `urls.root` when [`admin.integrated-ui`](/technical/configuration/admin) is enabled, otherwise `*`.        |
| `/.well-known/**`, `/api/oauth2/**` | Any origin (`*`).                                                                                          |

Allowed origins, allowed methods and the preflight `max-age` are not configurable. See the
[Security](/technical/security#cors-restriction-on-the-flow-api) page for the reasoning behind the Flow API
origin restriction.

`Content-Type`, `Authorization` and `DPoP` are **always allowed and cannot be removed** — the server does
not function without them (the token endpoint, bearer authentication, and
[DPoP](/technical/security#dpop-demonstrating-proof-of-possession) sender-constrained tokens respectively).

## ```cors```

| Key                   | Type        | Description                                                                                                                                                                                                                                                                          | Required<br>Default        |
|-----------------------|-------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------|
| ```allowed-headers``` | string list | Request headers browsers may send on cross-origin requests, applied to all three tiers in addition to the always-allowed headers above. Redefining this key **replaces** the default list rather than extending it — repeat any default entry you still want. Each entry must be a valid HTTP header name; the wildcard `*` is rejected. | NO<br>`[X-Requested-With]` |

## Example

Allow a custom `X-Tenant-Id` header while keeping the swagger-ui default:

```yaml
cors:
  allowed-headers:
    - X-Requested-With
    - X-Tenant-Id
```
