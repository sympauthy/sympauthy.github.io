---
name: review-docs
description: Review SympAuthy documentation pages through four readers — a SympAuthy developer checking against the server code, an operator who knows authentication but not SympAuthy, an operator discovering authentication, and an integrator building a client application — plus a check of the repository's writing rules, all run in parallel; verify every finding and report what is unclear, wrong or against the writing rules. Use when asked to review the docs, a page, or the pages a branch changes.
argument-hint: "[page paths | diff]"
---

# Review the documentation

Several reviewers read the same pages in parallel, each reporting what they found unclear, wrong or against
the repository's writing rules. Every finding is checked before it is reported. The review reports; it does
not edit any page.

## 1. Decide what is reviewed

- Paths given as arguments (`docs/functional/claim_access.md`, `docs/technical/expressions/`): those pages.
- `diff`, or no argument: every Markdown page under `docs/` the current branch changes against `main`,
  committed or not:

  ```sh
  { git diff --name-only main...HEAD; git diff --name-only HEAD; git ls-files --others --exclude-standard; } \
    | grep '^docs/.*\.md$' | sort -u
  ```

- If that finds nothing, ask which pages to review rather than reviewing the whole site.

## 2. Fetch the server

The developer checks the pages against what the server does, so clone it into the session's scratchpad
directory before launching anyone:

```sh
git clone --depth 1 https://github.com/sympauthy/sympauthy.git <scratchpad>/sympauthy-server
```

If the clone already exists from earlier in the session, `git -C <scratchpad>/sympauthy-server pull` it
instead. `gh search code` returns nothing on that repository, so the clone is the only way to search it.

## 3. Launch the reviewers

Launch all five agents **in one message**, so they run in parallel, with the Agent tool:
`subagent_type: "general-purpose"`, `model: "fable"`, `effort: "high"`. Give each the page list, the shared
instructions below and its own brief: the four readers get the reader instructions and their persona, the
writing rules reviewer gets its own instructions.

### Shared instructions

> You are reviewing pages of the SympAuthy documentation, a VitePress site whose Markdown sources are under
> `docs/`. Internal links are root-relative without `.md`: `/functional/claim_access#doors` is
> `docs/functional/claim_access.md`, heading "Doors"; a link ending in `/` is that folder's `index.md`.
> Do not edit any file.
>
> For each point you report, give:
> - **Where** — `path:line`, and the exact words quoted.
> - **What is wrong** — what you understood, or could not, and why; or which rule it breaks.
> - **What would fix it** — what the reader needed to be told, which page should have told them, or the
>   wording that follows the rule.
> - **Severity** — `incorrect` (the page states something the server does not do), `blocking` (the reader
>   cannot go on or would configure something wrong), `confusing` (the reader goes on unsure), or `minor`.
>
> End with the pages you read and the links you followed. If you found nothing on a page, say so.

### Reader instructions

> Read each page as the reader described below would: top to bottom, following a link only when that
> reader would click it to understand what they are reading.
>
> Report **every point this reader would find unclear**: a term used before it is defined or never
> defined, a sentence that can be read two ways, a step or a reason that is missing, a statement that
> contradicts another page, an example that does not show what the text says it shows. Skip what is
> merely stylistic.

### Personas

**A SympAuthy developer.** You know the server's code and its design documents, and you read the
documentation to check that it says what the server does, precisely enough that nobody could read it into
something it does not do. The server is cloned at `<scratchpad>/sympauthy-server`: check every behaviour,
key, default, value and refusal the pages assert against `server/src/main/kotlin`,
`server/src/main/resources` (the shipped `application-default.yml`, `error_messages.properties`) and
`docs/design/*.md`. The design documents state rules more loosely than the code enforces them, so where
they disagree the code is the authority. Report a statement the server contradicts as `incorrect`, citing
the file and line that shows it. Also flag a statement that is vague where the behaviour is exact, a rule
stated without its exceptions, a key, value or error described in words the server does not use, and
anything another page states differently.

**An operator who knows authentication but not SympAuthy.** You run identity infrastructure and know
OAuth 2.1, OpenID Connect, scopes, consent and tokens well, but you have never deployed SympAuthy. Flag every
term SympAuthy coined or uses in its own sense without defining it or linking to its definition, every
place it departs from what the standards would lead you to expect without saying so, and every
configuration the page tells you to write without telling you where it goes or what it changes.

**An operator discovering authentication.** You are deploying an authentication server for the first time
and know what a login page and a password are, but not what a scope, a claim, a client or a token is
beyond the word. Flag every piece of jargon used before it is explained, every place the page assumes you
already know why something is done, and every point where you would not know what to do next.

**An integrator.** You develop an application that signs its users in through SympAuthy and calls its APIs:
you send authorization requests, exchange codes, read tokens and `/userinfo`, call the Client API, and test
against SympAuthy with its testcontainers module. You did not deploy the server and cannot change its
configuration. Flag every place the page does not tell you what your application sends, what it receives
back, what a refusal looks like and how to recover from it, and every place it describes the server's
configuration without telling you what that changes for your application.

### Writing rules reviewer

> Read the writing rules in `.claude/rules/*.md` at the repository root. Each file's `paths` frontmatter
> says which pages it applies to: check each page against every rule of every file covering it, and report
> each place a page breaks one, quoting the rule and naming its file. Do not report anything the rules do
> not ask for.

## 4. Verify the findings

Once every reviewer has reported, check each finding before it reaches the user:

1. Re-read the quoted words in their page, with the paragraphs around them. Drop a finding whose reviewer
   misread the page, or that the page answers where the reader was reading.
2. For an `incorrect` finding, open the server file and line it cites and confirm the server does what the
   finding says. Drop it, or lower it to `confusing`, if it does not.
3. For a writing rules finding, confirm the rule it quotes says what the finding claims.

Keep a list of every finding dropped or lowered, and why.

## 5. Report

1. Merge the findings that are the same problem, noting which reviewers raised it — a point several
   reviewers hit comes first within its severity.
2. Group by page, and within a page order by severity: `incorrect`, `blocking`, `confusing`, `minor`. Give
   each finding its `path:line`, the quote, the reviewers who raised it and what would fix it.
3. Write the report to the session's scratchpad directory as
   `docs-review-<branch>-<YYYY-MM-DD>.md`, with the dropped and lowered findings in a last section, and give
   the user its path.
4. In the reply, summarise the counts per severity and show the `incorrect` and `blocking` findings in
   full; point to the file for the rest.

Do not fix anything until the user says which points to act on.
