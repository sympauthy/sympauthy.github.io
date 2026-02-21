# How to write a configuration

Configuration management in SympAuthy uses a custom system built on top of Micronaut's `@ConfigurationProperties` to
provide early validation, explicit error messages, and type-safe configuration models. This guide explains how to create
new configuration components following SympAuthy's three-layer architecture: properties, factories, and models.

## Architecture Overview

SympAuthy's configuration system consists of three layers:

1. **Properties Layer** (`com.sympauthy.config.properties`) - Raw string-based configuration properties from Micronaut
2. **Factory Layer** (`com.sympauthy.config.factory`) - Parsing, validation, and transformation logic
3. **Model Layer** (`com.sympauthy.config.model`) - Type-safe, validated configuration models

This architecture ensures that:

- Configuration errors are caught at server startup (not lazily)
- All errors are reported together (not just the first one)
- Invalid configurations prevent the server from starting
- Consumers get type-safe, non-nullable configuration objects

## Step 1: Create the Properties Class

The properties class defines the structure of your configuration as it appears in the `application.yml` file. All
properties must be nullable strings (or collections of strings) to enable explicit validation in the factory layer.

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

## Step 3: Create the Factory

The factory is responsible for parsing, validating, and building the configuration model. It uses the `ConfigParser`
singleton to convert string properties into typed values.

```kotlin
package com.sympauthy.config.factory

import com.sympauthy.config.ConfigParser
import com.sympauthy.config.exception.ConfigurationException
import com.sympauthy.config.model.*
import com.sympauthy.config.properties.AuthConfigurationProperties
import com.sympauthy.config.properties.AuthConfigurationProperties.Companion.AUTH_KEY
import io.micronaut.context.annotation.Factory
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Factory
class AuthConfigFactory(
    @Inject private val parser: ConfigParser
) {

    @Singleton
    fun provideAuthConfig(
        properties: AuthConfigurationProperties
    ): AuthConfig {
        val errors = mutableListOf<ConfigurationException>()

        // Parse required string
        val issuer = try {
            parser.getStringOrThrow(
                properties,
                "$AUTH_KEY.issuer",
                AuthConfigurationProperties::issuer
            )
        } catch (e: ConfigurationException) {
            errors.add(e)
            null
        }

        // Parse optional string
        val audience = try {
            parser.getString(
                properties,
                "$AUTH_KEY.audience",
                AuthConfigurationProperties::audience
            )
        } catch (e: ConfigurationException) {
            errors.add(e)
            null
        }

        // Return appropriate variant
        return if (errors.isEmpty()) {
            EnabledAuthConfig(
                issuer = issuer!!,
                audience = audience
            )
        } else {
            DisabledAuthConfig(errors)
        }
    }
}
```

**Key conventions:**

- Annotate class with `@Factory`
- Inject `ConfigParser`
- Method annotated with `@Singleton` returns the sealed config type
- Create a mutable error list
- Parse each property in a try-catch block
- Add errors to the list instead of failing immediately
- Use `!!` operator only when errors list is confirmed empty
- Return `Enabled*Config` if no errors, otherwise `Disabled*Config`

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

## Validating Collections

When parsing lists or arrays, validate each item and collect all errors:

```kotlin
private fun getAllowedRedirectUris(
    properties: ClientConfigurationProperties,
    allowedRedirectUris: List<String>?,
    errors: MutableList<ConfigurationException>
): List<URI>? {
    val listErrors = mutableListOf<ConfigurationException>()

    val uris = allowedRedirectUris?.mapIndexedNotNull { index, uri ->
        try {
            parser.getAbsoluteUriOrThrow(
                uri,
                "$CLIENTS_KEY.${properties.id}.allowed-redirect-uris[$index]"
            ) { it }
        } catch (e: ConfigurationException) {
            listErrors.add(e)
            null
        }
    }

    return if (listErrors.isEmpty()) {
        uris
    } else {
        errors.addAll(listErrors)
        null
    }
}
```

**Key conventions:**

- Use `mapIndexedNotNull` to process items
- Include array index in error key: `allowed-redirect-uris[$index]`
- Create a separate error list for the collection
- Return null if any errors occurred

## Handling Optional Features

For features that can be disabled, check an `enabled` flag first:

```kotlin
@Singleton
fun provideEmailConfig(
    properties: EmailConfigurationProperties
): EmailConfig {
    val errors = mutableListOf<ConfigurationException>()

    // Check if feature is enabled
    val enabled = try {
        parser.getBoolean(
            properties,
            "$EMAIL_KEY.enabled",
            EmailConfigurationProperties::enabled
        ) ?: false
    } catch (e: ConfigurationException) {
        errors.add(e)
        false
    }

    if (!enabled) {
        return DisabledEmailConfig(emptyList())
    }

    // Continue with required field validation...
}
```

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

### 3. Factory (`EmailConfigFactory.kt`)

```kotlin
package com.sympauthy.config.factory

import com.sympauthy.config.ConfigParser
import com.sympauthy.config.exception.ConfigurationException
import com.sympauthy.config.model.*
import com.sympauthy.config.properties.EmailConfigurationProperties
import com.sympauthy.config.properties.EmailConfigurationProperties.Companion.EMAIL_KEY
import io.micronaut.context.annotation.Factory
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Factory
class EmailConfigFactory(
    @Inject private val parser: ConfigParser
) {

    @Singleton
    fun provideEmailConfig(
        properties: EmailConfigurationProperties
    ): EmailConfig {
        val errors = mutableListOf<ConfigurationException>()

        val enabled = try {
            parser.getBoolean(
                properties,
                "$EMAIL_KEY.enabled",
                EmailConfigurationProperties::enabled
            ) ?: false
        } catch (e: ConfigurationException) {
            errors.add(e)
            false
        }

        if (!enabled) {
            return DisabledEmailConfig(emptyList())
        }

        val smtpHost = try {
            parser.getStringOrThrow(
                properties,
                "$EMAIL_KEY.smtp-host",
                EmailConfigurationProperties::smtpHost
            )
        } catch (e: ConfigurationException) {
            errors.add(e)
            null
        }

        val smtpPort = try {
            parser.getIntOrThrow(
                properties,
                "$EMAIL_KEY.smtp-port",
                EmailConfigurationProperties::smtpPort
            )
        } catch (e: ConfigurationException) {
            errors.add(e)
            null
        }

        val username = try {
            parser.getStringOrThrow(
                properties,
                "$EMAIL_KEY.username",
                EmailConfigurationProperties::username
            )
        } catch (e: ConfigurationException) {
            errors.add(e)
            null
        }

        val password = try {
            parser.getStringOrThrow(
                properties,
                "$EMAIL_KEY.password",
                EmailConfigurationProperties::password
            )
        } catch (e: ConfigurationException) {
            errors.add(e)
            null
        }

        val fromAddress = try {
            parser.getStringOrThrow(
                properties,
                "$EMAIL_KEY.from-address",
                EmailConfigurationProperties::fromAddress
            )
        } catch (e: ConfigurationException) {
            errors.add(e)
            null
        }

        val timeout = try {
            parser.getDurationOrThrow(
                properties,
                "$EMAIL_KEY.timeout",
                EmailConfigurationProperties::timeout
            )
        } catch (e: ConfigurationException) {
            errors.add(e)
            null
        }

        return if (errors.isEmpty()) {
            EnabledEmailConfig(
                smtpHost = smtpHost!!,
                smtpPort = smtpPort!!,
                username = username!!,
                password = password!!,
                fromAddress = fromAddress!!,
                timeout = timeout!!
            )
        } else {
            DisabledEmailConfig(errors)
        }
    }
}
```

### 4. YAML Configuration

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

### 5. Usage

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

3. **Create factory** in `com.sympauthy.config.factory`
    - Use `ConfigParser` to parse and validate
    - Collect all errors before failing
    - Return appropriate variant

This pattern ensures early validation, comprehensive error reporting, and type-safe configuration access throughout the
application.


