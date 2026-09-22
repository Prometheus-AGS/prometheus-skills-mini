# Plan — the-boss-shipping-and-settings

Seven changes across two repositories, plus four pre-existing mini changes this phase depends on
but does not own. Ordering is mostly **forced by real dependencies**, not preference: nothing
binary-related can begin before a release exists, and two the-boss changes spawn files a third
installs.

## Ordering

| # | Change | Repo | Depends on | Why here |
|---|---|---|---|---|
| 1 | `the-boss-release-infrastructure` | mini | — | **Nothing else can start.** Four repos have 0 releases. |
| 2 | `prometheus-001-skills-bundling` | the-boss | 1 (openspec release) | Installs the runnable pack that 003/004/005 spawn and resolve against. |
| 3 | `mini-vendor-submodules` | mini | 1 | Source submodules, pinned to released commits. Parallel with 2. |
| 4 | `prometheus-002-binary-shipping` | the-boss | 1 | `TOOLS[]` entries; digests cannot be written before releases exist. |
| 5 | `prometheus-005-mcp-server-presets` | the-boss | 2, 4 | Registers what 4 bundles, resolving beside the app-data pack 2 installs. A preset for an absent binary is a dead entry. |
| 6 | `prometheus-003-settings-and-doctor` | the-boss | 2 | The settings surface, doctor, repair, startup push. |
| 7 | `prometheus-004-docker-services` | the-boss | 2, 6, **mini `docker-services`** | Consent + rendering only. Needs 6's section to live in. |

**Not owned by this phase, but blocking:** the mini's `docker-services` (15 tasks, 0 done) must
land before 7 can complete. `compass-vendored`, `openspec-fork-submodule` and
`sycophancy-correction-vendored` overlap change 3 and should be reconciled with it at execute
time rather than run twice.

## Dependency edges that are not negotiable

- **1 → everything.** `prometheus-002` cannot write a `sha256` for an artifact that does not exist,
  and a placeholder digest would defeat the verification that makes the pipeline safe.
- **2 → 3, 6, 7.** `prometheus-001 §3` installs the app-data copy of the runnable pack.
  `prometheus-003` and `004` spawn `node scripts/doctor.mjs` and `services.mjs` from it; `005`
  resolves binaries beside it. The spec review caught that nothing created this — without §3 all
  three spawn files that are not there.
- **4 → 5.** A preset whose command cannot resolve is a catalog entry that fails on click.
- **6 → 7.** The Docker panel lives inside the settings section 6 creates.

## The MCP server inventory — every tool, and where it is registered

**Provenance:** change 5 does not trace to `goals.md`, which was written before this requirement
existed. The operator added it during planning: *every binary and vendored project with an MCP
server must be listed as a system MCP server and configured that way, beside the others.* It is
recorded here rather than silently folded into another change, and `goals.md` should gain a
matching goal so the two do not drift.

The mechanism was verified before specifying against it: `PRESET_MCP_SERVERS`
(`src/shared/data/presets/mcpServers.ts`) is the single registry the renderer lists and
`BuiltinMcpServerSeeder` reconciles against, over an `mcp_server` table carrying `command`, `args`,
`env` and `disabledAutoApproveTools`. The full inventory:

| Tool | MCP? | Transport | Where it comes from | Change |
|---|---|---|---|---|
| `compass` | yes | stdio | bundled binary | 4 bundles, 5 registers |
| `rust-mcp-filesystem` | yes | stdio | bundled binary | 4 bundles, 5 registers |
| `sycophancy-correction` | yes | stdio | bundled binary | **blocked**: no release pipeline exists at all |
| `surreal-memory` | yes | streamableHttp `:23001/mcp/sse` | Docker container | 5 registers, 7 governs the container |
| SurrealDB | no | — | Docker, backs surreal-memory | 7 |
| liter-llm | no | OpenAI-compatible `:4000/v1`, not MCP | Docker | 7 |
| `pk` | no | a CLI the Karpathy flow spawns | mini submodule | — |
| `openspec` | no | a CLI | submodule (2) | — |

Three of the four registrations are ready once change 4 lands. **sycophancy-correction is the
exception and should not hold up the rest** — change 5 task 1.1 says to add it last or defer it,
rather than ship a preset whose binary cannot exist.

## Gate row — what must be true before each change starts

| Change | Gate |
|---|---|
| 1 | **(a)** The sycophancy repository target is settled BEFORE §4 starts — change 1 §4.1 is itself the decision point, and §4.2 onward acts on whichever repo it names. The goal says `Prometheus-AGS`; it exists as `Know-Me-Tools/sycophancy-correction-skill`; anything but the goal is a goal change the operator makes explicitly. **(b)** Operator authorization for EACH irreversible act (A-11): creating or transferring a repository, merging to a default branch, tagging, and running a publish workflow. An agent prepares branches and PRs only. |
| 2 | openspec has a release; a submodule path that obeys the closed-set rule is chosen. |
| 3 | Every target repo has a release. (The repo-target decision was already made in change 1 §4.1; this change consumes it as a submodule URL and a `versions.toml` pin.) |
| 4 | compass and rust-mcp-filesystem releases carry all five targets with digests. |
| 5 | Binaries present in `resources/binaries/` for this platform. |
| 6 | App-data pack installed and `node scripts/doctor.mjs` runs from it (exit 0 or 1, never 2). |
| 7 | Mini `docker-services` landed, or only the "detection unavailable" path is built. |

## Per-change rules

- **the-boss:** `git commit -S --signoff`; conventional commits with a specific kebab-case scope;
  `BaseService` + `@Injectable` + `serviceRegistry.ts`, never `new`; `application.getPath()`, never
  `app.getPath()`; `loggerService.withContext()`, never `console.log`; no new top-level directory;
  edit `classification.json`, never the generated `preferenceSchemas.ts`; no behaviour-pinning
  tests.
- **Mini:** Node ≥22 only, no `.sh`/`.py`, no symlinks, copies only.
- **Both:** test-first; verify what changed, not the whole repo.

## QA gate

Per change: `refine-validate` → `adversarial-review --mode diff` → archive. A CRITICAL blocks. The
diff packet must be built on the **cumulative** range, not `git diff HEAD` — the packet builder
defaults to the working tree and reviewed almost nothing for two rounds in an earlier phase
(`.prometheus/gotchas.md`).

## Risks

| Risk | Severity | Handling |
|---|---|---|
| No release workflow has ever run | **high** | Run compass first — most mature, both Windows arches. A failure there predicts the rest. |
| sycophancy-correction has no CI at all | **high** | Sequenced last within change 1; explicitly deferrable in change 5. |
| Windows entirely unverified | **high** | Every change's final task is a Windows run, and says it is unverified until then. |
| Mini and the-boss both implement Docker | medium | Boundary fixed in analysis D3: the mini probes, the-boss renders. |
| i18n gate fails the build late | medium | Keys land in the same change as components, all 13 locales. |
| Two sources of truth for skills | medium | `--check` mode in CI, following `build:builtin-knowledge`. |
| Change 3 overlaps three existing mini changes | medium | Reconcile at execute; do not run both. |

## What this plan does not decide

- **Which of the eleven mini doctor checks the-boss surfaces.** Each needs an id in a closed union
  plus a catalog `detail.variant`. A product call, carried from analyze.
- **The sycophancy repository target.** Operator decision, gating change 3.
- **`versions.toml`.** Still unauthored; agents may not write it; five mini changes gate on it.
