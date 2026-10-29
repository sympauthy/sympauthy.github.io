# Metrics

These are the metrics SympAuthy exports once [telemetry is turned on](/technical/monitoring/#turning-telemetry-on),
grouped by what they are about, each with the attributes its values are split by. [Monitoring](/technical/monitoring/)
says which of them show an instance struggling, and what a [backend](/technical/monitoring/#what-telemetry-is-made-of)
is.

A metric named after a convention means what that convention says, so it reads the way it does for any other server:
`http.*` and most `jvm.*` metrics are named by OpenTelemetry's
[semantic conventions](https://opentelemetry.io/docs/specs/semconv/), `jvm.gc.collections.*` by OpenTelemetry's
[JMX metrics](https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/main/instrumentation/jmx-metrics),
and `netty.*` and `executor.*` by [Micrometer](https://docs.micrometer.io/micrometer/reference/)'s. The `sympauthy.*`
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

**Every value is exported as a running total since the instance started** (cumulative temporality), and each instance
reports its own series. A restarted instance draws a new `service.instance.id`, so it starts new series from zero
rather than resetting the old ones, as [Monitoring](/technical/monitoring/#turning-telemetry-on) explains. A backend
that computes rates handles this; a sum across instances is the deployment's total.

## Attributes

Each value a metric records carries **attributes**, which split it into series: `sympauthy.authentication.attempts`
under `kind` `sign_up` counts sign-ups, and under `outcome` `refused` the attempts that were turned down. Summing a
metric over all its attributes always gives every event it counted.

**An attribute never carries a value a request sent.** No identifier a person typed, no token, no code: only values the
server chose itself, from a closed set, or the id of a client, provider or [condition](/technical/monitoring/conditions)
the configuration declares. A `client_id` is recorded only once the client has been found, so an id sent by somebody
guessing never becomes a series. There is no key to leave `client_id` out, and no need for one: the configuration
bounds how many clients there are, so it cannot multiply the series without limit. An attribute the server does not
know the value of is left out rather than recorded empty.

**No attribute identifies a person, a session or a credential**, so a metric answers how many and how fast, never for
whom. A question about one request is answered by its trace.

These attributes mean the same on every metric that carries them:

| Attribute    | Value                                                                                                                                                                                                                           |
|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `client_id`  | the id of the [client](/technical/configuration/client) the event was for.                                                                                                                                                      |
| `condition`  | the [condition](/technical/monitoring/conditions#the-conditions) the value is about: `database`, `mail`, `collector`, `console`, `provider:<id>` or `webhook:<client id>`.                                                      |
| `error.type` | why the event did not succeed, absent when it did. What it holds depends on the metric, and is said with each one; on the `sympauthy.*` metrics it is most often the error code the caller was answered with, such as `flow.password.sign_in.invalid`, the same identifier the Admin API shows as a [flow session's `error_details_id`](/technical/api/admin#get-interactive-flow-session), and the class of the failure where it carried no code. |
| `outcome`    | how the event ended: `success`; `refused`, where the caller caused it, such as a wrong password or a code already exchanged; or `error`, where the server or a dependency failed. Some metrics have endings of their own, listed with them. |

## HTTP

| Metric                         | Unit | Type      | Description                                                                                                           |
|--------------------------------|------|-----------|-----------------------------------------------------------------------------------------------------------------------|
| `http.client.request.duration` | `s`  | histogram | Duration of each request the server's HTTP client sends, to a [provider](/technical/configuration/provider) or a client's [authorization webhook](/technical/authorization_webhook). A provider's key set (`jwks`) is fetched outside that client and the exports to the collector use a client of their own, so neither is in it. |
| `http.server.request.duration` | `s`  | histogram | Duration of each request the server answers, on any route but those `otel.exclusions` names: `/health` and the paths under it, as shipped, have no series. |

Both carry the attributes of OpenTelemetry's
[HTTP semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/), among them
`http.request.method`, `http.response.status_code` and `error.type`, which there is the status code or the class of
the failure. A request served is split by `http.route`, the route template such as `/api/v1/admin/users/{userId}`
rather than the path, and a request sent by `server.address`. No query string is ever recorded.

## Tokens and grants

| Metric                                       | Unit      | Type      | Description                                                                                                                                                                     |
|----------------------------------------------|-----------|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `sympauthy.access_token.validation.duration` | `s`       | histogram | Duration of each check of an access token presented to the server, and how it ended.                                                                                            |
| `sympauthy.grant.revocations`                | `{grant}` | counter   | [Grants](/functional/grant) revoked, and what revoked them.                                                                                                                     |
| `sympauthy.token.request.duration`           | `s`       | histogram | Duration of each request to the token endpoint, and how it ended. A request refused before the server looks at the grant, such as one whose client fails to authenticate, is only in `http.server.request.duration`. |

| Attribute    | On                                     | Value                                                                                                                                                         |
|--------------|----------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `client_id`  | every metric above                     | on a token check, present only when the check succeeded; on a revocation, absent when it spans grants of several clients.                                    |
| `grant_type` | `sympauthy.token.request.duration`     | the `grant_type` of the request, such as `authorization_code`, `refresh_token` or `client_credentials`.                                                       |
| `revoked_by` | `sympauthy.grant.revocations`          | what revoked the grants: `client` through the revocation endpoint, `admin` through the Admin API, `consent_revoked` when the person's consent was revoked, `authorization_code_replayed` when its authorization code was presented again. |
| `scheme`     | the token request and the token check  | how the token is bound: `bearer`, or `dpop` for a token bound to a key with [DPoP](/technical/security#dpop-demonstrating-proof-of-possession).               |

`sympauthy.token.request.duration` and `sympauthy.access_token.validation.duration` also carry `outcome` and
`error.type`.

## Authentication

| Metric                              | Unit        | Type            | Description                                                                         |
|-------------------------------------|-------------|-----------------|-------------------------------------------------------------------------------------|
| `sympauthy.authentication.attempts` | `{attempt}` | counter         | Attempts to sign in, to sign up and to pass a second factor, and how each ended.   |
| `sympauthy.password.hash.active`    | `{hash}`    | up-down counter | Password hashes being computed right now.                                           |
| `sympauthy.password.hash.duration`  | `s`         | histogram       | Duration of each password hash, which is the CPU a sign-in costs.                   |
| `sympauthy.validation_code.checks`  | `{check}`   | counter         | Validation codes checked, and how each check ended.                                 |

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

An [interactive flow](/functional/interactive_flow) session is started for one **purpose**, and may take on others on
the way, such as checking a second factor. The purposes are, by the value the metrics record them under:

| Purpose            | What the person is doing                       | Starts a session |
|--------------------|------------------------------------------------|------------------|
| `oauth2_authorize` | signing in at a client's request               | yes              |
| `mfa_enrollment`   | setting up a second factor                     | yes              |
| `link_provider`    | linking a third-party provider to their account | yes             |
| `mfa_challenge`    | checking a second factor                       | no               |
| `reauthentication` | proving the account again before a sensitive step | no            |
| `confirm`          | approving an action started on their behalf    | no               |

| Metric                            | Unit        | Type      | Description                                                                                                                   |
|-----------------------------------|-------------|-----------|-------------------------------------------------------------------------------------------------------------------------------|
| `sympauthy.flow.session.duration` | `s`         | histogram | Time from the start of a session to its end, and whether it completed, failed or was cancelled.                              |
| `sympauthy.flow.sessions.expired` | `{session}` | counter   | Sessions that expired unfinished, counted when they are cleaned up, with the first purpose the person had not finished.      |
| `sympauthy.flow.sessions.started` | `{session}` | counter   | Sessions started, including those created failed because the authorization request they answer was invalid.                 |

| Attribute         | On                                | Value                                                                                                                                                  |
|-------------------|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| `client_id`       | every metric above                | present only when the session was started for a client the configuration declares.                                                                    |
| `outcome`         | `sympauthy.flow.session.duration` | how the session ended: `completed`, `failed` or `cancelled`. `error.type` says why a session failed.                                                   |
| `purpose`         | every metric above                | the purpose the session was started for: one of those that start a session.                                                                          |
| `stalled_purpose` | `sympauthy.flow.sessions.expired` | the first purpose the session had not finished, which is where the person stopped: any purpose in the table above.                                    |

`sympauthy.flow.sessions.started` also carries `outcome` and `error.type`. A `refused` start is an authorization
request that was invalid: the server still creates the session, marked failed, so that the person sees its error page,
and `error.type` is the code the session failed with. Such a session is counted nowhere else: it has no duration, and
is not counted when it expires.

## Dependencies

| Metric                           | Unit | Type      | Description                                                                                                                                       |
|----------------------------------|------|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `sympauthy.condition.degraded`   | `1`  | gauge     | `1` while a dependency's [condition](/technical/monitoring/conditions) is degraded and listed by `/health`, `0` otherwise. One series per dependency, such as the database, the mail server, a provider or the collector. |
| `sympauthy.remote_call.duration` | `s`  | histogram | Duration of each call the server makes outside its process, to a provider, an authorization webhook or the mail server, and how it ended.          |

`sympauthy.remote_call.duration` times the whole operation and says what it did to the dependency's condition, the
`jwks` fetch and mail included; `http.client.request.duration` times the HTTP exchange alone. Alert on the first.

| Attribute   | On                               | Value                                                                                                                                                                                       |
|-------------|----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `condition` | every metric above               | the condition the dependency reports to.                                                                                                                                                    |
| `operation` | `sympauthy.remote_call.duration` | what the call was for: to a provider `discovery`, `jwks`, `token` or `user_info`; to an authorization webhook `authorize`; to the mail server `send`.                                         |

`sympauthy.remote_call.duration` also carries `outcome` and `error.type`. `error` is a call that counts as a failure of
its condition, as [Conditions](/technical/monitoring/conditions#what-counts-as-a-failure) defines it — for an
authorization webhook, a `4xx` included — and `refused` an answer turning down what was sent, which does not count.
`error.type` is:

- the status the dependency answered with, such as `503`;
- `timeout` where it did not answer in time, `connection` where it could not be reached or the connection broke;
- `authentication` where the mail server refused the server's credentials;
- `unknown` where a webhook call failed without saying why;
- otherwise the error code, or the class of the failure, such as `jakarta.mail.SendFailedException` for a mail the
  mail server refused.

## Scheduled jobs

| Metric                       | Unit    | Type      | Description                                                                                                                    |
|------------------------------|---------|-----------|--------------------------------------------------------------------------------------------------------------------------------|
| `sympauthy.job.deletions`    | `{row}` | counter   | Rows a cleanup job deleted.                                                                                                    |
| `sympauthy.job.run.duration` | `s`     | histogram | Duration of each run of a scheduled job, and whether it succeeded, failed, or was skipped because another instance was running it. |

The jobs are the [scheduled cleanups](/technical/configuration/advanced#scheduled-cleanups), and two more:

| `job`                                     | What it does                                                                                              |
|-------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `clean_abandoned_accounts`                | collects the accounts an abandoned sign-up left half-created                                              |
| `clean_expired_interactive_flow_sessions` | expires interactive flow sessions and the records attached to them                                        |
| `clean_expired_user_security_contexts`    | removes a place people sign in from once nobody has been seen there for its retention                    |
| `clean_finished_grants`                   | deletes expired tokens and authorization codes, the tokens of a revoked grant, and the grants left empty  |
| `mail_backlog`                            | at startup, sends the mails a stopped instance left unsent, once per deployment                           |
| `renew_job_leases`                        | keeps the leases of the jobs this instance is running, every minute                                       |

| Attribute | On                           | Value                                                                                                                                                          |
|-----------|------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `job`     | every metric above           | the job, from the table above.                                                                                                                                 |
| `kind`    | `sympauthy.job.deletions`    | what was deleted, such as `token`, `authorization_code`, `grant` or `validation_code`.                                                                         |
| `outcome` | `sympauthy.job.run.duration` | `success`, `error`, or `skipped` when another instance held the job's lease.                                                                                   |

**A job is run by one instance at a time**, which holds a lease on it, renewed every minute and expiring after three
minutes of silence. On a deployment of several instances, `skipped` on most of them is normal. A job `skipped` on
every instance and succeeding on none is held by an instance that is still renewing its lease but no longer finishing
the job, a run that hangs: that instance is the one to restart. An instance that stops altogether loses its leases
within three minutes, and another one takes the job.

## Concurrency

| Metric                              | Unit       | Type            | Description                                                                                                                                         |
|-------------------------------------|------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `executor.active`                   | `{thread}` | up-down counter | Threads running a request's work right now, on the pool requests continue on after they waited on a call. The pool has as many threads as the instance has processors. |
| `netty.allocator.memory.used`       | `By`       | up-down counter | Memory Netty's buffer allocator holds, on and off the heap.                                                                                         |
| `netty.eventexecutor.tasks.pending` | `{task}`   | gauge           | Tasks waiting on each Netty event loop. One series per loop, named by its thread: the loops the HTTP server and client share and, on PostgreSQL, the database driver's. |
| `sympauthy.lock.wait.duration`      | `s`        | histogram       | Time a change waited to lock the objects it changes, such as a person's account.                                                                    |

| Attribute        | On                                  | Value                                                                                                                                                            |
|------------------|-------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `allocator.type` | `netty.allocator.memory.used`       | the class of the allocator.                                                                                                                                      |
| `id`             | `netty.allocator.memory.used`       | an id telling one allocator from another of the same class.                                                                                                     |
| `lock`           | `sympauthy.lock.wait.duration`      | the kinds of object locked together, joined by `+`: `user` for a change to a person's account, or `identifier_value+provider_subject+user` when a sign-up completes and its [provisional](/functional/end-user_management#a-sign-up-counts-only-once-the-flow-completes) account becomes a real one. |
| `memory.type`    | `netty.allocator.memory.used`       | `heap`, or `direct` for memory held outside the heap.                                                                                                            |
| `name`           | `executor.active`                   | always `request`.                                                                                                                                                |
| `name`           | `netty.eventexecutor.tasks.pending` | the name of the loop's thread.                                                                                                                                   |

`sympauthy.lock.wait.duration` also carries `outcome` and `error.type`. A lock is a row the database locks for the
length of a transaction, and the server sets no limit on how long it waits for one: it waits as long as the database's
own `lock_timeout` allows, which PostgreSQL leaves unlimited by default. A wait that failed is an `error`, typed by the
code the database answered with — `55P03` when the database's `lock_timeout` ran out, `40P01` for a deadlock — or by
the class of the failure where it carried none.

## Runtime

The container image is a [native image](/technical/monitoring/#what-the-runtime-metrics-say), and the server exports
only the runtime readings that image fills.

| Metric                       | Unit       | Type            | Description                                                            |
|------------------------------|------------|-----------------|------------------------------------------------------------------------|
| `jvm.cpu.count`              | `{cpu}`    | up-down counter | Processors available to the process.                                   |
| `jvm.cpu.time`               | `s`        | counter         | CPU time the process has used since it started.                        |
| `jvm.gc.collections.count`   | `1`        | counter         | Garbage collections since startup, per garbage collector.              |
| `jvm.gc.collections.elapsed` | `ms`       | counter         | Total time spent in garbage collection since startup, per garbage collector. |
| `jvm.memory.committed`       | `By`       | up-down counter | Heap memory committed.                                                 |
| `jvm.memory.limit`           | `By`       | up-down counter | Maximum heap memory the process can obtain, where it is known.         |
| `jvm.memory.used`            | `By`       | up-down counter | Heap memory in use.                                                    |
| `jvm.thread.count`           | `{thread}` | up-down counter | Threads running, background (daemon) ones included.                    |

| Attribute              | On                  | Value                                                         |
|------------------------|---------------------|---------------------------------------------------------------|
| `jvm.memory.pool.name` | `jvm.memory.*`      | the heap pool the memory belongs to.                          |
| `jvm.memory.type`      | `jvm.memory.*`      | always `heap`: memory outside the heap is not reported.       |
| `jvm.thread.daemon`    | `jvm.thread.count`  | `true` for background (daemon) threads, `false` for the others. |
| `name`                 | `jvm.gc.*`          | the garbage collector.                                        |

### Missing compared to a JVM

A dashboard built for a Java application on a Java virtual machine expects readings that SympAuthy does not export.
Their absence is not a fault: a native image reports nothing for them, or always `0`, and the server leaves them out
rather than export a series that never moves.

| Missing reading                                    | Why a native image has none                                        | Read instead                                                                 |
|----------------------------------------------------|--------------------------------------------------------------------|------------------------------------------------------------------------------|
| duration of each garbage-collection pause (`jvm.gc.duration`) | the garbage collector never announces its pauses         | the rate of `jvm.gc.collections.elapsed` divided by the rate of `jvm.gc.collections.count`: the recent average pause, in milliseconds. It hides one long pause among short ones |
| classes loaded, JIT compilation (`jvm.class.*`)    | every class is compiled into the executable before it runs         | nothing: no class is loaded or compiled while the server runs                |
| non-heap memory: metaspace, code cache             | the code lives in the executable, not in a memory pool             | nothing to watch: it is the executable's mapped pages, which [sizing an instance's memory](/technical/monitoring/#sizing-an-instance-s-memory) budgets on the host |
| buffer pools (`jvm.buffer.*`)                      | the image has no way to report them                                | `netty.allocator.memory.used`, which holds the server's network buffers      |
| threads per state: runnable, blocked, waiting      | the image does not report thread states                            | `jvm.thread.count`, and the queues [Monitoring](/technical/monitoring/#what-shows-an-instance-struggling) lists to tell whether work is waiting |
