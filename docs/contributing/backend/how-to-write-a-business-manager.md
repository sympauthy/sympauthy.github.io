# How to write a business manager

Business managers are the core of SympAuthy's business logic layer. They sit between REST controllers and data
repositories, encapsulating domain rules, validation, and orchestration. This guide explains how to create a new
business manager following SympAuthy's conventions.

## Architecture Overview

SympAuthy follows a layered architecture where each layer has a clear responsibility:

```
Controllers (com.sympauthy.api)         → HTTP handling, request/response mapping
    ↓
Managers (com.sympauthy.business)       → Business logic, validation, orchestration
    ↓
Repositories (com.sympauthy.data)       → Data access
    ↓
Database
```

Managers are the only layer that should contain business logic. Controllers delegate to managers, and managers
delegate to repositories for persistence. Managers never deal with HTTP concerns (status codes, headers, request
parsing).

## Step 1: Create the Business Model

Before writing a manager, define the business model it will operate on. Business models are simple data classes
located in `com.sympauthy.business.model`.

```kotlin
package com.sympauthy.business.model.user

import java.time.LocalDateTime
import java.util.*

data class User(
    val id: UUID,
    val status: UserStatus,
    val creationDate: LocalDateTime
)
```

**Key conventions:**

- Use **data classes** with immutable (`val`) properties
- Use properly typed fields (no raw strings for UUIDs, dates, enums, etc.)
- Business models are distinct from database entities — they represent the domain, not the schema

## Step 2: Create the Mapper

Mappers convert between database entities and business models. They are defined as MapStruct interfaces in
`com.sympauthy.business.mapper`.

```kotlin
package com.sympauthy.business.mapper

import com.sympauthy.business.mapper.config.ToBusinessMapperConfig
import com.sympauthy.business.model.user.User
import com.sympauthy.data.model.UserEntity
import org.mapstruct.Mapper

@Mapper(
    config = ToBusinessMapperConfig::class
)
interface UserMapper {

    fun toUser(entity: UserEntity): User
}
```

**Key conventions:**

- Use `ToBusinessMapperConfig` as the mapper config
- Name the mapping method `to<BusinessModel>` (e.g., `toUser`, `toConsent`)
- Mappers are interfaces — MapStruct generates the implementation at compile time

## Step 3: Create the Manager

### Basic Structure

A manager is a `@Singleton` class in the `com.sympauthy.business.manager` package. Dependencies are injected via
the constructor.

```kotlin
package com.sympauthy.business.manager.user

import com.sympauthy.business.exception.businessExceptionOf
import com.sympauthy.business.mapper.UserMapper
import com.sympauthy.business.model.user.User
import com.sympauthy.data.repository.UserRepository
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.*

@Singleton
open class UserManager(
    @Inject private val userRepository: UserRepository,
    @Inject private val userMapper: UserMapper
) {

    suspend fun findByIdOrNull(id: UUID?): User? {
        return id?.let { userRepository.findById(it) }
            ?.let(userMapper::toUser)
    }

    suspend fun findById(id: UUID?): User {
        return findByIdOrNull(id) ?: throw businessExceptionOf(
            detailsId = "user.not_found",
            "userId" to "$id"
        )
    }
}
```

**Key conventions:**

- Annotate with `@Singleton`
- Use `@Inject` on constructor parameters
- All dependencies are `private val`
- All methods are `suspend` (coroutine-based)
- Mark the class `open` if any method uses `@Transactional` (required for Micronaut proxying)

### Late-Initialized Dependencies

When circular dependencies occur, use `@Inject` with `lateinit var` on a field instead of the constructor:

```kotlin
@Singleton
open class UserManager(
    @Inject private val userRepository: UserRepository,
    @Inject private val userMapper: UserMapper
) {

    @Inject
    private lateinit var claimValueMapper: ClaimValueMapper
}
```

Use this sparingly — prefer constructor injection when possible.

## Method Conventions

### Naming

Managers follow strict naming conventions that communicate the method's behavior:

| Pattern | Returns | Behavior |
|---------|---------|----------|
| `find*OrNull()` | `T?` | Returns null if not found |
| `find*()` | `T` | Throws `BusinessException` if not found |
| `list*()` | `List<T>` | Returns a collection (empty if none) |
| `create*()` | `T` | Creates and persists a new entity |
| `save*()` | `T` | Saves or updates an entity |
| `parse*()` | `T` | Parses and validates untrusted input |
| `mark*()` | `T` | Transitions entity state |
| `revoke*()` | `Unit` or `T` | Revokes or cancels an entity |

Always provide both `find*OrNull()` and `find*()` variants when a lookup may fail. The non-null variant should
delegate to the nullable one and throw a `BusinessException`:

```kotlin
suspend fun findByIdOrNull(id: UUID?): User? {
    return id?.let { userRepository.findById(it) }
        ?.let(userMapper::toUser)
}

suspend fun findById(id: UUID?): User {
    return findByIdOrNull(id) ?: throw businessExceptionOf(
        detailsId = "user.not_found",
        "userId" to "$id"
    )
}
```

### Visibility

Method visibility communicates the intended audience:

| Modifier | When to use |
|----------|-------------|
| *(public)* | Method is part of the manager's API, called by controllers or other managers |
| `internal` | Helper logic, intermediate steps, or implementation details |
| `internal open` | Internal method that requires `@Transactional` |
| `open` | Public method that requires `@Transactional` |

**Public methods** are the manager's API — they are called by controllers and other managers:

```kotlin
suspend fun findClientByIdOrNull(id: String): Client? {
    return listClients().firstOrNull { it.id == id }
}
```

**Internal methods** are implementation details that should not be called from outside the manager:

```kotlin
internal fun shouldRefreshToken(
    refreshToken: AuthenticationToken,
    accessToken: EncodedAuthenticationToken
): Boolean {
    val refreshExpiration = refreshToken.expirationDate ?: return false
    val accessExpiration = accessToken.expirationDate ?: return false
    return refreshExpiration.isBefore(accessExpiration)
}
```

**Internal open methods** combine internal visibility with `@Transactional`. The `open` modifier is required for
Micronaut to create a proxy for transaction management:

```kotlin
@Transactional
internal open suspend fun createUser(): User {
    val entity = UserEntity(
        status = UserStatus.ENABLED.name,
        creationDate = now()
    )
    val savedEntity = userRepository.save(entity)
    return userMapper.toUser(savedEntity)
}
```

### Transactions

Methods that modify multiple database records within a single operation should use `@Transactional`
from `io.micronaut.transaction.annotation`:

```kotlin
@Transactional
open suspend fun revokeConsent(
    consent: Consent,
    revokedBy: ConsentRevokedBy,
    revokedById: UUID
) {
    consentRepository.updateRevokedAt(...)
    tokenRepository.updateRevokedAtByUserIdAndClientId(...)
}
```

Both the class and the transactional method must be `open` (Micronaut creates a proxy subclass for transaction
management).

## Error Handling

Managers throw `BusinessException` using utility functions. See
[How to throw an exception](how-to-throw-an-exception) for the full guide on error codes and message conventions.

```kotlin
// Unrecoverable error — the user cannot fix this
throw businessExceptionOf(
    detailsId = "client.invalid_client_id",
    values = arrayOf("clientId" to id)
)

// Recoverable error — the user can modify their request and retry
throw recoverableBusinessExceptionOf(
    detailsId = "password.incorrect",
    descriptionId = "description.password.incorrect"
)
```

Error code format: `<package>.(manager).(method).<description>`

## Injecting Configuration

Managers that depend on configuration inject the sealed config type and call `.orThrow()` to unwrap it:

```kotlin
@Singleton
class ClientManager(
    @Inject private val uncheckedClientsConfig: Flow<ClientsConfig>
) {

    suspend fun listClients(): List<Client> {
        return uncheckedClientsConfig.firstOrNull()?.orThrow()?.clients ?: emptyList()
    }
}
```

See [How to write a configuration](how-to-write-a-configuration) for details on the configuration system.

## Composing Managers

Managers can depend on other managers. Inject them through the constructor like any other dependency:

```kotlin
@Singleton
class ScopeManager(
    @Inject private val uncheckedScopesConfig: ScopesConfig,
    @Inject private val claimManager: ClaimManager
) {

    suspend fun parseRequestedScopes(client: Client, uncheckedScopes: String?): List<Scope> {
        val availableScopes = listScopes()
        // Validate scopes against claims from claimManager...
    }
}
```

Keep each manager focused on a single domain. When logic spans multiple domains, compose managers rather than
merging responsibilities into a single class.

## Documentation

### Class-Level KDoc

Document the manager class when it has complex responsibilities, manages a lifecycle, or implements a
specification. Describe what the manager is responsible for and any important invariants:

```kotlin
/**
 * Manages user consents granted to clients during authorization flows.
 *
 * A consent records which scopes a user has authorized for a given client. Only one active (non-revoked) consent
 * may exist per user+client pair at any time. When a new consent is granted for an existing pair, the previous
 * consent is automatically revoked and replaced.
 *
 * Revoking a consent also cascades to all refresh tokens issued for that user+client pair, effectively
 * preventing the client from obtaining new access tokens on behalf of the user.
 */
@Singleton
open class ConsentManager(...)
```

When implementing an RFC or specification, include links:

```kotlin
/**
 * Manager supporting the lifecycle of web-based interactive authorization flows:
 * - [Authorization Code Grant](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)
 * - [Implicit Grant](https://datatracker.ietf.org/doc/html/rfc6749#section-4.2)
 */
@Singleton
class WebAuthorizationFlowManager(...)
```

### Method-Level KDoc

Document all public methods. Use `[parameterName]` to reference parameters and `[Type]` to cross-reference
types. Include the error code when a method throws a `BusinessException`:

```kotlin
/**
 * Return the [Client] identified by [id] or throw a non-recoverable business exception
 * ```client.invalid_client_id```.
 */
suspend fun findClientById(id: String): Client
```

For methods with cascading effects or multiple error conditions, document them explicitly:

```kotlin
/**
 * Decodes and verify the [encodedRefreshToken] and issues a new access token.
 *
 * Additionally, a new refresh token may be issued if the refresh token expires
 * before the expiration of the new access token.
 *
 * Throws a [LocalizedException] if the refresh token validation fails:
 * - one of the validation of [JwtManager.decodeAndVerify].
 * - the [client] does not match the one we have issued the token to.
 */
@Transactional
open suspend fun refreshToken(
    client: Client,
    encodedRefreshToken: String
): List<EncodedAuthenticationToken>
```

When implementing RFC behavior, document compliance notes:

```kotlin
/**
 * Per RFC 7009, this method does not throw if the token is invalid, expired, already revoked, or not found.
 * Only tokens owned by [client] are revoked.
 */
@Transactional
open suspend fun revokeTokenByEncodedToken(
    client: Client,
    encodedToken: String,
    tokenTypeHint: String?
)
```

Internal methods only need documentation when their behavior is non-obvious. Simple helpers with clear names
can be left undocumented.

## Unit Tests

### Test Structure

Tests use **JUnit 5** with **MockK** for mocking and `kotlinx.coroutines.test.runTest` for coroutine support.
Test files mirror the manager's package structure under `src/test/kotlin/`.

```kotlin
@ExtendWith(MockKExtension::class)
class UserManagerTest {

    @MockK
    lateinit var collectedClaimRepository: CollectedClaimRepository

    @MockK
    lateinit var userRepository: UserRepository

    @MockK
    lateinit var userMapper: UserMapper

    @SpyK
    @InjectMockKs
    lateinit var manager: UserManager
}
```

**Key conventions:**

- `@ExtendWith(MockKExtension::class)` — enables MockK annotations
- `@MockK` — creates a mock for each dependency (repositories, mappers, other managers)
- `@SpyK` + `@InjectMockKs` — creates a spy of the manager under test, allowing internal methods to be stubbed
  while keeping real behavior for the methods being tested
- Add `@MockKExtension.CheckUnnecessaryStub` to enforce strict stub verification

For simpler managers without internal methods to stub, construct the manager directly in each test instead of
using `@SpyK`:

```kotlin
@Test
fun `listClients - Return list of clients from config`() = runTest {
    val client = mockk<Client> { every { id } returns "client1" }
    val config = EnabledClientsConfig(clients = listOf(client))

    val clientManager = ClientManager(flowOf<ClientsConfig>(config))

    val result = clientManager.listClients()
    assertEquals(1, result.size)
}
```

### Test Method Naming

Test methods use backtick-enclosed names following the pattern `methodName - description of expected behavior`:

```kotlin
fun `findByIdOrNull - Return user when found`()
fun `findByIdOrNull - Return null when user not found`()
fun `findById - Throw exception when user not found`()
fun `createUser - Create and return new user with ENABLED status`()
```

### Writing Tests

Wrap all test bodies in `runTest`. Use `coEvery` for stubbing suspend functions and `every` for regular
functions:

```kotlin
@Test
fun `findByIdOrNull - Return user when found`() = runTest {
    val userId = UUID.randomUUID()
    val entity = mockk<UserEntity>()
    val user = mockk<User>()

    coEvery { userRepository.findById(userId) } returns entity
    every { userMapper.toUser(entity) } returns user

    val result = manager.findByIdOrNull(userId)

    assertSame(user, result)
}
```

### Capturing Arguments

Use `slot<Type>()` to capture arguments passed to mocked methods for assertion:

```kotlin
@Test
fun `createUser - Create and return new user with ENABLED status`() = runTest {
    val entitySlot = slot<UserEntity>()
    val savedEntity = mockk<UserEntity>()
    val user = mockk<User>()

    coEvery { userRepository.save(capture(entitySlot)) } answers { savedEntity }
    every { userMapper.toUser(savedEntity) } returns user

    val result = manager.createUser()

    assertSame(user, result)
    assertEquals(UserStatus.ENABLED.name, entitySlot.captured.status)
    assertNotNull(entitySlot.captured.creationDate)
}
```

### Verifying Interactions

Use `coVerify` to assert that a mock was (or was not) called:

```kotlin
coVerify(exactly = 0) { tokenRepository.updateRevokedAt(any(), any(), any(), any()) }
coVerify(exactly = 1) { consentRepository.save(any()) }
```

### Testing Business Exceptions

Use the `coAssertThrowsBusinessException` utility from `com.sympauthy.business.manager.util` to assert that a
method throws a `BusinessException` with a specific error code:

```kotlin
@Test
fun `findById - Throw exception when user not found`() = runTest {
    coEvery { userRepository.findById(any()) } returns null

    coAssertThrowsBusinessException("user.not_found") {
        manager.findById(UUID.randomUUID())
    }
}
```

## Complete Example

Here is a complete example for a consent manager that demonstrates all the conventions described above:
repository access, mappers, visibility modifiers, transactions, KDoc, and unit tests.

### 1. Business Model (`Consent.kt`)

```kotlin
package com.sympauthy.business.model.oauth2

import java.time.LocalDateTime
import java.util.*

data class Consent(
    val id: UUID,
    val userId: UUID,
    val clientId: String,
    val scopes: List<String>,
    val consentedAt: LocalDateTime,
    val revokedAt: LocalDateTime?
)
```

### 2. Mapper (`ConsentMapper.kt`)

```kotlin
package com.sympauthy.business.mapper

import com.sympauthy.business.mapper.config.ToBusinessMapperConfig
import com.sympauthy.business.model.oauth2.Consent
import com.sympauthy.data.model.ConsentEntity
import org.mapstruct.Mapper

@Mapper(
    config = ToBusinessMapperConfig::class
)
interface ConsentMapper {

    fun toConsent(entity: ConsentEntity): Consent
}
```

### 3. Manager (`ConsentManager.kt`)

```kotlin
package com.sympauthy.business.manager.consent

import com.sympauthy.business.mapper.ConsentMapper
import com.sympauthy.business.model.oauth2.Consent
import com.sympauthy.business.model.oauth2.ConsentRevokedBy
import com.sympauthy.business.model.oauth2.TokenRevokedBy
import com.sympauthy.data.model.ConsentEntity
import com.sympauthy.data.repository.AuthenticationTokenRepository
import com.sympauthy.data.repository.ConsentRepository
import io.micronaut.transaction.annotation.Transactional
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.time.LocalDateTime
import java.util.*

/**
 * Manages user consents granted to clients during authorization flows.
 *
 * A consent records which scopes a user has authorized for a given client. Only one active (non-revoked) consent
 * may exist per user+client pair at any time. When a new consent is granted for an existing pair, the previous
 * consent is automatically revoked and replaced.
 *
 * Revoking a consent also cascades to all refresh tokens issued for that user+client pair, effectively
 * preventing the client from obtaining new access tokens on behalf of the user.
 *
 * Consents only apply to user-facing flows (not client_credentials).
 */
@Singleton
open class ConsentManager(
    @Inject private val consentRepository: ConsentRepository,
    @Inject private val tokenRepository: AuthenticationTokenRepository,
    @Inject private val consentMapper: ConsentMapper
) {

    /**
     * Save a granted consent for the given [userId] and [clientId] with the given [scopes].
     * If an active consent already exists for this user+client pair, it is revoked and replaced.
     */
    @Transactional
    open suspend fun saveGrantedConsent(
        userId: UUID,
        clientId: String,
        scopes: List<String>
    ): Consent {
        revokeExistingConsent(userId, clientId)

        val entity = ConsentEntity(
            userId = userId,
            clientId = clientId,
            scopes = scopes.toTypedArray(),
            consentedAt = LocalDateTime.now()
        )
        val savedEntity = consentRepository.save(entity)
        return consentMapper.toConsent(savedEntity)
    }

    /**
     * Find the active (non-revoked) consent for the given [userId] and [clientId], or null if none exists.
     */
    suspend fun findActiveConsentOrNull(userId: UUID, clientId: String): Consent? {
        return consentRepository
            .findByUserIdAndClientIdAndRevokedAtIsNull(userId, clientId)
            ?.let(consentMapper::toConsent)
    }

    /**
     * Find all active (non-revoked) consents for the given [userId].
     */
    suspend fun findActiveConsentsByUser(userId: UUID): List<Consent> {
        return consentRepository.findByUserIdAndRevokedAtIsNull(userId)
            .map(consentMapper::toConsent)
    }

    /**
     * Revoke the given [consent] and all associated refresh tokens for this user+client pair.
     */
    @Transactional
    open suspend fun revokeConsent(
        consent: Consent,
        revokedBy: ConsentRevokedBy,
        revokedById: UUID
    ) {
        val updatedCount = consentRepository.updateRevokedAt(
            id = consent.id,
            revokedAt = LocalDateTime.now(),
            revokedBy = revokedBy.name,
            revokedById = revokedById
        )
        // Cascade: revoke all refresh tokens for this user+client pair
        if (updatedCount > 0) {
            tokenRepository.updateRevokedAtByUserIdAndClientId(
                userId = consent.userId,
                clientId = consent.clientId,
                revokedAt = LocalDateTime.now(),
                revokedBy = TokenRevokedBy.CONSENT_REVOKED.name,
                revokedById = revokedById
            )
        }
    }

    /**
     * Revoke the existing active consent for the given [userId] and [clientId], if any.
     */
    internal suspend fun revokeExistingConsent(userId: UUID, clientId: String) {
        val existingConsent = consentRepository
            .findByUserIdAndClientIdAndRevokedAtIsNull(userId, clientId)
        if (existingConsent != null) {
            consentRepository.updateRevokedAt(
                id = existingConsent.id!!,
                revokedAt = LocalDateTime.now(),
                revokedBy = ConsentRevokedBy.USER.name,
                revokedById = userId
            )
        }
    }
}
```

### 4. Unit Test (`ConsentManagerTest.kt`)

```kotlin
package com.sympauthy.business.manager.consent

import com.sympauthy.business.mapper.ConsentMapper
import com.sympauthy.business.model.oauth2.Consent
import com.sympauthy.business.model.oauth2.ConsentRevokedBy
import com.sympauthy.business.model.oauth2.TokenRevokedBy
import com.sympauthy.data.model.ConsentEntity
import com.sympauthy.data.repository.AuthenticationTokenRepository
import com.sympauthy.data.repository.ConsentRepository
import io.mockk.*
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.MockK
import io.mockk.impl.annotations.SpyK
import io.mockk.junit5.MockKExtension
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDateTime
import java.util.*

@ExtendWith(MockKExtension::class)
@MockKExtension.CheckUnnecessaryStub
class ConsentManagerTest {

    @MockK
    lateinit var consentRepository: ConsentRepository

    @MockK
    lateinit var tokenRepository: AuthenticationTokenRepository

    @MockK
    lateinit var consentMapper: ConsentMapper

    @SpyK
    @InjectMockKs
    lateinit var manager: ConsentManager

    @Test
    fun `findActiveConsentOrNull - Return consent when found`() = runTest {
        val userId = UUID.randomUUID()
        val clientId = "my-client"
        val entity = mockk<ConsentEntity>()
        val consent = mockk<Consent>()

        coEvery {
            consentRepository.findByUserIdAndClientIdAndRevokedAtIsNull(userId, clientId)
        } returns entity
        every { consentMapper.toConsent(entity) } returns consent

        val result = manager.findActiveConsentOrNull(userId, clientId)

        assertSame(consent, result)
    }

    @Test
    fun `findActiveConsentOrNull - Return null when no active consent`() = runTest {
        val userId = UUID.randomUUID()

        coEvery {
            consentRepository.findByUserIdAndClientIdAndRevokedAtIsNull(userId, "my-client")
        } returns null

        val result = manager.findActiveConsentOrNull(userId, "my-client")

        assertNull(result)
    }

    @Test
    fun `revokeConsent - Revoke consent and cascade to tokens`() = runTest {
        val consent = mockk<Consent>()
        val consentId = UUID.randomUUID()
        val userId = UUID.randomUUID()
        val revokedById = UUID.randomUUID()

        every { consent.id } returns consentId
        every { consent.userId } returns userId
        every { consent.clientId } returns "my-client"
        coEvery { consentRepository.updateRevokedAt(consentId, any(), any(), any()) } returns 1
        coEvery {
            tokenRepository.updateRevokedAtByUserIdAndClientId(userId, "my-client", any(), any(), any())
        } returns 2

        manager.revokeConsent(consent, ConsentRevokedBy.USER, revokedById)

        coVerify(exactly = 1) { consentRepository.updateRevokedAt(consentId, any(), any(), any()) }
        coVerify(exactly = 1) {
            tokenRepository.updateRevokedAtByUserIdAndClientId(userId, "my-client", any(), any(), any())
        }
    }

    @Test
    fun `revokeConsent - Do not cascade to tokens when consent was already revoked`() = runTest {
        val consent = mockk<Consent>()

        every { consent.id } returns UUID.randomUUID()
        coEvery { consentRepository.updateRevokedAt(any(), any(), any(), any()) } returns 0

        manager.revokeConsent(consent, ConsentRevokedBy.USER, UUID.randomUUID())

        coVerify(exactly = 0) {
            tokenRepository.updateRevokedAtByUserIdAndClientId(any(), any(), any(), any(), any())
        }
    }
}
```

## Summary

To create a new business manager in SympAuthy:

1. **Create the business model** in `com.sympauthy.business.model`
    - Data class with typed, immutable properties

2. **Create the mapper** in `com.sympauthy.business.mapper`
    - MapStruct interface with `ToBusinessMapperConfig`
    - Method named `to<Model>`

3. **Create the manager** in `com.sympauthy.business.manager`
    - `@Singleton` class with constructor-injected dependencies
    - All methods are `suspend`
    - Follow naming conventions (`find*OrNull`, `find*`, `list*`, `create*`, etc.)
    - Use visibility modifiers to separate API from implementation (`internal` for helpers)
    - Use `@Transactional` + `open` for multi-write operations
    - Document all public methods with KDoc
    - Throw `BusinessException` for business rule violations
    - Keep the manager focused on a single domain

4. **Create unit tests** in `src/test/kotlin/` mirroring the manager's package
    - Use MockK with `@SpyK` + `@InjectMockKs`
    - Name tests with `` `methodName - expected behavior` ``
    - Wrap test bodies in `runTest`
    - Use `coAssertThrowsBusinessException` for error cases
