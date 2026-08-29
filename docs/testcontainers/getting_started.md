# Getting started

## Installation

The library is published to **GitHub Packages** at
`https://maven.pkg.github.com/sympauthy/testcontainers-sympauthy`. It is a test-only dependency, and
the only dependency you inherit is Testcontainers itself (the JSON parser used internally is shaded).

::: warning
Even though the package is public, GitHub's Maven registry requires authentication for every read.
You need a [personal access token](https://github.com/settings/tokens) with the `read:packages`
scope (classic token), supplied as the password in the snippets below.
:::

### Gradle (Kotlin DSL)

```kotlin
repositories {
    mavenCentral()
    maven {
        url = uri("https://maven.pkg.github.com/sympauthy/testcontainers-sympauthy")
        credentials {
            // Set gpr.user / gpr.token in ~/.gradle/gradle.properties, or fall back to env vars.
            username = providers.gradleProperty("gpr.user").orNull ?: System.getenv("GITHUB_ACTOR")
            password = providers.gradleProperty("gpr.token").orNull ?: System.getenv("GITHUB_TOKEN")
        }
    }
}

dependencies {
    testImplementation("com.sympauthy:testcontainers-sympauthy:x.x.x")
}
```

### Maven

Add a server with your token to `~/.m2/settings.xml`:

```xml
<servers>
  <server>
    <id>github-sympauthy</id>
    <username>YOUR_GITHUB_USERNAME</username>
    <password>YOUR_GITHUB_TOKEN</password> <!-- PAT with read:packages -->
  </server>
</servers>
```

Then reference the repository and dependency in your `pom.xml`:

```xml
<repositories>
  <repository>
    <id>github-sympauthy</id>
    <url>https://maven.pkg.github.com/sympauthy/testcontainers-sympauthy</url>
  </repository>
</repositories>

<dependencies>
  <dependency>
    <groupId>com.sympauthy</groupId>
    <artifactId>testcontainers-sympauthy</artifactId>
    <version>x.x.x</version>
    <scope>test</scope>
  </dependency>
</dependencies>
```

### In CI (GitHub Actions)

No personal access token needed — the workflow's automatic `GITHUB_TOKEN` can read the (public)
package. Grant it `packages: read` and pass it through as the registry password:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: read          # lets GITHUB_TOKEN read GitHub Packages
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - run: ./gradlew test
        env:
          GITHUB_ACTOR: ${{ github.actor }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}   # consumed by the credentials block above
```

This reuses the `System.getenv("GITHUB_ACTOR")` / `System.getenv("GITHUB_TOKEN")` fallback in the
Gradle snippet, so the same build works locally (via `gpr.*` properties) and in CI (via these env
vars). For Maven, store the token as a secret and reference it from the `<server>` in `settings.xml`.

## Usage

Start a container, then point the system under test at its issuer and discovery document:

```java
try (SympauthyContainer sympauthy = new SympauthyContainer()) {
    sympauthy.start();

    String issuer    = sympauthy.getIssuerUrl();               // http://localhost:<port>
    String discovery = sympauthy.getOpenIdConfigurationUrl();  // .../.well-known/openid-configuration
    // point the system under test at the issuer / discovery document
}
```

Out of the box the container is minimal — SympAuthy's `default` Micronaut environment against an
in-memory H2 database. Password authentication, claims, the `admin` environment, clients, providers
and MFA are all opt-in; enable exactly what a test needs with the methods described under
[Configuration](/testcontainers/configuration) and the feature pages that follow.
