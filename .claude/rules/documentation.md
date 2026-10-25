---
paths:
  - "docs/**/*.md"
---

# Writing rules for the whole documentation

- Internal links use root-relative paths without `.md` extension: `/technical/configuration`
- YAML examples should only illustrate the feature they document — do not inject unrelated config keys into existing
  examples. An example is about its own feature, not a complete reference of the object it configures: a new key
  goes into an example only when the example is about it, or into a new example of its own.
- Don't count a set that can grow: write "the doors a token comes through", not "the four token doors", and list
  the members when they matter. A number goes stale the day a member is added, and nothing points at it. Counting a
  set that is closed — the removed keys of a migration, the conditions of one example — is fine.
- A term a newcomer to SympAuthy would not understand — one this project coined, like a claim ACL's *door* — links to
  its definition on the [functional page that owns it](functional.md) on its first use on every other page.
- A new section is no longer than the sections around it on the same page. Material with no natural home — log
  lines an operator must act on, with no operations page — is compressed into a small table rather than quoted as
  prose blocks.
