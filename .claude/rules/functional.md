---
paths:
  - "docs/functional/**/*.md"
---

# Writing rules for the functional documentation

- A term a newcomer to SympAuthy would not understand — one this project coined, like a claim ACL's *door* — is
  defined on the functional page that owns the notion, under a heading of its own, so other pages can link to it.
  Define it plainly by what it is before using it to explain anything.
- A functional page goes from high level to low level: what the notion is and why it exists first, then how it
  behaves, and the edge cases, exceptions and configuration last.
- Each section follows the same order within itself: it opens with what the reader needs to know at that level,
  and the detail comes under a deeper heading — a `###` under its `##`, a `####` under its `###`. The heading
  level tells the reader they are digging deeper, so one who has what they came for can skip to the next heading
  of the same level.
- The first paragraph lets readers decide whether the page is the one they need. It explains the notion at a high
  level, in words a newcomer to SympAuthy understands, and ends with a short list of the subjects the page covers.
