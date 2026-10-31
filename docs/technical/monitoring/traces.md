# Traces

These are the traces SympAuthy exports once [telemetry is turned on](/technical/monitoring/#turning-telemetry-on) and
[traces are turned on too](#turning-traces-on): what a trace of one request holds, and what each of its spans carries.
[Monitoring](/technical/monitoring/) says what a trace, a span and a
[collector](/technical/monitoring/#what-telemetry-is-made-of) are.

This page covers:

- [how to turn traces on](#turning-traces-on), since they ship off, [which sampler to choose](#choosing-a-sampler),
  and [what a deployment keeps without them](#without-traces),
- [what a trace holds](#what-a-trace-holds),
- [what a query span carries](#what-a-query-span-carries), and why no value a query compares against reaches the
  collector,
- [which queries are not traced](#queries-that-are-not-traced),
- [how to turn database spans off](#turning-database-spans-off).

## Turning traces on

**Traces ship off.** With the two keys that [turn telemetry on](/technical/monitoring/#turning-telemetry-on), the
server exports metrics and log records, and no span: not a request's, not a call's, not a query's. The metrics give
totals and percentiles; a span says what one request waited on, and in what order. Turn traces on to look at single
requests, or keep a share of them traced. A third key turns them on, written in the configuration file beside the
other two, or passed like any other key as an environment variable (`OTEL_TRACES_SAMPLER`) or a command-line argument:

```yaml
otel:
  traces:
    sampler: parentbased_always_on
```

**It is the only key to write**: the server already sends traces to the collector once there are any. Under
`parentbased_always_on`, the OpenTelemetry SDK's own default, every request is traced unless its caller
[says otherwise](#a-caller-s-trace), and everything below holds: the server builds and exports a span per request,
per call to a provider or an authorization webhook, and per query a request sends its database.

## Choosing a sampler

**The sampler decides which requests are traced**, and `otel.traces.sampler` takes the ones the
[OpenTelemetry SDK](https://opentelemetry.io/docs/languages/java/configuration/#properties-traces) names below. A ratio
is set by `otel.traces.sampler.arg`, such as `0.1` for one request in ten; without it, the ratio is `1`, every request.
In the configuration file, write it as a dotted key beside `sampler`, which already holds the sampler's name, or pass it
as `OTEL_TRACES_SAMPLER_ARG`:

```yaml
otel:
  traces:
    sampler: traceidratio
    sampler.arg: 0.1
```

| Sampler | Requests traced |
| --- | --- |
| `always_off` | none. The server's default |
| `always_on` | all of them, whatever their caller sends |
| `traceidratio` | a share of them, whatever their caller sends |
| `parentbased_always_on` | all of them, except those whose caller's trace is not recorded |
| `parentbased_always_off` | only those whose caller's trace is recorded |
| `parentbased_traceidratio` | those whose caller's trace is recorded, none whose caller's trace is not, and a share of those that arrive without one |

### A caller's trace

**A caller passes its own trace in a W3C [`traceparent`](https://www.w3.org/TR/trace-context/) header**, whose last
field, the trace flags, says whether the caller records it: `01` recorded, `00` not. Under every sampler, a request
that carries one joins the caller's trace; the sampler decides only whether the server records it. A `parentbased_`
sampler follows the caller's flags, and the others ignore them. Anybody can send that header: under
`parentbased_always_on` a caller can keep its requests out of the traces, and under `parentbased_always_off` or
`parentbased_traceidratio` it can have them traced. A deployment that does not want its callers to decide writes
`always_on` or `traceidratio`. Under the shipped `always_off`, nothing a caller sends turns tracing on.

## Without traces

**With traces off, a deployment loses the spans and, with them, the exemplars of its metrics; nothing else.** Every
metric is still exported. An **exemplar** is a sample trace a backend links a point of a duration metric to, and is
taken only from a recorded span. A log record still carries a trace id and a span id, the caller's trace id when the
request carried a `traceparent`, so the lines one request wrote can still be read together. A call to a provider or an
authorization webhook still carries a `traceparent`, its flags `00`. The collector's
[condition](/technical/monitoring/conditions) still degrades when an export fails.

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
[on](#turning-traces-on). While `micronaut.otel.enabled` is `false`, nothing is placed between the server and its
database. To leave them out alone, set `otel.instrumentation.r2dbc.enabled` to `false` (default `true`): the rest of
the telemetry, the other spans included, is still exported. A database that stops answering is reported as its [condition](/technical/monitoring/conditions) says, on `/health` and
in the log, whether its queries are traced or not.
