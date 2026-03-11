# Getting started

In this quickstart guide, you will learn how to run SympAuthy locally using Docker and connect to it using OAuth 2.1.

In order to make this guide works on Windows, macOS and Linux, we will run both
the SympAuthy server and the PostgreSQL in a Docker container.

## Requirements

To follow this guide, you will need Docker installed on your machine.

### Windows

Download and install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).

**System Requirements:**

- Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
- Windows 11 64-bit
- WSL 2 backend enabled (recommended)
- Hyper-V and Containers Windows features must be enabled

### macOS

Download and install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/).

**System Requirements:**

- macOS 11 or newer
- Apple Silicon (M1/M2/M3) or Intel processor

Alternatively, you can install Docker using [Homebrew](https://brew.sh/):

```bash
brew install --cask docker
```

### Linux

#### Ubuntu / Debian

```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

After running these commands, log out and log back in for the group changes to take effect.

#### Fedora / RHEL / CentOS

```bash
sudo dnf install docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### Arch Linux

```bash
sudo pacman -S docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### Other Distributions

For other Linux distributions, refer to
the [official Docker installation guide](https://docs.docker.com/engine/install/).

## Running PostgreSQL and preparing the database

First, create a dedicated Docker network so the PostgreSQL and SympAuthy containers can communicate with each other:

```bash
docker network create sympauthy-network
```

Then, start the PostgreSQL container and attach it to that network:

```bash
docker run -d \
  --name sympauthy-postgres \
  --network sympauthy-network \
  -e POSTGRES_USER=sympauthy_pg_user \
  -e POSTGRES_PASSWORD=sympauthy_pg_password \
  -e POSTGRES_DB=getting_started_with_sympauthy \
  postgres:17
```

This command:

- Starts a PostgreSQL 17 container in the background (`-d`)
- Attaches the container to the `sympauthy-network` network, making it reachable by other containers on that network
  using the hostname `sympauthy-postgres`
- Creates a user `sympauthy_pg_user` with password `sympauthy_pg_password`
- Creates a database `getting_started_with_sympauthy` owned by that user

Wait a few seconds for PostgreSQL to finish starting up. You can verify it is ready by running:

```bash
docker exec sympauthy-postgres pg_isready -U sympauthy_pg_user
```

You should see:

```
/var/run/postgresql:5432 - accepting connections
```

> The database **MUST** exist before running SympAuthy. Only the content (tables, indexes, etc.) will be created
> automatically by SympAuthy on first startup.

## Running SympAuthy locally

### Running SympAuthy

Run the following command to start the latest version of SympAuthy in your Docker:

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
  '-rules[0].scopes=admin:config:read,admin:users:read,admin:users:write,admin:users:delete,admin:access:read,admin:access:write,admin:sessions:read,admin:sessions:write' \
  '-rules[0].behavior=grant' \
  '-rules[0].expressions=CLAIM("email") = "admin@example.com"' \
  '-urls.root=http://localhost:8080'
```

After the server has started, you should see the following lines in the log indicating the server is properly
configured:

```
XX:XX:XX.XXX [main] INFO  c.s.ApplicationReadinessStatusPrinter - SympAuthy is ready and has found the following elements in its configuration:
XX:XX:XX.XXX [main] INFO  c.s.ApplicationReadinessStatusPrinter - - X claim(s).
XX:XX:XX.XXX [main] INFO  c.s.ApplicationReadinessStatusPrinter - - X scope(s).
XX:XX:XX.XXX [main] INFO  c.s.ApplicationReadinessStatusPrinter - - X client(s).
XX:XX:XX.XXX [main] INFO  c.s.ApplicationReadinessStatusPrinter - - X rule(s).
```

The server should be available on port ```8080```. You can verify the server is up and running by accessing to the API
documentation of the server at: ```http://localhost:8080/swagger-ui```.

#### Breaking down the command

Let's break down the previous command in parts to help you understand how it works:

##### Configure the database

These parameters tell SympAuthy where to find and how to authenticate to its PostgreSQL database.
For the full list of supported databases and configuration options, see
the [r2dbc configuration](/documentation/technical/configuration#r2dbc).

##### Configure the authorization server

- ```auth.issuer```: The public URL of this authorization server, embedded as the `iss` claim in every JWT token it
  issues. Clients use it to verify that a token was issued by the expected server and to discover the OpenID Connect
  configuration at `<issuer>/.well-known/openid-configuration`.
- ```auth.by-password.enabled```: Enable password-based authentication, allowing end-users to sign up and sign in
  using a password. See [auth.by-password](/documentation/technical/configuration#auth-by-password) for details.
- ```auth.identifier-claims```: The list of claims that uniquely identify a person. These claims are used as the login
  identifier for password authentication. Here we use ```email``` so users sign in with their email address. See
  [auth.identifier-claims](/documentation/technical/configuration#auth-identifier-claims) for details.
- ```claims.email.enabled```: Enable the ```email``` claim, allowing end-users to provide an email address during
  sign-up. See [claims](/documentation/technical/configuration#claims) for details.
- ```urls.root```: An URL that end-users and clients are able to use to reach the SympAuthy server. This URL will be
  used as base when redirecting the end-user to an authentication flow.

##### Enable the Admin UI

- ```MICRONAUT_ENVIRONMENTS=default,admin```: The ```admin``` [Micronaut environment](/documentation/technical/configuration#micronaut-environments)
  enables the Admin UI and pre-configures an ```admin``` client with all admin scopes. See the
  [Admin API](/documentation/technical/admin_api) documentation for details.

##### Grant admin permissions

- ```rules[0]```: A [scope granting rule](/documentation/functional/authorization#scope-granting-rules) that
  automatically grants all admin scopes to the user who signs up with the email ```admin@example.com```.

You can pass additional configurations to the server by appending the following to the command:
```-<configuration key>=<value>```. The list of available ```<configuration key>```  is described in details in
the [Configuration](/documentation/technical/configuration) section of this documentation.

## Test your SympAuthy instance

To simulate an application requiring authentication of one of its end-users, you can use an online service
like [OAuth Debugger](https://oauthdebugger.com/).

1. Go to [https://oauthdebugger.com/](https://oauthdebugger.com/)
2. Fill in the following fields:
    - **Authorize URI**: `http://localhost:8080/api/oauth2/authorize`
    - **Client ID**: `admin`
    - **Scope**: Leave empty or use `openid profile email`
    - **Response Type**: `code`
    - **Response Mode**: `form_post`
3. Click **Send Request**
4. You will be redirected to the SympAuthy authentication page where you can create an account or sign in
5. After successful authentication, you will be redirected back to OAuth Debugger with an authorization code

This confirms that your SympAuthy instance is running correctly and can handle OAuth 2.1 authentication flows.

## Test the Admin UI

1. Go to `http://localhost:8080/admin`
2. Create an account using the email ```admin@example.com```
3. After signing in, you will have access to the Admin UI with full admin permissions

The [scope granting rule](/documentation/functional/authorization#scope-granting-rules) configured in the Docker
command automatically grants all admin scopes to the user with this email address.

To learn more about the Admin API and available admin features, see
the [Admin API](/documentation/technical/admin_api) documentation.

## Cleanup

1. Stop the SympAuthy container by pressing `Ctrl + C` in the terminal where it is running. The container will be automatically removed.

2. Stop and remove the PostgreSQL container:

```bash
docker rm -f sympauthy-postgres
```

3. Remove the Docker network:

```bash
docker network rm sympauthy-network
```

4. Remove the SympAuthy Docker image:

```bash
docker rmi ghcr.io/sympauthy/sympauthy-nightly:latest
```
