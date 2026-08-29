# Testcontainers

`testcontainers-sympauthy` is a [Testcontainers](https://testcontainers.com) module that runs a
real SympAuthy server inside a Docker container so it can be driven from JVM unit and integration
tests. Instead of mocking an OAuth 2.1 / OpenID Connect provider, your tests point at a genuine
SympAuthy instance — issuer, discovery document, token endpoint and all — started fresh per test.

It also ships a **browser-free driver for SympAuthy's interactive login flow**: sign-up, sign-in,
claim collection, confirmation and TOTP multi-factor steps can be scripted from test code to obtain
real authorization codes and tokens end-to-end, without a headless browser.

The library is published to GitHub Packages as `com.sympauthy:testcontainers-sympauthy`. It is a
test-only dependency; the only transitive dependency you inherit is Testcontainers itself.

## Minimal by default

Out of the box the container is **minimal**: it runs SympAuthy's `default` Micronaut environment
against an in-memory H2 database and pins the issuer to a host-reachable `http://localhost:<port>`.
Password authentication, claims, the `admin` environment, mail, clients, providers and MFA are all
**opt-in** — you enable exactly what a test needs. The `auth.issuer` and `urls.root` settings are
always managed by the container so the issuer stays reachable from host-side test code.

## Requirements

| Requirement       | Minimum version                                                                        |
|-------------------|----------------------------------------------------------------------------------------|
| Java (JDK)        | 17 or newer                                                                             |
| Testcontainers    | 2.0.0 or newer (2.x line)                                                               |
| JUnit             | 5 (Jupiter) — optional; the container can also be driven with a manual lifecycle       |
| Container runtime | Docker, or a Testcontainers-supported alternative (Podman, Colima, Rancher Desktop, …) |

- **Java 17** is the module's compilation target — the lowest JVM supported by the Testcontainers
  2.x line, chosen for the widest compatibility on that line.
- **Testcontainers 2.x** is required: the 2.0 release relocated packages
  (`org.testcontainers.containers.*` → `org.testcontainers.<module>.*`) and dropped JUnit 4, so the
  module is not compatible with the 1.x line.
- A running **Docker** (or compatible) engine must be available on the machine executing the tests.

## Documentation pages

- [Getting started](/testcontainers/getting_started) — install the library and start your first container.
- [Configuration](/testcontainers/configuration) — property overrides, environments, config files, and datasource.
- [Interactive Flow](/testcontainers/interactive_flow) — drive the login flow to a code and tokens without a browser.
- [Clients](/testcontainers/clients) — declare the public or confidential client a flow runs against.
- [Multi-factor Authentication](/testcontainers/mfa) — enable TOTP MFA and answer confirm and challenge steps.
- [Invitation](/testcontainers/invitation) — read and redeem bootstrap invitation tokens.
- [Admin API](/testcontainers/admin) — enable the Admin API and call it with an admin-scoped token.
- [Server-initiated Flows](/testcontainers/server_initiated_flows) — drive confirm/MFA flows started by a client or an administrator.
