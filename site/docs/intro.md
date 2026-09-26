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

The original port analysis recorded that the full pack's `skill-system.json` stated its Windows posture plainly: Windows is supported
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

The current distribution contains **97 skills**, including **40 portable UI/UX entries**
from the shared 41-entry catalog. Mini excludes the full-only Impeccable native engine and
ships a bounded context/workflow adaptation. See the [Skills Catalog](/docs/catalog) for
actual frontmatter descriptions and user-only invocation labels.

- **UI/UX routing** — context-first selection, TypeScript 7/Node Pro Max, craft and platform
  guidance, and independent completed-phase review. [UI/UX routing and adoption](/docs/ui-ux/overview).
- **Agent teams** — proposal export plus project installation, active-team discovery and
  preservation of native ownership/configuration. [Agent Teams](/docs/agent-teams/overview).

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

Verification is scoped to a recorded phase and environment. Historical platform-foundation
Windows CI does not certify new UI/team behavior. The
[UI/team delivery record](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/research/ui-ux-routing/DELIVERY.md)
records macOS and offline Linux-container integration evidence. Native Windows execution,
live invocation of every harness and full Electron installed-app acceptance remain open;
no release certification is claimed here.

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
- [UI/UX routing and adoption](/docs/ui-ux/overview) — project installation, selective skills and evidence.
- [Agent Teams](/docs/agent-teams/overview) — creation, project adoption and native limits.
- [KBD Overview](/docs/kbd/overview) — the lifecycle state machine.
- [Windows constraints](/docs/platform/windows-constraints) — the rules every contribution follows.
- [Comparison with the full pack](/docs/reference/comparison-with-full-pack) — what's ported, what's deliberately excluded, what's still a gap.

## Running this site locally

```bash
cd site
npm ci
npm run generate:catalog
npm start
```

It deploys to GitHub Pages via
[`.github/workflows/docs-pages.yml`](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/.github/workflows/docs-pages.yml)
on every push to `main` that touches `site/`, `docs/`, or any `skills/**/SKILL.md`.
