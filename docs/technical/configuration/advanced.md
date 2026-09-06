# Advanced

This page covers configuration that is not necessary for a regular operator but allows fine-tuning of server behaviour.

## ```advanced```

This section holds configuration that will change the general behavior of the server.

| Key                            | Type   | Description                                                                                                                     | Required<br>Default        |
|--------------------------------|--------|---------------------------------------------------------------------------------------------------------------------------------|----------------------------|
| ```authorization-webhook```    | object | Timeout bounding every call to a client's authorization webhook. See [advanced.authorization-webhook](#advanced-authorization-webhook). | NO                         |
| ```cleanup```                  | object | Bounds one run of each of the scheduled cleanups. See [advanced.cleanup](#advanced-cleanup).                                    | YES                        |
| ```hash```                     | object | Scrypt parameters used when hashing secrets. See [advanced.hash](#advanced-hash).                                               | YES                        |
| ```invitation```               | object | [Invitation](/functional/invitation) token settings. See [advanced.invitation](#advanced-invitation).                           | YES                        |
| ```jwt```                      | object |                                                                                                                                 | YES                        |
| ```keys-generation-strategy``` | string | How the instances of a deployment agree on the cryptographic keys they share. `auto-increment`, the only strategy published, negotiates through the database: an instance needing a key looks for an existing one, inserts a newly generated key if there is none, and every instance then settles on the row with the lowest auto-increment index. | YES<br>```auto-increment``` |
| ```pagination```               | object | Bounds every paged endpoint applies to the `page` and `size` query parameters. See [advanced.pagination](#advanced-pagination). | YES                        |
| ```validation-code```          | object | See [advanced.validation-code](#advanced-validation-code).                                                                      | YES                        |

### ```advanced.authorization-webhook```

| Key           | Type     | Description                                                                                                                                                            | Required<br>Default |
|---------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```timeout``` | duration | Time a client's authorization webhook has to answer before the call is abandoned and the webhook treated as failed. Applies to every call, whichever client made it. | NO<br>```5s```      |

The webhook itself — the URL called and the secret the request is signed with — is configured per client under
[`clients.<id>.authorization-webhook`](/technical/configuration/client#clients-id-authorization-webhook), a different
key. This one only bounds how long the server waits for it.

### ```advanced.cleanup```

Bounds one run of each of the two cleanups the server runs every fifteen minutes: the one removing expired
[interactive flow](/functional/interactive_flow) sessions, the other collecting the accounts an abandoned sign-up left
behind.

| Key              | Type | Description                                                                                                                                                                                         | Required<br>Default |
|------------------|------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```batch-size``` | int  | Largest number of rows one run of a cleanup takes, each cleanup bounded on its own. Must be greater than 0. Nothing is lost by the bound: whatever a run leaves behind, the next one takes.        | YES<br>```1000```   |

A run holds locks on the tables it deletes from, which are the tables a sign-in is writing, for as long as it takes.
That is what the bound keeps short.

Both cleanups log at `WARN` when a run stops at `batch-size` with rows left to remove. Once after an outage, that is
the cleanup catching up. At every run, `batch-size` is too low for the cleanup to ever drain what it has to remove and
must be increased.

### ```advanced.hash```

| Key                             | Type | Description                                                                          | Required<br>Default |
|---------------------------------|------|--------------------------------------------------------------------------------------|---------------------|
| ```block-size```                | int  |                                                                                      | YES<br>```8```      |
| ```cost-parameter```            | int  |                                                                                      | YES<br>```16384```  |
| ```key-length```                | int  | Number of bytes generated as output of the hashing algorithm.                        | YES<br>```32```     |
| ```parallelization-parameter``` | int  |                                                                                      | YES<br>```1```      |
| ```salt-length```               | int  | Number of random bytes to generate and then use as a salt for the hashing algorithm. | YES<br>```256```    |

### ```advanced.invitation```

Configuration for [invitation](/functional/invitation) token generation and expiration.

| Key                        | Type     | Description                                                                                 | Required<br>Default |
|----------------------------|----------|---------------------------------------------------------------------------------------------|---------------------|
| ```default-expiration```   | duration | Default validity period when no `expires_at` is provided at creation.                       | YES<br>```7d```     |
| ```max-expiration```       | duration | Maximum allowed validity period. `expires_at` values beyond this limit are capped.          | YES<br>```30d```    |
| ```token-length```         | int      | Number of random bytes for token generation (before base64url encoding).                    | YES<br>```32```     |

### ```advanced.invitation.hash```

Scrypt parameters for hashing invitation tokens. Follows the same structure as [`advanced.hash`](#advanced-hash).

| Key                             | Type | Description                                                                          | Required<br>Default |
|---------------------------------|------|--------------------------------------------------------------------------------------|---------------------|
| ```block-size```                | int  | Scrypt block size parameter (r).                                                     | YES<br>```8```      |
| ```cost-parameter```            | int  | Scrypt CPU/memory cost parameter (N).                                                | YES<br>```16384```  |
| ```key-length```                | int  | Number of bytes generated as output of the hashing algorithm.                        | YES<br>```32```     |
| ```parallelization-parameter``` | int  | Scrypt parallelization parameter (p).                                                | YES<br>```1```      |
| ```salt-length```               | int  | Number of random bytes to generate and then use as a salt for the hashing algorithm. | YES<br>```256```    |

### ```advanced.jwt```

| Key               | Type   | Description                                                                                                                                                                                                                                                                                            | Required<br>Default |
|-------------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```access-alg```  | string | Algorithm used to sign access tokens. The algorithm **MUST** be asymmetric and support a public key, which leaves `rs256`, `ps256` and `es256`. Access tokens are signed with a dedicated key, separate from ID tokens per [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068).                    | YES<br>```es256```  |
| ```private-alg``` | string | Algorithm used to sign the JWTs the server keeps to itself: refresh tokens, provider nonces and the flow state token. The algorithm **MUST** be deterministic, which leaves `rs256` and `hs256`. `es256` and `ps256` are refused: the provider nonce flow rebuilds the JWT at callback time and compares it to the one it sent, so a signature that differs per call is a nonce mismatch. | YES<br>```hs256```  |
| ```public-alg```  | string | Algorithm used to sign ID tokens and other keys shared publicly. The algorithm **MUST** be asymmetric and support a public key, which leaves `rs256`, `ps256` and `es256`.                                                                                                                              | YES<br>```es256```  |

### ```advanced.pagination```

Bounds applied to the `page` and `size` query parameters of every paged endpoint of
the [Admin API](/technical/api/admin#pagination) and the [Client API](/technical/api/client#pagination).

| Key                | Type | Description                                                                                                      | Required<br>Default |
|--------------------|------|------------------------------------------------------------------------------------------------------------------|---------------------|
| ```default-size``` | int  | Number of items returned when the caller sends no `size`. Must be greater than 0 and no greater than `max-size`. | YES<br>```20```     |
| ```max-size```     | int  | Largest `size` a caller may ask for. A larger one is refused with a `400`, not reduced. Must be greater than 0.  | YES<br>```100```    |

Without a maximum, `?size=100000` is a request to serialize a whole collection into a single response, and the
endpoints that page in memory will do it. Where the ceiling belongs depends on how large the collections a deployment
holds, which is why it is configuration rather than a fixed value.

### ```advanced.validation-code```

| Key                | Type     | Description                                                                                      | Required<br>Default |
|--------------------|----------|--------------------------------------------------------------------------------------------------|---------------------|
| ```expiration```   | duration | Duration, after the validation code has been generated, where the server will accept it.         | YES<br>```10m```    |
| ```length```       | int      | Number of digit expected in validation code generate by this authorization server.               | YES<br>```6```      |
| ```resend-delay``` | duration | Duration the end-user has to wait before being able to request a new validation code to be sent. | YES<br>```1m```     |

