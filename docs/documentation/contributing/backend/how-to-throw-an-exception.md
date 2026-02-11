# How to write an exception

## How to select the right exception type

## Business exception

All exceptions thrown by the business layer should be a subclass of `BusinessException`.

### Recoverable / Unrecoverable

A business exception can be recoverable or unrecoverable. An error is considered **recoverable** if the end-user is able to
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

To throw an unrecoverable exception, use the following utility method:

```kotlin
throw internalBusinessExceptionOf(
    detailsId = "",
    ...
)
```

## Localized exception

A localized exception is the technical base to provide internationalization of error support for others exception types
like ```BusinessException```, etc.

:::warning
They should never be thrown directly. Instead, they should be used as a base class for other exception types.
:::

### How to choose a ```detailsId```

### How to choose a ```descriptionId```

