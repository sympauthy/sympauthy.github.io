# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Documentation site for SympAuthy, an open-source authentication & authorization server. Built with VitePress (v2 alpha).

## Commands

- `npm run docs:dev` — Start dev server with hot-reload (default: http://localhost:5173)
- `npm run docs:build` — Build for production (output: `docs/.vitepress/dist`)
- `npm run docs:preview` — Preview production build locally

Requires Node.js 24 LTS (see `.nvmrc`). Use `nvm install && nvm use` if using nvm.

## Architecture

This is a pure documentation site — no application code, no tests. All content is Markdown processed by VitePress.

- `docs/.vitepress/config.ts` — VitePress configuration: site metadata, nav bar, sidebar structure. **When adding a new page, you must add it to the sidebar config here.**
- `docs/` — All documentation pages as `.md` files, organized into:
  - `functional/` — What SympAuthy does (authentication, tokens, scopes, claims, consent, etc.)
  - `technical/` — How to configure and integrate (APIs, configuration, security, OAuth2 compatibility)
    - `technical/configuration/` — Configuration documentation, split by concern (database, mail, client, authorization, etc.). Each page covers one topic; the `index.md` is the overview with links to sub-pages.
  - `getting-started/` — Onboarding guide
  - `testcontainers/` — The testcontainers module integrators use to test against SympAuthy

## Writing Conventions

The writing rules live in `.claude/rules/`, one file per scope, each loaded for the pages its `paths` cover:

- `.claude/rules/documentation.md` — every page under `docs/`
- `.claude/rules/technical.md` — `docs/technical/`
- `.claude/rules/functional.md` — `docs/functional/`

Verify the build succeeds (`npm run docs:build`) after making changes.

## Reviewing the Documentation

What a documentation review, such as `sdlc:review-docs`, needs to know about this project.

The server's code is at `https://github.com/sympauthy/sympauthy.git`. `gh search code` returns nothing on that
repository, so a clone is the only way to search it, and `<clone>` below is where it is.

A finding is dropped, whichever reader raised it, when its fix would describe the server's internals rather than
something a reader can observe or configure, as the writing rules require.

### Readers

#### A SympAuthy developer

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

#### An operator who knows authentication but not SympAuthy

You run identity infrastructure and know OAuth 2.1, OpenID Connect, scopes, consent and tokens well, but you have
never deployed SympAuthy. Flag every term SympAuthy coined or uses in its own sense without defining it or
linking to its definition, every place it departs from what the standards would lead you to expect without
saying so, and every configuration the page tells you to write without telling you where it goes or what it
changes.

#### An operator discovering authentication

You are deploying an authentication server for the first time and know what a login page and a password are, but
not what a scope, a claim, a client or a token is beyond the word. Flag every piece of jargon used before it is
explained, every place the page assumes you already know why something is done, and every point where you would
not know what to do next.

#### An integrator

You develop an application that signs its users in through SympAuthy and calls its APIs: you send authorization
requests, exchange codes, read tokens and `/userinfo`, call the Client API, and test against SympAuthy with its
testcontainers module. You did not deploy the server and cannot change its configuration. Flag every place the
page does not tell you what your application sends, what it receives back, what a refusal looks like and how to
recover from it, and every place it describes the server's configuration without telling you what that changes
for your application.

## Merging a Pull Request

Merge with **squash**, and clean up afterwards:

```sh
gh pr merge <number> --squash --delete-branch   # deletes the remote and local branch
git checkout main
git pull
```

`--delete-branch` removes the local branch too, so the only step left is returning to `main` and
pulling the squashed commit. Do not leave the merged branch behind on the remote.
