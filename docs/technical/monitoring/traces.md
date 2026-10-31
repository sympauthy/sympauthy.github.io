# Traces

These are the traces SympAuthy exports once [telemetry is turned on](/technical/monitoring/#turning-telemetry-on), and
[traces with it](#turning-traces-on): what a trace of one request holds, and what each of its spans carries.
[Monitoring](/technical/monitoring/) says what a trace, a span and a
[collector](/technical/monitoring/#what-telemetry-is-made-of) are.

This page covers:

- [how to turn traces on](#turning-traces-on), which ship off,
- [what a trace holds](#what-a-trace-holds),
- [what a query span carries](#what-a-query-span-carries), and why no value a query compares against reaches the
  collector,
- [which queries are not traced](#queries-that-are-not-traced),
- [how to turn database spans off](#turning-database-spans-off).

## Turning traces on

**Traces ship off.** With the two keys that [turn telemetry on](/technical/monitoring/#turning-telemetry-on), the
server exports metrics and log records, and no span: not a request's, not a call's, not a query's. A span says what one
request waited on, and in what order, which is the question somebody changing the server asks; an operator runs it
from the metrics and the log records. A third key turns traces on, written beside them or passed as
`OTEL_TRACES_SAMPLER`:

```yaml
otel:
  traces:
    sampler: parentbased_always_on
```

**Under that sampler, every request is traced**, unless its caller says its own trace is not recorded, and everything
below holds: the server builds and exports a span per request, per call it makes and per query a request sends its
database. The **sampler** is what decides which requests are traced, and `otel.traces.sampler` takes any of the
[OpenTelemetry SDK's](https://opentelemetry.io/docs/languages/java/configuration/#properties-traces), for a deployment
that wants a share of the requests rather than all of them:

| Sampler | Requests traced |
| --- | --- |
| `always_off` | none. The server's default |
| `always_on` | all of them |
| `traceidratio` | a share of them, set by `OTEL_TRACES_SAMPLER_ARG`, such as `0.1` for one in ten |
| `parentbased_always_on` | all of them, except one whose caller's trace is not recorded |
| `parentbased_always_off` | only one whose caller's trace is recorded |
| `parentbased_traceidratio` | one whose caller's trace is recorded, and a share of those that arrive without a trace, set by `OTEL_TRACES_SAMPLER_ARG` |

**A caller's trace decides only under a `parentbased_` sampler.** A request that arrives with a W3C `traceparent`
header, the header a caller passes its own trace on in, is traced as part of the caller's trace, and under a
`parentbased_` sampler the header's flag decides whether it is traced at all. Anybody can send that header, so on a
server the public calls, such a sampler lets a caller choose what is traced; `always_on` and `traceidratio` decide
alone. Under the shipped `always_off`, a header saying its caller recorded the trace turns nothing on.

**With traces off, a deployment loses the spans and nothing else.** Every metric is still exported, without its
**exemplars**: the sample traces a backend links a point of a duration metric to, which are taken only from a
recorded span. A log record still carries a trace id and a span id, so the lines one request wrote can still be read
together. A call to a provider or an authorization webhook still carries a `traceparent`, flagged as not recorded. The
collector's [condition](/technical/monitoring/conditions) is reported as it is with traces on.

## What a trace holds

**A trace holds a span for the request, and under it a span for each call the server waited on**: every query it
sent its database, in the order it sent them, and every call to a [provider](/technical/configuration/provider) or an
[authorization webhook](/technical/authorization_webhook). A request that spent its time in the database shows it,
query by query, beside the calls it made elsewhere.

## What a query span carries

**A query span carries OpenTelemetry's
[attributes for a database call](https://opentelemetry.io/docs/specs/semconv/database/database-spans/)**, and is
named by its summary:

| Attribute | What it holds |
| --- | --- |
| `db.system.name` | `postgresql`, or `h2database` for H2 |
| `db.namespace` | the database's name |
| `server.address`, `server.port` | the database server's. H2 runs inside the server and has none |
| `db.query.text` | the statement. A value it binds stays a placeholder, such as `$1`, and a value written into it is replaced by `?` |
| `db.query.summary` | the operation and the tables it names, such as `SELECT "grants"` |
| `db.operation.batch.size` | the number of rows a statement was sent for at once, when more than one |
| `db.response.status_code`, `error.type` | for a query the database refused, its SQL state. A query cancelled before it returned anything, because its request timed out or its caller went away, ends as an error too |

**No value a query compares against reaches the collector.** The server binds its values rather than writing them into
a statement, so the statement it sends holds none, and a value written into one is replaced by `?` before the span is
started. An email address, an authorization code, a token or its hash is never in a span; the tables and columns a
statement names are. The database's user is not exported.

## Queries that are not traced

**Only a request's queries are traced.** A scheduled job's queries and the work the server does at startup have no
request around them, and open no span: a job sweeping a table every few seconds would otherwise be the most traced
thing in the collector. The migration at startup is not traced either. One query a request makes is missing from its
trace: the first load of the signing keys, made by the first request that needs a key, and cached for every later one.
Any other query a request's trace does not show was not made.

## Turning database spans off

**Database spans are exported with every other span**, to the same collector, once traces are
[on](#turning-traces-on). While `micronaut.otel.enabled` is `false`, nothing is placed between
the server and its database. To leave them out alone, set `otel.instrumentation.r2dbc.enabled` to `false` (default
`true`): the rest of the telemetry, the other spans included, is still exported. A
database that stops answering is reported as its [condition](/technical/monitoring/conditions) says, on `/health` and
in the log, whether its queries are traced or not.
