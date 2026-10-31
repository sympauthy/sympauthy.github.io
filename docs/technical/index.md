# Technical documentation

This part of the documentation describes the technical aspects of SympAuthy, like its configuration file and APIs.

## Security

SympAuthy is designed with security as a first-class concern. See the [Security](/technical/security) documentation for a detailed
description of the measures in place, including password hashing, token signing, OAuth 2.1 flow protections, and safe
configuration defaults.

## Monitoring

SympAuthy reports whether it is healthy on its console and its `/health` endpoint, and, once you turn telemetry on,
sends metrics and log records to an OpenTelemetry collector you run, and traces once you turn them on too. See the
[Monitoring](/technical/monitoring/) documentation for how to turn it on and which readings show an instance
struggling, [Logs](/technical/monitoring/logs) for what each log level means,
[Conditions](/technical/monitoring/conditions) for a dependency that stops answering, and
[Metrics](/technical/monitoring/metrics) for every metric the server exports.

## Configuration

Sympauthy is configured through a configuration file that defines how the authorization server behaves. The
configuration controls authentication methods, OAuth providers, claim collection, validation requirements, and various
security settings. It allows you to customize the authentication experience without modifying code. See
the [Configuration](/technical/configuration/) documentation for detailed information on all available configuration options
and [Well-known providers](/technical/well-known_providers) for pre-configured OAuth provider templates.

## APIs

SympAuthy exposes several APIs for different use cases: standard OAuth 2.1 & OpenID Connect endpoints, plus custom APIs
for building authentication flows, querying user data, and administering the server. See the [API](/technical/api/) documentation
for a complete overview.

## Expressions

[Scope granting rules](/functional/user_authorization#scope-granting-rules),
[act-as rules](/functional/delegation#act-as-rules) and the [doors](/functional/claim_access#doors) of a claim's
[ACL](/functional/claim_access) are driven by expressions you write in configuration. See the
[Expressions](/technical/expressions/) documentation for the functions available in those
expressions and where each one can be used.
