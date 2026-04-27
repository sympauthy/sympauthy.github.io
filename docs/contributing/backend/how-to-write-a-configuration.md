# How to write a configuration

Configuration management in SympAuthy uses a custom system built on top of Micronaut's `@ConfigurationProperties` to
provide early validation, explicit error messages, and type-safe configuration models. This guide explains how to create
new configuration components following SympAuthy's layered architecture.

## Architecture Overview

SympAuthy's configuration system consists of five layers:

1. **Properties Layer** (`com.sympauthy.config.properties`) — Raw string-based configuration properties from Micronaut
2. **Parser Layer** (`com.sympauthy.config.parsing`) — Type conversion and template resolution only
3. **Validator Layer** (`com.sympauthy.config.validation`) — Intra-domain and cross-domain validation
4. **Factory Layer** (`com.sympauthy.config.factory`) — Thin orchestration that connects the layers
5. **Model Layer** (`com.sympauthy.config.model`) — Type-safe, validated configuration models

All layers use `ConfigParsingContext` for error accumulation, replacing manual try-catch boilerplate.

This architecture ensures that:

- Configuration errors are caught at server startup (not lazily)
- All errors are reported together (not just the first one)
- Invalid configurations prevent the server from starting
- Consumers get type-safe, non-nullable configuration objects
- Parsing and validation concerns are cleanly separated

## ConfigParsingContext

`ConfigParsingContext` is a shared error accumulator that replaces the old manual
`mutableListOf<ConfigurationException>()` + try-catch pattern.

```kotlin
val ctx = ConfigParsingContext()

// In parsers: wraps each call, catching ConfigurationException automatically.
val issuer = ctx.parse { parser.getStringOrThrow(properties, "auth.issuer", Props::issuer) }

// In validators: add errors explicitly.
if (audienceId !in audiencesById) {
    ctx.addError(configExceptionOf("key", "config.audience.not_found", ...))
}

// In factories: check for errors before assembling.
return if (ctx.hasErrors) DisabledXxxConfig(ctx.errors) else EnabledXxxConfig(...)
```

**API:**

| Method | Purpose |
|---|---|
| `ctx.parse { }` | Execute a block, catch `ConfigurationException` automatically, return `T?` |
| `ctx.addError(e)` | Accumulate a validation error explicitly |
| `ctx.child()` | Create an independent child context for a sub-section |
| `ctx.merge(other)` | Merge errors from a child context back into this one |
| `ctx.hasErrors` | Whether any errors have been accumulated |
| `ctx.errors` | Immutable list of all accumulated errors |

Use `ctx.child()` and `ctx.merge()` when a sub-section (e.g., hash config within advanced config) needs its own
isolated error tracking.

## Step 1: Create the Properties Class

The properties class defines the structure of your configuration as it appears in the `application.yml` file. All
properties must be nullable strings (or collections of strings) to enable explicit validation in the parser layer.

### Simple Configuration (Interface)

For simple, flat configurations, use an interface with `@ConfigurationProperties`:

```kotlin
package com.sympauthy.config.properties

import io.micronaut.context.annotation.ConfigurationProperties

@ConfigurationProperties(AUTH_KEY)
interface AuthConfigurationProperties {
    val issuer: String?
    val audience: String?

    companion object {
        const val AUTH_KEY = "auth"
    }
}
```

**Key conventions:**

- Use an **interface** for simple configurations
- All properties are **nullable** (`String?`)
- Use `String` type even for booleans, numbers, durations, etc.
- Define the configuration key as a constant in the companion object
- Use kebab-case in YAML (e.g., `my-property`), which maps to camelCase in Kotlin (e.g., `myProperty`)

### Collection Configuration (Class with @EachProperty)

For map-like configurations where each item has a unique identifier (e.g., clients, providers, scopes):

```kotlin
package com.sympauthy.config.properties

import io.micronaut.context.annotation.EachProperty
import io.micronaut.context.annotation.Parameter

@EachProperty(CLIENTS_KEY)
class ClientConfigurationProperties(
    @param:Parameter val id: String
) {
    var secret: String? = null
    var authorizationFlow: String? = null
    var allowedRedirectUris: List<String>? = null
    var allowedScopes: List<String>? = null

    companion object {
        const val CLIENTS_KEY = "clients"
    }
}
```

**YAML example:**

```yaml
clients:
  my-app:
    secret: "abc123"
    authorization-flow: "authorization-code"
    allowed-redirect-uris:
      - "https://example.com/callback"
```

**Key conventions:**

- Use a **class** (not interface) with `@EachProperty`
- Use `@param:Parameter` on the `id` field to capture the map key
- Properties are **mutable** (`var`) instead of `val`
- Properties are nullable

### List Configuration (Class with list = true)

For array-like configurations without identifiers:

```kotlin
package com.sympauthy.config.properties

import io.micronaut.context.annotation.EachProperty

@EachProperty(
    value = RULES_KEY,
    list = true
)
class ScopeGrantingRuleConfigurationProperties {
    var name: String? = null
    var behavior: String? = null
    var scopes: List<String>? = null
    var expressions: List<String>? = null

    companion object {
        const val RULES_KEY = "rules"
    }
}
```

**YAML example:**

```yaml
rules:
  - name: "grant-email-scope"
    behavior: "grant"
    scopes: [ "email" ]
  - name: "deny-admin-scope"
    behavior: "deny"
    scopes: [ "admin" ]
```

**Key conventions:**

- Use `list = true` parameter in `@EachProperty`
- No `@Parameter` field needed
- Empty primary constructor

### Nested Configuration

For complex configurations with multiple levels:

```kotlin
package com.sympauthy.config.properties

import io.micronaut.context.annotation.ConfigurationProperties
import io.micronaut.context.annotation.EachProperty
import io.micronaut.context.annotation.Parameter

@EachProperty(PROVIDERS_KEY)
class ProviderConfigurationProperties(
    @param:Parameter val id: String
) {
    var name: String? = null
    var oauth2: Oauth2Config? = null

    @ConfigurationProperties("oauth2")
    interface Oauth2Config {
        val clientId: String?
        val clientSecret: String?
        val scopes: List<String>?
        val authorizationUrl: String?
        val tokenUrl: String?
    }

    companion object {
        const val PROVIDERS_KEY = "providers"
    }
}
```

**Key conventions:**

- Nested configurations must be **inner interfaces**
- Annotate with `@ConfigurationProperties("nested-key")`
- Parent class must be a class (not interface)
- Micronaut supports only one level of nesting

### Hierarchical Keys

For configurations that belong under a parent namespace:

```kotlin
@ConfigurationProperties(TOKEN_KEY)
interface TokenConfigurationProperties {
    val accessExpiration: String?
    val refreshExpiration: String?

    companion object {
        const val TOKEN_KEY = "$AUTH_KEY.token"  // Results in "auth.token"
    }
}
```

## Step 2: Create the Model Class

The model class represents the validated, type-safe configuration that will be used throughout the application. Use a
sealed class with two variants: `Enabled*Config` and `Disabled*Config`.

```kotlin
package com.sympauthy.config.model

import com.sympauthy.config.exception.ConfigurationException
import java.time.Duration

sealed class AuthConfig(
    configurationErrors: List<ConfigurationException>? = null
) : Config(configurationErrors)

data class EnabledAuthConfig(
    val issuer: String,
    val audience: String?,
    val token: TokenConfig
) : AuthConfig()

class DisabledAuthConfig(
    configurationErrors: List<ConfigurationException>
) : AuthConfig(configurationErrors)

fun AuthConfig.orThrow(): EnabledAuthConfig {
    return when (this) {
        is EnabledAuthConfig -> this
        is DisabledAuthConfig -> throw this.invalidConfig
    }
}
```

**Key conventions:**

- Sealed class extends `Config` base class
- **Enabled variant:**
    - Data class with properly typed, non-nullable fields
    - Contains the actual configuration values
- **Disabled variant:**
    - Holds the list of configuration errors
    - Used when validation fails
- **Extension function** `.orThrow()`:
    - Safely unwraps the enabled config
    - Throws exception if disabled

**Usage in business logic:**

```kotlin
@Singleton
class MyService(
    @Inject private val authConfig: AuthConfig
) {
    fun doSomething() {
        val config = authConfig.orThrow()  // Throws if invalid
        val issuer = config.issuer  // Type-safe, non-nullable access
    }
}
```

## Step 3: Create the Parser

The parser is a `@Singleton` bean responsible only for type conversion (converting raw strings into typed values) and
template resolution. It takes a `ConfigParsingContext` and properties as input, and returns a parsed intermediate
data class with nullable fields.

```kotlin
package com.sympauthy.config.parsing

import com.sympauthy.config.ConfigParser
import com.sympauthy.config.ConfigParsingContext
import com.sympauthy.config.properties.EmailConfigurationProperties
import com.sympauthy.config.properties.EmailConfigurationProperties.Companion.EMAIL_KEY
import jakarta.inject.Singleton

data class ParsedEmailConfig(
    val enabled: Boolean?,
    val smtpHost: String?,
    val smtpPort: Int?,
    val username: String?,
    val password: String?,
    val fromAddress: String?,
    val timeout: Duration?
)

@Singleton
class EmailConfigParser(
    private val parser: ConfigParser
) {
    fun parse(
        ctx: ConfigParsingContext,
        properties: EmailConfigurationProperties
    ): ParsedEmailConfig {
        val enabled = ctx.parse {
            parser.getBoolean(properties, "$EMAIL_KEY.enabled", EmailConfigurationProperties::enabled)
        } ?: false
        val smtpHost = ctx.parse {
            parser.getStringOrThrow(properties, "$EMAIL_KEY.smtp-host", EmailConfigurationProperties::smtpHost)
        }
        val smtpPort = ctx.parse {
            parser.getIntOrThrow(properties, "$EMAIL_KEY.smtp-port", EmailConfigurationProperties::smtpPort)
        }
        val username = ctx.parse {
            parser.getStringOrThrow(properties, "$EMAIL_KEY.username", EmailConfigurationProperties::username)
        }
        val password = ctx.parse {
            parser.getStringOrThrow(properties, "$EMAIL_KEY.password", EmailConfigurationProperties::password)
        }
        val fromAddress = ctx.parse {
            parser.getStringOrThrow(properties, "$EMAIL_KEY.from-address", EmailConfigurationProperties::fromAddress)
        }
        val timeout = ctx.parse {
            parser.getDurationOrThrow(properties, "$EMAIL_KEY.timeout", EmailConfigurationProperties::timeout)
        }
        return ParsedEmailConfig(
            enabled = enabled,
            smtpHost = smtpHost,
            smtpPort = smtpPort,
            username = username,
            password = password,
            fromAddress = fromAddress,
            timeout = timeout
        )
    }
}
```

**Key conventions:**

- Annotate the class with `@Singleton`
- Inject `ConfigParser`
- Define a `ParsedXxxConfig` data class with **nullable fields** (null = parse error)
- Use `ctx.parse { }` to wrap every `ConfigParser` call — errors are accumulated automatically
- **Never validate** values (no range checks, no cross-domain references)
- **Never reference** other config domains
- Template resolution (looking up a named template and merging values) belongs in the parser

### Parsing Collections

When parsing lists of items, use `mapIndexedNotNull` with `ctx.parse { }`:

```kotlin
fun parseAllowedRedirectUris(
    ctx: ConfigParsingContext,
    uris: List<String>?,
    configKeyPrefix: String
): List<URI>? {
    val childCtx = ctx.child()
    val result = uris?.mapIndexedNotNull { index, uri ->
        childCtx.parse {
            parser.getAbsoluteUriOrThrow(uri, "$configKeyPrefix.allowed-redirect-uris[$index]") { it }
        }
    }
    ctx.merge(childCtx)
    return if (childCtx.hasErrors) null else result
}
```

Use `ctx.child()` to isolate collection errors, then `ctx.merge()` to bubble them up. Include the array index in the
error key: `allowed-redirect-uris[$index]`.

### ConfigParser Methods

The `ConfigParser` singleton provides type-safe parsing methods:

| Method                    | Purpose                     | Returns     | Throws on Missing |
|---------------------------|-----------------------------|-------------|-------------------|
| `getString()`             | Parse optional string       | `String?`   | No                |
| `getStringOrThrow()`      | Parse required string       | `String`    | Yes               |
| `getBoolean()`            | Parse optional boolean      | `Boolean?`  | No                |
| `getBooleanOrThrow()`     | Parse required boolean      | `Boolean`   | Yes               |
| `getInt()`                | Parse optional integer      | `Int?`      | No                |
| `getIntOrThrow()`         | Parse required integer      | `Int`       | Yes               |
| `getDuration()`           | Parse optional duration     | `Duration?` | No                |
| `getDurationOrThrow()`    | Parse required duration     | `Duration`  | Yes               |
| `getUri()`                | Parse optional URI          | `URI?`      | No                |
| `getUriOrThrow()`         | Parse required URI          | `URI`       | Yes               |
| `getAbsoluteUriOrThrow()` | Parse required absolute URI | `URI`       | Yes               |
| `getEnum()`               | Parse optional enum         | `T`         | No (uses default) |
| `getEnumOrThrow()`        | Parse required enum         | `T`         | Yes               |

**Boolean parsing** accepts: `true`, `t`, `yes`, `y`, `false`, `f`, `no`, `n` (case-insensitive)

**Duration parsing** accepts: ISO-8601 format (e.g., `PT15M`, `P2D`) or simple format (e.g., `15m`, `2h`)

**Enum parsing** converts between:

- Enum constant: `MY_ENUM_VALUE`
- Config value: `my-enum-value` (lowercase with hyphens)

## Step 4: Create the Validator

The validator is a `@Singleton` bean responsible for all validation logic. It receives the parsed intermediate
data class and validates both intra-domain constraints and cross-domain references. It returns the final business
models.

```kotlin
package com.sympauthy.config.validation

import com.sympauthy.config.ConfigParsingContext
import com.sympauthy.config.exception.configExceptionOf
import com.sympauthy.config.parsing.ParsedEmailConfig
import jakarta.inject.Singleton

@Singleton
class EmailConfigValidator {
    fun validate(
        ctx: ConfigParsingContext,
        parsed: ParsedEmailConfig
    ) {
        // Example: validate smtp port is in valid range
        val port = parsed.smtpPort
        if (port != null && (port < 1 || port > 65535)) {
            ctx.addError(
                configExceptionOf(
                    "email.smtp-port",
                    "config.email.smtp_port.out_of_range",
                    "port" to port.toString()
                )
            )
        }
    }
}
```

**Key conventions:**

- Annotate the class with `@Singleton`
- Use `ctx.addError()` to accumulate validation errors
- **Intra-domain validation:** value ranges, consistency checks, power-of-2 checks, algorithm compatibility, etc.
- **Cross-domain validation:** audience exists, scope exists, identifier claim is enabled, etc.
- For cross-domain references, accept resolved maps as parameters (e.g., `audiencesById: Map<String, Audience>`)

### Cross-Domain Validation

When a config references another config domain (e.g., a client referencing an audience), the validator receives
the resolved map and checks the reference:

```kotlin
@Singleton
class ClientsConfigValidator {
    fun validate(
        ctx: ConfigParsingContext,
        parsed: List<ParsedClient>,
        audiencesById: Map<String, Audience>
    ): List<Client> {
        return parsed.mapNotNull { client ->
            // Validate audience cross-reference using shared helper
            val audienceId = validateAudienceId(
                ctx, client.audienceId, audiencesById,
                "clients.${client.id}.audience",
                "config.client.audience.not_found"
            )
            // ... build final model
        }
    }
}
```

### Shared Validation Helpers

For validation logic reused across multiple validators (e.g., audience reference checks), use top-level functions
in `com.sympauthy.config.validation`:

```kotlin
package com.sympauthy.config.validation

fun validateAudienceId(
    ctx: ConfigParsingContext,
    audienceId: String?,
    audiencesById: Map<String, Audience>,
    configKey: String,
    notFoundMessageId: String
): String? {
    if (audienceId == null) return null
    if (audienceId !in audiencesById) {
        ctx.addError(
            configExceptionOf(configKey, notFoundMessageId,
                "audience" to audienceId,
                "availableAudiences" to audiencesById.keys.joinToString(", ")
            )
        )
        return null
    }
    return audienceId
}
```

## Step 5: Create the Factory

The factory is a thin orchestration layer. It creates a `ConfigParsingContext`, calls the parser, calls the
validator, and assembles the appropriate config variant.

```kotlin
package com.sympauthy.config.factory

import com.sympauthy.config.ConfigParsingContext
import com.sympauthy.config.model.*
import com.sympauthy.config.parsing.EmailConfigParser
import com.sympauthy.config.properties.EmailConfigurationProperties
import com.sympauthy.config.validation.EmailConfigValidator
import io.micronaut.context.annotation.Factory
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Factory
class EmailConfigFactory(
    @Inject private val emailParser: EmailConfigParser,
    @Inject private val emailValidator: EmailConfigValidator
) {

    @Singleton
    fun provideEmailConfig(
        properties: EmailConfigurationProperties
    ): EmailConfig {
        val ctx = ConfigParsingContext()
        val parsed = emailParser.parse(ctx, properties)

        if (parsed.enabled != true) {
            return DisabledEmailConfig(emptyList())
        }

        emailValidator.validate(ctx, parsed)

        return if (ctx.hasErrors) {
            DisabledEmailConfig(ctx.errors)
        } else {
            EnabledEmailConfig(
                smtpHost = parsed.smtpHost!!,
                smtpPort = parsed.smtpPort!!,
                username = parsed.username!!,
                password = parsed.password!!,
                fromAddress = parsed.fromAddress!!,
                timeout = parsed.timeout!!
            )
        }
    }
}
```

**Key conventions:**

- Annotate class with `@Factory`
- Inject the parser and validator (not `ConfigParser` directly)
- Method annotated with `@Singleton` returns the sealed config type
- Create a `ConfigParsingContext`
- Call `parser.parse(ctx, properties)`
- Call `validator.validate(ctx, parsed)`
- Use `!!` operator only when `ctx.hasErrors` is confirmed false
- Return `Enabled*Config` if no errors, otherwise `Disabled*Config`

### Factories with Cross-Domain Dependencies

When a config depends on other config domains, inject them and pass the resolved data to the validator:

```kotlin
@Factory
class ScopeConfigFactory(
    @Inject private val scopeParser: ScopeConfigParser,
    @Inject private val scopeValidator: ScopeConfigValidator,
    @Inject private val scopeTemplatesConfig: ScopeTemplatesConfig,
    @Inject private val audiencesConfig: AudiencesConfig
) {

    @Singleton
    fun provideScopesConfig(
        propertiesList: List<ScopeConfigurationProperties>
    ): ScopesConfig {
        val enabledTemplatesConfig = scopeTemplatesConfig.orNull()
            ?: return DisabledScopesConfig(emptyList())
        val enabledAudiencesConfig = audiencesConfig as? EnabledAudiencesConfig
            ?: return DisabledScopesConfig(emptyList())

        val ctx = ConfigParsingContext()
        val parsed = scopeParser.parse(ctx, propertiesList, enabledTemplatesConfig.templates)
        val scopes = scopeValidator.validate(
            ctx, parsed, enabledAudiencesConfig.audiences.associateBy { it.id }
        )
        return if (ctx.hasErrors) DisabledScopesConfig(ctx.errors)
        else EnabledScopesConfig(scopes)
    }
}
```

If a dependency is disabled, the factory can return a disabled config immediately without parsing.

## Throwing Configuration Exceptions

When you need to throw a custom validation error:

```kotlin
import com.sympauthy.config.exception.configExceptionOf

throw configExceptionOf(
    "clients.my-client.authorization-flow",
    "config.client.authorization_flow.invalid",
    "flow" to flowId,
    "availableFlows" to availableFlows.joinToString(", ")
)
```

**Key conventions:**

- Include the full configuration key path
- Use a localized message ID (defined in `error_messages.properties`)
- Pass contextual values as key-value pairs for message interpolation

In validators, prefer `ctx.addError(configExceptionOf(...))` over `throw` to continue accumulating errors.

## Complete Example

Here's a complete example for an email configuration:

### 1. Properties (`EmailConfigurationProperties.kt`)

```kotlin
package com.sympauthy.config.properties

import io.micronaut.context.annotation.ConfigurationProperties

@ConfigurationProperties(EMAIL_KEY)
interface EmailConfigurationProperties {
    val enabled: String?
    val smtpHost: String?
    val smtpPort: String?
    val username: String?
    val password: String?
    val fromAddress: String?
    val timeout: String?

    companion object {
        const val EMAIL_KEY = "email"
    }
}
```

### 2. Model (`EmailConfig.kt`)

```kotlin
package com.sympauthy.config.model

import com.sympauthy.config.exception.ConfigurationException
import java.time.Duration

sealed class EmailConfig(
    configurationErrors: List<ConfigurationException>? = null
) : Config(configurationErrors)

data class EnabledEmailConfig(
    val smtpHost: String,
    val smtpPort: Int,
    val username: String,
    val password: String,
    val fromAddress: String,
    val timeout: Duration
) : EmailConfig()

class DisabledEmailConfig(
    configurationErrors: List<ConfigurationException>
) : EmailConfig(configurationErrors)

fun EmailConfig.orThrow(): EnabledEmailConfig {
    return when (this) {
        is EnabledEmailConfig -> this
        is DisabledEmailConfig -> throw this.invalidConfig
    }
}
```

### 3. Parser (`EmailConfigParser.kt`)

```kotlin
package com.sympauthy.config.parsing

import com.sympauthy.config.ConfigParser
import com.sympauthy.config.ConfigParsingContext
import com.sympauthy.config.properties.EmailConfigurationProperties
import com.sympauthy.config.properties.EmailConfigurationProperties.Companion.EMAIL_KEY
import jakarta.inject.Singleton
import java.time.Duration

data class ParsedEmailConfig(
    val enabled: Boolean?,
    val smtpHost: String?,
    val smtpPort: Int?,
    val username: String?,
    val password: String?,
    val fromAddress: String?,
    val timeout: Duration?
)

@Singleton
class EmailConfigParser(
    private val parser: ConfigParser
) {
    fun parse(
        ctx: ConfigParsingContext,
        properties: EmailConfigurationProperties
    ): ParsedEmailConfig {
        val enabled = ctx.parse {
            parser.getBoolean(properties, "$EMAIL_KEY.enabled", EmailConfigurationProperties::enabled)
        } ?: false
        val smtpHost = ctx.parse {
            parser.getStringOrThrow(properties, "$EMAIL_KEY.smtp-host", EmailConfigurationProperties::smtpHost)
        }
        val smtpPort = ctx.parse {
            parser.getIntOrThrow(properties, "$EMAIL_KEY.smtp-port", EmailConfigurationProperties::smtpPort)
        }
        val username = ctx.parse {
            parser.getStringOrThrow(properties, "$EMAIL_KEY.username", EmailConfigurationProperties::username)
        }
        val password = ctx.parse {
            parser.getStringOrThrow(properties, "$EMAIL_KEY.password", EmailConfigurationProperties::password)
        }
        val fromAddress = ctx.parse {
            parser.getStringOrThrow(properties, "$EMAIL_KEY.from-address", EmailConfigurationProperties::fromAddress)
        }
        val timeout = ctx.parse {
            parser.getDurationOrThrow(properties, "$EMAIL_KEY.timeout", EmailConfigurationProperties::timeout)
        }
        return ParsedEmailConfig(
            enabled = enabled,
            smtpHost = smtpHost,
            smtpPort = smtpPort,
            username = username,
            password = password,
            fromAddress = fromAddress,
            timeout = timeout
        )
    }
}
```

### 4. Validator (`EmailConfigValidator.kt`)

```kotlin
package com.sympauthy.config.validation

import com.sympauthy.config.ConfigParsingContext
import com.sympauthy.config.parsing.ParsedEmailConfig
import jakarta.inject.Singleton

@Singleton
class EmailConfigValidator {
    fun validate(
        ctx: ConfigParsingContext,
        parsed: ParsedEmailConfig
    ) {
        // Add validation rules here as needed.
        // Example: ctx.addError(configExceptionOf(...))
    }
}
```

### 5. Factory (`EmailConfigFactory.kt`)

```kotlin
package com.sympauthy.config.factory

import com.sympauthy.config.ConfigParsingContext
import com.sympauthy.config.model.*
import com.sympauthy.config.parsing.EmailConfigParser
import com.sympauthy.config.properties.EmailConfigurationProperties
import com.sympauthy.config.validation.EmailConfigValidator
import io.micronaut.context.annotation.Factory
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Factory
class EmailConfigFactory(
    @Inject private val emailParser: EmailConfigParser,
    @Inject private val emailValidator: EmailConfigValidator
) {

    @Singleton
    fun provideEmailConfig(
        properties: EmailConfigurationProperties
    ): EmailConfig {
        val ctx = ConfigParsingContext()
        val parsed = emailParser.parse(ctx, properties)

        if (parsed.enabled != true) {
            return DisabledEmailConfig(emptyList())
        }

        emailValidator.validate(ctx, parsed)

        return if (ctx.hasErrors) {
            DisabledEmailConfig(ctx.errors)
        } else {
            EnabledEmailConfig(
                smtpHost = parsed.smtpHost!!,
                smtpPort = parsed.smtpPort!!,
                username = parsed.username!!,
                password = parsed.password!!,
                fromAddress = parsed.fromAddress!!,
                timeout = parsed.timeout!!
            )
        }
    }
}
```

### 6. YAML Configuration

```yaml
email:
  enabled: true
  smtp-host: "smtp.example.com"
  smtp-port: 587
  username: "noreply@example.com"
  password: "secret"
  from-address: "noreply@example.com"
  timeout: "30s"
```

### 7. Usage

```kotlin
@Singleton
class EmailService(
    @Inject private val emailConfig: EmailConfig
) {
    suspend fun sendEmail(to: String, subject: String, body: String) {
        val config = emailConfig.orThrow()

        // Use type-safe, non-nullable configuration
        val host = config.smtpHost
        val port = config.smtpPort
        // ...
    }
}
```

## Summary

To create a new configuration in SympAuthy:

1. **Create properties class** in `com.sympauthy.config.properties`
    - Use interface for simple configs, class for `@EachProperty`
    - All properties are nullable strings
    - Define configuration key constant

2. **Create model class** in `com.sympauthy.config.model`
    - Sealed class with Enabled/Disabled variants
    - Enabled variant has properly typed, non-nullable fields
    - Add `.orThrow()` extension function

3. **Create parser** in `com.sympauthy.config.parsing`
    - `@Singleton` bean, injects `ConfigParser`
    - Define a `ParsedXxxConfig` data class with nullable fields
    - Use `ctx.parse { }` to wrap every `ConfigParser` call
    - Only type conversion and template resolution — no validation, no cross-domain references

4. **Create validator** in `com.sympauthy.config.validation`
    - `@Singleton` bean
    - Use `ctx.addError()` for validation errors
    - Validate intra-domain constraints and cross-domain references
    - Accept resolved maps for cross-domain data (e.g., `audiencesById: Map<String, Audience>`)

5. **Create factory** in `com.sympauthy.config.factory`
    - `@Factory` bean, injects parser and validator
    - Thin orchestration: create `ConfigParsingContext`, call parser, call validator, assemble result
    - Return appropriate Enabled/Disabled variant

This pattern ensures early validation, comprehensive error reporting, clean separation of concerns, and type-safe
configuration access throughout the application.