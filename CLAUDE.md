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

- Internal links use root-relative paths without `.md` extension: `/technical/configuration`
- YAML examples should only illustrate the feature they document — do not inject unrelated config keys into existing examples
- Configuration reference tables (`docs/technical/configuration/`) must list keys in alphabetical order
- Verify the build succeeds (`npm run docs:build`) after making changes

## Merging a Pull Request

Merge with **squash**, and clean up afterwards:

```sh
gh pr merge <number> --squash --delete-branch   # deletes the remote and local branch
git checkout main
git pull
```

`--delete-branch` removes the local branch too, so the only step left is returning to `main` and
pulling the squashed commit. Do not leave the merged branch behind on the remote.
