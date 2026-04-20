# Advanced

This page covers configuration that is not necessary for a regular operator but allows fine-tuning of server behaviour.

## ```advanced```

This section holds configuration that will change the general behavior of the server.

| Key                            | Type   | Description                                                        | Required<br>Default        |
|--------------------------------|--------|--------------------------------------------------------------------|----------------------------|
| ```jwt```                      | object |                                                                    | YES                        |
| ```user-merging-strategy```    | string | **Deprecated** — replaced by [`auth.user-merging-enabled`](/technical/configuration/authorization#auth). | YES<br>```by-mail```       |
| ```keys-generation-strategy``` | string |                                                                    | YES<br>```autoincrement``` |
| ```validation-code```          | object | See [advanced.validation-code](#advanced-validation-code).         | YES                        |

### ```advanced.hash```

| Key                             | Type | Description                                                                          | Required<br>Default |
|---------------------------------|------|--------------------------------------------------------------------------------------|---------------------|
| ```block-size```                | int  |                                                                                      | YES<br>```8```      |
| ```cost-parameter```            | int  |                                                                                      | YES<br>```16384```  |
| ```key-length```                | int  | Number of bytes generated as output of the hashing algorithm.                        | YES<br>```32```     |
| ```parallelization-parameter``` | int  |                                                                                      | YES<br>```1```      |
| ```salt-length```               | int  | Number of random bytes to generate and then use as a salt for the hashing algorithm. | YES<br>```256```    |

### ```advanced.jwt```

| Key               | Type   | Description                                                                                                                                                                                                                                | Required<br>Default |
|-------------------|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```access-alg```  | string | Algorithm used to sign access tokens. The algorithm **MUST** be asymmetric and support a public key. Access tokens are signed with a dedicated key, separate from ID tokens per [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068). | YES<br>```rs256```  |
| ```public-alg```  | string | Algorithm used to sign ID tokens and other keys shared publicly. The algorithm **MUST** be asymmetric and support a public key.                                                                                                            | YES<br>```rs256```  |
| ```private-alg``` | string | Algorithm used to encrypt internal keys. The algorithm only have to support public key.                                                                                                                                                    | YES<br>```rs256```  |

### ```advanced.validation-code```

| Key                | Type     | Description                                                                                      | Required<br>Default |
|--------------------|----------|--------------------------------------------------------------------------------------------------|---------------------|
| ```expiration```   | duration | Duration, after the validation code has been generated, where the server will accept it.         | YES<br>```10m```    |
| ```length```       | int      | Number of digit expected in validation code generate by this authorization server.               | YES<br>```6```      |
| ```resend-delay``` | duration | Duration the end-user has to wait before being able to request a new validation code to be sent. | YES<br>```1m```     |

