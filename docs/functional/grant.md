# Grant

A **grant** is the record of what a client was allowed. Every token SympAuthy issues — access, refresh and ID alike —
is issued under a grant, and a token is in service only while its grant is.

The grant is what makes signing an end-user out a single act. However often a client refreshed its tokens, everything
it holds for one authorization stands under the one grant, so taking that grant out of service takes every one of those
tokens with it, at the same instant.

## What a grant records

A grant holds what every token under it has in common:

- The **end-user** it was opened for — absent for a [`client_credentials`](/functional/client_authorization) grant,
  which no person is behind.
- The **client** that was allowed, and the **[audience](/functional/audience)** the grant was opened for.
- The **[scopes](/functional/scope)** — consented, granted and client scopes — and when and how each set was obtained.
- **When the end-user authenticated**, which every token under the grant states as
  [`auth_time`](/functional/tokens#when-the-user-authenticated).
- The **[claims the authorization asked for](/functional/claims#asking-for-a-claim-in-the-request)** by name, so a
  token minted months later honours the same request the first one did.

A token keeps only what is its own: its type, its expiry, and the
[DPoP](/functional/tokens#sender-constrained-tokens-dpop) key it is bound to.

## When a grant is opened

Three things open a grant:

- an **[interactive flow](/functional/interactive_flow)** that completes — the grant is opened as the flow ends, just
  before the authorization code is handed out, and exchanging that code issues tokens under it;
- a **`client_credentials`** request;
- a **[token exchange](/functional/delegation)**, which opens an act-as grant recording the grant of the token the
  acting client presented.

**A refresh opens none.** It issues its tokens under the grant of the refresh token it was given, which is why
`auth_time` does not move when a client refreshes: the authentication is the grant's, not the token's.

## How long a grant lives

By default a grant has no lifetime of its own. It lasts as long as its client keeps refreshing, and the end-user signs
in again only once the [refresh token](/functional/tokens#refresh-token) expires.

Setting [`auth.token.grant-expiration`](/technical/configuration/authorization#auth-token) gives every grant an
**absolute lifetime that no refresh extends**. Once it has passed, the refresh is refused however long the refresh
token itself had left, and the end-user signs in again. Every token issued under a grant also expires no later than the
grant does — an access token issued a minute before the grant ends says so in its `exp`, so a resource server stops
honouring it when the grant stops.

## What takes a grant out of service

A grant is revoked, never one token of it. Each of these signs the end-user out of everything the grant covers:

- an administrator's **force logout** through the [Admin API](/technical/api/admin#force-logout), for every client or
  for one;
- the client's own call to the **[revocation endpoint](/technical/security#revocation)** — whichever token it presents,
  an access token as surely as a refresh token;
- the end-user's **[consent](/functional/consent#revoking-consent)** being revoked, which reaches every grant that
  end-user holds for the audience;
- the **authorization code being presented a second time**, which
  [revokes the grant it was issued under](/technical/security#authorization-code-security).

An authorization code not yet exchanged is reached with its grant too: a consent revoked, or an end-user signed out,
between the sign-in and the exchange leaves the code unspendable.

## A grant does not outlive its client

When a deployment [removes a client](/technical/configuration/client#removing-a-client) from its configuration, every
token of every grant opened for that client is refused on every surface. The grants are **refused, not revoked** —
nothing is written to them — so re-declaring the same client id serves their unexpired tokens again.

A grant also belongs to the audience it was opened for. Moving a client to another audience ends the grants it already
holds: their tokens were issued for an audience the client has left, and a consent revoked for that audience could no
longer reach them.

## Delegation follows the actor's grant

A grant opened by a [token exchange](/functional/delegation) records the grant of the token the acting client
presented — its own `client_credentials` grant. The delegation never outlives it: revoking that token takes every
delegated token obtained from it out of service, and so does letting its grant expire.

## What a grant is not

- **It is not shown to the client.** [Grant Management](/technical/oauth2_compatibility#features), which would let a
  client query and revoke a grant by identifier, is not served.
- **It is not an audit trail.** A revoked grant is deleted with its tokens on the next
  [scheduled sweep](/technical/configuration/advanced#scheduled-cleanups), and so is a grant left with no token and no
  code. Who revoked it, and when, goes with it.

## Relation to other concepts

- **[Tokens](/functional/tokens)** — every token is issued under a grant and refused once its grant is gone.
- **[Consent](/functional/consent)** — a consent is the audience's, and revoking it revokes every grant the end-user
  holds for that audience.
- **[Audiences](/functional/audience)** — a grant is opened for one audience and cannot serve another.
- **[Clients](/functional/client)** — a grant is opened for one client, and does not outlive its declaration.
- **[Delegation](/functional/delegation)** — an act-as grant rests on the act-as rules and on the actor's own grant,
  not on a consent.
