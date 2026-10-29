# Conditions

A **condition** is a dependency SympAuthy cannot fully work without, such as the database, a provider or the mail
server. At any moment a condition is either **operational** or **degraded**. When one degrades, the server does not
stop: it keeps answering what it can, and says what is wrong in three places that an operator can watch: the console,
`/health` and a metric.

This page covers:

- [which conditions the server watches](#the-conditions),
- [how a condition degrades and recovers](#how-a-condition-degrades-and-recovers), and what counts as a failure,
- [what `/health` answers](#on-health) while a condition is degraded,
- [the metric an alert can watch](#as-a-metric).

## The conditions

| Condition                   | What it is                                                                                         | On `/health`                  | On the metric       |
|-----------------------------|----------------------------------------------------------------------------------------------------|-------------------------------|---------------------|
| the database                | the database the server stores its data in                                                         | `database`                    | `database`          |
| the mail server             | the server mail is sent through, when [mail](/technical/configuration/mail) is configured          | `mail`                        | `mail`              |
| a provider                  | a [provider](/technical/configuration/provider) people sign in with, one condition per provider     | `providers.<provider id>`     | `provider:<id>`     |
| an authorization webhook    | a client's [authorization webhook](/technical/authorization_webhook), one condition per client      | `authorization-webhooks.<client id>` | `webhook:<id>` |
| the collector               | the OpenTelemetry collector, when [telemetry](/technical/monitoring/#turning-telemetry-on) is on    | `collector`                   | `collector`         |
| the console                 | the queue the server's log lines go through on their way to the console                            | `console`                     | `console`           |

A provider and a client may share an id, which is why each is named under its kind.

## How a condition degrades and recovers

**The first failure degrades a condition and writes one ERROR line** naming it. Every failure after that, while it is
still degraded, is counted and writes nothing. However long an outage lasts and however much traffic meets it, the
console gets one line for it, not one per failed request.

**A condition recovers once its dependency answers again and 30 seconds pass without a new failure.** One INFO line
then says how long it was degraded and how many failures it absorbed, and, where something was lost, how much: the
lines the console dropped, the spans and log records the collector did not receive. The 30 seconds keep a dependency
that fails one call in two from flipping back and forth, so a condition writes at most one ERROR line every 30 seconds.

**Each instance watches its conditions on its own.** Two instances of one deployment may disagree for up to the
30 seconds of a recovery, each answering for the calls it made.

### What counts as a failure

Only a failure that says the dependency itself is unwell degrades its condition: a connection refused, a timeout, a
`5xx`, a database connection that cannot be opened or is lost. A query that fails on a working connection does not.

**A `4xx` is an answer, not a failure.** A provider refusing a code somebody replayed says nothing about the provider,
and counting it would let anybody degrade the server by sending bad input. While a condition is degraded, a `4xx`
starts its 30 seconds of recovery just as a success does.

**A `4xx` from an authorization webhook is the exception, and counts.** The server composes the webhook's request
alone, so a refusal says the webhook, or the secret it shares with the server, is wrong.

**A provider that cannot be reached at startup starts degraded**, and recovers like any other condition once it
answers.

**The console degrades when its queue is full**, and its failures are the lines it dropped. An ERROR line is never
queued, so the line saying the console is dropping lines always reaches it.

## On `/health`

**While a condition is degraded, `/health` answers `DEGRADED`, with a `200`.** It lists every degraded condition by
name, with the moment it degraded, under `conditions`:

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

**A degraded condition takes no instance out of service.** Readiness answers `DEGRADED` and `200` too, so a load
balancer reading the status code keeps routing to the instance, and liveness does not report conditions at all, so
the instance is not restarted. A provider that is down is down for every instance at once: taking readiness down would
pull them all out of the load balancer and turn one broken sign-in method into an outage. What takes readiness down is
an [invalid configuration](/technical/configuration/#a-key-that-binds-to-nothing), which no restart without a fix
can recover from.

**The failure itself is not published.** `/health` is visible to anonymous callers, and a failure carries hostnames,
internal addresses and response bodies. The names say nothing the sign-in pages do not; what went wrong is in the
ERROR line.

## As a metric

Once [telemetry is on](/technical/monitoring/#turning-telemetry-on), `sympauthy.condition.degraded` is `1` exactly
while `/health` lists a condition and `0` otherwise, one series per condition under the name in the table above. A
condition gets its series once its dependency has first answered or failed, so a provider nobody has signed in with yet
has none.

`sympauthy.remote_call.duration` times each call that reports to a provider's, a webhook's or the mail server's
condition, and says how it ended. Both are listed with the other [metrics](/technical/monitoring/metrics).
