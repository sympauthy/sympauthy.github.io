# Advanced

This page covers configuration that is not necessary for a regular operator but allows fine-tuning of server behaviour.

## ```advanced```

This section holds configuration that will change the general behavior of the server.

| Key                            | Type   | Description                                                                                                                     | Required<br>Default        |
|--------------------------------|--------|---------------------------------------------------------------------------------------------------------------------------------|----------------------------|
| ```hash```                     | object | Scrypt parameters used when hashing secrets. See [advanced.hash](#advanced-hash).                                               | YES                        |
| ```invitation```               | object | [Invitation](/functional/invitation) token settings. See [advanced.invitation](#advanced-invitation).                           | YES                        |
| ```jwt```                      | object |                                                                                                                                 | YES                        |
| ```keys-generation-strategy``` | string |                                                                                                                                 | YES<br>```autoincrement``` |
| ```pagination```               | object | Bounds every paged endpoint applies to the `page` and `size` query parameters. See [advanced.pagination](#advanced-pagination). | YES                        |
| ```user-merging-strategy```    | string | **Deprecated** — replaced by [`auth.user-merging-enabled`](/technical/configuration/authorization#auth).                        | YES<br>```by-mail```       |
| ```validation-code```          | object | See [advanced.validation-code](#advanced-validation-code).                                                                      | YES                        |

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

| Key               | Type   | Description                                                                                                                                                                                                                                | Required<br>Default |
|-------------------|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```access-alg```  | string | Algorithm used to sign access tokens. The algorithm **MUST** be asymmetric and support a public key. Access tokens are signed with a dedicated key, separate from ID tokens per [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068). | YES<br>```rs256```  |
| ```public-alg```  | string | Algorithm used to sign ID tokens and other keys shared publicly. The algorithm **MUST** be asymmetric and support a public key.                                                                                                            | YES<br>```rs256```  |
| ```private-alg``` | string | Algorithm used to encrypt internal keys. The algorithm only have to support public key.                                                                                                                                                    | YES<br>```rs256```  |

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

Both keys are required and have no fallback in code. The `default` [environment](/technical/configuration/environments)
supplies them; a deployment that declares its own `advanced:` block without enabling `default` must set both, or the
server reports itself unready with a `config.missing` error for each.

### ```advanced.validation-code```

| Key                | Type     | Description                                                                                      | Required<br>Default |
|--------------------|----------|--------------------------------------------------------------------------------------------------|---------------------|
| ```expiration```   | duration | Duration, after the validation code has been generated, where the server will accept it.         | YES<br>```10m```    |
| ```length```       | int      | Number of digit expected in validation code generate by this authorization server.               | YES<br>```6```      |
| ```resend-delay``` | duration | Duration the end-user has to wait before being able to request a new validation code to be sent. | YES<br>```1m```     |

