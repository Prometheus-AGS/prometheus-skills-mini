## Context

CRLF tolerance today is one untested line (`readText` in `rules/build.mjs:18`), and `splitFrontmatter` in `rules/lib/render.mjs` rejects CRLF outright — probed directly, it throws "has no `paths:` frontmatter". `.gitattributes` (from `project-scaffold`) protects this repository only; OKF bundles cloned from other repositories in later phases can still arrive as CRLF. Candidates: cand-019, cand-018.

## Goals / Non-Goals

**Goals**
- One place that knows where home, temp and state live; one place that reads text.
- `rules/build.mjs` as the first consumer, so nothing is tested before it is in a call graph (A-9).

**Non-Goals**
- CR-only or mixed line endings — unobserved.
- Any file writing (next change).
- An OKF frontmatter parser (a later phase; it will inherit `readText`).

## Decisions

- **Normalise in the reader AND make the parsers tolerant** — `splitFrontmatter` is exported and callable without the reader, so defence in depth is cheap and removes a trap for the next caller. *Alternative considered:* normalise only in the reader — rejected for that reason.
- **Inject roots rather than mock `node:os`** — pure functions of their inputs are trivially testable on every OS and cannot write to the real home directory by accident.
- **`stateDir` roots at `<home>/.prometheus`** — matches the source pack's on-disk contract so projects can move between packs.

## Risks / Trade-offs

- `rules/lib/render.mjs` is touched by this change and `rules/build.mjs` by this and the next; they are serialised in the plan for that reason.
- The CRLF-working-tree scenario needs a temp copy of the repository; it must use `tempDir()` and clean up.
