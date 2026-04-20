# Technical documentation

This part of the documentation describes the technical aspects of SympAuthy, like its configuration file and APIs.

## Security

SympAuthy is designed with security as a first-class concern. See the [Security](security) documentation for a detailed
description of the measures in place, including password hashing, token signing, OAuth 2.1 flow protections, and safe
configuration defaults.

## Configuration

Sympauthy is configured through a configuration file that defines how the authorization server behaves. The
configuration controls authentication methods, OAuth providers, claim collection, validation requirements, and various
security settings. It allows you to customize the authentication experience without modifying code. See
the [Configuration](configuration/) documentation for detailed information on all available configuration options
and [Well-known providers](well-known_providers) for pre-configured OAuth provider templates.

## APIs

SympAuthy exposes several APIs for different use cases: standard OAuth 2.1 & OpenID Connect endpoints, plus custom APIs
for building authentication flows, querying user data, and administering the server. See the [API](api/) documentation
for a complete overview.
