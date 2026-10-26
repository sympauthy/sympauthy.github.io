# Security Context

SympAuthy reads three things off a request: the **address** it came from, the **user agent** it declares
— its `User-Agent` header, naming the browser or application — and the **location** the deployment's
**edge**, the proxy or CDN in front of the server, attributes to that address. Where a person signs in from
is then kept as a [place](/functional/grant#the-places-a-grant-is-used-from) on the grant it was seen
under, for as long as that grant keeps being used from it.

None of what is read can be known without knowing the deployment's topology, so all of it is
configuration. The keys are listed under
[`advanced.security-context`](/technical/configuration/advanced#advanced-security-context); this page is
the trust model behind them and the edges they may name.

## The default trusts nothing

With no proxy named and `auto-detect` off, the address is the peer of the socket the request arrived on,
no forwarded header is read at all, and no location is recorded. A header is consulted only because an
operator named the proxy that sets it.

Behind any proxy that peer is the proxy's own address — the same one for every end-user — so a deployment
that leaves this unconfigured keeps a place on every grant naming its own proxy. **Naming the proxy is what
makes the record say anything about where a person is**, which is a reason to configure these keys rather
than a property of them.

## Naming a proxy is a promise

Naming a proxy promises that the server is only reachable through that proxy. There is no proxy
allow-list, and nothing checks that a request carrying `CF-Connecting-IP` came from Cloudflare — that
check is a firewall rule or an origin lock, and it is the deployment's to make.

::: warning
If the origin is reachable directly while a proxy is named, anyone can set that header and choose what
gets recorded about them. A deployment that cannot close its origin names none.
:::

## The address and the location are configured apart

They are separate keys, and only the location may be detected.

- **The address.** Only the proxy *nearest* this server knows it, as the peer it accepted a connection
  from rather than a value it was handed. So `ip` names **one** proxy, or one header read as it stands.
  There is no detecting it and no merging two answers: an edge reading an entry of `X-Forwarded-For` reads
  it at a position only its own hop count explains, so guessing which edge is in front reaches an entry the
  caller wrote. That forgery travels through a *legitimate* proxy, so a closed origin does not stop it.
- **The location.** Each edge publishes it under a header of its own — `CF-IPCountry`,
  `X-Akamai-Edgescape`, `CloudFront-Viewer-City` — never at a position in a shared header. Two edges
  reading their own headers cannot be read at cross purposes, so `geo` takes a list and admits
  `auto-detect`. A wrong answer there is a wrong location on a record, not a request attributed to whoever
  asked for it.

## An override is a plain header read

`ip.header`, and every field of `geo.headers`, replaces one field and is always read as it stands, never
parsed. A deployment needing a value dug out of a packed header names the edge that knows how.

Pointing `ip.header` at `X-Forwarded-For` is accepted and records the whole list, including the part the
caller chose. A name no request could carry, holding a space or a colon, is refused at startup.

## What is kept

A [place](/functional/grant#the-places-a-grant-is-used-from), not a request: an address and a user agent,
with the location the edge gave for that address. The same address and user agent seen again under the
same grant updates that place rather than adding another row, whatever the location says. A postal code an
edge publishes is read and not kept.

A grant opens with the place the person proved who they were at. Afterwards, every time a
[public client](/functional/client#confidential-and-public-clients)'s
[code exchange](/functional/interactive_flow#returning-to-the-application) or
[refresh](/functional/tokens#refresh-token) succeeds, where it came from is a sighting of its grant; no
other request is one. A confidential client's token requests record nothing, because they come from its own
backend, and neither does a grant no person signed in for:
[`client_credentials`](/functional/client_authorization), or a [token exchange](/functional/delegation).

A person's places are the places of the grants they hold, and nothing else: signing out and back in from
the same device is a new grant, with a new place. A place is deleted with its grant, or earlier once nobody
has been seen there for [`retention`](/technical/configuration/advanced#advanced-security-context),
measured from the last sighting rather than the first; deleting a place leaves the grant as it is, and
nothing a client sends is refused for it. A grant holds at most
[`max-places-per-grant`](/technical/configuration/advanced#advanced-security-context) distinct places, and
the least recently seen makes room for a new one, the place the grant opened with included. No API serves a
grant's places, and no client is shown them.

Nothing unidentified is kept. What is observed before the server knows who is asking belongs to the
[interactive flow](/functional/interactive_flow) session that observed it and is collected with that
session, at a bound of its own that `max-places-per-grant` does not touch. So a failed sign-in, an abandoned flow and an
[action started on the person's behalf](/functional/interactive_flow#an-action-started-on-the-user-s-behalf),
which opens no grant, leave nothing behind.

No anomaly is derived from any of it: no device fingerprint, no impossible-travel check, no risk score, and
no geolocation from an IP database. Only what an edge said.

## The edges

| Edge             | Address (`ip.provider`)                                    | Location (`geo.providers`)                                                                                                        | Operator has to                                                                                                       |
|------------------|------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| ```akamai```     | `True-Client-IP`                                           | `X-Akamai-Edgescape` (`country_code`, `region_code`, `city`, `zip`, `timezone`)                                                    | —                                                                                                                        |
| ```azure```      | `X-Azure-ClientIP`                                         | *none* — inject through the rules engine and name it under `geo.headers`                                                            | —                                                                                                                        |
| ```caddy```      | rightmost entry of `X-Forwarded-For`                       | *none*                                                                                                                              | nothing; works against a stock `reverse_proxy`                                                                           |
| ```cloudflare``` | `CF-Connecting-IP`                                         | `CF-IPCountry`, `cf-region`, `cf-region-code`, `cf-ipcity`, `cf-postal-code`, `cf-timezone`                                          | enable IP Geolocation for the country, and the *Add visitor location headers* managed transform for the rest            |
| ```cloudfront``` | `CloudFront-Viewer-Address`, less the source port it carries | `CloudFront-Viewer-Country`, `-Country-Region`, `-Country-Region-Name`, `-City`, `-Postal-Code`, `-Time-Zone`                        | add them to the origin request policy, or none reach the origin                                                          |
| ```fastly```     | `Fastly-Client-IP`                                         | *none* — inject the VCL `client.geo.*` variables and name them under `geo.headers`                                                  | —                                                                                                                        |
| ```gcp```        | second entry from the right of `X-Forwarded-For`           | `X-Client-Geo-Location`, read as `<country>,<city>`                                                                                 | configure the custom header on the load balancer as `{client_region},{client_city}`                                      |
| ```nginx```      | `X-Real-IP`                                                | *none*                                                                                                                              | write `proxy_set_header X-Real-IP $remote_addr;` — without it nothing is recorded                                         |
| ```traefik```    | `X-Real-IP`                                                | *none*                                                                                                                              | nothing; Traefik populates the header itself                                                                             |

An edge publishing no location cannot be named under `geo.providers`: `nginx`, `traefik`, `caddy`,
`fastly` and `azure` publish an address and nothing else, so naming one there is refused at startup rather
than accepted to no effect.

**A header that does not arrive is never an error.** The field is null and the server goes on answering,
which is why the conditions above are silent when they are unmet. Header names are matched
case-insensitively, and where a header arrives twice the last value is the edge's — a caller may have sent
it first.

## Example

A Kubernetes cluster on Google behind an nginx ingress takes the address from the ingress and the location
from the load balancer:

```yaml
advanced:
  security-context:
    ip:
      provider: nginx
    geo:
      providers:
        - gcp
```
