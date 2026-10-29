# Conditions

A **condition** is something SympAuthy watches because it cannot fully work while it fails: a dependency outside the
server, such as the database, a [provider](/technical/configuration/provider) people sign in with or the mail server,
and two of the server's own outputs, its console and its telemetry. At any moment a condition is either
**operational** or **degraded**. When one degrades, the server does not stop: it keeps answering every request that
does not need what failed, and says what is wrong on its console (the container's log output), on its `/health`
endpoint and, once [telemetry](/technical/monitoring/) is on, as a metric.

This page covers:

- [which conditions the server watches](#the-conditions), and what a caller gets while each is degraded,
- [how a condition degrades and recovers](#how-a-condition-degrades-and-recovers), and what counts as a failure,
- [what `/health` answers](#on-health), and the readiness and liveness probes,
- [the metric an alert can watch](#as-a-metric).

## The conditions

| Condition                | What it is                                                                                              | While it is degraded                                                                                                                                                                                                                                       |
|--------------------------|---------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| the database             | the database the server stores its data in                                                              | a request that needs it is answered with a server error (`500`), and a retry succeeds once the database answers again.                                                                                                                                    |
| the mail server          | the server mail is sent through, when [mail](/technical/configuration/mail) is configured               | the request that sends a mail, such as a validation code, still succeeds, but the mail is tried once and dropped: the person does not receive it, and can ask for it again with [Resend Validation Code](/technical/api/flow#resend-validation-code). |
| a provider               | a provider people sign in with, one condition per provider                                              | signing in with that provider fails, and the person sees the flow's error page; every other way to sign in keeps working.                                                                                                                                 |
| an authorization webhook | a client's [authorization webhook](/technical/authorization_webhook), one condition per client           | the server keeps calling the webhook, and each call that fails gets the webhook's [`on-failure` policy](/technical/authorization_webhook#failure-behavior): `deny_all` by default.                                                                       |
| the collector            | the OpenTelemetry collector, when [telemetry](/technical/monitoring/#turning-telemetry-on) is on         | nothing changes for callers; the spans and log records sent meanwhile are lost.                                                                                                                                                                           |
| the console              | the queue the server's log lines go through on their way to the console                                 | nothing changes for callers; log lines below ERROR are dropped.                                                                                                                                                                                           |

Each condition has a name, used both on `/health` and on the metric:

| Condition                | On `/health`                                                    | On the metric         |
|--------------------------|-----------------------------------------------------------------|-----------------------|
| the database             | `database`                                                      | `database`            |
| the mail server          | `mail`                                                          | `mail`                |
| a provider               | `<provider id>`, nested under `providers`                       | `provider:<id>`       |
| an authorization webhook | `<client id>`, nested under `authorization-webhooks`            | `webhook:<client id>` |
| the collector            | `collector`                                                     | `collector`           |
| the console              | `console`                                                       | `console`             |

A provider and a client may share an id, which is why each is named under its kind.

## How a condition degrades and recovers

**The first failure degrades a condition and writes one ERROR line** naming it. Every failure after that, while it is
still degraded, is counted and writes nothing. However long an outage lasts and however much traffic meets it, the
console gets one line for it, not one per failed request.

**A condition recovers once its dependency answers again and 30 seconds pass without a new failure.** The server checks
every second, so the recovery lands within a second after the 30. One INFO line then says how long the condition was
degraded and how many failures it absorbed, and, where something was lost, how much: the lines the console dropped,
the spans and log records the collector did not receive. The 30 seconds keep a dependency that fails one call in two
from flipping back and forth, so a condition writes at most one ERROR line every 30 seconds.

**Each instance watches its conditions on its own.** Two instances of one deployment may disagree for up to the
30 seconds of a recovery, each answering for the calls it made.

### What counts as a failure

Only a failure that says the dependency itself is unwell degrades its condition: a connection refused, a timeout, a
`5xx` status (the dependency saying it failed), a database connection that cannot be opened or is lost, or the
dependency refusing the server's own credentials, such as a changed database or mail server password. A query that
fails on a working connection does not.

**An answer turning down what was sent is not a failure.** A provider refusing a sign-in code somebody replayed, with a
`4xx` status (the dependency saying the request was wrong), says nothing about the provider, and counting it would let
anybody degrade the server by sending bad input. The same goes for the mail server refusing one mail. While a provider
or the mail server is degraded, such an answer starts its 30 seconds of recovery just as a success does.

**For an authorization webhook and for the collector, every answer other than a success counts**, a `4xx` included.
The server composes their requests alone, so a refusal says the webhook or the collector, or the secret or address the
server reaches it with, is wrong. A webhook that wants to refuse a person answers `2xx` with `deny` decisions, as
[its response](/technical/authorization_webhook#response) describes, never a `4xx`. A webhook that does not answer
within its [timeout](/technical/configuration/advanced#advanced-webhooks-authorization), five seconds by default, fails
too.

**An OpenID Connect provider that cannot be reached at startup starts degraded.** Its discovery document is fetched at
startup, and while it cannot be, the provider is disabled: signing in with it, or linking it from the Client API, is
refused with `provider.disabled`. The server tries again every 30 seconds until it gets the document, and the provider
is then enabled without a restart. If what it gets cannot be used, the provider's condition recovers, since the
provider answered, but the provider stays disabled until the server restarts, and an ERROR line says so. A provider
configured without discovery makes no call at startup.

**The console degrades on the first line it drops.** Lines go through a queue of 1,024 lines on their way to the
console, so that a slow log reader never slows a request. An INFO line or below is dropped once the queue is four
fifths full, a WARN once it is full. The cause is on the reading side: whatever consumes the container's output, such
as a log driver or agent, is not keeping up. An ERROR line never goes through the queue, so the line saying the console
is dropping lines always reaches it.

## On `/health`

**`/health` is the endpoint at the root of the server, on the same port as every other request**
(`http://localhost:8080/health` in the [getting started guide](/getting-started/)), and anybody may read it. Its
status is `UP` while every condition is operational. **While a condition is degraded, it answers `DEGRADED`, with a
`200`**: `DEGRADED` is a status of SympAuthy's own, beside the usual `UP` and `DOWN`, so a check that reads the body
must accept it. Every degraded condition is listed by name, with the moment it degraded, under `conditions`. Trimmed to
that entry, the answer reads:

```json
{
  "status": "DEGRADED",
  "details": {
    "conditions": {
      "status": "DEGRADED",
      "details": {
        "database": { "degraded-since": "2026-10-29T09:12:44.120Z" },
        "providers": {
          "google": { "degraded-since": "2026-10-29T09:14:02.511Z" }
        }
      }
    }
  }
}
```

**A degraded condition takes no instance out of service, the database's included.** Two probes are answered beside
`/health`:

- **readiness**, `/health/readiness`, which a load balancer or Kubernetes polls to decide whether to send the instance
  traffic. It answers `DEGRADED` and `200` too, so the instance keeps receiving traffic.
- **liveness**, `/health/liveness`, which Kubernetes polls to decide whether to restart the instance. It does not report
  conditions at all, so the instance is not restarted.

A dependency that is down — a provider, the database every instance shares — is down for every instance at once:
taking readiness down would pull them all out of the load balancer and turn one broken dependency into an outage, and
a restart fixes nothing. What takes readiness down is an
[invalid configuration](/technical/configuration/#a-key-that-binds-to-nothing), which no restart without a fix can
recover from.

**The failure itself is not published.** `/health` is visible to anonymous callers, and a failure carries hostnames,
internal addresses and response bodies. The names say nothing the sign-in pages do not; what went wrong is in the
ERROR line.

## As a metric

Once [telemetry is on](/technical/monitoring/#turning-telemetry-on), `sympauthy.condition.degraded` is `1` exactly
while `/health` lists a condition and `0` otherwise, one series per condition, with the condition's name in its
`condition` attribute. A condition gets its series once its dependency has first answered or failed: the console and
an OpenID Connect provider at startup, the collector at its first export, the database at its first connection, and a
provider without discovery once somebody signs in with it.

**The collector's own series cannot be relied on to alert.** While the collector is degraded, the series saying so is
sent to the collector that is failing, and arrives, if at all, once it answers again. Watch the console's ERROR line,
or `/health`, for the collector.

`sympauthy.remote_call.duration` times each call that reports to a provider's, a webhook's or the mail server's
condition, and says how it ended. Both are listed with the other [metrics](/technical/monitoring/metrics).
