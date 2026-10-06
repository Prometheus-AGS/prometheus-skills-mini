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

The full pack supports its skills profile on Windows through Git Bash or WSL; its native service profile is macOS/Linux. Mini implements its local process workflow with Node ESM, copy delivery and no Python or shell dependency in the pack's runtime. External harnesses and optional services have their own prerequisites and acceptance limits.

## What's actually ported today

The generated [Skills Catalog](/docs/catalog) lists the distribution inventory. It includes portable UI/UX entries from the shared catalog. Mini excludes the full-only Impeccable native engine and
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

## Optional services

Mini supports independently configured surreal-memory and a liter-llm gateway. The Windows-oriented Compose stack adds SurrealDB beneath surreal-memory; its namespace/database is `memory/main_local_384`. Native full-pack configuration uses `memory/mcp` and is a separate installation. Follow [service operations](/docs/services/docker-services) for ownership, data and platform limits.

Local KBD state and the memory outbox do not require a live service. A missing gateway does not turn a same-model fresh-context review into independent QA: a native fallback needs recorded distinct-model evidence, or independent review remains pending. Mini's scoped memory source supports the canonical REST contract and a durable file tier; it does not include the full Python learning writer, Cortex feeder, project cards or intake executor. Source changes and regenerated installed artifacts are separate evidence boundaries.

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
