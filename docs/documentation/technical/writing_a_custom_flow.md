# Writing a custom flow

## Flow API

There is an endpoint for each step in the flow.
Each endpoint will provide at least a `GET` and a `POST` method.

Both methods will return a JSON object containing a `redirectUrl` property.
This property will contain the URL to redirect the user if:
- the user has completed the step.
- an unrecoverable error occurred. (ex. the session expired).
