# Logs

SympAuthy writes its log to standard output, which is the container's log output, and, once
[telemetry](/technical/monitoring/) is on, sends the same lines to the
[collector](/technical/monitoring/#what-telemetry-is-made-of) as log records. Its levels have a meaning an operator can
rely on: an ERROR line always says the server is not fully operational, and nothing a caller — a person signing in, or
an application making a request — does can produce one. An alert on ERROR lines is an alert on the server's health,
and does not fire because somebody typed a wrong password.

This page covers:

- [what each level carries](#levels), [what is not logged](#what-is-not-logged), and
  [changing the level](#changing-the-level),
- [how the console is written](#how-the-console-is-written): what a line looks like, and in what order lines appear,
- [the log records sent through telemetry](#log-records-sent-through-telemetry), and how to stop sending them.

## Levels

**An ERROR line means the server is not fully operational**, for example because a dependency stopped answering, the
console is [dropping lines](#how-the-console-is-written), a [provider](/technical/configuration/provider) answered with
a discovery document the server cannot use and stays disabled until a restart, or the
[configuration](/technical/configuration/) leaves the server unready. A dependency that stops answering writes one
ERROR when it first fails and one INFO line once it has recovered, however long the outage lasts, as
[Conditions](/technical/monitoring/conditions#how-a-condition-degrades-and-recovers) describes.

Each level below ERROR carries less urgent news:

| Level | Carries                                                                                                                                                                        |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| WARN  | one operation failed in a way the server did not expect, and an operator would act on it                                                                                       |
| INFO  | the server's lifecycle: startup, a dependency that recovered, the unsent mails a stopped instance left behind, replayed at startup                                             |
| DEBUG | the decisions worth reading while investigating, such as the scopes an authorization webhook granted and declined, or a session presented from more places than the server keeps |

### What is not logged

**Nothing a caller caused is logged above DEBUG.** A wrong password, a sign-in the server turned down, a `redirect_uri`
the client did not register, a malformed request: the response says it, and a line for each would let anybody fill the
log on demand. Most of them write no line at any level, and the few a caller can provoke at will, such as the places a
session is presented from, are DEBUG. A request that failed is not an ERROR either, and the requests the server serves
are not logged at all: a [trace](/technical/monitoring/#what-telemetry-is-made-of) is the only record of a request.

The log is therefore no source for counting failed sign-ins: a dashboard or an alert on them is built on
[`sympauthy.authentication.attempts`](/technical/monitoring/metrics#authentication) instead.

### Changing the level

**The server writes INFO, WARN and ERROR, and leaves DEBUG off.** Each line is written by a **logger**, whose name is
printed on the line (see [what a line looks like](#how-the-console-is-written)). Names nest by their dots, and
`logger.levels` sets the level of a logger and of every logger nested under it: `com.sympauthy` for the
server's own lines, `root` for every logger, the framework and libraries the server runs on included, except the few the
server silences on its own. The levels are `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR` and `OFF`.

Write it in the configuration file, or pass it as a command-line argument, such as `-logger.levels.com.sympauthy=DEBUG`.
A test against the [testcontainers module](/testcontainers/configuration#property-overrides) passes it with
`withProperty("logger.levels.com.sympauthy", "DEBUG")`; keep `com.sympauthy` at INFO or lower when the test reads the
[bootstrap invitation](/testcontainers/invitation) from the log, which is written at INFO.

```yaml
logger:
  levels:
    com.sympauthy: DEBUG
```

**The level decides what reaches the console and the collector alike.** A line below its logger's level is not written
anywhere. DEBUG is many more lines: under load, they fill the queue the console is written through
([below](#how-the-console-is-written)), and the console [degrades](/technical/monitoring/conditions#what-counts-as-a-failure)
as it drops them. Turn it on while investigating, and back off afterwards.

## How the console is written

**A line is meant for a person to read**: the time of day, the thread, the level, the logger's name (`com.sympauthy` is
shortened to `c.s`) and the message.

```
09:12:44.120 [main] INFO  c.s.ApplicationReadinessStatusPrinter - SympAuthy vX.Y.Z is ready and has found the following elements in its configuration:
```

The level and the time are coloured with terminal escape codes, which a log store receives as they are; the time
carries no date, and the line no trace id. No structured format, such as JSON, is offered.

**Below ERROR, the console is written in the background.** A line is handed to a queue and the code that logged it
moves on, so whatever reads the container's output — a log driver or an agent — never slows a request when it is slow.
Under pressure, lines are dropped rather than waited for, INFO and below first, WARN only once the queue is full, and
the drop is reported as the [console's condition](/technical/monitoring/conditions#what-counts-as-a-failure), which
gives the queue's numbers.

**An ERROR is never dropped from the console.** It is written straight to it by the code that raised it, so it may
appear before a line that was logged just before it: the timestamp on each line, not its place in the output, is what
orders them.

**On shutdown, the lines still queued are written for up to a second**, then abandoned, so a rolling redeploy is not
held up by a backlog of lines below ERROR.

## Log records sent through telemetry

**Once [telemetry is on](/technical/monitoring/#turning-telemetry-on), every line its logger's level lets through is
also sent to the collector as a log record**, ERROR included, whether or not the console wrote it. A line written while
serving a request carries the id of that request's trace. A record does not go through the console's queue: the
server's exporter, the part of it that sends to the collector, has a queue of its own, which drops records rather than
wait when the collector falls behind. Those drops are not reported on the console or on `/health`.

**Alert on ERROR from the console or `/health`, not from the records.** An ERROR record is dropped like any other, and
the one saying the collector is failing is sent to the collector that is failing.

**The records follow the [level](#changing-the-level)**: lowering it to DEBUG sends DEBUG records too, and the collector
receives the same lines as the console.

**To stop sending log records and keep traces and metrics**, set the logs exporter to `none`:

```yaml
otel:
  logs:
    exporter: none
```

The console is not affected. To send nothing at all, leave `micronaut.otel.enabled` at its default, `false`: that is
also what removes the part of the server that turns lines into records.
