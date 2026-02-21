# How to write an exception

Exception handling in SympAuthy follows a structured approach with specialized exception types for different layers of
the application. This guide explains how to properly throw and configure exceptions in the backend, including selecting
the appropriate exception type, defining error messages, and providing user-friendly descriptions. Understanding these
conventions ensures consistent error handling and improves both developer troubleshooting and end-user experience.

## How to select the right exception type

- ```LocalizedHttpException``` are throw by the REST controllers located in the ```com.sympauthy.api``` package.
- ```BusinessException``` are throw by the business layer located in the ```com.sympauthy.business``` package.
- ```LocalizedException``` are the abstract base class for all exceptions. They must never be thrown directly.

## Business exception

All exceptions thrown by the business layer should be a subclass of `BusinessException`.

A ```BusinessException``` represents an error that occurs in the business logic handling an operation requested by
the end-user. The most common use case is to throw a ```BusinessException``` when the application is on a state where
the operation cannot be performed. Ex. complete an authentication flow without having a user account.

Therefore, the HTTP status code returned by the REST controllers is ```400 Bad Request``` for all
```BusinessException```,
unless explicitly specified otherwise.

### Recoverable / Unrecoverable

#### Recoverable

A business exception can be recoverable or unrecoverable. An error is considered **recoverable** if the end-user is able
to
modify his request and retry. (ex. a password is incorrect).
Otherwise, it is considered unrecoverable.

To throw a recoverable exception, use the following utility method:

```kotlin
throw recoverableBusinessExceptionOf(
    detailsId = "",
    descriptionId = "",
    ...
)
```

As the end-user is expected to modify his request, adding a ```descriptionId``` is strongly recommended
to provide more context to the end-user.

#### Unrecoverable

To throw an unrecoverable exception, use the following utility method:

```kotlin
throw businessExceptionOf(
    detailsId = "",
    ...
)
```

### How to choose a ```detailsId``` for a ```BusinessException```

The ```detailsId``` is a message code that identifies the error and provides a technical description to help
troubleshoot the issue. It is also sent to clients as an error identifier.

The format for business exception error codes follows this pattern:

```
<last package>(.<word identifying the manager>)?(.<word identifying the method>)?.<description>
```

For example:

- `auth.authorize_attempt.complete.missing_user` - Error in auth package, authorize_attempt manager, complete method
- `claim.validate.invalid_email` - Error in claim package, validate method
- `user.missing` - Generic error in user package

The message associated with this code in `error_messages.properties` must describe the error in a technical way to help
troubleshoot the issue. Variables can be included using `{variableName}` syntax.

### How to choose a ```descriptionId``` for a ```BusinessException```

The ```descriptionId``` is an optional message code that provides a user-friendly description intended to be displayed
to the end-user and guide them to the next step. It is particularly recommended for **recoverable** exceptions where the
user can modify their request and retry.

The description code follows the pattern: `description.{detailsId}`

For example:

- If `detailsId` is `oauth2.expired`, the `descriptionId` would be `description.oauth2.expired`
- If `detailsId` is `internal_server_error`, the `descriptionId` would be `description.internal_server_error`

The description message in `error_messages.properties` should:

- Be written in a user-friendly language (not technical)
- Guide the user on what to do next
- Provide context about what went wrong in terms the end-user can understand
- Include variables using `{variableName}` syntax when needed (e.g., `{expiration}`)

## Localized exception

A localized exception is the technical base to provide internationalization of error support for others exception types
like ```BusinessException```, etc.

:::warning
They should never be thrown directly. Instead, they should be used as a base class for other exception types.
:::

