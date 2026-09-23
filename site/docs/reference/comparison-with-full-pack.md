---
title: Comparison with the Full Pack
sidebar_label: Comparison
---

# Comparison with `prometheus-skill-pack`

This page reflects the tree as of commit `8497ae8` ("port the KBD process orchestrator and 49
skills to Windows-native Node") — the Phase C port that closed the KBD/adversarial-review/
ideation-mindmap/distribution gap. Every claim below is checked against the actual `skills/`,
`lib/`, `scripts/`, and `docker/` trees, not against this repository's own earlier planning
documents, which predate that commit and are stale in places (notably, an earlier `README.md`
revision stated flatly "the foundation is built and verified; the port itself has not started" —
that sentence is no longer true for the KBD family).

## What is ported and real today

| Capability | Status |
|---|---|
| KBD lifecycle (24 skills: parent + 22 sub-skills + `kbd-evolve`/`kbd-goal-check`) | **Ported.** See [KBD Skills](/docs/kbd/skills). |
| KBD state-machine core (`lib/kbd/`, 12 modules) | **Ported**, 230 tests. |
| Adversarial review (`lib/review/`, `skills/adversarial-review/`) | **Ported**, 176 tests. Cross-model judge dispatch, packet builder, sycophancy anti-theater gate, decision log, model-role resolution. `python3` and `curl` eliminated. |
| Ideation mindmap (`lib/ideation/`, `skills/ideation-mindmap/`) | **Ported**, 38 tests. Independent-dispatch recording and structural verification. |
| Karpathy progress memory (`lib/karpathy/`) | **Ported** (already complete in a prior session; verified, not rebuilt, in the Phase C commit). |
| Plugin/marketplace distribution (`lib/distribution/`, `skill-system.json`) | **Ported**, 61 tests. Claude Code + Codex packages, both marketplaces, the slash-command generator. Copy-mode throughout, never symlink. |
| Artifact refinement (`lib/refiner/`, 20 skills) | **Ported.** See [Artifact Refinement](/docs/artifact-refinement/overview). |
| OpenSpec integration (12 skills × 4 harnesses) | **Ported and the default planning backend.** |
| Platform primitives (`lib/platform/`) | **Ported and CI-verified on Windows** (`platform-foundation` phase): atomic write, lock, CRLF-tolerant text, shell-free spawn. |
| Docker services (`docker/compose.yaml`, `docker/compose.build.yaml`, `scripts/services.mjs`) | **Ported.** Three containers (SurrealDB, surreal-memory, liter-llm), loopback-bound, env-file secrets, named volumes, memory limits, digest-pinned SurrealDB image. This was listed as a future roadmap item in earlier documentation; it now exists on disk. |
| Doctor (`lib/doctor/`, `skills/doctor/`) | **Ported.** Runtime, KBD position, services, optional tools, home-directory skill copies, and the install-scope rule, in that report order. |
| Context bootstrap (`lib/context-bootstrap/`) | **Ported.** |

## What is a deliberate exclusion (not a gap)

These are excluded by explicit constraint, not because porting them was deferred:

| Excluded | Why |
|---|---|
| ZeeSpec | `openspec/config.yaml` binding constraint: OpenSpec is the default; no ZeeSpec anywhere. |
| Python anywhere | Hard constraint (C4 in the original port analysis). Every Python call site in the source pack (record-progress.py, state-* scripts' `python3` invocations) was translated to Node stdlib (`JSON.parse`/`stringify`, `crypto.randomUUID()`, `toISOString()`). |
| Shell scripts (`.sh`) | Hard constraint. Hooks use exec-form Node commands exclusively. |
| Symlink-based installs | This pack's installer and distribution generator are copy-mode only — the full pack symlinks 11 of 13 install targets, which needs Developer Mode or elevation on Windows. |
| The Rust execution substrate (`prometheus-exec`, `substrate/*`, the research daemon, the surface bridge) | Unix-socket daemons and sandbox machinery with no Windows-native design; explicitly out of scope for this pack's process-focused architecture. |
| `prometheus-knowledge`'s HTTP companion (`pk-cherry`) and its learning-worker timer daemon | This pack replaced the timer/worker model with durable receipts flushed opportunistically at SessionStart — see [Karpathy Progress Memory](/docs/karpathy/progress-memory). |
| React/entity-management skills, DevOps/GitOps skills, BDD/Cucumber testing skills | Deliberately out of this pack's scope; the full pack's breadth in these areas is not being replicated here. |
| `karpathy-tokenizer` | Despite the name, it trains BPE tokenizers via Python (`rustbpe`, `tiktoken`) — unrelated to Karpathy *logging*, and a Python dependency either way. |
| `native-agent` / `start-business-build` | Generates a full service stack by design (Docker + surreal-memory + `pk` + liter-llm as *application* dependencies, not this pack's own two services) — out of scope for a process-focused mini pack. |

## Genuine remaining gaps

These are things the project has named as still missing, distinct from the deliberate exclusions
above:

- **Deep research.** Planned as a checkpoint-only Node port (`openspec/config.yaml`: "deep-research
  ... runs in checkpoint mode only"; the Rust `prometheus-research` server is explicitly not
  shipped). Not present in this checkout as a skill yet.
  Sycophancy correction (as a standing hook, not the review-pipeline gate)
  is optional and off by default per the original port analysis — the review pipeline's own
  `lib/review/sycophancy-binary.mjs`/`sycophancy-gate.mjs` are ported and active; a project-wide
  `sycophancy-correction` MCP server integration is a separate, still-optional item.
- **Windows runtime verification for the Phase C batch.** `platform-foundation`'s Windows claims are
  CI-verified on `windows-latest`. The later KBD/adversarial-review/ideation-mindmap/distribution
  work (1,000+ tests) ran on macOS only as of the port commit — Windows verification for that batch
  is recorded as still owed, not assumed passing.
  See [Windows Constraints](/docs/platform/windows-constraints).
- **`versions.toml`'s `[npm]` table.** `docs/versions-toml.md` documents a proposed `[npm]` table
  pinning `@docusaurus/core`/`@docusaurus/preset-classic` for this very docs site, gating a
  `docs-site` OpenSpec change. As of this writing, `versions.toml` has `[node]`, `[submodules]`, and
  `[images]` tables, but no `[npm]` table yet — the operator has not authored it. This documentation
  site itself was built ahead of that formal gate being satisfied; `rules/test/versions-toml.test.mjs`
  will need an `[npm]` entry before a `docs-site` OpenSpec change can pass its own first task.
- **Neither container stack has been run on real Windows hardware.** The Compose design is derived
  from reading Dockerfiles/Compose files; image build time, VM memory during build, and first-start
  model download for local embeddings remain unmeasured on Windows, per the original port analysis's
  own open questions.
- **Rust toolkit skills remain thinner than the full pack's.** This pack has one house-router skill
  (`prometheus-rust-workspace`) that routes to externally-installed skills rather than vendoring a
  full parallel set of `mcp-server`/`rust-cli`/`workspace-structure`/etc. skills the way the full
  pack does. See [Rust Workspace Guidance](/docs/rust/prometheus-rust-workspace).

## Skill count

This pack ships **50 skill directories** under `skills/` (confirmed by direct directory listing),
versus the full pack's much larger multi-hundred-skill catalog spanning many domains this pack does
not attempt to cover (React/entity development, DevOps/GitOps, BDD testing, Feynman learning,
broad multi-language guidance, native-agent generation, and more). See the
[Skills Catalog](/docs/catalog) for the complete, generated list.

## See also

- [Introduction](/docs/intro) — the top-level framing of why this port exists.
- [Windows Constraints](/docs/platform/windows-constraints) — the rules every ported capability follows.
