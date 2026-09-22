I’ll restart the comparison from verified repository evidence. First I’m restoring the mini project’s required context, then I’ll inventory both repositories and map their capabilities into a side-by-side table.

The restored waypoint is `karpathy-logs-node` with 10/11 implementation tasks complete; the active OpenSpec change is `okf-v02-via-pk`. `versions.toml` is absent in this checkout, so there is no local dependency-version authority to apply; this task is read-only and does not require a dependency decision.

The mini README is partly stale: it still labels several items as “target design,” while current state and decisions show that the foundation, Node hooks, KBD core, artifact-refiner port, and most of the progress recorder are already implemented. I’ll therefore compare **actual repository contents**, not just the original roadmap. Also, the required `ccc` search tool is not installed (`command not found`), so I’m using direct repository inventories instead.

I’ve confirmed the editor file tools cannot directly traverse the added external root, so I’m switching to a read-only Node inventory for both directories. I’ll count and classify skills, hooks, agents, scripts, services, Rust crates, templates, and platform/runtime dependencies, then spot-check the controlling manifests.

The raw full-pack count is inflated by generated distributions, worktrees, and vendored tool repositories, so it is not a fair “number of skills” comparison. I’m normalizing the full count using its own `skill-system.json` inventory rules and separating source capabilities from generated/install copies.

# Mini vs. Full Skill System

## Executive summary

The repositories serve different purposes:

- **`prometheus-skills-mini`** is becoming a **portable, Windows-native core** centered on OpenSpec, artifact refinement, cross-platform Node hooks, and durable progress recording. It deliberately removes most domain skills, background services, Bash/Python dependencies, and the Rust execution substrate.
- **`prometheus-skill-pack`** is a broad **enterprise agent-development platform** with 166 canonical skills, full KBD/PMPO orchestration, learning and research systems, React/entity development, DevOps, BDD testing, Rust tooling, MCP execution infrastructure, marketplaces, and managed services.

The important qualification is that the mini repository is **still under construction**. Its README describes the intended end state, but the current checkout does not yet contain the complete KBD/PMPO port, Docker services, deep research, adversarial review, installer, or Rust toolkit skills.

## Capability table

| Feature or capability | Mini — current checkout | Full version |
|---|---|---|
| **Primary purpose** | Portable subset focused on artifact refinement, OpenSpec, KBD-compatible hooks, and progress memory | Comprehensive skill and agent platform spanning development, research, learning, DevOps, testing, execution, and UI |
| **Canonical skill catalog** | **33 unique skills:** 21 under `skills/` plus 12 OpenSpec skills replicated for supported harnesses | **166 canonical skills** according to the inventory rules in `skill-system.json`, plus harness-specific OpenSpec integrations |
| **Skill breadth** | Primarily artifact refinement and progress-memory recording | Architecture, DevOps, document extraction, Flint SDKs, Flutter, Go, HTMX, learning, process orchestration, Python, React, research, Rust, Tauri, testing, and TypeScript |
| **Artifact refinement** | **Implemented.** Twenty artifact-refiner skills for UI, logos, images, content, A2UI, AG-UI/MCP UI scaffolding, conversion, validation, and rebranding | Same artifact-refiner family, plus its broader upstream support files, hook integration, imported tools, and sycophancy-correction |
| **Persistent artifact state** | Implemented through manifests, constraints, refinement logs, decisions, and output directories | Implemented, with additional provider, MCP, and system integrations |
| **OpenSpec support** | **Implemented and the default planning backend.** Twelve skills are present for Claude, Codex/Agents, Cursor, and OpenCode | Supported alongside the larger KBD planning system and other historical backends |
| **KBD lifecycle skills** | **Not yet shipped in `skills/`.** No local `kbd-assess`, `kbd-plan`, `kbd-execute`, `kbd-reflect`, `kbd-apply`, or related skill documents exist yet | **Complete:** 23 KBD orchestrator/root and lifecycle skills, including assess, analyze, plan, apply, execute, reflect, audit, pause/resume, child phases, status, doctor, and memory recall |
| **KBD runtime state** | The repository itself uses `.kbd-orchestrator/`, and six hooks can read or preserve its state. That project state should not be mistaken for a distributable KBD implementation | Full KBD control plane, runtime, state machine, stage gates, transitions, hierarchy, compatibility projections, and command integration |
| **PMPO orchestration** | Five PMPO-oriented agent prompts support artifact refinement, but the general `pmpo-elicit`, outer loop, evolver, and skill-creator ports are not yet present | Full PMPO family: elicitation, outer loop, evolver, skill creation/cloning/extension/validation, plus iterative evolution |
| **Karpathy progress recording** | **Mostly implemented.** Records validated task/change/phase events, creates idempotent receipts, appends the session log, invokes `pk`, and retries degraded receipts | Fully integrated into KBD lifecycle hooks and background learning infrastructure |
| **Automatic progress capture** | **Not wired yet.** `karpathy-progress-memory` explicitly says it must currently be called manually; the remaining active task is a Windows PATHEXT test | Automatically triggered at lifecycle boundaries through hooks and worker infrastructure |
| **Knowledge/OKF support** | `pk` 1.9.0 is vendored as a Rust submodule and supports OKF v0.2, but the binding/documentation change `okf-v02-via-pk` is still **0/9 tasks** | Full `prometheus-knowledge`/`pk` integration, learning queues, context, search, ingest, knowledge services, and workers |
| **Learning system** | No general learning curriculum yet; only progress-memory recording and planned self-improvement paths | Twelve Feynman/learning skills: survey, goals, planning, practice, grading, retention, certification, KB integration, harness learning, and UI surfaces |
| **Adversarial review** | Planned, not currently shipped | Implemented critic/judge workflow, review packets, decision gates, isolation, anti-automation-bias checks, and model routing |
| **Sycophancy correction** | Not shipped as a mini skill or MCP server | Canonical imported skill and MCP implementation; integrated with review/reflection paths |
| **Deep research** | Planned checkpoint-only Node port; not present now | Ten-stage research pipeline: plan, search, retrieve, collect, verify, resolve, graph, cite, report, and export, plus a research server |
| **React/entity development** | Not included | 29 React/entity-management skills covering CRUD, GraphQL, Prisma, realtime, migrations, performance, relations, and auditing |
| **DevOps/GitOps** | Deliberately excluded | ArgoCD multicloud, GitOps bootstrap/transformation, Kustomize overlays, Fabric integration, and disk-space management |
| **Testing/BDD** | No BDD skill family | Cucumber JS and Rust, lifecycle management, compatibility alias, and signed video-proof bundles |
| **Language/framework guidance** | Artifact-focused JavaScript tooling only at present | Rust, TypeScript, Go, Python/PyO3, Flutter/Rust FFI, Tauri/React/Vite, HTMX/Alpine/Lit, and multiple Flint SDK languages |
| **Native agent scaffolding** | Artifact-level React, Tauri, Flutter A2UI, AG-UI, and MCP UI scaffold skills are present | Full native-agent application generation, business-build flows, and Bossfang upload support |
| **MCP server development** | Planned stdio-only Rust guidance; not currently shipped | HTTP/SSE and stdio MCP guidance plus multiple production MCP implementations |
| **Execution substrate** | Excluded | Seventeen Rust substrate components covering local, embedded, remote, mobile, sovereign-sync, storage, FFI, UI bridging, and execution tiers |
| **Tools and binaries** | Vendored `pk` only; Node utilities for hooks, refinement, conversion, validation, and progress recording | `prometheus-cli`, `forge-rs`, `liter-llm`, `openai-proxy`, `prometheus-knowledge`, surreal-memory, Rust auditor, disk guardian, cowork tooling, and benchmark automation |
| **Runtime languages** | Repository-owned execution is designed around **Node.js ≥22**. No Python; no host Bash in the target design. The vendored `pk` tool is Rust | Node, Bash, Python, TypeScript, and Rust; many operational flows depend on POSIX shell tools |
| **Windows support** | Native `cmd.exe`/PowerShell target, without requiring Git Bash or entering WSL. Implemented portions are tested on Windows, macOS, and Linux | Skills profile supports Windows only through **Git Bash or WSL**; the full profile officially supports macOS and Linux only |
| **Hooks** | **6 hook entries across 5 events:** SessionStart, PostToolUse, SubagentStop, TaskCompleted, and PreCompact | **31 root hook entries across 7 events**, plus nested hook packs for evolution, artifact refinement, ZeeSpec, and other capabilities |
| **Hook architecture** | Direct Node dispatch: manifest → `hook-entry.mjs` → in-process module | Node entry plus Bash/Rust dispatch layers and numerous Bash/Python payloads |
| **Hook behavior** | Current hooks restore KBD context, detect project context, refresh position reminders, create task receipts, and preserve state before compaction | Adds KBD opening, memory outbox flushing, knowledge health, Karpathy learning, stage-specific checkpoints, evaluation, reflection, writeback, sycophancy checks, GitOps validation, and more |
| **Managed services** | **None shipped yet in the current checkout.** The target design permits surreal-memory/SurrealDB and liter-llm only | Eleven generated service definitions, including SurrealDB, surreal-memory, liter-llm, `pk-cherry`, Forge MCP, execution daemon, surface bridge, learning worker, log rotation, sync, and periodic learning nudges |
| **Service philosophy** | Intended to work when all optional services are down; target is three containers representing two retained service capabilities | Full profile installs and manages a larger native service ecosystem through launchd/systemd |
| **Templates** | Planned Nunjucks renderer; no `.njk` templates currently present | Tera-based templates hosted by `forge-rs`, including large application generators |
| **Installer/distribution** | No complete mini installer or doctor yet | Skills-only and full installation profiles, generated Claude/Codex packages, marketplaces, source lifecycle policies, installers, updaters, doctors, and health checks |
| **Harness targets** | OpenSpec content currently materialized for Claude, Agents/Codex, Cursor, and OpenCode | Fourteen declared targets, including Claude, OpenCode, Kimi, MiniMax, Cursor, Codex, Gemini, Roo, Devin/Windsurf, Zed, Cline, and Agents |
| **Rules architecture** | Strong, compact generated Rules Architecture v4 with constitution, path rules, skill routing, and drift checks | Larger rule and policy surface across the complete platform |
| **Resource profile** | Designed for 16 GB machines and few resident processes | Considerably larger disk, build, memory, service, and operational footprint |
| **Offline/degraded operation** | Designed to preserve local state and receipts when `pk` or future services are unavailable | Supports degraded paths, but the full feature set depends more heavily on installed binaries and services |
| **ZeeSpec** | Explicitly excluded; OpenSpec is authoritative | ZeeSpec interrogator and related compatibility remain part of the full catalog |
| **Security surface** | Smaller: fewer daemons and ports, loopback-only target design, bounded payloads, secret rejection, unsafe-path rejection | Broader: more network services, execution tiers, credentials, service managers, and MCP boundaries; correspondingly more policy and hardening infrastructure |

## What the mini version can do today

The present mini checkout can reliably:

1. **Run structured artifact-refinement workflows**
   - UI and content refinement
   - Logo and image refinement
   - A2UI, AG-UI, and MCP UI normalization
   - React/Vite, Tauri, and Flutter A2UI scaffolding
   - Markdown → HTMX, HTMX → React, and HTMX → PDF conversion
   - Schema-based refinement validation

2. **Plan and manage changes with OpenSpec**
   - Propose, create, continue, apply, verify, sync, update, and archive changes
   - Use the same OpenSpec skills across four harness layouts

3. **Provide portable hook infrastructure**
   - Restore project/KBD context at session start
   - Preserve position before compaction
   - Refresh position reminders after writes
   - Produce task-completion receipts
   - Fall back safely when optional context is unavailable

4. **Record durable KBD progress manually**
   - Validate bounded event payloads
   - Reject secrets and unsafe file paths
   - Produce deterministic hashes and idempotent receipts
   - Append one session-log record per event
   - Deliver records through `pk ingest`
   - Preserve degraded records and retry them later

5. **Provide tested cross-platform primitives**
   - Portable paths and CRLF-tolerant text handling
   - Atomic writes with Windows rename retry
   - Exclusive file locks
   - Shell-free process spawning and Windows `.cmd`/PATHEXT handling
   - Generated agent-rule checks

## What remains exclusive to the full version

The full pack is required today if you need:

- The complete KBD lifecycle and automatic phase execution
- General PMPO elicitation, evolution, and skill creation
- Automated adversarial review and sycophancy correction
- Deep research
- Feynman learning workflows
- React/entity-management development
- GitOps and multicloud DevOps
- BDD/Cucumber testing and certification bundles
- Broad Rust, Go, Flutter, Tauri, Python, TypeScript, and Flint guidance
- Native-agent generation
- The execution substrate and remote execution tiers
- Full MCP/service infrastructure
- Multi-harness marketplace packaging and installation
- Managed background workers, health checks, and service orchestration

## Bottom line

The mini system is **not a smaller copy containing a representative sample of everything**. It is a deliberate rewrite around a narrower core:

> **Portable artifact refinement + OpenSpec + KBD-compatible state/hooks + durable progress knowledge.**

The full pack is instead:

> **A complete agent-development operating environment with broad domain skills, orchestration, research, learning, execution, services, and distribution.**

For Windows-native operation without Git Bash or WSL dependencies, the mini architecture is the stronger direction. For breadth and end-to-end automation today, the full pack remains substantially more capable.

### Evidence used

- Mini architecture and roadmap: `prometheus-skills-mini/README.md`
- Mini constraints: `prometheus-skills-mini/openspec/config.yaml`
- Mini hooks: `prometheus-skills-mini/hooks/hooks.json`
- Mini implemented skills: `prometheus-skills-mini/skills/`
- Mini progress recorder status: `prometheus-skills-mini/openspec/changes/karpathy-progress-recorder/tasks.md`
- Mini OKF status: `prometheus-skills-mini/openspec/changes/okf-v02-via-pk/tasks.md`
- Full catalog/profile definition: `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/skill-system.json`
- Full runtime scripts: `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/package.json`
- Full hooks: `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/hooks/hooks.json`
- Full services: `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/shared/services.manifest.json`

This was a read-only analysis. I did not run the test suites; I verified repository inventories, manifests, current OpenSpec progress, and controlling documentation.
