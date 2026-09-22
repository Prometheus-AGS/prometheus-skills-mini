# Rust Tool Analysis: Windows Portability and Mini-Pack Fit

## Executive recommendation

The full `prometheus-skill-pack` is not a safe unit to move into `prometheus-skills-mini`. Its Rust surface combines portable libraries, Unix-bound execution machinery, imported products, and several resident network services. Windows portability and mini architectural fit must therefore be decided independently.

Recommended disposition:

- **Keep the existing `pk` CLI baseline (A), but do not copy it from the full pack.** Mini already vendors a newer, Windows-tested `tools/prometheus-knowledge` pin (`abb6745`). `pk` remains optional and no release artifact currently makes it a clean-host dependency.
- **Open separate bounded-port changes for three strong B candidates:** `sycophancy-correction` (stdio MCP), `rust-mcp-filesystem` (optional stdio MCP), and `learner-model` (optional JSONL CLI). None is certified by this analysis.
- **Keep only the two already-authorized service capabilities as C:** `liter-llm` and `surreal-memory` backed by SurrealDB, containerized on Windows and bound to loopback. Do not import upstream Compose definitions unchanged.
- **Mine several products for contracts and guidance (D), not binaries.** This includes execution receipts/contracts, KBD runtime patterns, registry/storage libraries, Forge checks, CLI diagnostics, Rust auditing rules, and template behavior.
- **Exclude Unix-centric or scope-conflicting products (E):** the full execution daemon, Rust research daemon, surface bridge, OpenAI proxy, `pk-cherry`, learning worker, Cowork CLI, entity-management products, and any Forge resident service.

This change moved or certified **no tool**. It adds no dependency, daemon, database, port, installer, or Rust host requirement.

## Scope, method, and evidence language

### Repositories and governing constraints

Source inspected: `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack`. The evidence snapshot is superproject HEAD `fcccc9d6ea32f77a99b9f39da914d3c7725d152b`, with relevant imported pins: artifact-refiner `18d000f3`, sycophancy-correction `bc348fff`, rust-mcp-filesystem `ef808b7d`, entity management `d1588d8c`, Cowork `77edcf8a`, disk-space-guardian `26487db6`, liter-llm `c5c6caac`, openai-proxy `7833663d`, full-pack prometheus-knowledge `01a1dbe0`, and surreal-memory-server `452dab12`. These immutable revisions make the source citations reproducible and keep full-pack `pk` evidence separate from mini's newer `abb6745` pin.

Destination constraints come from this repository's `openspec/config.yaml`, current `.prometheus/decisions.md`, `.prometheus/gotchas.md`, and `README.md`. Where the README roadmap is stale, the current config and dated decisions govern. In particular, README statements that the port “has not started,” that `pk` is dropped, or that a Node OKF writer is planned are superseded by the implemented Node phases and the `pk` decisions at `.prometheus/decisions.md:129-145` and `:196-235`.

The mini constraints decisive for this analysis are:

- native `cmd.exe`/PowerShell operation without Git Bash or pack-managed WSL;
- Node >=22 as the only script runtime; no Bash, Python, shell strings, symlinks, or executable-bit reliance;
- exactly two resident service capabilities: `surreal-memory` (+ SurrealDB) and `liter-llm`;
- optional `pk`; no required Rust toolchain or Rust binary on a Windows host;
- optional/scaffolded MCP servers use stdio and log only to stderr;
- the KBD lifecycle and hooks remain Node-owned;
- a 16 GB host target, with the Docker VM expected to stay near 4 GB;
- deep research is checkpoint-only; the Rust research daemon is excluded.

`versions.toml` is named by the constitution and README as version authority but is absent from this repository. No version conclusion in this report relies on a missing file.

### Inventory method

The canonical inventory was derived from root crates, `tools/`, `substrate/`, binary targets, `skill-system.json` imports, `.gitmodules`, and `shared/services.manifest.json`. Products are grouped by deployable/user-facing capability rather than one row per internal crate.

Deduplication and exclusions:

- `.worktrees/**`, `dist/plugins/**`, generated harness projections, fixtures, examples, and build outputs are not products.
- Imported repositories are identified as imports and assessed once at their canonical source path; nested copies under imported distributions are duplicates.
- Internal workspace crates are grouped beneath their executable/service unless they are independently useful libraries.
- Non-Rust tools are outside the inventory except when required to install, start, supervise, or operate a Rust product.
- Service ports were reconciled against executable defaults and service templates; `shared/services.manifest.json` alone is not authoritative (it misidentifies Forge as `:8942`; Forge actually uses `:8943`).

### Evidence labels

The Windows columns distinguish four different claims:

- **Compile** — a Windows target compiled in observed CI.
- **Artifact** — a consumable Windows release artifact exists; a target declaration is not an artifact.
- **Tested** — tests or a runtime scenario ran on Windows, not merely compilation.
- **Operable** — installation, configuration, startup, shutdown, and supervision have a demonstrated Windows path.

Values are **Yes**, **No**, **Partial**, or **Unknown**. Confidence is confidence in the recommendation, not a claim that the product works on Windows. Source inspection is not upgraded to runtime verification.

Recommendation classes: **A** move/adapt now; **B** candidate after bounded Windows hardening; **C** container-only permitted service; **D** guidance/library extraction only; **E** exclude. `pk` is labeled **A (baseline satisfied)** because it meets the direct-fit criterion and is already present; its required action is preservation, not another move. This baseline qualifier is status, not a sixth recommendation class.

## Canonical product matrix

All source paths in this table are relative to `prometheus-skill-pack` unless prefixed `mini:`.

| Product / grouped capability | Role and key evidence | Windows: compile / artifact / tested / operable | Mini fit | Class | Confidence |
|---|---|---|---|---|---|
| [`pk` CLI](#a-baseline-satisfied--existing-pk-cli) | Optional OKF/knowledge CLI. Full-pack blocker existed at `tools/prometheus-knowledge/pk-cli/src/main.rs:1215-1227`, but mini pins the later Windows-tested tree (`mini:.prometheus/decisions.md:129-145`). | Yes / No / Yes / Unknown | Existing optional baseline; do not copy stale source tree. | **A (baseline satisfied)** | High |
| `pk-cherry` | HTTP companion on `:8942`; manifest at `tools/prometheus-knowledge/pk-cherry/Cargo.toml`. | Unknown / No / Unknown / No | Adds a prohibited service; `pk` CLI already covers mini's accepted use. | **E** | High |
| `pk-learning-worker` | Short-lived `RunOnce`/`Status` binary at `tools/prometheus-knowledge/pk-learning-worker/src/main.rs`, supervised as a timer/path unit by `shared/services.manifest.json:188-250`; mini uses receipts and SessionStart replay instead (`mini:.prometheus/decisions.md:149-184`). | Unknown / No / Unknown / No | Supervisor lifecycle conflicts with mini; one-shot behavior does not make the worker necessary. | **E** | High |
| [`liter-llm`](#c-permitted-service-liter-llm) | OpenAI-compatible gateway. Windows build leg at `tools/liter-llm/.github/workflows/ci-e2e.yaml:70-123`; guarded signals at `tools/liter-llm/crates/liter-llm-proxy/src/shutdown.rs:211-264`; image at `tools/liter-llm/docker/Dockerfile`. | Yes / Unknown / Unknown / Unknown | One of exactly two permitted capabilities; Windows runtime is container-only but untested here. | **C** | High |
| `liter-llm-catalog-gen` | Independent catalog fetch/write/validate binary declared by `tools/liter-llm/crates/liter-llm-catalog-gen/Cargo.toml` and implemented in its `src/main.rs`. | Unknown / Unknown / Unknown / Unknown | Network/filesystem maintenance utility grouped with liter-llm source, but not needed for mini runtime. | **D** | Medium |
| liter-llm bindings (`ffi`, `node`, `wasm`, language packages) | Independently consumable bindings under `tools/liter-llm/crates/liter-llm-ffi/`, `liter-llm-node/`, `liter-llm-wasm/`, and `tools/liter-llm/packages/`. | Unknown / Unknown / Unknown / Unknown | Mini consumes the HTTP gateway contract; carrying language bindings adds no observed value. | **D** | High |
| [`surreal-memory-server`](#c-permitted-service-surreal-memory--surrealdb) | Memory API/MCP. Guarded signals at `tools/surreal-memory-server/src/main.rs:262-280`; network/CORS surfaces at `tools/surreal-memory-server/src/mcp/http.rs:38-75` and `tools/surreal-memory-server/src/api/mod.rs:117-135`. | Unknown / Unknown / Unknown / Unknown | Second permitted capability; Windows runtime is container-only but untested here. | **C** | High |
| [`sycophancy-correction`](#b1-sycophancy-correction-stdio-mcp) | Imported stdio MCP; `skills/imported/sycophancy-correction/crates/sycophancy-mcp/src/server.rs:387-393`. | Unknown / No / Unknown / No | Strong optional stdio fit after gateway/config and Windows certification work. | **B** | High |
| [`rust-mcp-filesystem`](#b2-rust-mcp-filesystem-stdio-mcp) | Imported stdio filesystem MCP. Transport/config at `skills/imported/artifact-refiner/tools/rust-mcp-filesystem/src/server.rs` and `skills/imported/artifact-refiner/tools/rust-mcp-filesystem/src/cli.rs`; Windows path code at `skills/imported/artifact-refiner/tools/rust-mcp-filesystem/src/fs_service/utils.rs`; target/package declarations at `skills/imported/artifact-refiner/tools/rust-mcp-filesystem/dist-workspace.toml`. | Unknown / Unknown / Unknown / No | Useful optional MCP, but filesystem authority is a material trust boundary. | **B** | High |
| [`learner-model`](#b3-learner-model-jsonl-cli) | Local JSONL CLI (`substrate/learner-model/README.md`); literal `~/.prometheus/...` resolution at `substrate/learner-model/src/main.rs:44-53`. | Unknown / No / Unknown / No | Optional short-lived CLI can fit after path, packaging, and privacy work. | **B** | Medium |
| `prometheus-exec` product | Unix-socket daemon (`crates/prometheus-exec/src/daemon.rs:237-238`); stdio frontend still launches it (`crates/prometheus-exec/src/mcp.rs:533-555`); no Windows Tier-P sandbox (`substrate/exec-tier-p/src/lib.rs:16-26`). | Unknown / No / Unknown / No | Prohibited resident execution authority and Unix sandbox design; operability failure is not evidence of compile failure. | **E** | High |
| Execution contracts/libraries (`exec-core`, `exec-contracts`, `exec-embedded`, Tier W) | Transport-independent kernel and reusable schemas/receipt patterns in `substrate/exec-core/src/lib.rs`, `substrate/exec-contracts/`, `substrate/exec-embedded/`, and `substrate/exec-tier-w/`; `exec-service`, `exec-remote`, and Tier P belong to the excluded product. | Unknown / N/A / Unknown / N/A | Extract typed evidence/receipt and Windows-safe embedding patterns only. | **D** | Medium |
| `prometheus-hook` | Interpreter/payload dispatcher at `crates/prometheus-hook/src/main.rs:99-117`, with store/path logic at `crates/prometheus-hook/src/store.rs:15`; reachable payloads are Bash scripts. | Unknown / No / Unknown / No | Duplicates mini's tested Node hook entry; retain digest/path-validation ideas only. | **D** | High |
| `kbd-runtime` | Large state runtime at `substrate/kbd-runtime/`; contains Windows-aware keyring/path guards but also file synchronization/locking responsibilities. | Unknown / No / Unknown / No | Competes with OpenSpec/Node canonical state ownership. Extract contracts only. | **D** | High |
| `prometheus-research` | HTTP/SSE server at `:7891`, depends on surface bridge `:7890`, and invokes `run-research.sh` from `substrate/prometheus-research/`. | Unknown / No / Unknown / No | Explicitly excluded for operability/architecture; no compile failure is claimed. | **E** | High |
| `surface-bridge` | Stub HTTP bridge (`substrate/surface-bridge/`) on `:7890`, permissive CORS and in-memory response state. | Unknown / No / Unknown / No | Third port plus implicit volatile business state. | **E** | High |
| `forge-rs` | Tera host/HTTP MCP plus filesystem-capable packaging CLI; `tools/forge-rs/crates/forge-cli/src/main.rs:1-16,75-87` can launch an editor and `cargo build`; MCP defaults to `:8943`. | Unknown / No / Unknown / No | Service and Tera ownership conflict with Node/Nunjucks. Mine checks only. | **D** | High |
| `prometheus-cli` | Broad global-state CLI: `tools/prometheus-cli/crates/prometheus-cli/src/main.rs:19-109` exposes install/uninstall/repair/refresh plus KBD, doctor, services, Cedar and learning concerns. | Unknown / No / Unknown / No | Duplicates mini's Node lifecycle and mutation authority. Reuse contracts/diagnostic semantics only. | **D** | High |
| `prometheus-rust-auditor` | Auditor at `tools/prometheus-rust-auditor/Cargo.toml`; Ubuntu-only CI/generated Ubuntu behavior; Windows allocator/runtime remains unproved. | Unknown / No / Unknown / No | Guidance is valuable; binary and Bash installer are not. | **D** | High |
| `dsg` (`disk-space-guardian`) | Destructive cleanup CLI at `tools/disk-space-guardian/dsg/`; Windows target is declared at `tools/disk-space-guardian/.github/workflows/release.yml:18-59`, while `tools/disk-space-guardian/dsg/src/safety.rs:40-113` uses `lsof`. | Unknown / Unknown / Unknown / No | Potentially portable but outside mini's KBD/PMPO purpose and carries destructive filesystem authority. | **D** | Medium |
| `template-forge-rs` | Imported CLI/stdio MCP at `skills/imported/artifact-refiner/tools/template-forge-rs/`; Tera-based workspace. | Unknown / No / Unknown / No | Duplicates mini's Node/Nunjucks renderer. Preserve behavior/tests as reference only. | **D** | High |
| Registry/storage/FFI libraries | `substrate/skill-index/`, `storage-provider/`, and `skill-ffi/`. | Unknown / N/A / Unknown / N/A | Possible scaffold/reference material; no demonstrated need for host binaries. | **D** | Medium |
| `openai-proxy` | Additional HTTP gateway at `:8181`, manifest `tools/openai-proxy/Cargo.toml`. | Unknown / No / Unknown / No | Duplicates `liter-llm` and violates the service/port limit. | **E** | High |
| `cowork` CLI | Imported/global skill manager under `tools/cowork-skills/cli/`; Unix symlink and Bash update paths, despite a Windows target declaration in `tools/cowork-skills/cli/Cargo.toml:82-88`. | Unknown / Unknown / Unknown / No | Global writes, symlink semantics, and overlap with mini installer make it unsafe to carry; no compile failure is claimed. | **E** | High |
| Entity-management Rust products | Imported `entity-graph-cli`, `entity-graph-mcp`, and Tauri plugin under `skills/imported/prometheus-entity-management/packages/`. | Unknown / Unknown / Unknown / Unknown | Domain-specific imported products, not mini process infrastructure. | **E** | High |
| Mobile/sovereign substrate products | `substrate/kbd-mobile/`, `sovereign-client/`, and `sovereign-sync/`. | Unknown / No / Unknown / No | No mini requirement; introduces unrelated client/sync architecture. | **E** | Medium |

The rows above cover the canonical first-party/imported Rust executable and service capabilities found under root `crates/`, `tools/`, `substrate/`, and the imported repositories. Internal crates are represented by their owning product, the liter-llm binding group, or the explicitly reusable library rows; examples, fixtures, generated distributions, and worktree copies are intentionally not separate rows.

## Detailed A/B/C candidates

### A (baseline satisfied) — Existing `pk` CLI

**Value.** `pk` is the sole writer of mini's OKF v0.2 knowledge bundle. It is invoked per call, not resident, and its absence degrades knowledge ingestion without blocking receipts or the KBD loop.

**Evidence and work.** The older full-pack tree contains the historical unguarded Unix permission import at `tools/prometheus-knowledge/pk-cli/src/main.rs:1215-1227`. Mini already pins `abb6745`, whose CI was observed green on Windows, macOS, and Linux (`mini:.prometheus/decisions.md:129-145`). Therefore the safe action is to keep the newer mini submodule, not copy or merge the stale full-pack tree. No Windows release exists, so clean-host installation remains unresolved and `pk` must stay optional.

**Runtime/dependencies.** Short-lived CLI process; no new port. `pk ingest` may contact an LLM, so event content and provider configuration cross that boundary. It writes user/project knowledge, making path confinement, CRLF-stable hashing, and secret rejection material; prior Windows fixes are recorded in `mini:.prometheus/gotchas.md:205-225`.

**Acceptance before changing baseline.** A future pin must identify an exact commit, show Windows/MSVC CI and tests (including backslash traversal and CRLF cases), preserve absent-binary degradation, and avoid importing `pk-cherry` or the learning worker.

### B1 — `sycophancy-correction` stdio MCP

**Value.** It provides structured detection/correction that can support the existing adversarial-review/reflection flow without a new listening port.

**Windows work.** No reachable Unix-only source was found in the stdio server, but there is no observed Windows CI, runtime test, or release artifact. Add `windows-latest` MSVC build/tests, stdio framing tests with CRLF paths/config, a packaged `.exe`, bounded request timeout/cancellation, and clean shutdown behavior.

**Mini adaptation.** Its default `skill.toml` targets the prohibited `openai-proxy` on `:8181`. Mini configuration must target the existing `liter-llm` gateway at `http://localhost:4000/v1`; it must remain optional and log only to stderr. Do not enable hooks merely because the binary is present without an explicit configuration change.

**Trust boundary.** Prompts/completions are sent to an LLM gateway; an API key may come from `SYCOPHANCY_LLM_API_KEY`; audit output may contain user content. Secrets must remain environment/config inputs and never enter logs or committed configuration.

**Acceptance evidence.** Three-OS CI, Windows packaged artifact, end-to-end stdio request/response test against a fake local gateway, timeout/cancellation test, stderr-only logging test, and an absent-binary degradation test in mini.

### B2 — `rust-mcp-filesystem` stdio MCP

**Value.** A capable optional filesystem MCP with write disabled by default and explicit allowed roots. It can complement, not replace, existing host filesystem tools.

**Windows work.** Source already contains `cfg(unix)`/`cfg(windows)`, CRLF handling, and drive-aware logic (`skills/imported/artifact-refiner/tools/rust-mcp-filesystem/src/fs_service/utils.rs`). `dist-workspace.toml` declares `x86_64-pc-windows-msvc` plus MSI/PowerShell/npm outputs, but the observed CI tests only Ubuntu; declarations are not runtime proof. Add Windows build/runtime CI and produce a real `.exe` artifact.

**Mini adaptation.** Keep stdio transport, stderr logs, write mode opt-in, and mini-owned installation/configuration. Namespace overlapping tool names rather than removing the existing server. Dynamic MCP roots currently can replace initial allowed directories, so the authority model must be explicit and tested before enablement.

**Trust boundary.** The server can expose broad host filesystem content and optionally mutate it. Required tests include path confinement for drive letters, UNC paths, `..`, symlinks, junctions/reparse points, case-insensitive aliases, and root replacement. Default-deny writes are part of acceptance, not an optional hardening extra.

**Acceptance evidence.** Windows/MSVC CI, signed or checksummed `.exe`, stdio protocol tests, the confinement matrix above on real Windows, write-disabled default verification, and an integration test proving mini remains functional when the binary is absent.

### B3 — `learner-model` JSONL CLI

**Value.** A local, short-lived JSONL processor may provide learning-model operations without a daemon or port (`substrate/learner-model/README.md`).

**Windows work.** There is no Windows CI or release. `substrate/learner-model/src/main.rs:44-53` resolves a literal `~/.prometheus/...` via `shellexpand`; replace this with an OS-native config/data directory contract. Add Windows path, CRLF JSONL, stdin/stdout framing, interrupted-write, and file-lock/concurrency tests.

**Mini adaptation.** Keep it optional and invoke it directly with an argument array and `shell: false`; do not create a worker/timer. The mini loop must retain its current behavior when the binary is absent. A prebuilt artifact is required before suggesting installation to normal Windows users.

**Trust boundary.** It persists learning history, which can include project/user-derived content. The eventual change must define storage location, retention, redaction, and ownership before enabling writes.

**Acceptance evidence.** Three-OS CI, packaged Windows executable, JSONL protocol contract tests, Windows storage tests, privacy/storage documentation, and absent-binary degradation tests.

### C — Permitted service: `liter-llm`

**Value/runtime.** This is the already-approved critic/judge gateway on loopback `:4000`. Windows uses a mini-owned container; native Windows service installation is not a goal.

**Windows and mini work.** The source has a Windows/MSVC build leg and guarded Unix shutdown handling, but this does not certify the full proxy lifecycle on Windows. Use `tools/liter-llm/docker/Dockerfile` as build evidence, not the upstream Compose stack: upstream lifecycle can add Redis `:6379`, which mini prohibits. Mini must pin the image/build, bind only `127.0.0.1:4000`, set a memory limit, load provider/master keys from a git-ignored env file, and remain optional with harness-native review fallback.

**Trust boundary.** Provider/master/virtual keys, outbound provider URLs (including SSRF risk), uploaded files, and tool calls cross this network service. Loopback binding and secret separation are required by the existing boundary, not speculative hardening.

**Acceptance evidence.** A later service change must run the container on Windows, prove `/v1/models` and critic/judge routing, verify shutdown/restart and service-down fallback, measure memory, and demonstrate that no Redis or additional port is introduced.

### C — Permitted service: `surreal-memory` + SurrealDB

**Value/runtime.** This is the already-approved memory capability: surreal-memory on loopback `:23001`, backed by SurrealDB on `:28000`. It counts as one permitted capability with its required database, though Compose contains two containers.

**Windows and mini work.** No Windows Rust CI was found; use container-only operation. Guarded Unix signals are present, but source inspection does not establish runtime portability. Build/run through mini-owned Compose with pinned images/build inputs, named volumes, loopback publication, env-file credentials, and memory limits. The server's roughly 23k Rust LOC, RocksDB, and local embedding model/cache make it the heavier capability; measure rather than relying on README planning estimates.

**Trust boundary.** The MCP/API and CORS surfaces (`tools/surreal-memory-server/src/mcp/http.rs:38-75`, `tools/surreal-memory-server/src/api/mod.rs:117-135`) expose persisted user/project memory. Keep both services loopback-only, do not log memory at debug level, and preserve durable local fallback when unavailable.

**Acceptance evidence.** Windows Docker startup/health, persistence across restart, local-embedding first-start behavior, loopback-only exposure, credential separation, service-down outbox/replay behavior, and measured steady/build peak memory under the 16 GB target.

## D — Guidance/library extraction, not executable moves

- **Execution contracts, `exec-embedded`, and Tier W:** retain typed request/evidence/receipt, cancellation, policy, and Windows-safe embedding patterns. Do not carry Unix sockets, Tier P, Seatbelt, or the daemon. The full execution system is a code-execution and signing boundary and would add resident authority.
- **`prometheus-hook`:** retain manifest/digest/path-validation and dispatch semantics. Mini's Node hook path is already the canonical implementation and avoids the Rust dependency plus Bash leaves.
- **`kbd-runtime`:** extract schema, keyring/path abstractions, synchronization invariants, and tests where useful. Do not create a second writer for OpenSpec/KBD state.
- **`skill-index`, `storage-provider`, `skill-ffi`:** use as design/reference material for future scaffolds only after a concrete mini requirement; no current executable need is observed.
- **`forge-rs`:** retain registry validation, constitution/drift checks, and path-confinement patterns. Do not import its HTTP MCP or Tera renderer; Node/Nunjucks owns templates.
- **`prometheus-cli`:** retain Cedar policy contracts and diagnostic/doctor semantics. Do not import overlapping install, KBD, service, or lifecycle commands.
- **`prometheus-rust-auditor`:** translate useful checks into Rust guidance or CI snippets. The binary's Ubuntu-only evidence and placeholder/generated behaviors do not justify a host tool.
- **`template-forge-rs`:** compare template fixtures/semantics while implementing Nunjucks, but do not create a second template engine.
- **`dsg`:** it may merit a separate Windows port in its own product, but mini has no requirement for destructive disk cleanup. Target declarations do not prove runtime correctness, and its filesystem authority is disproportionate to mini's purpose.

## E — Explicit exclusions

- **Full `prometheus-exec`:** Unix-domain-socket daemon, Unix/macOS sandbox machinery, and code-execution/signing/policy authority. The stdio adapter does not remove the daemon dependency.
- **`prometheus-research`:** adds `:7891`, depends on `surface-bridge :7890`, invokes Bash and Python/jq-era workflows, and launches external agents with broad permissions. Mini's checkpoint research flow is the chosen architecture.
- **`surface-bridge`:** third port, permissive CORS/operator-response surface, and in-memory global response state conflict with service and explicit-state rules.
- **`openai-proxy`:** duplicates the permitted `liter-llm` gateway and adds `:8181`.
- **`pk-cherry` and `pk-learning-worker`:** add resident HTTP/timer lifecycle that mini explicitly replaced with optional `pk` and durable receipts.
- **Cowork CLI:** Unix symlink/update behavior plus global skill writes are outside the mini repository's copy-mode installer boundary.
- **Entity-management and mobile/sovereign products:** imported/domain-specific application products, not KBD/PMPO infrastructure.
- **Forge resident MCP:** Forge patterns may be extracted, but its `:8943` service is excluded.

## Trust-boundary and resource conclusions

| Boundary | Products | Required disposition |
|---|---|---|
| Provider credentials and outbound model calls | `liter-llm`, sycophancy correction, `pk ingest` | Existing gateway only; env/config secrets, loopback service, no secret logging; stdio client remains optional. |
| Persisted user/project knowledge | `pk`, surreal-memory, learner-model | Explicit storage roots, path confinement, redaction/retention contract, durable local fallback, no debug-content logging. |
| Broad filesystem read/write | rust-mcp-filesystem, Cowork, `dsg`, Forge packaging, prometheus-cli | Filesystem MCP requires Windows confinement certification and write-off-by-default; Cowork/`dsg` are not moved; Forge/CLI mutation semantics are guidance only. |
| Interpreter, build, and arbitrary code/tool execution | prometheus-exec, research, prometheus-hook, Forge packaging, liter-llm tool calls | Exclude the execution/research daemons; keep Node hooks instead of the interpreter dispatcher; do not import Forge execution; govern gateway tool execution at its existing policy boundary. |
| Global install/repair state | prometheus-cli, Cowork | Do not import either global-state writer; mini retains inspectable copy-mode Node ownership. |
| Network listener / service supervision | liter-llm, surreal-memory/SurrealDB, Forge, proxies, research/bridge, `pk-cherry` | Only the two authorized capabilities survive, containerized and loopback-bound on Windows. |

No source repository provides measured RAM figures for these products. Rust LOC counts gathered during inventory are complexity indicators, not memory measurements. The two C services require later measured container build/steady-state data; short-lived B tools should not become resident. Avoiding wasmtime-class `prometheus-exec`, extra gateways, and model-serving containers is central to the 16 GB target.

## Prioritized sequence

1. **Preserve baseline:** keep mini's existing optional `pk` pin and absent-binary degradation. Do not copy the older full-pack tree.
2. **Immediate no-runtime work:** mine D products for guidance, schemas, test cases, and scaffold rules only when a concrete mini task needs them.
3. **First bounded candidate:** certify `sycophancy-correction` as a packaged Windows stdio MCP configured through `liter-llm`; it has the clearest direct process value and no filesystem authority.
4. **Second bounded candidate:** certify `rust-mcp-filesystem` only with a real-Windows confinement suite and explicit tool names/roots. Treat this as security-sensitive.
5. **Optional later candidate:** assess whether `learner-model` supplies value not already covered by the Node recorder and `pk`; if yes, port storage/path behavior and package it. Otherwise downgrade it to D.
6. **Container service phases:** implement/certify only `liter-llm` and surreal-memory + SurrealDB through mini-owned Compose. Publish pinned images to avoid multi-GB local Rust builds where possible.
7. **Defer/exclude:** do not spend mini effort porting the E products. A separate product can independently port `dsg`, Cowork, entity management, or the execution stack without making them mini dependencies.

Each B or C item requires its own OpenSpec change. This sequence is a recommendation, not evidence that a move, build, release, runtime test, or security certification occurred.

## Unverified claims and limitations

- No Rust build, cross-compile, Windows VM run, container run, installer run, packaging run, or runtime certification was performed for this analysis.
- Source/release target declarations for `rust-mcp-filesystem` and `dsg` do not establish that an artifact was published or works.
- `liter-llm` has observed Windows build evidence, but native Windows service operability and the fork's published image equivalence were not established.
- Neither permitted container capability was run on Windows here; memory figures remain unmeasured.
- Absence of an observed Unix-only source hit in `sycophancy-correction` is not proof that dependencies/build scripts are Windows-safe.
- The complete transitive dependency graph and every feature combination were not compiled; a later candidate change must lock features and test the exact shipped target.
- `versions.toml` is absent, so dependency/version authority could not be reconciled through that file.
- Imported repository history and external release registries were not treated as authoritative unless represented in the inspected checkout or current mini decisions.

## Decision summary

Safe movement means preserving mini's narrow process architecture, not maximizing the number of portable binaries. The practical shortlist is one **existing A baseline** (`pk`), three **B candidates** (sycophancy correction, filesystem MCP, and possibly learner-model), and the two already-permitted **C capabilities**. Everything else is more valuable as guidance or belongs outside mini.