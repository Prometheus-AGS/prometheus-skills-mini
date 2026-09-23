# Mini vs. Full Skill System

> **Updated for Phase C** (`feat(kbd): port the KBD process orchestrator and 49 skills to
> Windows-native Node`). This document previously described a checkout from before that phase
> landed; several rows below that said "not yet shipped," "planned, not currently shipped," or
> "none shipped yet" were true then and are **no longer true**. Every row has been re-verified
> against the current `skills/`, `lib/`, `docker/`, and `skill-system.json` trees rather than
> trusted from the prior pass. For a always-current, generated view, see the
> [documentation site](site/docs/reference/comparison-with-full-pack.md) — this file is a snapshot,
> the site is maintained.

Method: this comparison inventories both repositories directly — counting and classifying skills,
hooks, agents, scripts, services, Rust crates, templates, and platform/runtime dependencies, then
spot-checking the controlling manifests (`skill-system.json` in each repo, `docker/compose.yaml`,
`lib/` module trees). The full pack's raw file count is inflated by generated distributions,
worktrees, and vendored tool repositories, so counts below use each repo's own inventory rules
rather than a naive file count.

## Executive summary

The repositories serve different purposes:

- **`prometheus-skills-mini`** is a **portable, Windows-native core** centered on the KBD
  lifecycle, adversarial review, ideation-mindmap, Karpathy progress memory, OpenSpec, artifact
  refinement, cross-platform Node hooks, and plugin distribution for Claude Code and Codex. It
  deliberately excludes most domain skills, background services beyond its two, Bash/Python
  dependencies, and the Rust execution substrate.
- **`prometheus-skill-pack`** is a broad **enterprise agent-development platform** with a much
  larger skill catalog, full KBD/PMPO orchestration, learning and research systems, React/entity
  development, DevOps, BDD testing, Rust tooling, MCP execution infrastructure, marketplaces, and
  managed services.

The mini repository's KBD/PMPO-process core, adversarial review, ideation-mindmap, and
distribution system are **implemented and tested**, not aspirational — see "What the mini version
can do today" below, which is materially larger than it was before Phase C. What remains genuinely
absent is listed honestly in "What remains exclusive to the full version."

## Capability table

| Feature or capability | Mini — current checkout | Full version |
|---|---|---|
| **Primary purpose** | Portable core: KBD lifecycle, adversarial review, ideation-mindmap, Karpathy progress memory, OpenSpec, artifact refinement, and plugin distribution | Comprehensive skill and agent platform spanning development, research, learning, DevOps, testing, execution, and UI |
| **Canonical skill catalog** | **50 skill directories** under `skills/` (verified by direct listing) — the full KBD family, adversarial-review, ideation-mindmap, karpathy-progress-memory, 20 artifact-refiner skills, 5 scaffold/convert skills, plus 12 OpenSpec skills replicated per harness | A much larger multi-domain catalog per the full pack's own `skill-system.json` inventory rules, plus harness-specific OpenSpec integrations |
| **Skill breadth** | KBD process, adversarial review/ideation, artifact refinement, scaffolding, conversion, context bootstrap, Rust routing | Architecture, DevOps, document extraction, Flint SDKs, Flutter, Go, HTMX, learning, process orchestration, Python, React, research, Rust, Tauri, testing, and TypeScript |
| **Artifact refinement** | **Implemented.** Twenty artifact-refiner skills for UI, logos, images, content, A2UI, AG-UI/MCP UI scaffolding, conversion, validation, and rebranding | Same artifact-refiner family, plus its broader upstream support files, hook integration, imported tools, and sycophancy-correction |
| **Persistent artifact state** | Implemented through manifests, constraints, refinement logs, decisions, and output directories | Implemented, with additional provider, MCP, and system integrations |
| **OpenSpec support** | **Implemented and the default planning backend.** Twelve skills are present for Claude, Codex/Agents, Cursor, and OpenCode | Supported alongside the larger KBD planning system and other historical backends |
| **KBD lifecycle skills** | **Implemented.** 24 skills: `kbd-process-orchestrator` (parent) plus 22 sub-skills (`kbd-assess`, `-analyze`, `-spec`, `-plan`, `-execute`, `-apply`, `-reflect`, `-status`, `-audit`, `-pause`, `-resume`, `-cancel`, `-goal-check`, phase/child family, `-bottleneck-detector`, `-memory-recall`, `-inject-agent-rules`, `-init`) plus `kbd-evolve`. Backed by `lib/kbd/`, 12 modules, 230 tests | A KBD orchestrator/root and lifecycle skill set, including assess, analyze, plan, apply, execute, reflect, audit, pause/resume, child phases, status, doctor, and memory recall |
| **KBD runtime state** | `lib/kbd/` is a full Node port of the state machine: position/waypoint, progress, stage-gate, rollup, hooks dispatch, child-scope enforcement, runtime-authority checking, and the SpecBackend contract (OpenSpec + native-kbd) | Full KBD control plane, runtime, state machine, stage gates, transitions, hierarchy, compatibility projections, and command integration |
| **PMPO orchestration** | Artifact-refiner's own PMPO cycle (`lib/refiner/`) is implemented for the refinement loop specifically. The general-purpose `pmpo-elicit`, outer loop, evolver, and skill-creator family (independent of artifact refinement) is **not** part of this repo's skill set | Full PMPO family: elicitation, outer loop, evolver, skill creation/cloning/extension/validation, plus iterative evolution |
| **Karpathy progress recording** | **Implemented.** Records validated task/change/phase events, creates idempotent receipts, appends the session log, invokes `pk` (optional, bounded), and retries degraded receipts. See `lib/karpathy/` (8 modules) | Fully integrated into KBD lifecycle hooks and background learning infrastructure |
| **Automatic progress capture** | Invoked at KBD stage-gate boundaries through the ported hook chain (`lib/hooks/taskcompleted-kbd-receipt.mjs` and related), not a separate manual-only step | Automatically triggered at lifecycle boundaries through hooks and worker infrastructure |
| **Knowledge/OKF support** | `pk` is vendored as a Rust submodule (`tools/prometheus-knowledge`, pinned in `versions.toml`) and writes OKF v0.2 bundles under `.prometheus/knowledge/`; `lib/karpathy/knowledge-bundle.test.mjs` guards that no pack code writes there directly. `pk` remains fully optional | Full `prometheus-knowledge`/`pk` integration, learning queues, context, search, ingest, knowledge services, and workers |
| **Learning system** | No Feynman-style general learning curriculum; progress-memory recording and the OKF knowledge bundle are the self-improvement surface | Twelve Feynman/learning skills: survey, goals, planning, practice, grading, retention, certification, KB integration, harness learning, and UI surfaces |
| **Adversarial review** | **Implemented.** Cross-model judge/critic dispatch over the liter-llm gateway, review packet builder (10+ sub-modules), sycophancy anti-theater gate, decision log, judge≠producer isolation enforcement, model-role resolution. `lib/review/`, 176 tests | Implemented critic/judge workflow, review packets, decision gates, isolation, anti-automation-bias checks, and model routing |
| **Sycophancy correction** | The review pipeline's own anti-theater gate (`lib/review/sycophancy-binary.mjs`, `sycophancy-gate.mjs`) is implemented and active inside adversarial-review. A standalone `sycophancy-correction` MCP server integration (outside the review pipeline) is not shipped | Canonical imported skill and MCP implementation; integrated with review/reflection paths |
| **Deep research** | Still planned as a checkpoint-only Node port; not present as a skill in this checkout | Ten-stage research pipeline: plan, search, retrieve, collect, verify, resolve, graph, cite, report, and export, plus a research server |
| **React/entity development** | Not included | 29 React/entity-management skills covering CRUD, GraphQL, Prisma, realtime, migrations, performance, relations, and auditing |
| **DevOps/GitOps** | Deliberately excluded | ArgoCD multicloud, GitOps bootstrap/transformation, Kustomize overlays, Fabric integration, and disk-space management |
| **Testing/BDD** | No BDD skill family | Cucumber JS and Rust, lifecycle management, compatibility alias, and signed video-proof bundles |
| **Language/framework guidance** | Artifact-focused JavaScript tooling only at present | Rust, TypeScript, Go, Python/PyO3, Flutter/Rust FFI, Tauri/React/Vite, HTMX/Alpine/Lit, and multiple Flint SDK languages |
| **Native agent scaffolding** | Artifact-level React, Tauri, Flutter A2UI, AG-UI, and MCP UI scaffold skills are present | Full native-agent application generation, business-build flows, and Bossfang upload support |
| **MCP server development** | Planned stdio-only Rust guidance; not currently shipped | HTTP/SSE and stdio MCP guidance plus multiple production MCP implementations |
| **Execution substrate** | Excluded | Seventeen Rust substrate components covering local, embedded, remote, mobile, sovereign-sync, storage, FFI, UI bridging, and execution tiers |
| **Tools and binaries** | Vendored `pk`, `liter-llm`, `surreal-memory-server` (all git submodules, built as Docker contexts or optional CLIs, never required host toolchains); Node utilities for hooks, refinement, conversion, validation, review, ideation, distribution, and progress recording | `prometheus-cli`, `forge-rs`, `liter-llm`, `openai-proxy`, `prometheus-knowledge`, surreal-memory, Rust auditor, disk guardian, cowork tooling, and benchmark automation |
| **Runtime languages** | Repository-owned execution is **Node.js ≥22** only. No Python, no host Bash anywhere in the pack's own code. The three vendored submodules (`pk`, `liter-llm`, `surreal-memory-server`) are Rust, used only as build contexts or optional CLIs | Node, Bash, Python, TypeScript, and Rust; many operational flows depend on POSIX shell tools |
| **Windows support** | Native `cmd.exe`/PowerShell target, without requiring Git Bash or entering WSL. `platform-foundation`'s primitives (atomic write, lock, CRLF handling, shell-free spawn) are CI-verified on `windows-latest`; the later KBD/review/distribution batch (1,000+ tests) is verified on macOS only so far — Windows verification for that batch is still owed | Skills profile supports Windows only through **Git Bash or WSL**; the full profile officially supports macOS and Linux only |
| **Hooks** | Hook payloads live under `lib/hooks/` (SessionStart, PreCompact, PostToolUse, SubagentStop, TaskCompleted adapters), dispatched by `scripts/hook-entry.mjs` in-process from `hooks/hooks.json` | Many more root hook entries across 7 events, plus nested hook packs for evolution, artifact refinement, ZeeSpec, and other capabilities |
| **Hook architecture** | Direct Node dispatch: manifest → `hook-entry.mjs` → in-process module, no shell, no child dispatch layer | Node entry plus Bash/Rust dispatch layers and numerous Bash/Python payloads |
| **Hook behavior** | Hooks restore KBD context, detect project context, refresh position reminders, create task receipts, and preserve state before compaction | Adds KBD opening, memory outbox flushing, knowledge health, Karpathy learning, stage-specific checkpoints, evaluation, reflection, writeback, sycophancy checks, GitOps validation, and more |
| **Managed services** | **Implemented.** `docker/compose.yaml` runs SurrealDB, surreal-memory, and liter-llm as three loopback-bound, digest-pinned, memory-limited containers; `scripts/services.mjs` wraps the lifecycle (`status`, `pull`, `up`, `stop`, `restart`, `down`, `logs`) | Eleven generated service definitions, including SurrealDB, surreal-memory, liter-llm, `pk-cherry`, Forge MCP, execution daemon, surface bridge, learning worker, log rotation, sync, and periodic learning nudges |
| **Service philosophy** | Designed and implemented to work when both services are down: memory writes to a durable local outbox, review falls back to a fresh-context subagent recording `isolation_mode=harness-native` | Full profile installs and manages a larger native service ecosystem through launchd/systemd |
| **Templates** | No Nunjucks renderer or `.njk` templates in this checkout — this pack's skills that generate code (scaffold-*, convert-*) use direct Node transforms, not a template engine | Tera-based templates hosted by `forge-rs`, including large application generators |
| **Installer/distribution** | **Implemented.** `skill-system.json` + `lib/distribution/` generate copy-mode (never symlink) Claude Code and Codex plugin packages, both marketplace listings, and Claude Code slash commands from `SKILL.md` frontmatter. `lib/doctor/` (`scripts/doctor.mjs`) covers runtime, KBD position, service health, optional tools, home-directory skill copies, and the install-scope rule | Skills-only and full installation profiles, generated Claude/Codex packages, marketplaces, source lifecycle policies, installers, updaters, doctors, and health checks |
| **Harness targets** | OpenSpec content currently materialized for Claude, Agents/Codex, Cursor, and OpenCode | Fourteen declared targets, including Claude, OpenCode, Kimi, MiniMax, Cursor, Codex, Gemini, Roo, Devin/Windsurf, Zed, Cline, and Agents |
| **Rules architecture** | Strong, compact generated Rules Architecture v4 with constitution, path rules, skill routing, and drift checks | Larger rule and policy surface across the complete platform |
| **Resource profile** | Designed for 16 GB machines and few resident processes | Considerably larger disk, build, memory, service, and operational footprint |
| **Offline/degraded operation** | Designed to preserve local state and receipts when `pk` or future services are unavailable | Supports degraded paths, but the full feature set depends more heavily on installed binaries and services |
| **ZeeSpec** | Explicitly excluded; OpenSpec is authoritative | ZeeSpec interrogator and related compatibility remain part of the full catalog |
| **Security surface** | Smaller: fewer daemons and ports, loopback-only target design, bounded payloads, secret rejection, unsafe-path rejection | Broader: more network services, execution tiers, credentials, service managers, and MCP boundaries; correspondingly more policy and hardening infrastructure |

## What the mini version can do today

The present mini checkout can reliably:

1. **Run the full KBD lifecycle**
   - Assess, analyze, spec, plan, execute, reflect — every stage as a real skill backed by `lib/kbd/`
   - Drive OpenSpec (or native-kbd) one task at a time via `kbd-apply`, never "implement everything"
   - Pause, resume, cancel, audit, and recover position from `.kbd-orchestrator/`
   - Manage phase and child hierarchy (new/next phase, new/next child, child-exit)
   - Evaluate goal completion without the implementer grading its own work (`kbd-goal-check`)

2. **Run cross-model adversarial review**
   - Dispatch a fresh-context judge over the liter-llm gateway, enforcing judge ≠ producer
   - Build mode-specific review packets (skill, agent, diff, decision, research) with per-field
     truncation and manifest-level-only guarantees for creation modes
   - Screen the judge's own report for sycophantic softening before surfacing it
   - Fall back to a harness-native subagent when the gateway is down

3. **Run structurally-verified ideation**
   - Generate independent concept branches via surreal-memory, with dispatch inputs recorded and
     checked so branches cannot silently share context

4. **Run structured artifact-refinement workflows**
   - UI and content refinement
   - Logo and image refinement
   - A2UI, AG-UI, and MCP UI normalization
   - React/Vite, Tauri, and Flutter A2UI scaffolding
   - Markdown → HTMX, HTMX → React, and HTMX → PDF conversion
   - Schema-based refinement validation

5. **Plan and manage changes with OpenSpec**
   - Propose, create, continue, apply, verify, sync, update, and archive changes
   - Use the same OpenSpec skills across four harness layouts

6. **Record durable KBD progress**
   - Validate bounded event payloads
   - Reject secrets and unsafe file paths
   - Produce deterministic hashes and idempotent receipts
   - Append one session-log record per event
   - Deliver records through `pk ingest` (optional, bounded)
   - Preserve degraded records and retry them later

7. **Generate and distribute plugin packages**
   - Build Claude Code and Codex plugin packages plus both marketplace listings, copy-mode only
   - Generate typeable slash commands from `SKILL.md` frontmatter
   - Detect drift with `--check` before it ships

8. **Run the two-service Docker stack**
   - SurrealDB + surreal-memory + liter-llm via `docker/compose.yaml`, loopback-bound and
     digest-pinned
   - Report service health via `scripts/services.mjs status` and the `doctor` skill

9. **Provide tested cross-platform primitives**
   - Portable paths and CRLF-tolerant text handling
   - Atomic writes with Windows rename retry
   - Exclusive file locks
   - Shell-free process spawning and Windows `.cmd`/PATHEXT handling
   - Generated agent-rule checks

## What remains exclusive to the full version

The full pack is required today if you need:

- General-purpose PMPO elicitation, outer-loop, evolver, and skill-creator skills (independent of
  artifact refinement, which has its own PMPO-style cycle in this pack)
- Deep research (this pack has it planned as a checkpoint-only Node port, not yet a shipped skill)
- Feynman learning workflows
- React/entity-management development
- GitOps and multicloud DevOps
- BDD/Cucumber testing and certification bundles
- Broad Rust, Go, Flutter, Tauri, Python, TypeScript, and Flint guidance beyond this pack's single
  Rust-routing skill
- Native-agent generation (the full application-stack generator, distinct from this pack's
  artifact-level scaffold-* skills)
- The execution substrate and remote execution tiers
- A standalone `sycophancy-correction` MCP server integration outside the review pipeline
- Multi-harness marketplace packaging beyond Claude Code and Codex
- Managed background workers (a learning-worker timer daemon; this pack uses opportunistic
  SessionStart draining instead) and the broader native service ecosystem

## Bottom line

The mini system is **not a smaller copy containing a representative sample of everything**. It is a
deliberate rewrite around a specific, now largely-implemented core:

> **The KBD lifecycle + adversarial review + ideation-mindmap + artifact refinement + OpenSpec +
> Karpathy progress memory + plugin distribution — on Windows, macOS, and Linux, with no shell
> scripts, no Python, and no symlinks.**

The full pack is instead:

> **A complete agent-development operating environment with broad domain skills, orchestration, research, learning, execution, services, and distribution.**

For Windows-native operation without Git Bash or WSL dependencies, the mini architecture is the stronger direction. For breadth and end-to-end automation today, the full pack remains substantially more capable.

### Evidence used

- Mini architecture and roadmap: `prometheus-skills-mini/README.md`
- Mini constraints: `prometheus-skills-mini/openspec/config.yaml`
- Mini hooks: `prometheus-skills-mini/hooks/hooks.json`, `prometheus-skills-mini/lib/hooks/`
- Mini implemented skills: `prometheus-skills-mini/skills/` (direct directory listing, 50 entries)
- Mini KBD core: `prometheus-skills-mini/lib/kbd/`
- Mini review pipeline: `prometheus-skills-mini/lib/review/`
- Mini distribution: `prometheus-skills-mini/lib/distribution/`, `prometheus-skills-mini/skill-system.json`
- Mini services: `prometheus-skills-mini/docker/compose.yaml`, `prometheus-skills-mini/scripts/services.mjs`
- Mini Phase C commit: `8497ae8` ("feat(kbd): port the KBD process orchestrator and 49 skills to Windows-native Node")
- Full catalog/profile definition: `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/skill-system.json`
- Full runtime scripts: `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/package.json`
- Full hooks: `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/hooks/hooks.json`
- Full services: `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/shared/services.manifest.json`

Updated for Phase C by direct inspection of the current trees rather than trusted from the prior
pass of this document. Test suites were not re-run as part of this update; skill/module presence was
verified by directory listing and by reading module header comments, not by executing them.
