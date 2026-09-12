# Advanced

This page covers configuration that is not necessary for a regular operator but allows fine-tuning of server behaviour.

## ```advanced```

This section holds configuration that will change the general behavior of the server.

| Key                            | Type   | Description                                                                                                                     | Required<br>Default        |
|--------------------------------|--------|---------------------------------------------------------------------------------------------------------------------------------|----------------------------|
| ```hash```                     | object | Scrypt parameters used when hashing secrets. See [advanced.hash](#advanced-hash).                                               | YES                        |
| ```invitation```               | object | [Invitation](/functional/invitation) token settings. See [advanced.invitation](#advanced-invitation).                           | YES                        |
| ```jwt```                      | object |                                                                                                                                 | YES                        |
| ```keys-generation-strategy``` | string | How the instances of a deployment agree on the cryptographic keys they share. `auto-increment`, the only strategy published, negotiates through the database: an instance needing a key looks for an existing one, inserts a newly generated key if there is none, and every instance then settles on the row with the lowest auto-increment index. | YES<br>```auto-increment``` |
| ```pagination```               | object | Bounds every paged endpoint applies to the `page` and `size` query parameters. See [advanced.pagination](#advanced-pagination). | YES                        |
| ```security-context```         | object | What the server reads off a request about where it came from, and how long a place a person signs in from is kept. See [advanced.security-context](#advanced-security-context). | NO                         |
| ```validation-code```          | object | See [advanced.validation-code](#advanced-validation-code).                                                                      | YES                        |
| ```webhooks```                 | object | Timeout bounding every call to a client's authorization webhook. See [advanced.webhooks.authorization](#advanced-webhooks-authorization). | NO                         |

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

### ```advanced.security-context```

What the server reads off a request about where it came from, and how long a place a person signs in from
is kept. The trust model behind these keys, the edges that may be named and what each of them publishes
are on the [Security Context](/technical/configuration/security-context) page.

| Key                          | Type     | Description                                                                                                                               | Required<br>Default |
|------------------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```geo```                    | object   | Where that address is. See [advanced.security-context.geo](#advanced-security-context-geo).                                                | NO                  |
| ```ip```                     | object   | Where the address comes from. See [advanced.security-context.ip](#advanced-security-context-ip).                                           | NO                  |
| ```known-user-retention```   | duration | How long a place a person signs in from is kept, measured from the last time they were seen there rather than the first. Must be positive. | NO<br>```180d```    |

### ```advanced.security-context.geo```

| Key                 | Type        | Description                                                                                                                                                                    | Required<br>Default |
|---------------------|-------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```auto-detect```   | boolean     | Read every edge that publishes a location, sorted by name, instead of the ones `providers` lists.                                                                               | NO<br>```false```   |
| ```headers```       | object      | Header each location field is read from, overriding every edge for that field. See [advanced.security-context.geo.headers](#advanced-security-context-geo-headers).             | NO                  |
| ```providers```     | string list | Edges whose location headers are read, applied in order; each overrides the fields the ones before it answered. Only an edge publishing a location may be named, and only once. | NO<br>```[]```      |

### ```advanced.security-context.geo.headers```

Every key is a header name, read as it stands.

| Key                   | Type   | Description                        | Required<br>Default |
|-----------------------|--------|------------------------------------|---------------------|
| ```city```            | string | Header holding the city.           | NO                  |
| ```country-code```    | string | Header holding the country code.   | NO                  |
| ```postal-code```     | string | Header holding the postal code.    | NO                  |
| ```region```          | string | Header holding the region name.    | NO                  |
| ```region-code```     | string | Header holding the region code.    | NO                  |
| ```time-zone```       | string | Header holding the time zone.      | NO                  |

### ```advanced.security-context.ip```

| Key            | Type   | Description                                                                    | Required<br>Default |
|----------------|--------|----------------------------------------------------------------------------------|---------------------|
| ```header```   | string | Header holding the address, read as it stands. Wins over `provider`.             | NO                  |
| ```provider``` | string | The one proxy nearest this server whose header says where a request came from.   | NO                  |

### ```advanced.validation-code```

| Key                | Type     | Description                                                                                      | Required<br>Default |
|--------------------|----------|--------------------------------------------------------------------------------------------------|---------------------|
| ```expiration```   | duration | Duration, after the validation code has been generated, where the server will accept it.         | YES<br>```10m```    |
| ```length```       | int      | Number of digit expected in validation code generate by this authorization server.               | YES<br>```6```      |
| ```resend-delay``` | duration | Duration the end-user has to wait before being able to request a new validation code to be sent. | YES<br>```1m```     |

### ```advanced.webhooks.authorization```

| Key           | Type     | Description                                                                                                                                                            | Required<br>Default |
|---------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```timeout``` | duration | Time a client's authorization webhook has to answer before the call is abandoned and the webhook treated as failed. Applies to every call, whichever client made it. | NO<br>```5s```      |

The webhook itself — the URL called and the secret the request is signed with — is configured per client under
[`clients.<id>.webhooks.authorization`](/technical/configuration/client#clients-id-webhooks-authorization), a different
key. This one only bounds how long the server waits for it.

## Scheduled cleanups

Three sweeps run every fifteen minutes, each on a schedule of its own: the one expiring
[interactive flow](/functional/interactive_flow) sessions and the records attached to them, the one collecting
the accounts an abandoned sign-up left half-created, and the one removing the places people sign in from once
nobody has signed in from one for [`known-user-retention`](#advanced-security-context).

How much a run takes is fixed in the server rather than configured, and nothing is lost by it: whatever a run
leaves behind, the next one takes. The only key touching any of this is the retention above, which says when a
place becomes expired, not how it is removed.

In a deployment of several instances, a sweep is run by one instance rather than by every one of them: an
instance takes a lease on the sweep before running it, and the instances that do not hold it skip that round.
Each sweep has a lease of its own, so the three may well be taken by three different instances.
