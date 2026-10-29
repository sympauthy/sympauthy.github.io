# Traces

These are the traces SympAuthy exports once [telemetry is turned on](/technical/monitoring/#turning-telemetry-on): what
a trace of one request holds, and what each of its spans carries. [Monitoring](/technical/monitoring/) says what a
trace, a span and a [collector](/technical/monitoring/#what-telemetry-is-made-of) are.

This page covers:

- [what a trace holds](#what-a-trace-holds),
- [what a query span carries](#what-a-query-span-carries), and why no value a query compares against reaches the
  collector,
- [which queries are not traced](#queries-that-are-not-traced),
- [how to turn database spans off](#turning-database-spans-off).

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

**Database spans are exported with every other signal**, to the same collector, once `micronaut.otel.enabled` is
`true`. While it is `false`, nothing is placed between the server and its database. To leave them out alone, set
`otel.instrumentation.r2dbc.enabled` to `false` (default `true`): the rest of the telemetry is still exported. A
database that stops answering is reported as its [condition](/technical/monitoring/conditions) says, on `/health` and
in the log, whether its queries are traced or not.
