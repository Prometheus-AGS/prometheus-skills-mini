# `versions.toml` — the version authority

`CLAUDE.md` §0.2: *"Read `versions.toml` before any dependency or architecture decision. It is
authoritative; agents do not edit it."* This document describes the file's shape so it can be written
once, correctly. **The operator writes it. An agent reads it and never edits it** — including an agent
that has just proposed every value in it.

`rules/lib/versions-toml.mjs` parses it and compares it to the tree;
`rules/test/versions-toml.test.mjs` fails on any disagreement and reports `todo` while the file is absent,
so a missing authority is visible rather than silently tolerated.

## Shape

A minimal subset of TOML: tables, string values, inline tables, comments. No arrays of tables, no
multi-line strings — the reader implements only what this document describes, so anything richer is a
parse error rather than a silent misread.

```toml
# versions.toml — authored by the operator. Agents read this file; they never write it.

[node]
minimum = ">=22"          # must equal package.json engines.node, exactly

[submodules]
# "<path under the repository root>" = "<full or short commit sha>"
# Each path must be a gitlink in HEAD at exactly this commit.
"tools/prometheus-knowledge" = "abb6745"

[images]
# "<service name as it appears in docker/compose.yaml>" = { ... }
# Either digest (preferred — a tag is mutable) or built_from_submodule = true.
"surrealdb"      = { image = "surrealdb/surrealdb:v3.0.5", digest = "sha256:…" }
"liter-llm"      = { built_from_submodule = true, submodule = "tools/liter-llm" }
"surreal-memory" = { built_from_submodule = true, submodule = "tools/surreal-memory-server" }

[npm]
# Pins for the isolated site/ dependency tree. The root package.json has no dependencies.
"@docusaurus/core"           = "3.10.2"
"@docusaurus/preset-classic" = "3.10.2"
```

### What the test enforces

| Rule | Failure |
|---|---|
| The file exists | `todo` with "operator has not authored versions.toml" — never a vacuous pass |
| Every `[submodules]` path is a gitlink in `HEAD` at that commit | names the path, the file's commit and the tree's commit |
| `[node] minimum` equals `package.json` `engines.node` | names both values |
| Every `[images]` entry has `digest` **or** `built_from_submodule = true` | names the entry |
| A `built_from_submodule` entry names a `submodule` that `[submodules]` also pins | names the entry |

Short shas are compared by prefix against the tree's full sha, so `abb6745` matches
`abb6745e31da7577611d7c32005af26a72254484`.

## Proposed values

**These are proposals from `analysis.md` Q1 and Q1a, not decisions.** The operator accepts, changes or
rejects each one; the file as written is the authority regardless of what was proposed here.

| Key | Proposed | Where it came from |
|---|---|---|
| `[node] minimum` | `">=22"` | already `package.json` `engines.node`; the CI matrix runs 22 and 24 |
| `tools/prometheus-knowledge` | `abb6745` | already vendored and pinned (change `okf-v02-via-pk`) |
| `tools/openspec` | `d39ca5a` | the Prometheus OpenSpec fork, 1.13.1, +2/−0 vs upstream (the CRLF-preservation fix) |
| `tools/sycophancy-correction` | **a post-fix fork commit — not `bc348fff`** | `bc348fff` is the *audit baseline*, where the four blockers still exist; the pin is the commit that fixes them |
| `tools/compass` | a **tag** on `GQAdonis/compass` `main` | the fork checkout is dirty and on a side branch; the pin must be a clean tagged commit |
| `tools/liter-llm` | `c5c6caac` | the skill pack's own pin; build context only |
| `tools/surreal-memory-server` | `452dab1` | the skill pack's own pin; build context only |
| `tools/rust-mcp-filesystem` | `d977fbd` — **only if the-boss does not take it** | analysis Q3 assigns it to the-boss; then it does not belong here at all |
| `surrealdb` image | `surrealdb/surrealdb:v3.0.5`, digest resolved when `docker/` lands | both upstream compose files pin this tag |
| `@docusaurus/core`, `@docusaurus/preset-classic` | `3.10.2` | current on npm (2026-09-18), and the version the full pack's site pins |

## Why this file gates five changes

Changes `openspec-fork-submodule`, `docs-site`, `docker-services`,
`sycophancy-correction-vendored` and `compass-vendored` each begin with a task asserting that
`rules/test/versions-toml.test.mjs` **passes** — not `todo`. Until the operator authors the file, those
changes stop at their first task and say so. The four changes that pin nothing
(`review-housekeeping`, `pack-doctor`, `the-boss-handoff`, `open-port-phases`) run regardless.
