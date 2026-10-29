# Metrics

These are the metrics SympAuthy exports once [telemetry is turned on](/technical/monitoring/#turning-telemetry-on),
grouped by what they are about, each with the attributes its values are split by. [Monitoring](/technical/monitoring/)
says which of them show an instance struggling.

A metric named after a convention — `http.*` and `jvm.*` from OpenTelemetry's, `netty.*` and `executor.*` from
Micrometer's — means what that convention says, so it reads the way it does for any other server. The `sympauthy.*`
metrics are the server's own.

Units are written the way the server exports them: `s` for seconds, `ms` for milliseconds, `By` for bytes, `1` for a
plain number, and a word in braces, such as `{attempt}`, for a count of that thing. Every duration is in seconds,
except the garbage collector's.

Types are OpenTelemetry's, and say how a metric is read:

| Type            | What it records                                      | How to read it                                                              |
|-----------------|------------------------------------------------------|-----------------------------------------------------------------------------|
| counter         | a total that only goes up                            | as a rate: attempts per second, rows deleted per hour                       |
| up-down counter | an amount that rises and falls, such as memory held  | as its current value, like a gauge                                          |
| gauge           | a value read at each export                          | as its current value                                                        |
| histogram       | the distribution of durations                        | as percentiles, such as the 99th; its count is the number of events timed   |

**Each instance reports its own series, and a counter starts again from zero when its instance restarts.** A backend
that computes rates handles the reset; a sum across instances is the deployment's total.

## Attributes

Each value a metric records carries **attributes**, which split it into series: `sympauthy.authentication.attempts`
under `kind` `sign_up` counts sign-ups, and under `outcome` `refused` the attempts that were turned down. Summing a
metric over all its attributes always gives every event it counted.

**An attribute never carries a value a request sent.** No identifier a person typed, no token, no code: only values the
server chose itself, from a closed set, or the id of a client, provider or condition the configuration declares. A
`client_id` is recorded only once the client has been found, so an id sent by somebody guessing never becomes a series.
There is no key to leave `client_id` out. An attribute the server does not know the value of is left out rather than
recorded empty.

**No attribute identifies a person, a session or a credential**, so a metric answers how many and how fast, never for
whom. A question about one request is answered by its trace.

Four attributes mean the same on every metric that carries them:

| Attribute    | Value                                                                                                                                                                                                                           |
|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `client_id`  | the id of the [client](/technical/configuration/client) the event was for.                                                                                                                                                      |
| `condition`  | the [condition](/technical/monitoring/conditions#the-conditions) the value is about: `database`, `mail`, `collector`, `console`, `provider:<id>` or `webhook:<client id>`.                                                      |
| `error.type` | why the event did not succeed, absent when it did. The error code the caller was answered with, such as `flow.password.sign_in.invalid`, or the class of the failure where it carried no code.                                 |
| `outcome`    | how the event ended: `success`; `refused`, where the caller caused it, such as a wrong password or a code already exchanged; or `error`, where the server or a dependency failed. Some metrics have endings of their own, listed with them. |

## HTTP

| Metric                         | Unit | Type | Description                                                                                                           |
|--------------------------------|------|---|-----------------------------------------------------------------------------------------------------------------------|
| `http.client.request.duration` | `s`  | histogram | Duration of each HTTP request the server sends, to a [provider](/technical/configuration/provider) or a client's [authorization webhook](/technical/authorization_webhook). |
| `http.server.request.duration` | `s`  | histogram | Duration of each request the server answers, on any route.                                                            |

Both carry the attributes of OpenTelemetry's
[HTTP semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/), among them
`http.request.method`, `http.response.status_code` and `error.type`. A request served is split by `http.route`, the
route template such as `/api/v1/admin/users/{userId}` rather than the path, and a request sent by `server.address`.
No query string is ever recorded.

## Tokens and grants

| Metric                                       | Unit      | Type | Description                                                                                                                                                                     |
|----------------------------------------------|-----------|---|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `sympauthy.access_token.validation.duration` | `s`       | histogram | Duration of each check of an access token presented to the server, and how it ended.                                                                                            |
| `sympauthy.grant.revocations`                | `{grant}` | counter | [Grants](/functional/grant) revoked, and what revoked them.                                                                                                                     |
| `sympauthy.token.request.duration`           | `s`       | histogram | Duration of each request to the token endpoint, and how it ended. A request refused before the server looks at the grant, such as one whose client fails to authenticate, is only in `http.server.request.duration`. |

| Attribute    | On                                     | Value                                                                                                                                                         |
|--------------|----------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `client_id`  | all three                              | on a token check, present only when the check succeeded; on a revocation, absent when it spans grants of several clients.                                    |
| `grant_type` | `sympauthy.token.request.duration`     | the `grant_type` of the request, such as `authorization_code`, `refresh_token` or `client_credentials`.                                                       |
| `revoked_by` | `sympauthy.grant.revocations`          | what revoked the grants: `client` through the revocation endpoint, `admin` through the Admin API, `consent_revoked` when the person's consent was revoked, `authorization_code_replayed` when its authorization code was presented again. |
| `scheme`     | the token request and the token check  | how the token is bound: `bearer`, or `dpop` for a token bound to a key with [DPoP](/technical/security#dpop-demonstrating-proof-of-possession).                                                  |

`sympauthy.token.request.duration` and `sympauthy.access_token.validation.duration` also carry `outcome` and
`error.type`.

## Authentication

| Metric                             | Unit        | Type | Description                                                                         |
|------------------------------------|-------------|---|-------------------------------------------------------------------------------------|
| `sympauthy.authentication.attempts` | `{attempt}` | counter | Attempts to sign in, to sign up and to pass a second factor, and how each ended.   |
| `sympauthy.password.hash.active`   | `{hash}`    | up-down counter | Password hashes being computed right now.                                           |
| `sympauthy.password.hash.duration` | `s`         | histogram | Duration of each password hash, which is the CPU a sign-in costs.                   |
| `sympauthy.validation_code.checks` | `{check}`   | counter | Validation codes checked, and how each check ended.                                 |

| Attribute     | On                                  | Value                                                                                                                                      |
|---------------|-------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `kind`        | `sympauthy.authentication.attempts` | what the attempt was for: `sign_in`, `sign_up`, `second_factor`, or `enrollment` for setting up a second factor.                          |
| `media`       | `sympauthy.validation_code.checks`  | how the code was sent: `email` or `sms`.                                                                                                    |
| `method`      | `sympauthy.authentication.attempts` | how the person proved who they are: `password`, `provider`, or `totp` for a code from an authenticator app.                                |
| `operation`   | `sympauthy.password.hash.duration`  | `create` when a password is set, `verify` when one is checked at sign-in.                                                                  |
| `provider_id` | `sympauthy.authentication.attempts` | the [provider](/technical/configuration/provider) the person signed in with, present only when `method` is `provider`.                     |

`sympauthy.authentication.attempts` and `sympauthy.validation_code.checks` also carry `outcome` and `error.type`. A
password sign-in refused for an unknown identifier and one refused for a wrong password carry the same `error.type`,
since the server answers both alike so as not to say which accounts exist.

## Interactive flow

| Metric                             | Unit        | Type | Description                                                                                                                   |
|------------------------------------|-------------|---|-------------------------------------------------------------------------------------------------------------------------------|
| `sympauthy.flow.session.duration`  | `s`         | histogram | Time from the start of an [interactive flow](/functional/interactive_flow) session to its end, and whether it completed, failed or was cancelled. |
| `sympauthy.flow.sessions.expired`  | `{session}` | counter | Flow sessions that expired unfinished, counted when they are cleaned up, with the first step the person had not finished.     |
| `sympauthy.flow.sessions.started`  | `{session}` | counter | Flow sessions started, and authorization requests refused before one could start.                                            |

| Attribute         | On                                | Value                                                                                                                                                  |
|-------------------|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| `client_id`       | all three                         | present only when the session was started for a client the configuration declares.                                                                    |
| `outcome`         | `sympauthy.flow.session.duration` | how the session ended: `completed`, `failed` or `cancelled`. `error.type` says why a session failed.                                                   |
| `purpose`         | all three                         | what the session was started for, such as `oauth2_authorize` for signing in at a client's request, `mfa_enrollment`, `reauthentication` or `link_provider`. |
| `stalled_purpose` | `sympauthy.flow.sessions.expired` | the first purpose the session had not finished, which is where the person stopped. It takes the same values as `purpose`, `mfa_challenge` and `confirm` among them. |

`sympauthy.flow.sessions.started` also carries `outcome` and `error.type`: a refusal is a request turned down before a
person saw a page.

## Dependencies

| Metric                           | Unit | Type | Description                                                                                                                                       |
|----------------------------------|------|---|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `sympauthy.condition.degraded`   | `1`  | gauge | `1` while a dependency's [condition](/technical/monitoring/conditions) is degraded and listed by `/health`, `0` otherwise. One series per dependency, such as the database, the mail server, a provider or the collector. |
| `sympauthy.remote_call.duration` | `s`  | histogram | Duration of each call the server makes outside its process, to a provider, an authorization webhook or the mail server, and how it ended.          |

| Attribute   | On                               | Value                                                                                                                                                                                       |
|-------------|----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `condition` | both                             | the condition the dependency reports to.                                                                                                                                                    |
| `operation` | `sympauthy.remote_call.duration` | what the call was for: to a provider `discovery`, `jwks`, `token` or `user_info`; to an authorization webhook `authorize`; to the mail server `send`.                                         |

`sympauthy.remote_call.duration` also carries `outcome` and `error.type`. `error` is exactly a call that degraded its
condition, and `refused` an answer turning down what was sent, which does not. `error.type` is the status the
dependency answered with, `timeout` where it did not answer in time, or `connection` where it could not be reached or
the connection broke.

## Scheduled jobs

| Metric                       | Unit    | Type | Description                                                                                                                    |
|------------------------------|---------|---|--------------------------------------------------------------------------------------------------------------------------------|
| `sympauthy.job.deletions`    | `{row}` | counter | Rows a cleanup job deleted.                                                                                                    |
| `sympauthy.job.run.duration` | `s`     | histogram | Duration of each run of a scheduled job, and whether it succeeded, failed, or was skipped because another instance was running it. |

| Attribute | On                           | Value                                                                                                                                                          |
|-----------|------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `job`     | both                         | the job, such as `clean_finished_grants`, `clean_expired_interactive_flow_sessions` or `mail_backlog`.                                                         |
| `kind`    | `sympauthy.job.deletions`    | what was deleted, such as `token`, `authorization_code`, `grant` or `validation_code`.                                                                         |
| `outcome` | `sympauthy.job.run.duration` | `success`, `error`, or `skipped` when another instance held the job. A job that no instance gets to run shows as runs skipped everywhere and succeeding nowhere. |

## Concurrency

| Metric                              | Unit       | Type | Description                                                                                                                                         |
|-------------------------------------|------------|---|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `executor.active`                   | `{thread}` | up-down counter | Threads running a request's work right now, on the pool requests resume on after they waited on a call.                                             |
| `netty.allocator.memory.used`       | `By`       | up-down counter | Memory Netty's buffer allocator holds, on and off the heap.                                                                                         |
| `netty.eventexecutor.tasks.pending` | `{task}`   | gauge | Tasks waiting on each Netty event loop. One series per loop, named by its thread: the HTTP server's and client's loops and, on PostgreSQL, the database driver's. |
| `sympauthy.lock.wait.duration`      | `s`        | histogram | Time a change waited to lock the objects it changes, such as a person's account.                                                                     |

| Attribute                  | On                                  | Value                                                                                                                                                            |
|----------------------------|-------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`, `allocator.type`     | `netty.allocator.memory.used`       | the allocator the memory is held by.                                                                                                                             |
| `lock`                     | `sympauthy.lock.wait.duration`      | the kinds of object locked together, joined by `+`, such as `user` for a change to a person's account. |
| `memory.type`              | `netty.allocator.memory.used`       | `heap`, or `direct` for memory held outside the heap.                                                                                                            |
| `name`                     | `executor.active`                   | always `request`.                                                                                                                                                |
| `name`                     | `netty.eventexecutor.tasks.pending` | the name of the loop's thread.                                                                                                                                   |

`sympauthy.lock.wait.duration` also carries `outcome` and `error.type`. A wait that failed is an `error`, typed by the
code the database answered with: `55P03` when the lock could not be taken in time, `40P01` for a deadlock.

## Runtime

The production artifact is a native image, and the server exports only the runtime readings that image fills.

| Metric                       | Unit       | Type | Description                                                            |
|------------------------------|------------|---|------------------------------------------------------------------------|
| `jvm.cpu.count`              | `{cpu}`    | up-down counter | Processors available to the process.                                   |
| `jvm.cpu.time`               | `s`        | counter | CPU time the process has used since it started.                        |
| `jvm.gc.collections.count`   | `1`        | counter | Garbage collections since startup, per collector.                      |
| `jvm.gc.collections.elapsed` | `ms`       | counter | Total time spent in garbage collection since startup, per collector.   |
| `jvm.memory.committed`       | `By`       | up-down counter | Heap memory committed.                                                 |
| `jvm.memory.limit`           | `By`       | up-down counter | Maximum heap memory the process can obtain, where it is known.         |
| `jvm.memory.used`            | `By`       | up-down counter | Heap memory in use.                                                    |
| `jvm.thread.count`           | `{thread}` | up-down counter | Platform threads running, daemon or not.                               |

| Attribute              | On                  | Value                                                         |
|------------------------|---------------------|---------------------------------------------------------------|
| `jvm.memory.pool.name` | `jvm.memory.*`      | the heap pool the memory belongs to.                          |
| `jvm.memory.type`      | `jvm.memory.*`      | always `heap`: memory outside the heap is not reported.       |
| `jvm.thread.daemon`    | `jvm.thread.count`  | `true` for daemon threads, `false` for the others.            |
| `name`                 | `jvm.gc.*`          | the garbage collector.                                        |

### Missing compared to a JVM

A dashboard built for a Java application on a JVM expects readings that SympAuthy does not export. Their absence is not
a fault: a native image reports nothing for them, or always `0`, and the server leaves them out rather than export a
series that never moves.

| Missing reading                                    | Why a native image has none                                        | Read instead                                                                 |
|----------------------------------------------------|--------------------------------------------------------------------|------------------------------------------------------------------------------|
| duration of each garbage-collection pause (`jvm.gc.duration`) | the collector never announces its pauses                 | `jvm.gc.collections.elapsed` divided by `jvm.gc.collections.count`, the average pause |
| classes loaded, JIT compilation (`jvm.class.*`)    | every class is compiled into the executable before it runs         | nothing: no class is loaded or compiled while the server runs                |
| non-heap memory: metaspace, code cache             | the code lives in the executable, not in a memory pool             | the container's memory, as [sizing an instance's memory](/technical/monitoring/#sizing-an-instance-s-memory) explains |
| buffer pools (`jvm.buffer.*`)                      | the image has no way to report them                                | `netty.allocator.memory.used`, which holds the server's network buffers      |
| threads per state: runnable, blocked, waiting      | the image does not report thread states                            | `jvm.thread.count`, and the queues [Monitoring](/technical/monitoring/#what-shows-an-instance-struggling) lists to tell whether work is waiting |
