# Delegation

SympAuthy lets a [confidential client](/functional/client#confidential-and-public-clients) obtain an
access token that **acts on behalf of a user**, using
[OAuth 2.0 Token Exchange (RFC 8693)](https://datatracker.ietf.org/doc/html/rfc8693). This is useful
for **event-driven delegation**: a service that already knows a user by their SympAuthy id needs to
call a backend *as that user*, without the user ever completing an interactive authentication flow.

For example, a Discord bot receives a message from a user whose SympAuthy identity it knows, and calls
the backend on that user's behalf.

## Delegation, not impersonation

The issued access token keeps the user as its
[`sub`](/functional/tokens#structure-of-an-access-token) and records the acting client in an
[`act`](/functional/tokens#structure-of-an-access-token) claim. A resource server therefore sees both
*who the request is for* (the user) and *who is acting* (the client).

SympAuthy does **not** issue pure impersonation tokens — a token indistinguishable from one the user
obtained themselves, with no trace of the actor. Recording the actor in `act` is what makes delegation
auditable.

## Acting on behalf of a user by id

Only [confidential clients](/functional/client#confidential-and-public-clients) can request a
delegated token — a public client may never act on behalf of a user.

The delegated token is **identity-only**: it carries the user's identity (`sub`) and the actor
(`act`) but no [scopes](/functional/scope). There is no end-user consent and no authorization flow
behind it, so no [consentable](/functional/scope#consentable-scope) or
[grantable](/functional/scope#grantable-scope) scope can be attached. The resource server authorizes
the request from the asserted identity plus the trusted actor.

## Act-as rules

Whether a client may act on behalf of a given user is decided by **act-as rules**. They are the
delegation counterpart of
[scope granting rules](/functional/user_authorization#scope-granting-rules), but **permission-only**:
they grant no scope, they only allow or deny the delegation.

They are declared in the [Configuration](/technical/configuration/authorization#rules) under
```rules.act_as``` of the authorization server and look like the following:

```yaml
rules:
  act_as:
    # A specific bot may act as users who have a verified Discord identity.
    - behavior: allow
      order: 0
      expressions:
        - CLIENT("client_id") = "discord-bot" && CLAIM_IS_VERIFIED("discord_id")
    # Admin clients may act as any user (no per-user condition).
    - behavior: allow
      order: 0
      expressions:
        - CLIENT("audience") = "admin"
```

An expression may reference both the **acting client** — with ```CLIENT("client_id")``` or
```CLIENT("audience")``` — and the **target user's claims** — with ```CLAIM(...)``` and
```CLAIM_IS_VERIFIED(...)```. A rule is **matched** when all its ```expressions``` return ```true```
for the (acting client, target user) pair. See [Rule Expressions](/technical/rule_expressions) for the
full list of functions and which rule types they are available in.

The ```behavior``` is one of the following:

- ```allow```: the client is permitted to act on behalf of the target user.
- ```deny```: the client is forbidden from acting on behalf of the target user.

The ```order``` controls how conflicting rules are resolved:

- A **matched** rule with greater ```order``` overrides any **matched** rules of lower ```order```.
- A **matched** ```deny``` rule always wins over ```allow``` rules of the same or lower ```order```.

Delegation is **fail-closed**: if no rule matches, the request is denied. The "admin acts as any user"
case above is simply a rule with no per-user condition.

> There are no act-as rules defined in the out-of-the-box configuration, so delegation is disabled by
> default.

## Requesting a delegated token

A client requests a delegated token from the
[token endpoint](/technical/oauth2_compatibility#endpoints) with the token-exchange grant:

```
POST /api/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=<the client's own client-credentials access token>
&subject_token_type=urn:ietf:params:oauth:token-type:access_token
&requested_subject=3f1c…user-uuid
&audience=backend
```

The request parameters are:

| Parameter                       | Required | Description                                                                                                                                                                                     |
|---------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ```grant_type```                | **YES**  | ```urn:ietf:params:oauth:grant-type:token-exchange```.                                                                                                                                         |
| ```subject_token```             | **YES**  | The client's **own** [client-credentials](/functional/client_authorization) access token. It proves the client is the actor — SympAuthy derives the `act` claim from it.                       |
| ```subject_token_type```        | **YES**  | ```urn:ietf:params:oauth:token-type:access_token```.                                                                                                                                           |
| ```requested_subject```         | **YES**  | The id of the user to act on behalf of.                                                                                                                                                        |
| ```resource``` / ```audience``` | NO       | The target [audience](/functional/audience) for the issued token. Must match a configured audience; defaults to the acting client's own audience.                                              |
| ```requested_token_type```      | NO       | If present, must be ```urn:ietf:params:oauth:token-type:access_token``` — only access tokens can be issued.                                                                                     |

The response is a standard token response with an additional ```issued_token_type```. **No refresh
token and no ID token are issued.** [DPoP](/functional/tokens#sender-constrained-tokens-dpop) applies
as usual: send a proof to receive a sender-constrained delegated token.

## The delegated access token

The issued token is a normal [access token](/functional/tokens#structure-of-an-access-token) with:

- ```sub``` — the target user,
- ```client_id``` — the acting client,
- ```act``` — ```{ "sub": "<acting client_id>" }```,
- no ```scope```.

It uses the standard
[access token expiration](/technical/configuration/authorization#auth-token).

## Single level of delegation

SympAuthy supports **only a single level of delegation**.
[RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693#section-4.1) allows a *chain* of actors: the
```act``` claim may itself nest another ```act``` claim to express "A is acting for B, which is acting
for C" (composite delegation). SympAuthy never produces such a chain:

- The issued ```act``` claim is always **flat** — a single ```{ "sub": "<acting client_id>" }``` naming
  the acting client, with no nested ```act```.
- A delegated token cannot itself be exchanged again. The ```subject_token``` of a token-exchange
  request must be a plain [client-credentials](/functional/client_authorization) access token (one with
  no user attached), so an already-delegated act-as token is rejected as a ```subject_token```.

Delegation therefore never extends beyond one hop: an acting client acts directly on behalf of the
target user, and nothing can act on behalf of that delegated identity in turn.
