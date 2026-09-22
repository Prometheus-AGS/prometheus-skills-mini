# prometheus-skills-mini

A Windows-native, scaled-down port of
[`prometheus-skill-pack`](../prometheus-skill-pack) that keeps one thing and
keeps it working everywhere: **the KBD development process, driven by PMPO
skills, with OpenSpec as the spec backend and Karpathy-style logging and
self-improvement** — on Windows, macOS, and Linux, with **no Git Bash, no
Python, and no WSL in anything the pack itself runs**.

Two services from the source pack are kept because the process needs them:
the **surreal-memory server (backed by SurrealDB)** for agent memory, and the
**liter-llm gateway** so the adversarial **critic** and **judge** models are
available. On Windows both run in **Docker**; on macOS and Linux they run
exactly as they do in the source pack today. Everything else that was a daemon
is gone.

> **Status: the foundation is built and verified; the port itself has not started.**
>
> Phase `platform-foundation` is complete: `lib/platform/` (paths, CRLF-tolerant text
> reading, atomic write with a bounded Windows rename retry, an exclusive-create lock,
> shell-free process spawning), a `package.json` with the OpenSpec CLI pinned, and a
> three-OS CI matrix. **88 tests pass on `windows-latest`, `ubuntu-latest` and
> `macos-latest` across Node 22 and 24, with nothing skipped on Windows** — every Windows
> claim in this document is observed, not reasoned from macOS. Per-claim evidence:
> [`evidence/windows.md`](.kbd-orchestrator/phases/platform-foundation/evidence/windows.md).
>
> Still to come, each its own phase: the hooks, the KBD state machine, OKF v0.2 logging,
> the knowledge-sources registry, the Docker services, and the `adversarial-review` and
> `deep-research` ports. Everything under "Target design" below remains a proposal.

---

## 1. Non-negotiable constraints

| # | Constraint | What it means in practice |
|---|---|---|
| C1 | **Windows without WSL for anything the pack runs** | Hooks, scripts, and the installer run from `cmd.exe` / PowerShell on a stock Windows 10/11 box. Git Bash may be present but is never required. Docker's own backend is the one exception — see the note below the table. **Verified for everything built so far** on `windows-latest`, no Git Bash, no WSL. |
| C2 | **Node.js LTS is the only script runtime** | Every hook, state script, and installer is a `.mjs` file run as `node <script>`. Node ≥ 22 LTS required, 24 LTS recommended. |
| C3 | **No shell-script hooks** | No `.sh`. A `.ps1` is allowed only alongside an equivalent for the other platforms, and only when Node genuinely cannot do the job. The goal is zero of either. |
| C4 | **No Python** | Not as a runtime, not as a build step, not in rendered templates. |
| C5 | **OpenSpec native and default; no ZeeSpec** | `openspec` is the default SpecBackend. ZeeSpec and every gate that reads `.zeespec/` are removed. |
| C6 | **Template language runs on Node** | No Rust (Tera / forge-rs) needed to render a template. |
| C7 | **Rust toolkit is guidance + scaffolding, never a dependency** | The pack teaches and scaffolds Rust CLIs, tools, and MCP servers, but nothing in the pack requires a Rust toolchain or a Rust binary **on the Windows host** — the two Rust services arrive as containers. MCP servers it scaffolds are **STDIO only**. |
| C8 | **Exactly two resident services, Docker-managed on Windows** | `surreal-memory` (+ SurrealDB) and the `liter-llm` gateway. On Windows they run under Docker Compose — no Windows services, no Task Scheduler, no native daemons. On macOS/Linux they run as in the source pack. Nothing else from the source's service stack comes across. See [§5.6](#56-docker-services). |
| C8a | **The KBD loop survives both being down** | Memory writes fall back to a durable local outbox; review falls back to a fresh-context subagent and records that it did. Both behaviours already exist in the source pack and are preserved. |
| C9 | **Fits in 16 GB RAM** | Including the agent harness, editor, the Docker VM, and a Rust build. See [§7](#7-memory-budget-16-gb). |

**About C1 and Docker.** Docker Desktop on Windows needs a virtualization
backend of its own: **WSL 2** (the default, and the only option on Windows
Home) or **Hyper-V** (Windows Pro, Enterprise, or Education). Choosing Hyper-V
keeps WSL off the machine entirely. Either way, nothing in this pack enters
WSL, calls `wsl.exe`, or assumes a Linux userland on the host — the pack talks
to the containers only over loopback TCP. Podman and Rancher Desktop have the
same backend requirement, so they do not change this.

---

## 2. What `openspec init` created

Run with OpenSpec CLI **1.10.0**:

```bash
openspec init --tools claude,codex,cursor,opencode --no-animation .
```

| Path | Contents |
|---|---|
| `openspec/config.yaml` | `schema: spec-driven`, plus project context encoding C1–C9 so every generated proposal inherits them |
| `openspec/specs/`, `openspec/changes/` | Empty, ready for the first change |
| `.claude/skills/openspec-*` + `.claude/commands/opsx/` | 12 skills, 12 commands (Claude Code) |
| `.agents/skills/openspec-*` | 12 skills (Codex — skills only, no commands) |
| `.cursor/`, `.opencode/` | 12 skills + 12 commands each |

The harness set mirrors the ones the source pack wires OpenSpec into. Add more
later with `openspec init --tools <name>`; refresh with `openspec update`.

The OpenSpec CLI is itself a Node package, so it satisfies C2 with no extra
runtime. Start the first change with `/opsx:propose "<idea>"`.

---

## 3. Why this is a port and not a repackage

The source pack (v1.10.0) states its own Windows posture in `skill-system.json`:

```json
"platforms": {
  "skills": ["darwin", "linux", "windows-git-bash", "windows-wsl"],
  "full":   ["darwin", "linux"]
}
```

Windows is supported only through Git Bash or WSL, and the "full" profile is
macOS/Linux only. The reasons, measured in the source tree:

| Hazard | Evidence in source pack | Violates |
|---|---|---|
| Bash everywhere | 73 `.sh` in `shared/scripts/`, 117 in `skills/process/`, ~30 in `scripts/` | C1, C3 |
| Hooks *look* like Node but are not | `hooks.json` runs `node scripts/hook-entry.mjs`, which then probes `bash -c 'exit 0'` and fails with `MISSING_SHELL` unless Git Bash or a compiled `prometheus-hook` binary exists. Every hook payload is a bash script. | C1, C3 |
| `jq` as a hard dependency | `kbd-apply.sh` dies without it; `karpathy-hook-dispatch.sh` silently no-ops without it | C1 |
| Python on the critical path | `record-progress.py` (671 lines), `enqueue-learning-job.py`, `enqueue-memory-operation.py`, a `python3` heredoc inside `workflow-dispatch.sh`, `python3 -c` inside `state-resolve-provider.sh` | C4 |
| Symlinks are structural | `.claude-plugin/{agents,hooks,skills}` are symlinks; 11 of 13 install targets use `"mode": "symlink"` (needs Developer Mode or elevation on Windows) | C1 |
| Resident service stack with no Windows definition | SurrealDB `:28000`, surreal-memory `:23001` (SSE), liter-llm gateway `:4000`, prometheus-knowledge `:8942`, forge-rs `:8943`, openai-proxy `:8181`, `prometheus-exec` on a unix socket, a learning-worker timer — defined only as launchd plists and systemd units, three of them hardcoding `/bin/bash`. The liter-llm launcher is a bash script that sources a secrets file. | C1, C8 |
| Rust needed to render templates | Tera is the only engine, and `tools/forge-rs` is its only renderer | C6 |
| Unix-only Rust | `nix`/`libc` in `kbd-runtime`, `exec-service`, `exec-tier-p`, `prometheus-research`; macOS `sandbox-exec` in `seatbelt.rs` | C1 |

One design decision in the source is worth keeping: `hook-entry.mjs` uses
**exec-form** hook commands (`"command": "node", "args": [...]`, `shell: false`)
precisely because shell-form commands go to `sh -c` on POSIX and PowerShell on
Windows. The mini pack keeps that entry shape and removes everything behind it
that is not Node.

---

## 4. Port analysis — what comes across

Legend — **Port effort:** none (copy) · low · med · high. **Verdict:**
✅ port · 🔁 port with a substitution · ⏸ defer (portable, out of focus) · ❌ exclude.

### 4.1 Skills

| Source skill | Today | Verdict | Effort | Notes |
|---|---|---|---|---|
| `kbd-process-orchestrator` (core) | 9 bash libs + `jq` (`position`, `progress`, `waypoint`, `stage-gate`, `hooks`, `memory`, `rollup`, …) | ✅ | **high** | This is the state machine. Rewrite as Node modules under `lib/kbd/`. Largest single item. |
| `kbd-apply` | 602-line bash, hard `jq`, `openspec` CLI | ✅ | **high** | Highest-value rewrite. The six-op SpecBackend contract (`detect`, `list_tasks`, `progress`, `mark_done`, `verify`, `archive`) is already documented, so this is a re-implementation against a spec, not archaeology. |
| `kbd-analyze`, `-assess`, `-audit`, `-cancel`, `-pause`, `-plan`, `-reflect`, `-resume`, `-status` | Markdown only | ✅ | **none** | Copy, then strip ZeeSpec/daemon references. |
| `kbd-spec` | Markdown + ZeeSpec coverage gate | 🔁 | low | Delete the gate section and the `zeespec:` field of the stage handoff. The source already treats the gate as inactive when no `.zeespec/` exists, so removal is behaviour-preserving. |
| `kbd-init` | Node (`kbd-init-validate.mjs`) | ✅ | **none** | Already the right shape — use as the house style for every other script. Default `specBackend` becomes `openspec`. |
| `kbd-new-phase`, `-next-phase`, `-new-child`, `-next-child`, `-child-exit`, `-memory-recall`, `-inject-agent-rules`, `-bottleneck-detector` | bash + `jq` | ✅ | med | ~8 thin JSON-editing scripts. `jq` → `JSON.parse`. `kbd-memory-recall` reads from surreal-memory when it is up and from local files when it is not. |
| `adversarial-review` | 9 bash; `dispatch-judge.sh` needs `python3` + `curl` | ✅ | med–high | **This is what liter-llm is for.** The judge dispatcher posts the review packet to an OpenAI-compatible `/v1/chat/completions` endpoint and enforces judge ≠ producer, with the critic as the collision escape hatch. Port to Node (`fetch`, no `curl`, no Python). Keep the exit contract: gateway down → caller falls back to a fresh-context subagent and records `isolation_mode=harness-native`. |
| `kbd-doctor` | bash → compiled `prometheus doctor` (Rust) | 🔁 | low | Reimplement as a Node self-check: Node version, `openspec` on PATH, state-dir writable, no symlinks, line endings. No Rust binary (C7). |
| `kbd-evolve`, `kbd-goal-check` | Markdown only | ✅ | **none** | |
| `kbd-goal` | 2 bash | ✅ | low | |
| `pmpo-elicit` | 2 bash | ✅ | low | Drop ZeeSpec refs from the integration contract and schema. |
| `pmpo-outer-loop` | 1 bash (`loop-tick.sh`) | ✅ | low | |
| `pmpo-evolver` | 8 bash (some call `git`, `curl`) | ✅ | med | `curl` → Node `fetch`; `git` stays (it is a Windows-native CLI). |
| `pmpo-skill-creator` | 6 bash + own `hooks.json` | ✅ | med | Its validator must learn the mini pack's rules (no `.sh`, no `.py`, no symlinks). |
| `iterative-evolver` + `evolve-*` | 8 bash, 2 embedding Python | ✅ | **high** | `workflow-dispatch.sh` (bash wrapping a `python3` heredoc) and the 6-tier `state-resolve-provider.sh` are the awkward ones. Sub-skills are Markdown and copy across. |
| `karpathy-progress-memory` | Python 3.10+, stdlib only | ✅ | med | See [§5.3](#53-karpathy-logging-and-self-improvement). Mechanical port: hashing, atomic write, `O_EXCL` lock, Markdown append all exist in `node:fs`/`node:crypto`. |
| `ideation-mindmap` | 3 bash + **surreal-memory MCP** | ✅ | low–med | Its hard dependency is now available on every platform. Port the 3 scripts; drop the ZeeSpec hand-off from its description. |
| `prometheus-context-bootstrap` | bash | ⏸ | low | Useful, not essential. |
| `zeespec-interrogator` + 3 sub-skills | bash + `python3 -c` | ❌ | — | C5. Also remove: two blocks in `position`, the `zeespec` boundary kind in `bottleneck-guard`, the `.zeespec/` line in `position.schema.json`, and two tests. |
| `karpathy-tokenizer` | **Python** (`rustbpe`, `tiktoken` via pip) | ❌ | — | C4. Despite the name it trains BPE tokenizers; it is unrelated to Karpathy *logging*. |
| `native-agent` (+ `start-business-build`) | 26 Tera templates; generated app needs **Docker** + surreal-memory + pk + liter-llm | ❌ | — | C8. Generates a service stack by design. |
| `liter-llm-bridge` | 5 bash; builds a large Rust workspace with `cargo` | 🔁 | med | Rewritten around the container: no `cargo build`, no git clone on the host. It becomes "configure and verify the gateway" — write `liter-llm-proxy.toml` with the `kbd-judge` / `kbd-critic` model entries, write role mappings to `~/.prometheus/kbd/models.toml`, start the service, probe `/v1/models`. On macOS/Linux it keeps configuring the native binary as today. |

### 4.2 Rust toolkit skills

These are knowledge skills: Markdown guidance plus a few templates. Porting
them costs little because nothing executes. The work is **editorial**.

| Source skill | Verdict | Effort | Notes |
|---|---|---|---|
| `mcp-server` | 🔁 | med | **Needs a rewrite, not a copy.** The source skill is HTTP/SSE-first (Axum router, `/mcp` + `/events`) with stdio as the secondary path. The mini version is **stdio-only**: `rmcp` with `transport-io`, no Axum, no ports, logs to **stderr only** (stdout is the protocol channel). |
| `workspace-structure` | ✅ | low | Add Windows notes: `x86_64-pc-windows-msvc`, path separators, `.exe` suffixes. |
| `error-handling`, `async-patterns`, `performance`, `actor-model` | ✅ | none–low | Platform-neutral guidance. |
| **`rust-cli`** *(new)* | ✅ new | med | **No CLI skill exists in the source pack** (no `clap` reference anywhere under `skills/rust`). Must be written: `clap` derive, exit codes, `--json` output, stdin/stdout discipline, Windows console/ANSI, cross-compilation. |
| `prometheus-rust-auditor` | ⏸ | med | The auditor is a Rust binary and its installer is bash. Clippy/fmt/cargo-deny themselves are Windows-friendly. Defer; re-express as a Node-driven checklist if wanted. |
| `axum-patterns` | ❌ | — | HTTP services are out of scope (C7/C8). |
| `librefang-wasm-skill` | ❌ | — | Out of scope. |

**Rules the toolkit skills will teach** (so scaffolded tools satisfy C1/C7/C8):
STDIO transport only · no `nix`, no `libc` direct calls, no unix sockets, no
signal handlers beyond Ctrl-C · `std::env::temp_dir()` never `/tmp` ·
`dirs`/`directories` crate never `$HOME` · never spawn `sh -c` · `tracing`
to stderr · build with plain `cargo` — **no `sccache` requirement** (the source
pack's `.cargo/config.toml` makes it mandatory).

### 4.3 Hooks

The source registers 24 hook entries across 7 events. The mini pack keeps the
KBD, Karpathy, and checkpoint hooks and drops the ones that exist to feed
services.

| Source hook | Payload today | Verdict | Notes |
|---|---|---|---|
| `sessionstart-kbd-control`, `precompact-kbd-control` | bash | ✅ | Node. 1 s budget — must stay synchronous and tiny. |
| `sessionstart-kbd-open` | bash | ✅ | Node. |
| `sessionstart-detect-project-context` | bash | ✅ | Node. |
| `prompt-karpathy-learning` | bash + `jq` + `pk context` | 🔁 | Node; recall comes from the local learnings file instead of the `pk` daemon. |
| `stop-karpathy-learning`, `subagent-executor-karpathy-learning` | bash → **Python** | ✅ | Node, in-process. |
| `posttool-write-position-reminder`, `posttool-scope-record`, `posttool-validate-evolution-state` | bash | ✅ | Node. |
| `subagent-{assessor,analyst,planner,executor,reflector}-checkpoint` / `-dispatch`, `subagent-fallback-checkpoint` | bash | ✅ | Node. One module, parameterised by phase. |
| `subagent-executor-validate-state`, `-evaluate-session`, `subagent-reflector-log` | bash | ✅ | Node. |
| `taskcompleted-kbd-receipt` | bash | ✅ | Node. 1 s budget. |
| `sessionstart-memory-outbox-flush`, `posttool-memory-writeback` | bash + **Python** → surreal-memory via a memory bridge with a durable outbox | ✅ | Node. Writeback persists the Delta / Root Cause / Corrective Actions of an *accepted* reflection; a rejected one is never persisted. Server unreachable → the operation lands in the outbox and the next SessionStart flushes it. Always exits 0 (C8a). |
| `sessionstart-pk-health` | bash → `pk` | ❌ | No `pk` daemon. |
| `posttool-sycophancy-artifact`, `subagent-reflector-sycophancy` | bash → sycophancy-correction MCP | ⏸ | Optional; see §4.4. Off by default. |
| `posttool-validate-gitops-write` | bash | ❌ | DevOps skills are not in scope. |

### 4.4 Services and MCP servers

C8 keeps two of these and drops the rest. "Optional" means a user can add it to
their own `.mcp.json`; the KBD loop must be fully functional without.

| Source component | Transport / runtime | Windows-native? | Verdict | In mini |
|---|---|---|---|---|
| SurrealDB `:28000` | database; `surrealdb/surrealdb:v3.0.5` image, RocksDB volume | **via Docker** | ✅ keep | Windows: Compose service. macOS/Linux: unchanged from source. |
| `surreal-memory` `:23001` | SSE MCP, Rust, local `bge-small-en-v1.5` embeddings; source ships a `Dockerfile` + `docker-compose.yaml` | **via Docker** | ✅ keep | Windows: Compose service depending on a healthy SurrealDB. macOS/Linux: unchanged. Same endpoint everywhere: `http://localhost:23001/mcp/sse`. |
| `liter-llm` gateway `:4000` | OpenAI-compatible HTTP (`liter-llm api`), Rust; source ships `docker/Dockerfile` | **via Docker** | ✅ keep | Windows: Compose service. macOS/Linux: native binary under launchd/systemd as today. Serves the `kbd-judge` and `kbd-critic` models. |
| `prometheus-knowledge` (`pk`) `:8942` | HTTP, Rust daemon | no | ❌ | local learnings file; keyword recall in Node |
| `forge-rs` `:8943` | HTTP, Rust daemon (the Tera host) | no | ❌ | Nunjucks renderer in Node ([§5.4](#54-template-language)) |
| `openai-proxy` `:8181` | HTTP, Rust daemon | no | ❌ | Not shipped. The gateway resolver still probes `:8181` before `:4000`, so a macOS/Linux machine that already runs it behaves as it does today. |
| `prometheus-exec` | unix socket; wasmtime + hyper + rmcp | partial (`windows-sys` block exists; `daemon.rs` is unix-heavy) | ❌ | — |
| `learning-worker` | launchd/systemd timer | no | 🔁 | Queue is drained **opportunistically at SessionStart** by a time-boxed Node function. No timer, no Task Scheduler. |
| `codex-skills-sync`, `hooks-logrotate`, `prometheus-nudge` | `/bin/bash` on a timer | no | 🔁 / ❌ | Log rotation folds into the SessionStart hook (size check + rename). The other two are dropped. |
| `liter-llm` stdio MCP entry | **stdio**, Rust (`liter-llm mcp --transport stdio`) | **unverified** | ⏸ optional | Separate from the gateway above: review only needs the HTTP API. On Windows the MCP entry could be `docker exec -i liter-llm liter-llm mcp --transport stdio`; not tested. The source entry relies on `${HOME}` expansion and a mandatory `--config`. |
| `sycophancy-correction` | **stdio**, Rust binary on PATH | likely, **unverified** | ⏸ optional | Not shipped. If a user installs a Windows build, two hooks can be switched on. |
| `tavily` | **stdio**, Node via `npx` | **yes** | ⏸ optional | Needs `TAVILY_API_KEY`. Used by evolver analysis when present. |
| `sequential-thinking` | **stdio**, Node via `npx` | **yes** | ⏸ optional | No key needed. |
| `substrate/*` (17 crates), `wit/`, WASM tiers | Rust, several unix-only | no | ❌ | — |
| `crates/prometheus-hook` | Rust CLI, 2 deps, no unix-only code | probably | ❌ (not needed) | The source uses it to *escape* bash on the hot path. With Node payloads there is no bash to escape, and shipping it would make Rust a dependency (C7). |

**Net result:** the pack's own runtime surface is `node`, `git`, and the
`openspec` CLI. Beside it run **three containers on Windows** (SurrealDB,
surreal-memory, liter-llm) or their native equivalents on macOS/Linux — down
from the source pack's seven-plus daemons — and the loop keeps working when
they are stopped.

---

## 5. Target design

### 5.1 Layout

```text
prometheus-skills-mini/
├── CLAUDE.md                      # Layer 0 constitution — GENERATED, do not edit
├── AGENTS.md                      # byte-identical copy of CLAUDE.md — GENERATED
├── rules/
│   ├── src/                       # single source for all agent rules — edit here only
│   ├── build.mjs                  # renders CLAUDE.md, AGENTS.md, .claude/rules, .cursor/rules
│   └── build.conf
├── docs/skill-routing.md          # GENERATED from rules/src/routing.md
├── openspec/                      # specs + changes (initialized)
├── docker/
│   ├── compose.yaml               # surrealdb + surreal-memory + liter-llm
│   ├── .env.example               # secrets template; real .env is git-ignored
│   └── liter-llm-proxy.example.toml
├── skills/
│   ├── kbd/                       # orchestrator + kbd-* sub-skills
│   ├── pmpo/                      # elicit, evolver, outer-loop, skill-creator, iterative-evolver
│   ├── karpathy/                  # karpathy-progress-memory
│   └── rust/                      # mcp-server (stdio), rust-cli, workspace-structure, …
├── hooks/
│   └── hooks.json                 # exec-form: "command": "node", "args": [...]
├── scripts/
│   ├── hook-entry.mjs             # single entry; dispatches in-process
│   ├── install.mjs                # copy-mode installer (never symlinks)
│   ├── services.mjs               # up | down | status | logs — wraps `docker compose`
│   └── doctor.mjs
├── lib/                           # small, focused ESM modules (200–400 lines)
│   ├── kbd/                       # position, progress, waypoint, stage-gate, rollup
│   ├── spec-backend/              # openspec.mjs (default), native-kbd.mjs (fallback)
│   ├── karpathy/                  # record-progress, learning-queue, learnings
│   ├── memory/                    # surreal-memory bridge + durable outbox
│   ├── review/                    # judge/critic dispatch, gateway + role resolution
│   ├── template/                  # nunjucks env + filters
│   └── platform/                  # paths, atomic-write, lock, spawn
├── templates/                     # *.njk
└── tests/                         # node:test
```

### 5.2 Hook chain

Source pack — three layers, the last of which is the blocker:

```text
hooks.json → node hook-entry.mjs → prometheus-hook(.exe)?  ── else ──→ bash hook-runtime-v1.sh
                                                                        → bash hook-dispatch-v1.sh
                                                                        → bash <payload>.sh (→ python3)
```

Mini pack — one layer:

```text
hooks.json → node hook-entry.mjs --hook <id> → import('../lib/hooks/<id>.mjs') → run(stdinJson)
```

One Node process per hook event, no child shells, no `jq`, no manifest of
shell scripts to verify. Hooks that carry a 1 s budget in the source
(`kbd-control`, `kbd-receipt`) must import nothing heavy — Node cold start is
already most of that budget on a slow disk, which is the main performance risk
of this design and should be measured on real Windows hardware early.

### 5.3 Karpathy logging and self-improvement

The Karpathy progress recorder (`scripts/record-progress.mjs`, `lib/karpathy/`) and the Rust `pk` CLI
(`tools/prometheus-knowledge`, vendored as a submodule) do two separate, independent jobs. Neither can
block the other:

| Job | Owner | Where it writes |
|---|---|---|
| Record a task/change/phase boundary; make it idempotent; recover from a crash mid-write | This pack's recorder | `.prometheus/session-log.md`, `.prometheus/progress-memory-receipts/` |
| Distil that history into a searchable, cited knowledge bundle | `pk` (optional) | `.prometheus/knowledge/` |

| Path | Format | Purpose |
|---|---|---|
| `.prometheus/session-log.md` | Markdown, append-only | Human-readable boundary log — the source pack's own on-disk format, kept unchanged so a project can move between packs |
| `.prometheus/progress-memory-receipts/<sha256(eventId)>.json` | JSON | Idempotency — one receipt per event; `complete: false` (or `memory.status: "degraded"`) makes it a durable retry queue of one |
| `.prometheus/progress-memory-receipts/<sha256(eventId)>.lock` | lock file | `fs.open(path, 'wx')`, the source pack's own exclusive-create discipline |
| `.prometheus/knowledge/` | OKF v0.2 bundle | Written exclusively by `pk`; `lib/karpathy/knowledge-bundle.test.mjs` guards that no code under `lib/` or `scripts/` writes there |

Changes from the source: the recorder no longer shells out to `prometheus kbd status --json` (a Rust
binary) — it reads `.kbd-orchestrator/` state directly, falling back to the waypoint projection when the
CLI does not resolve. `pk ingest` delivery is real but optional and bounded (`KPM_PK_TIMEOUT_SECONDS`,
default 5s, 0.1–10s range): with `pk` absent or its call failing, the result is `degraded`, the receipt and
session-log entry are already durable, and `--flush-degraded` retries later. The source's Python outbox and
`pk-learning-worker` daemon are not ported — the receipt is the retry queue instead (see
`.prometheus/decisions.md`). The set of reachable results is `recorded | duplicate | degraded`; the source
pack's own `queued` state is read (for a receipt an old source-pack run wrote) but never emitted by this
pack. The source's `256_000`-byte payload bound (its own message rounds this to "256 KiB") and
secret-pattern rejection are kept.

#### The knowledge bundle is `pk`'s Open Knowledge Format v0.2 bundle

Google's [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
is a directory of Markdown files with YAML frontmatter — no registry, no tooling, `cat`-readable. The
current version is **0.2** (2026-07-25). `pk`, pinned to the commit that lands its `okf-v02-writer` change,
writes 0.2 directly: `generated: { by, at }` as a mapping and `sources` as structured entries, not the
0.1-era `timestamp` field and body `# Citations` list.

`.prometheus/` is the bundle root; `.prometheus/knowledge/` is where `pk` writes:

| Path | OKF role | Notes |
|---|---|---|
| `index.md` | reserved — directory listing | carries `okf_version: "0.2"` and no other frontmatter (§8) — `lib/karpathy/knowledge-bundle.test.mjs` guards this |
| `decisions.md`, `gotchas.md`, `postmortems/` | this pack's own append-only memory, **outside** the bundle | no `type` frontmatter today; not OKF-conformant, and this section does not claim otherwise |
| `knowledge/**/*.md` | concept, `type` per article, written by `pk` | what `pk ingest` distils from delivered events |
| `session-log.md`, `progress-memory-receipts/` | **outside** the bundle | not `.md` under `knowledge/`, so `pk`'s conformance scope never touches them |

Every concept file `pk` writes carries the v0.2 families, and they map directly onto rules this project
already has:

| OKF v0.2 field | Rule it implements |
|---|---|
| `type` (required) | — |
| `generated: { by, at }` | A-15: who produced it is on the record |
| `verified: [{ by, at }]` | the derived trust tier **is** D-6: *unverified* → *machine-confirmed* → *human-reviewed*. A lesson may become a rule only at *human-reviewed*. |
| `status: draft \| stable \| deprecated` | `deprecated` instead of deleting — "mark entries superseded; never delete them" |
| `stale_after` | a gotcha about an upstream bug expires instead of misleading forever |
| `sources: [{ id, resource, … }]` | A-6: every claim points at its evidence |

`pk` stays optional (`openspec/config.yaml`'s binding constraint): with it absent, `pk ingest` degrades and
no knowledge bundle is written or updated, but the recorder's own receipts and `session-log.md` are
entirely unaffected either way — they do not depend on `pk` running, ever having run, or ever running
again.

The files above remain the **primary record**. surreal-memory is the searchable
secondary: accepted reflections are written back to it through the memory
bridge, and anything that cannot be delivered waits in the outbox. Losing the
container never loses a log entry.

Self-improvement loop: events → learning queue → distilled entries in a local
learnings file → surfaced by the `prompt-karpathy-learning` hook → consumed by
`kbd-reflect` and `pmpo-evolver`.

#### Three tiers of log — project, personal, team

Every log at every tier is the same thing: an OKF v0.2 bundle in a git repository. A tier is *where a bundle
lives and who may write it*, not a different format.

| Tier | Lives in | Written by | Reaches a project through |
|---|---|---|---|
| **Project** | `.prometheus/` in the project repository | the hooks; reviewed in the project's own PRs | always selected |
| **Personal** | the developer's own private git repository | distilled from that developer's events across *all* projects; committed locally — **the developer pushes, never the agent**; `sources sync` reports unpushed and uncommitted work | `~/.prometheus/sources.json` — follows the developer, never named in a project |
| **Team** | a team git repository | **pull request only** — never written directly by a working agent | `.prometheus/sources.json`, committed |

**Selecting logs.** A project's logs are declared in a registry, merged in this order:
`.prometheus/sources.json` (committed: project + team sources) → `~/.prometheus/sources.json` (personal) →
`.prometheus/sources.local.json` (git-ignored, per-developer overrides). Non-project sources are plain clones
under `~/.prometheus/sources/<id>/`. No submodules (they would commit a private URL into every project) and
**no symlinks** (the way the personal tier is wired by hand today, and the one thing Windows cannot do).

**Reading — "can and do".** `sources sync` (clone, else fetch + fast-forward only; time-boxed; offline
degrades to the last good checkout) runs at session start and at `kbd-assess`, and writes
`phases/<phase>/sources-receipt.json`: for each selected source its id, tier, **resolved commit SHA**, fetch
time and status. The assess and plan stage gates require a fresh receipt, a `required` source that is missing
blocks the gate, and the assessment carries a "sources consulted" block copied from it. The previous
receipt's SHA yields the update digest — "team-platform: 3 new, 1 deprecated since your last session" — so
nobody re-reads a whole log to learn what changed. The receipt proves selection and availability; it cannot
prove the model paid attention.

**Ranking across tiers.** Relevance; then OKF trust tier (human-reviewed > machine-confirmed > unverified);
then freshness (`deprecated` and past-`stale_after` entries are excluded); tier only as the tie-break, most
specific first. The bounded context budget has a per-tier floor so a large team log cannot crowd out a
project's own gotchas. Entries carry a content-addressed id and a `sources:` lineage link, so something
promoted from personal to team is injected once, not twice.

**Maintaining a team log** is four Node skills, run from the team repository's CI or a maintainer's
session: `karpathy-share` (a member proposes one entry — the push model, so nothing leaves a private log
unchosen), `team-log-harvest` (pulls only from project repositories the team already owns),
`team-log-curate` (de-duplicate, adversarial review, sycophancy gate, open the PR as *machine-confirmed*;
the human merge makes it *human-reviewed*), `team-log-prune` (expire and deprecate, never delete). Crossing
from a private or client log into a team log requires per-entry opt-in, secret rejection and path
redaction — that is a real trust boundary.

**Both packs.** The contract is files, not an API: any tool that reads OKF v0.2 Markdown can read the
bundle `pk` writes. The source pack takes part once `pk` accepts a repeatable `--kb <path>` beside its
three fixed scopes (project, shared, global — all hard-wired local paths today, with no git, team or
selection concept); this pack invokes `pk` as a per-call CLI (§5.3 above) and never reimplements its
writer.

### 5.4 Template language

**Nunjucks** (pure JavaScript, Jinja2 family). The source's Tera templates use
a very small feature set — `if`/`elif`/`else`, `for`, one `set`, and the
filters `default`, `replace`, `upper`, `json_encode`, `safe`; no macros, no
inheritance, no includes — so the languages overlap almost completely.

The one real incompatibility is **filter arguments**: Tera takes named
arguments, Nunjucks takes positional ones.

| Tera (source) | Nunjucks (mini) |
|---|---|
| `{{ v \| default(value="0.1.0") }}` | `{{ v \| default("0.1.0") }}` |
| `{{ n \| replace(from="-", to="_") }}` | `{{ n \| replace("-", "_") }}` |
| `{{ s \| json_encode \| safe }}` | `{{ s \| dump \| safe }}` |
| `{{ a ~ ':latest' }}` | unchanged |

Roughly 25 call sites across the source templates, and most belong to skills
this pack excludes (`native-agent`), so the practical conversion is small. Files
are renamed `*.tera` → `*.njk`. Autoescape must be **off** — these templates
emit Rust, TOML, and JSON, not HTML.

Caveat: in the source pack only `forge-rs` renders Tera, and it registers
templates from its own manifests. The templates under `skills/` have no in-repo
renderer and appear to be agent-interpreted. Giving the mini pack a real
renderer (`node scripts/render.mjs <template> --vars <json>`) is therefore an
improvement on the source, not just parity.

### 5.5 Spec backend

Source precedence: explicit pin → openspec → speckit → native-kbd, with
native-kbd as the default for new projects. Mini: **`openspec` is the default
for new projects**; `native-kbd` (a `tasks.json` file) stays as the fallback
for when the CLI is missing; `speckit` (documented but never wired in the
source) is dropped.

OpenSpec adapter operations, carried over verbatim from the source contract:

| Op | Implementation |
|---|---|
| `detect` | `openspec/` exists **and** `openspec` resolves on PATH |
| `list_tasks` / `progress` | `openspec instructions apply --change <c> --json` |
| `mark_done` | flip `- [ ]` → `- [x]` in `openspec/changes/<c>/tasks.md` |
| `verify` | `openspec validate <c>` |
| `archive` | `openspec archive <c> --yes` — `--yes` is mandatory or it blocks on a prompt |

Invariant kept from the source: `kbd-apply` drives **per task** and never calls
a backend's "implement everything" command. Windows note: npm installs
`openspec` as `openspec.cmd`, which `child_process.spawn` cannot launch with
`shell: false`; the spawn helper in `lib/platform/` has to resolve the shim
explicitly rather than turning the shell on.

### 5.6 Docker services

One Compose file, `docker/compose.yaml`, defines all three containers. It is
**required on Windows** and **works unchanged on macOS and Linux** for anyone
who prefers containers there — but macOS/Linux keep the source pack's native
launchd/systemd path as their default, so existing installs are untouched.

| Service | Image / build | Host endpoint | State |
|---|---|---|---|
| `surrealdb` | `surrealdb/surrealdb:v3.0.5` (pinned, same as source) | `127.0.0.1:28000` | named volume `surrealdb_data` (RocksDB) |
| `surreal-memory` | built from the source pack's `tools/surreal-memory-server/Dockerfile` with `--no-default-features --features server-only,palace,local-embeddings` | `127.0.0.1:23001` → container `3001` | named volume for the Hugging Face model cache |
| `liter-llm` | built from `tools/liter-llm/docker/Dockerfile`; runs `liter-llm api --host 0.0.0.0 --port 4000` | `127.0.0.1:4000` | config mounted read-only |

The ports, the SSE path (`/mcp/sse`), the SurrealDB namespace/database
(`memory` / `main_local_384`), and the model names (`kbd-judge`, `kbd-critic`)
are **identical on every platform**, so `.mcp.json`, the memory bridge, and the
judge dispatcher contain no platform branches. Only *how the process is
started* differs.

**Changes from the source Compose file — each traces to a real boundary or a
Windows fact:**

| Source | Mini | Why |
|---|---|---|
| `ports: "28000:8000"` (all interfaces) | `127.0.0.1:28000:8000`, same for `23001` and `4000` | A database and an LLM gateway holding provider keys should not be reachable from the LAN. The source pack treated the same defect in forge-mcp as P0 (`change-credibility-002-bind-loopback`). |
| `--user=root --pass=root` inline | `${SURREAL_USER}` / `${SURREAL_PASS}` from a git-ignored `docker/.env` | Secrets never in source (A-3). |
| `${HOME}/.cache/huggingface/hub` bind mount | named volume | `HOME` is not set in `cmd.exe`/PowerShell, and bind mounts from NTFS are slow. |
| `RUST_LOG=debug` | `info` | Debug logging of a memory server writes user content to container logs. |
| Secrets sourced by `liter-llm-api-launch.sh` from `~/.prometheus/kbd/secrets.env` | Compose `env_file:` pointing at the same kind of file | Same separation — keys live in one owner-only file, never in the unit/compose definition — without a bash launcher. macOS/Linux keep the launcher. |
| `restart: unless-stopped` | kept | Containers come back with Docker Desktop; no Windows service or scheduled task is needed. |
| No memory limits | `deploy.resources.limits.memory` per service | C9. |

**Critic and judge.** Model routing keeps the source's resolution order, highest
first: explicit argument → `PROMETHEUS_KBD_<ROLE>_MODEL` →
`~/.prometheus/kbd/models.toml` `[roles]` → `.kbd-orchestrator/project.json`
`model_policy` → built-in defaults `kbd-judge` / `kbd-critic`. Those names must
exist as `[[models]]` entries in `liter-llm-proxy.toml`; the resolver fails
loudly when a role points at a model the gateway cannot route, rather than
discovering it as a 404 mid-review. Gateway discovery: `LITER_LLM_BASE_URL` →
first of `http://localhost:8181/v1`, `http://localhost:4000/v1` that answers
`GET /models`. Provider API keys are the user's; the pack ships none.

**Lifecycle.** `node scripts/services.mjs up|down|status|logs` is a thin wrapper
over `docker compose -f docker/compose.yaml …` (spawned with `shell: false`).
`doctor.mjs` reports each service as *up*, *down*, or *not installed* — never
as a failure, because of C8a.

**Image builds are the cost.** Both Rust images compile inside the Docker VM,
which is slow and memory-hungry on a 16 GB machine. Publishing prebuilt,
digest-pinned images and having Compose `pull` instead of `build` is the
intended end state; until those exist, building locally is the only path. No
published image for surreal-memory-server was found; an upstream liter-llm
image exists (`ghcr.io/xberg-io/liter-llm`) but this pack tracks a fork, so it
is not assumed to be equivalent.

### 5.7 Agent rules — Prometheus Rules Architecture v4

Agent context is layered so each rule sits where it earns its tokens:

| Layer | Where | Loaded |
|---|---|---|
| 0 Constitution | `CLAUDE.md`, `AGENTS.md` | every turn, every subagent; ≤ 120 lines |
| 1 Path rules | `.claude/rules/*.md`, `.cursor/rules/*.mdc`, nested `AGENTS.md` | when a matching file is read; ≤ 80 lines each |
| 2 Skills | `.claude/skills/`, `.agents/skills/` | metadata at start, body on **named** invocation |
| 3 Reference | `docs/`, `.prometheus/`, `versions.toml`, `tasks/todo.md`, `openspec/` | at bootstrap / before a subsystem |
| 4 Hooks | `hooks/`, `.githooks/` | never — mechanical checks cost no context |

**Edit `rules/src/` only.** `node rules/build.mjs` renders every target;
`node rules/build.mjs --check` exits 1 on drift or a budget breach and belongs
in CI. The build enforces the Layer 0 budget, that A-1…A-17 each appear exactly
once, that every Layer 1 file carries `paths:` frontmatter (a file without it
would load unconditionally), and that no Layer 1 file repeats a constitution
rule.

Two deliberate deviations from the v4 document, both forced by C1–C3:

- **`AGENTS.md` is a generated copy, not a symlink.** Symlinks need Developer
  Mode or elevation on Windows. `--check` fails if the copy differs from
  `CLAUDE.md` by a single byte, which prevents the drift the symlink was for.
  Add `GEMINI.md` by appending it to `mirrors` in `rules/build.conf`.
- **`rules/build.mjs`, not `rules/build.sh`.** The source pack's v4 renderer is
  `build.py` behind a bash wrapper; this is a Node port of it.

Rendered today: the constitution, the skill routing table, the `rust` stack
rule, the four domain rules (`architecture`, `security-boundaries`,
`agent-runtime`, `review`), and two project rules (`node-scripts`,
`docker-services`). Stacks this repo does not contain — React, Flutter, WASM,
Tauri, Python, Go — are not rendered; add one by dropping its file into
`rules/src/tech/` and naming it in `build.conf`.

---

## 6. Windows rules for every contribution

- **No symlinks.** Installer copies. `.claude-plugin/` contains real directories. `AGENTS.md` is a generated copy of `CLAUDE.md`.
- **Docker is reached over loopback TCP only.** Never `docker exec` into a container from a hook, never bind-mount a host path that is built from `HOME`, never assume the Docker CLI is on PATH — probe and degrade.
- **No executable bit.** Everything is invoked as `node <file>`; never rely on a shebang.
- **No `jq`, `sed`, `grep`, `awk`, `curl`, `mktemp`, `chmod`** — in scripts *or* in SKILL.md instructions the agent is told to run.
- **Paths:** `path.join` / `path.resolve`; `os.homedir()`; `os.tmpdir()`. Never `~`, `$HOME`, `/tmp`, or a hardcoded `/`.
- **Processes:** `spawn` with `shell: false` and an args array. Never build a command string.
- **Atomic writes:** write to a temp file in the *same directory*, then `fs.rename`. Retry on `EPERM`/`EBUSY` — antivirus and indexers hold files open on Windows.
- **Line endings:** `.gitattributes` with `* text=auto eol=lf`; parsers must tolerate CRLF anyway.
- **Case-insensitive filesystem:** no two files differing only by case.
- **Path length:** keep state paths short; the source's deeply nested `.kbd-orchestrator/phases/.../changes/...` trees approach the 260-character limit.
- **Tests:** `node:test`, run in CI on `windows-latest`, `ubuntu-latest`, `macos-latest`. The source's `bats` tests do not come across.

---

## 7. Memory budget (16 GB)

The source pack declares no memory figures anywhere, so nothing below is
measured — these are planning estimates to be replaced with real numbers from
a Windows machine.

| Component | Resident? | Estimate |
|---|---|---|
| Dropped from the source stack: pk, forge, openai-proxy, `prometheus-exec`, learning-worker | — | **eliminated** |
| Docker Desktop VM (WSL 2 or Hyper-V backend) | yes, on Windows | 1–2 GB overhead before any container |
| `surrealdb` container (RocksDB) | yes | a few hundred MB, grows with data |
| `surreal-memory` container (loads `bge-small-en-v1.5` for local embeddings) | yes | ~0.5–1 GB |
| `liter-llm` container (a proxy; inference happens at the provider) | yes | ~100 MB |
| Mini pack hooks | no — one short-lived `node` process per event | tens of MB, transient |
| `openspec` CLI | no — per invocation | tens of MB, transient |
| Optional `npx` stdio MCP servers | while the session is open | ~50–100 MB each |
| **Resident total on Windows** | | **≈ 2–4 GB, all of it inside the Docker VM** |
| Building the two Rust images inside the Docker VM | one-off | several GB; the VM cap below may need raising for the build, then lowering |
| `cargo build` of a scaffolded Rust tool | during builds only | the real peak: 2–6 GB for a mid-sized workspace with LTO |

**Cap the Docker VM.** Left alone, the WSL 2 backend may claim up to half of
host RAM. Set a ceiling of about **4 GB**: with WSL 2, `memory=4GB` under
`[wsl2]` in `%UserProfile%\.wslconfig`; with Hyper-V, Docker Desktop →
Settings → Resources. Per-service `memory` limits in the Compose file keep one
container from starving the others inside that ceiling. The source Compose
files set no limits except a 3 GB cap on an optional Ollama service, which this
pack does not include — local model inference is out of scope for 16 GB.

That leaves roughly 12 GB for Windows, the harness, the editor, and builds.
Beyond Docker, the pack itself is not the constraint; **Rust compilation is**. The toolkit
skills will therefore recommend, for 16 GB machines: cap parallelism
(`cargo build -j 4`), keep `lto` and `codegen-units = 1` to release profiles
only, prefer a small dependency set for stdio MCP servers (`rmcp` +
`tokio` + `serde`, not Axum/hyper), and avoid wasmtime-class dependencies.

---

## 8. Roadmap as OpenSpec changes

Each line is one `/opsx:propose`. Order matters — later changes build on
`lib/platform`.

1. `platform-foundation` — `lib/platform/` (paths, atomic write, lock, spawn with `.cmd` resolution), `node:test` harness, 3-OS CI, `.gitattributes`.
2. `hook-entry-node-only` — `hooks.json` + `hook-entry.mjs` with in-process dispatch; cold-start measurement on Windows. The installed file list is derived from `hooks.json`, and a test resolves every path `hooks.json` names inside the built payload — the source pack shipped a payload missing its hook entry, which broke every hook event.
3. `kbd-state-core` — position, progress, waypoint, stage-gate, rollup as Node modules.
4. `spec-backend-openspec-default` — OpenSpec adapter, native-kbd fallback, `kbd-apply` driver.
5. `kbd-skills-import` — copy Markdown sub-skills; strip ZeeSpec and daemon references.
6. `okf-v02-io` + `karpathy-progress-memory-node` — OKF v0.2 reader/writer (reads 0.1), recorder, receipts, learning queue, SessionStart drain, `log.md` rendered from `events.jsonl`. `pk` is an optional accelerator, never required.
6a. `knowledge-sources` — the sources registry, `sources sync`, the per-phase receipt, the update digest, cross-tier ranking, and the stage-gate check.
6b. `team-log-skills` — `karpathy-share`, `team-log-harvest`, `team-log-curate`, `team-log-prune`.
7. `docker-services` — `docker/compose.yaml` (loopback binds, env-file secrets, named volumes, memory limits), `scripts/services.mjs`, Windows backend + VM-cap docs. Verified on a real Windows machine under **both** backends.
8. `memory-bridge-node` — surreal-memory client, durable outbox, writeback + flush hooks, `kbd-memory-recall`, `ideation-mindmap`.
9. `adversarial-review-node` — 6,146 lines of bash + inline Python: packet builder, judge dispatch (exit contract 0/2/3/4), preflight, model resolution, the sycophancy MCP client rewritten from a named pipe to `spawn` + stdin, decision log writing OKF v0.2; `liter-llm-bridge` rewritten as configure-and-verify.
9a. `deep-research-node` — ~9,000 lines: ten stdlib-only, network-free Python scripts and the `jq`-bound driver ported to Node; the ten stage skills and nine agent prompts copied; checkpoint mode only (exit 3 = awaiting a stage); the Rust background server is **not** shipped. Needs Tavily or Firecrawl (both Node stdio MCP); surreal-memory and the gateway stay optional.
10. `pmpo-skills-port` — elicit, outer-loop, evolver, skill-creator.
11. `iterative-evolver-port` — workflow dispatch and provider resolution without Python.
12. `template-engine-nunjucks` — renderer, filters, Tera→Nunjucks conversion.
13. `rust-toolkit-stdio` — rewrite `mcp-server` stdio-first; write new `rust-cli`; import the neutral guidance skills.
14. `rules-layer4-hooks` — the v4 hooks the constitution points at: `commit-msg` (A-15), build guard (A-10), formatter; wire `rules/build.mjs --check` into CI.
15. `prebuilt-images` — publish digest-pinned surreal-memory and liter-llm images so Windows users pull instead of compiling Rust in the Docker VM.
16. `installer-and-doctor` — copy-mode installer, `doctor.mjs` including service status.

---

## 9. Open questions and unverified claims

- **Hook cold-start on Windows.** Whether a Node process fits the source's 1 s hook budgets on typical Windows hardware is untested. If it does not, raise the budgets before reaching for a compiled dispatcher.
- **Neither container stack has been run on Windows.** The Compose design in §5.6 is derived from reading the source pack's Dockerfiles and Compose files on macOS. Image build time, VM memory during the build, and first-start model download for local embeddings are all unmeasured.
- **Windows Home cannot avoid WSL 2.** Hyper-V is not available there, so Docker Desktop requires the WSL 2 backend. The pack still never enters WSL, but "no WSL on the machine" is only achievable on Pro, Enterprise, or Education.
- **Docker Desktop licensing.** It requires a paid subscription for larger organisations; whether that matters depends on who installs this pack.
- **Which liter-llm image.** The pack tracks a fork; whether the fork publishes an image, and whether the upstream image is equivalent, was not checked.
- **`sycophancy-correction` on Windows.** A stdio Rust server that *should* build for `windows-msvc`; not built or run as part of this analysis. It is separate from the critic/judge path, which goes through liter-llm.
- **Rules v4 on non-Claude harnesses.** Path-scoped loading of `.claude/rules/` is a Claude Code feature (and reported unreliable under worktrees); named skill invocation is assumed, not tested, on Codex, Cursor, and OpenCode. The v4 document asks for one test per harness, recorded in `.prometheus/gotchas.md`.
- **Tera templates under `skills/`.** No in-repo renderer was found for them; the conclusion that they are agent-interpreted is an inference.
- **Memory figures in §7** are estimates, not measurements.

**Settled by `platform-foundation` (2026-09-21), with run links in
[`evidence/windows.md`](.kbd-orchestrator/phases/platform-foundation/evidence/windows.md):** that
Node's atomic-write, locking, CRLF handling and shell-free CLI spawning work on Windows; that the
repository survives a `core.autocrlf=true` checkout; and that Node 22 and 24 both work. Node 26 —
what this machine runs — is still untested and unclaimed.
- **Harness hook support on Windows.** Exec-form hooks with `${CLAUDE_PLUGIN_ROOT}` are taken from the source pack's Claude Code configuration; equivalent behaviour in Codex, Cursor, and OpenCode on Windows needs checking per harness.
- **`ideation-mindmap`** is deferred, not rejected — decide once the core loop works.
