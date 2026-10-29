# Monitoring

SympAuthy can export its traces, metrics and log records to an [OpenTelemetry](https://opentelemetry.io/) collector,
which hands them to the backend of your choice. Exporting is off until a deployment names a collector. Once it is on,
the question an operator asks of it is whether an instance is healthy or starting to struggle, and the readings that
look like the obvious answer — threads, the container's memory — are not the ones that say so.

This page covers:

- [how to turn telemetry on](#turning-telemetry-on), and [how to try it locally](#trying-it-locally),
- [the readings that show an instance struggling](#what-shows-an-instance-struggling),
- [what the runtime metrics say, and what they do not](#what-the-runtime-metrics-say),
- [how to size an instance's memory](#sizing-an-instance-s-memory).

[Conditions](/technical/monitoring/conditions) says how the server reports a dependency that stops answering, and
every metric the server exports is listed, with its unit, on the [Metrics](/technical/monitoring/metrics) page.

## Turning telemetry on

Two keys turn telemetry on: the flag, and the collector's endpoint.

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
connection is opened. Set the endpoint with it: without one, the exporter sends to its own default,
`http://localhost:4318`, which inside a container is the container itself.

**The server sends over `http/protobuf` only**, so point the endpoint at the collector's HTTP port, `4318` by
convention. A collector's gRPC port, `4317`, is never reached.

Traces, metrics and log records all go to that one endpoint, and the service is named `sympauthy`. Each instance
exports under an id of its own, so the series of several instances do not merge at the collector. Any other key under
`otel` is read by the [OpenTelemetry SDK](https://opentelemetry.io/docs/languages/java/configuration/), for example
`otel.resource.attributes` to tag every signal with an environment or a region.

### Trying it locally

This walkthrough adds telemetry to the server from the [getting started guide](/getting-started/), with
[otel-tui](https://github.com/ymtdzzz/otel-tui) as the collector: a terminal application that receives OTLP and shows
what it receives.

1. Install otel-tui and start it in a terminal of its own. It listens for OTLP over HTTP on port `4318`:

   ```bash
   brew install ymtdzzz/tap/otel-tui
   otel-tui
   ```

   Other ways to install it are listed in [its README](https://github.com/ymtdzzz/otel-tui#getting-started).

2. Follow the getting started guide up to
   [running SympAuthy](/getting-started/#running-sympauthy), and append the two keys to the `docker run` command:

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
     '-otel.exporter.otlp.endpoint=http://host.docker.internal:4318'
   ```

   `host.docker.internal` is how a container reaches the host it runs on. On Linux, add
   `--add-host=host.docker.internal:host-gateway` to the command for that name to resolve.

3. Metrics arrive every ten seconds, from startup on. Open `http://localhost:8080/swagger-ui`, or sign in to the Admin
   UI, and each request appears in otel-tui as a trace. The log records written while serving it carry the same trace
   id.

## What shows an instance struggling

**An instance that falls behind queues work; it does not add threads.** Every pool the server runs has a fixed size,
so under load the readings that move are queue lengths and wait times. These are the ones to watch:

| Where work waits | Metric | What a rise means |
| --- | --- | --- |
| requests served | `http.server.request.duration` | slower answers. Read it per route: if many routes that share nothing slow down together, the cause is below them |
| the event loops | `netty.eventexecutor.tasks.pending` | a loop falling behind, usually one blocked call stalling every connection that loop serves. One series per loop, named by its thread: the HTTP server's loops and, on PostgreSQL, the driver's |
| the pool `suspend` routes resume on | `executor.active` | how busy that pool is |
| a person's account | `sympauthy.lock.wait.duration` | several changes waiting on one account |
| password hashing | `sympauthy.password.hash.active` | the CPU that sign-ins cost right now. A sudden rise is often password guessing |
| a [provider](/technical/configuration/provider), an [authorization webhook](/technical/authorization_webhook), the mail server, the database, the collector | `sympauthy.condition.degraded`, `sympauthy.remote_call.duration` | a dependency that is failing, or a call outside the process that is slow. `sympauthy.condition.degraded` is `1` exactly while `/health` lists the dependency's [condition](/technical/monitoring/conditions) |
| scheduled jobs | `sympauthy.job.run.duration` | a cleanup that fails, or that no instance gets to run |

## What the runtime metrics say

The production artifact is a native image, and it exports only the runtime readings that image fills.

| Reading | Exported as | What it tells |
| --- | --- | --- |
| heap memory | `jvm.memory.used`, `.committed`, `.limit` | heap only. Memory outside the heap (thread stacks, Netty's buffers) is not in it |
| Netty's buffers | `netty.allocator.memory.used` | the memory Netty's allocator holds, on and off the heap. A native image reports it nowhere else |
| garbage collection | `jvm.gc.collections.count`, `jvm.gc.collections.elapsed` | how often the collector ran and how long it took in total. Not how long a single pause took |
| threads | `jvm.thread.count` | a leak, when the count keeps climbing after it levels off. It levels off soon after startup at a size set by the processor count, and stays there under load, so it says nothing about saturation |
| CPU | `jvm.cpu.time`, `jvm.cpu.count` | the CPU the process uses, and how many processors it sees |

An operator who comes from a JVM will look for more, such as the duration of each garbage-collection pause: the
[runtime metrics](/technical/monitoring/metrics#missing-compared-to-a-jvm) list what a native image does not export,
and what to read instead.

## Sizing an instance's memory

**The container's memory figure and the process's are different numbers.** A native image keeps its code and its
pre-built heap in the executable, and maps them into memory. The figure a container reports (`docker stats`, a
Kubernetes memory metric) counts what the server allocated while running, and usually not those mapped pages. Run from
the [getting started guide](/getting-started/) on a 12-CPU host, with telemetry on and no traffic, an instance showed
100 MiB in `docker stats` while the whole process held 240 MiB.

**A memory limit acts on the container's figure.** Under memory pressure, the mapped pages can be dropped and read back
from the executable, at a cost in speed. Set a limit to the container's figure plus headroom, and leave the host enough
memory to keep the executable in memory.

**`jvm.memory.used` sits below both**, since it counts the heap alone.
