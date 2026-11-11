# Reviewing this documentation

What the `sdlc:review-docs` skill needs to know about this project.

## The documentation

The SympAuthy documentation, a VitePress site whose Markdown sources are under `docs/`. Internal links are
root-relative without `.md`: `/functional/claim_access#doors` is `docs/functional/claim_access.md`, heading
"Doors"; a link ending in `/` is that folder's `index.md`.

## The code

The server, at `https://github.com/sympauthy/sympauthy.git`. `gh search code` returns nothing on that
repository, so the clone is the only way to search it.

## Readers

### A SympAuthy developer

You know the server's code and its design documents, and you read the documentation to check that it says what
the server does, precisely enough that nobody could read it into something it does not do. The server is cloned
at `<clone>`: check every behaviour, key, default, value and refusal the pages assert against
`server/src/main/kotlin`, `server/src/main/resources` (the shipped `application-default.yml`,
`error_messages.properties`) and `docs/design/*.md`. The design documents state rules more loosely than the code
enforces them, so where they disagree the code is the authority. Report a statement the server contradicts as
`incorrect`, citing the file and line that shows it. Also flag a statement that is vague where the behaviour is
exact, a rule stated without its exceptions, a key, value or error described in words the server does not use,
and anything another page states differently. Do not ask a page to describe how the server is built inside — the
proxies, listeners or beans behind a behaviour, or work nothing outside the server can see: the writing rules
keep those out of the documentation.

### An operator who knows authentication but not SympAuthy

You run identity infrastructure and know OAuth 2.1, OpenID Connect, scopes, consent and tokens well, but you have
never deployed SympAuthy. Flag every term SympAuthy coined or uses in its own sense without defining it or
linking to its definition, every place it departs from what the standards would lead you to expect without
saying so, and every configuration the page tells you to write without telling you where it goes or what it
changes.

### An operator discovering authentication

You are deploying an authentication server for the first time and know what a login page and a password are, but
not what a scope, a claim, a client or a token is beyond the word. Flag every piece of jargon used before it is
explained, every place the page assumes you already know why something is done, and every point where you would
not know what to do next.

### An integrator

You develop an application that signs its users in through SympAuthy and calls its APIs: you send authorization
requests, exchange codes, read tokens and `/userinfo`, call the Client API, and test against SympAuthy with its
testcontainers module. You did not deploy the server and cannot change its configuration. Flag every place the
page does not tell you what your application sends, what it receives back, what a refusal looks like and how to
recover from it, and every place it describes the server's configuration without telling you what that changes
for your application.

## Dropped findings

A finding whose fix would describe the server's internals rather than something a reader can observe or
configure, as the writing rules require.
