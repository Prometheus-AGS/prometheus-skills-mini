---
title: Introduction
sidebar_label: Introduction
slug: /intro
---

# Prometheus Skills Mini

`prometheus-skills-mini` is a Windows-native, scaled-down port of
[`prometheus-skill-pack`](https://github.com/Prometheus-AGS/prometheus-skill-system) (the "full
pack") that keeps one thing and keeps it working everywhere: **the KBD development process,
driven by skills, with OpenSpec as the spec backend, and Karpathy-style progress logging** — on
Windows, macOS, and Linux, with no Git Bash, no Python, and no WSL in anything the pack itself
runs.

## Why a mini port exists

The full pack's own `skill-system.json` states its Windows posture plainly: Windows is supported
only through Git Bash or WSL, and the "full" install profile is macOS/Linux only. The full pack's
tree has 73 `.sh` files under `shared/scripts/`, 117 more under `skills/process/`, hooks that
probe for `bash -c 'exit 0'` and fail with `MISSING_SHELL` when neither Git Bash nor a compiled
binary exists, a hard `jq` dependency, Python on several critical paths (a 671-line
`record-progress.py`), and 11 of 13 install targets that use symlinks — every one of these is
either impossible or fragile on a stock Windows 10/11 box without WSL.

This repository is the answer: the same KBD lifecycle, the same skill-driven workflow, rewritten
as pure Node.js ESM modules with no shell scripts, no Python, and no symlinks anywhere in the
install or runtime path.

## What's actually ported today

As of the `feat(kbd): port the KBD process orchestrator and 49 skills to Windows-native Node`
commit, this is **not** a proposal document — the KBD lifecycle, adversarial review,
ideation-mindmap, Karpathy progress memory, and the plugin distribution system are real, tested
Node.js code:

- **50 skills** under [`skills/`](https://github.com/Prometheus-AGS/prometheus-skills-mini/tree/main/skills) — see the [Skills Catalog](/docs/catalog) for the full list with real frontmatter descriptions.
- **`lib/kbd/`** — the 12-module KBD state-machine core (position, progress, waypoint, stage
  gates, hooks, memory, rollup, and more). See [KBD Overview](/docs/kbd/overview).
- **`lib/review/`** — the adversarial-review judge/producer isolation pipeline. See
  [Adversarial Review](/docs/review/adversarial-review).
- **`lib/ideation/`** — ideation-mindmap's independent-dispatch verification. See
  [Ideation Mindmap](/docs/ideation/ideation-mindmap).
- **`lib/karpathy/`** — durable, idempotent progress recording. See
  [Karpathy Progress Memory](/docs/karpathy/progress-memory).
- **`lib/distribution/`** — the plugin/marketplace generator for Claude Code and Codex. See
  [Plugin Distribution](/docs/distribution/plugin-marketplace).

Over 1,000 tests pass on macOS as of that commit. **Windows itself remains unverified for the
Phase C work** — everything in that batch ran on macOS; Windows verification for the newest code
is still owed, the same caveat the project has recorded for every phase before it. The
`platform-foundation` phase's own Windows claims (atomic writes, locking, CRLF handling,
shell-free spawning) *are* independently CI-verified on `windows-latest`.

## Two services, not eleven

The full pack's runtime surface includes SurrealDB, surreal-memory, a liter-llm gateway,
`prometheus-knowledge`, `forge-rs`, `openai-proxy`, `prometheus-exec`, and a learning-worker timer
— eight-plus daemons. This pack keeps exactly two, because the KBD/adversarial-review loop
genuinely needs them:

1. **surreal-memory** (backed by SurrealDB) — agent memory, ideation-mindmap.
2. **liter-llm gateway** — the cross-model critic and judge for adversarial review.

On Windows both run under Docker Compose (`docker/compose.yaml`). On macOS/Linux they run exactly
as in the full pack today. The KBD loop keeps working when both are down: memory writes fall back
to a durable local outbox, and review falls back to a fresh-context subagent recording
`isolation_mode=harness-native`.

## Where to go next

- [Installation](/docs/getting-started/installation) — how this pack is distributed and installed.
- [npm scripts](/docs/getting-started/npm-scripts) — every script in `package.json` explained.
- [KBD Overview](/docs/kbd/overview) — the lifecycle state machine.
- [Windows constraints](/docs/platform/windows-constraints) — the rules every contribution follows.
- [Comparison with the full pack](/docs/reference/comparison-with-full-pack) — what's ported, what's deliberately excluded, what's still a gap.

## Running this site locally

```bash
cd site
npm install
npm start
```

It deploys to GitHub Pages via
[`.github/workflows/docs-pages.yml`](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/.github/workflows/docs-pages.yml)
on every push to `main` that touches `site/`, `docs/`, or any `skills/**/SKILL.md`.
