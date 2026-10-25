---
paths:
  - "docs/technical/**/*.md"
---

# Writing rules for the technical documentation

## Configuration pages (`docs/technical/configuration/`)

These are quick-reference pages: operators scan the table for the key they need.

- Reference tables list keys in alphabetical order.
- A page is an H1, a short intro, a `## section` table per configuration prefix and an `## Example`. Context that
  matters to every key — "these headers are always allowed and cannot be removed" — goes in the intro under the
  title, never in a `:::details` or other collapsible block.
- A key's behaviour goes in its table row's Description cell — caveats like replace-not-extend, validation rules,
  defaults — rather than in a `### key` prose subsection of its own.
- A Description cell says what the key sets, not what the behaviour costs. What an end-user observes, what a
  request is refused with, what happens to existing state when the value changes belongs on the functional page
  for the notion and on `docs/technical/security.md`, even when it is accurate and wanted.
- No prose saying a key is required with no fallback, that a deployment missing it gets `config.missing`, or
  naming the `config.*` code a bad value is refused with. The `Required` column and a short "must be greater than
  zero" in the Description already carry it.
- Log lines are described by what they mean and what to do about them, with today's cases as examples rather than
  a list — not quoted in the server's wording, which evolves and gains cases.
