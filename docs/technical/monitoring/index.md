# Monitoring

SympAuthy can report what it is doing so that you can watch whether it is healthy: how long it takes to answer, how
many sign-ins fail, whether a dependency stopped answering. It reports this as **telemetry**, in the
[OpenTelemetry](https://opentelemetry.io/) format, and only once you turn it on. The readings that look like the
obvious answer to "is it struggling?" — its threads, its container's memory — are not the ones that say so, and this
page says which are.

This page covers:

- [what telemetry is made of](#what-telemetry-is-made-of), and what you need to run beside the server,
- [how to turn telemetry on](#turning-telemetry-on), and [how to try it locally](#trying-it-locally),
- [the readings that show an instance struggling](#what-shows-an-instance-struggling),
- [what the runtime metrics say, and what they do not](#what-the-runtime-metrics-say),
- [how to size an instance's memory](#sizing-an-instance-s-memory).

[Conditions](/technical/monitoring/conditions) says how the server reports a dependency that stops answering, on its
console and on its `/health` endpoint, whether telemetry is on or not. Every metric the server exports is listed on the
[Metrics](/technical/monitoring/metrics) page, and what a trace holds once traces are on, down to each query a request
sent its database, on the [Traces](/technical/monitoring/traces) page.

## What telemetry is made of

The server sends these kinds of telemetry, called **signals**:

- a **trace** is the record of one request: the route it came in on, how long it took, and each call the server made
  outside itself to answer it, such as a call to a provider or a query to its database. Each part of it is a **span**.
  Traces ship off: the server sends none until you [turn them on](/technical/monitoring/traces#turning-traces-on).
- a **metric** is a number measured over time, such as the duration of token requests or the count of failed
  sign-ins. One metric is split into **series** by its attributes, as the [Metrics](/technical/monitoring/metrics#attributes)
  page explains.
- a **log record** is a line of the server's log, sent with the id of the trace it was written under when it was
  written while serving a request. [Logs](/technical/monitoring/logs#log-records-sent-through-telemetry) says which
  lines are sent, and how to change their level or stop sending them.

**The server does not store or display any of it.** It sends every signal to a **collector**, a separate program you
run, such as the [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/). The collector passes them on to
a **backend**, the tool you look at them in: Prometheus or Grafana for metrics, Jaeger or Tempo for traces, or a
hosted service that does all of them. SympAuthy ships no integration with any backend; it only needs the collector.

## Turning telemetry on

Two [configuration keys](/technical/configuration/) turn telemetry on: the flag, and the collector's endpoint. Write
them in the configuration file, or pass them like any other key, as an environment variable
(`MICRONAUT_OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`) or as a command-line argument. They send metrics and log
records: traces ship off, and [Traces](/technical/monitoring/traces#turning-traces-on) says how to turn them on.

```yaml
micronaut:
  otel:
    enabled: true
otel:
  exporter:
    otlp:
      endpoint: http://collector:4318
```

**Nothing is exported while `micronaut.otel.enabled` is `false`**, which is the default: no request is traced and no
connection is opened. The flag sits under `micronaut` because it switches on the server framework's telemetry module.
Set the endpoint with it: without one, the **exporter**, the part of the server that sends a signal to the collector,
sends to its own default, `http://localhost:4318`, which inside a container is the container itself.

**The server sends over the HTTP transport of OTLP, OpenTelemetry's protocol for sending telemetry, only**,
`http/protobuf`, so point the endpoint at the collector's HTTP port, `4318` by convention. A collector's gRPC port,
`4317`, is never reached: the server ships no gRPC sender, so setting `otel.exporter.otlp.protocol` to `grpc` makes
every export fail.

**Every signal goes to that one endpoint.** A deployment that wants to leave one out sets its exporter to `none`, as in
`otel.logs.exporter: none`. Metrics are sent every ten seconds (`otel.metric.export.interval`, set by the server; the
OpenTelemetry default is a minute).

**The server names itself in every signal.** Its `service.name` is `sympauthy`, and each instance adds a
`service.instance.id` drawn at random when it starts, so the series of several instances do not merge. A restart draws
a new id, and the restarted instance shows as a new one. To keep an id across restarts, or to tag every signal with an
environment or a region, set `otel.resource.attributes`, for example
`service.instance.id=sympauthy-1,deployment.environment=production`.

**`/health` is not traced, and has no series in `http.server.request.duration`.** The server ships
`otel.exclusions: ['/health.*']`, so once traces are on, a liveness probe every few seconds is not the most traced
route. A deployment that writes its own `otel.exclusions` replaces that list rather than adding to it, and has to repeat
`/health.*` to keep it.
`otel.exclusions` and the `otel.http.server.*` and `otel.http.client.*` keys, which copy named request or response
headers onto every span (none by default), are read by the server framework's telemetry module. Every other key under
`otel` is read by the [OpenTelemetry SDK](https://opentelemetry.io/docs/languages/java/configuration/).

### Trying it locally

This walkthrough adds telemetry to the server from the [getting started guide](/getting-started/), with
[otel-tui](https://github.com/ymtdzzz/otel-tui) as both the collector and the backend: a terminal application that
receives OTLP and shows what it receives.

1. Install otel-tui and start it in a terminal of its own. It listens for OTLP over HTTP on port `4318`:

   ```bash
   brew install ymtdzzz/tap/otel-tui
   otel-tui
   ```

   Other ways to install it are listed in [its README](https://github.com/ymtdzzz/otel-tui#getting-started).

2. Follow the getting started guide up to
   [running SympAuthy](/getting-started/#running-sympauthy), and append the two keys that turn telemetry on and the
   one that [turns traces on](/technical/monitoring/traces#turning-traces-on) to the `docker run` command as arguments:

   ```bash
   docker run -ti --rm -p 8080:8080 \
     --network sympauthy-network \
     -e MICRONAUT_ENVIRONMENTS=default,admin \
     ghcr.io/sympauthy/sympauthy-nightly:latest \
     '-r2dbc.datasources.default.url=r2dbc:postgresql://sympauthy-postgres:5432/getting_started_with_sympauthy' \
     '-r2dbc.datasources.default.username=sympauthy_pg_user' \
     '-r2dbc.datasources.default.password=sympauthy_pg_password' \
     '-auth.issuer=http://localhost:8080' \
     '-auth.by-password.enabled=true' \
     '-auth.identifier-claims=email' \
     '-claims.email.enabled=true' \
     '-urls.root=http://localhost:8080' \
     '-micronaut.otel.enabled=true' \
     '-otel.exporter.otlp.endpoint=http://host.docker.internal:4318' \
     '-otel.traces.sampler=parentbased_always_on'
   ```

   Without the last line, otel-tui shows the metrics and the log records, and no trace.

   `host.docker.internal` is how a container reaches the host it runs on. On Linux, add
   `--add-host=host.docker.internal:host-gateway` to the command for that name to resolve.

3. Metrics arrive every ten seconds, from startup on. Open `http://localhost:8080/swagger-ui`, or
   [sign in to the Admin UI](/getting-started/#test-your-sympauthy-instance), and each request appears in otel-tui as a
   trace. The log records written while serving it carry the same trace id, so you can find them by it.

If nothing arrives, the server could not reach the collector: its console shows one ERROR line saying the telemetry
collector is failing, as [Conditions](/technical/monitoring/conditions) describes. Check that otel-tui is running and
that the endpoint is the HTTP port.

## What shows an instance struggling

**An instance that falls behind makes work wait; it does not add threads to take it on.** A **thread** is one task the
server can run at a time, and the server runs its work on a few **pools** of threads whose size is set by the number
of processors: the **event loops**, which read requests and write answers, and the pool a request resumes on once a
call it waited on has answered. When more work arrives than those threads can take, it waits in a queue. So under load
the readings that move are queue lengths and wait times, not the thread count. These are the ones to watch:

| Where work waits | Metric | What a rise means |
| --- | --- | --- |
| requests served | `http.server.request.duration` | slower answers. Read it per **route**, the URL pattern a request matched (`http.route`): if many routes that share nothing slow down together, the cause is something they all use, such as the database or the CPU |
| the event loops | `netty.eventexecutor.tasks.pending` | a loop falling behind, usually one blocked call stalling every connection that loop serves. One series per loop, named by its thread: the loops the HTTP server and client share and, on PostgreSQL, the database driver's. Near `0` on a healthy instance |
| the pool a request resumes on once a call it waited on has answered | `executor.active` | how many of its threads are busy. The pool has as many threads as the instance has processors (`jvm.cpu.count`), so a value that stays at that count means requests wait for a thread |
| a person's account | `sympauthy.lock.wait.duration` | several changes waiting on one account |
| password hashing | `sympauthy.password.hash.active` | the CPU that sign-ins cost right now. A sudden rise is often password guessing |
| a [provider](/technical/configuration/provider), an [authorization webhook](/technical/authorization_webhook), the mail server, the database, the collector | `sympauthy.condition.degraded` | a dependency that is failing: `1` exactly while `/health` lists its [condition](/technical/monitoring/conditions) |
| a provider, an authorization webhook, the mail server | `sympauthy.remote_call.duration` | a call outside the process that is slow, or failing. The database and the collector are not timed here: once traces are on, a query's [span](/technical/monitoring/traces#what-a-query-span-carries) says how long it took |
| scheduled jobs | `sympauthy.job.run.duration` | not a rise, but its `outcome`: `error` is a job that fails, and `skipped` on every instance with `success` on none is a job no instance gets to run |

## What the runtime metrics say

The container image does not run on a Java virtual machine. SympAuthy is compiled ahead of time into a plain
executable, a [GraalVM native image](https://www.graalvm.org/latest/reference-manual/native-image/), which starts
faster and uses less memory, but leaves some of the readings a Java server gives empty. The server exports only the
runtime readings a native image fills. Its **heap** is the memory the server keeps its data in, and **garbage
collection** is how that memory is reclaimed once the data is no longer used.

| Reading | Exported as | What it tells |
| --- | --- | --- |
| heap memory | `jvm.memory.used`, `.committed`, `.limit` | heap only. Memory outside the heap (thread stacks, Netty's buffers) is not in it |
| Netty's buffers | `netty.allocator.memory.used` | the memory Netty's allocator holds, on and off the heap. A native image reports it nowhere else |
| garbage collection | `jvm.gc.collections.count`, `jvm.gc.collections.elapsed` | how often the garbage collector ran and how long it took in total. Not how long a single pause took |
| threads | `jvm.thread.count` | a leak, when the count keeps climbing after it levels off. It levels off soon after startup at a size set by the processor count. Two pools grow with the work, and fall back once it is done: the one passwords are hashed on, a thread per hash running, and the one the server waits on the mail server and on providers from. A count that rises with `sympauthy.password.hash.active` and falls back with it is not a leak |
| CPU | `jvm.cpu.time`, `jvm.cpu.count` | the CPU the process uses, and how many processors it sees |

An operator who comes from a Java virtual machine will look for more, such as the duration of each
garbage-collection pause: the [runtime metrics](/technical/monitoring/metrics#missing-compared-to-a-jvm) list what a
native image does not export, and what to read instead.

## Sizing an instance's memory

**The container's memory figure and the process's are different numbers.** A native image keeps its code and its
pre-built heap in the executable, and maps them into memory. The figure a container reports (`docker stats`, or
`container_memory_working_set_bytes` on Kubernetes) counts what the server allocated while running, and usually not
those mapped pages. Run from the [getting started guide](/getting-started/) on a 12-CPU host, with telemetry on and no
traffic, an instance showed 100 MiB in `docker stats` while the resident memory of the whole process (its RSS, as `ps`
reports it on the host) was 240 MiB. The host's processor count matters because the thread pools, and so their
stacks, are sized by it.

**A memory limit acts on the container's figure.** Under memory pressure, the mapped pages can be dropped and read back
from the executable, at a cost in speed. Set the limit to the container's figure under load plus a margin, such as
256 MiB for the 100 MiB above, and leave the host room for the difference between the two figures, about 140 MiB in
that run, so the executable stays in memory.

**The heap grows until it reaches its own maximum.** Unless told otherwise, a native image lets its heap grow to 80% of
the memory it sees, which in a container with a limit is that limit. To cap it lower, pass `-Xmx` as an argument, such
as `-Xmx192m`, which [GraalVM reads at startup](https://www.graalvm.org/latest/reference-manual/native-image/optimizations-and-performance/MemoryManagement/).
`jvm.memory.limit` reports the maximum in force, and `jvm.memory.used` sits below both figures above, since it counts
the heap alone.
