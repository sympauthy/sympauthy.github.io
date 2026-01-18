# Getting started

## Requirements

To run SympAuthy, you will need the following dependencies:
- [Docker](https://www.docker.com/)
- [PostgreSQL](https://www.postgresql.org/) >= 18 (SympAuthy requires support of [UUIDv7](https://www.thenile.dev/blog/uuidv7))

## Running SympAuthy locally using Docker

### Create a database in your PostgreSQL

You can create a PostgreSQL database using the [CREATE DATABASE](https://www.postgresql.org/docs/current/sql-createdatabase.html) command:
``` sql
CREATE DATABASE <database>;
```

Or from the command line using [createdb](https://www.postgresql.org/docs/current/app-createdb.html) command:
``` bash
createdb <database>
```

Replace ```<database>``` with your desired database name.

### Determine you connection string to PostgreSQL

SympAuthy relies on [r2dbc](https://r2dbc.io/) to communicate with its database.

```r2dbc:postgresql://<host>:<port>/<database>```

- ```<host>```: Hostname or IP address of the database server.
- ```<port>```: Port the database server is listening to. By default, PostreSQL uses the port ```5432```.
- ```<database>```: Name of the database.

> The database **MUST** exists before running SympAuthy. Only the content of the database will be created automatically.

### Running SympAuthy

Replace the following command to start the latest version of SympAuthy in your Docker:

```bash
docker run -ti -p 8080:8080 \
  ghcr.io/sympauthy/sympauthy:latest-nightly \
  -r2dbc.datasources.default.url=r2dbc:postgresql://host.docker.internal:5432/<database> \
  -r2dbc.datasources.default.username=<username> \
  -r2dbc.datasources.default.password=<password> \
  -urls.root=http://localhost:8080 \
  -clients.example.secret=example_secret
```

After the server has started, you should see the following line in the log indicating the server is properly configured:

```
XX:XX:XX.XXX [scheduled-executor-thread-X] INFO ConfigReadinessIndicator - No error detected in the configuration.
```

The server should be available on port ```8080```. You can verify the server is up and running by accessing to the API documentation of the server at: ```http://localhost:8080/swagger```.

#### Breaking down the command

Let break down the previous command in part to help you understand how it works:

##### Configure the database

SympAuthy relies on [Micronaut R2DBC](https://guides.micronaut.io/latest/micronaut-data-r2dbc-repository-gradle-java.html) to communicate with the database.

- ```r2dbc.datasources.default.url```: The connection string locating the database that SympAuthy will use.
- ```r2dbc.datasources.default.username```: The username to identify to the database.
- ```r2dbc.datasources.default.password```: The password to identify to the database. It can be omitted if your database does not require a password.

##### Configure the authorization server

- ```urls.root```: An URL that end-users and clients are able to use to reach the SympAuthy server. This URL will be used as base when redirecting the end-user to an authentication flow.
- ```client.example.secret```: Provide the secret the OAuth 2 client identified by ```example``` must use to communicate with this authorization server. Simply declaring the secret in the configuration will be enough to register the client. To learn more about the management of client, you can refer to the [Connect using OAuth 2](/documentation/functional/connect_using_oauth2) section of this documentation.

You can pass additional configurations to the server by appending the following to the command: ```-<configuration key>=<value>```. The list of available ```<configuration key>```  is described in details in the [Configuration](/documentation/technical/configuration) section of this documentation.

## Test your SympAuthy instance

To simulate an application requiring authentication of one of its end-user, we can use an online service like [OAuth Debugger](https://oauthdebugger.com/).






<!--stackedit_data:
eyJoaXN0b3J5IjpbLTEzMjAzODExODIsMzk2ODA4MjZdfQ==
-->
