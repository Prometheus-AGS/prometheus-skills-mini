# Assessment — the-boss-shipping-and-settings

Against `goals.md`. Every claim below cites a file and line that was read in this session, in
`the-boss` at `10aa57f76c` unless stated. Where a goal is already satisfied by existing code,
that is recorded as **MET** and the phase should not rebuild it.

## Headline

**Far more exists than the goals assumed, and the gaps are narrower and different.** The-boss
already has: a per-platform binary download pipeline with SHA-256 verification, a bundled-binary
resolver wired into MCP launch, and a startup skill installer that is content-hash gated. What is
genuinely absent is Docker handling (nothing), the home-directory push (nothing), and the
settings surface itself.

The single biggest correction to the plan: **`the-boss` has no Docker awareness at all** — six
files mention the word and all six are incidental (trash handling, destructive-command
heuristics). Goal C is greenfield.

## A · Release infrastructure

| Goal | State | Evidence |
|---|---|---|
| A-1 Windows-on-ARM for rust-mcp-filesystem | **MET (pending merge)** | `dist-workspace.toml` now lists `aarch64-pc-windows-msvc` with a `windows-11-arm` runner; branch `feat/windows-arm64-target`, commit `3a8d182`, PR GQAdonis/rust-mcp-filesystem#1 |
| A-2 First release on each fork | **NOT MET** | `gh release list`: `GQAdonis/compass` 0, `GQAdonis/rust-mcp-filesystem` 0, `Prometheus-AGS/openspec` 0. All three have working workflows (`compass-release.yml`, cargo-dist `release.yml`, `release-prepare.yml`) that have never run |
| A-3 `sycophancy-correction` | **NOT MET — and it is the weakest of the four** | The repo is `Know-Me-Tools/sycophancy-correction-skill` (operator-supplied; my search for `Prometheus-AGS/sycophancy-correction` was the wrong name and wrongly concluded “does not exist”). It is a Rust workspace with `crates/`, `Cargo.toml`, `SKILL.md` and `claude-plugin.json` — but **no `.github/workflows` at all** and **0 releases**. Not a fork (`isFork: false`), last pushed 2026-07-02. |

**Platform coverage, verified:** compass's `compass-release.yml` matrix already builds
`x86_64-pc-windows-msvc` AND `aarch64-pc-windows-msvc` (lines 77-81), plus both macOS and both
Linux arches. rust-mcp-filesystem covered five targets and was missing Windows ARM — that is what
A-1 fixed. the-boss ships `--win --x64 --arm64`, so both are now required, not optional.

**Not verified:** whether either release workflow actually succeeds. Neither has ever run. The PR
in A-1 explicitly lists "CI shows the new matrix job appear" as the item that confirms its own
central claim; `dist` is not installed locally so the regenerated YAML could not be produced.

## B · Vendoring and shipping

### B-1 · the-boss's binary pipeline is MET and reusable as-is

`scripts/download-binaries.js` already ships five binaries (`mise`, `bun`, `uv`, `rg`, `mingit`)
per platform. The `TOOLS[]` manifest contract (`:244`) is:

- top level: `name`, `version`, `versionFile`, `required`, `packages`, `isWindowsOnly`
- per package, keyed `platform-arch` (`darwin-arm64`, `win32-x64`, `win32-arm64`, …):
  `url`, `archive`, `binaries`, `sha256`, `strip`, `dir`

It is invoked from `scripts/before-pack.js:190` with `<platform> <arch> --packaging`, and
`before-pack.js:194` then calls `verifyBundledBinaries(platform, arch)`. There is a shared
cross-worktree cache with hard-linking and a 14-day TTL.

**Adding compass and rust-mcp-filesystem is two `TOOLS` entries plus their SHA-256s — not new
machinery.** This is the strongest single finding of the assessment.

### B-2 · The bundled-binary path into MCP already exists

`src/main/ai/mcp/mcpLaunch.ts` resolves a stdio server's command through
`getBinaryPath`/`isBinaryExists` (`@main/utils/binaryResolver`), returning
`resolution: 'system' | 'bundled' | 'unresolved'` with an `unavailableReason`
(`mcpLaunch.ts:42-48`). `binaryResolver.ts:19-34` searches mise shims then `cherry.bin`
(`pathRegistry.ts:66` → `CHERRY_HOME/bin`), and `getBinaryName` appends `.exe` on Windows
(`:15-17`).

So a bundled compass is registered as an ordinary stdio MCP server and resolves through existing
code. **The `Runner` abstraction (`mcpLaunch.ts:5-11`) with its `notFound` message is the pattern
for "binary should be there and isn't".**

### B-3 · Skills installation is MET, with one parameter to pass

`installBuiltinSkills()` (`src/main/utils/builtinSkills.ts:31`) runs on **every** startup
(`AiService.ts:407`), reads every directory under `resources/skills/`
(`pathRegistry.ts:185` → `appRootResources/skills`), and calls
`skillService.syncBuiltinSkill(folderName, sourcePath, appVersion, namespace = null)`
(`SkillService.ts:1119`).

Three facts that de-risk the port:

1. **Updates are gated on a CONTENT HASH, not a version string** —
   `computeBuiltinDirectoryHash` (`SkillService.ts:1070`, `:1142`). The 21 mini skills without a
   `version:` field are therefore fine. This was the suspected blocker and is not one.
2. **`version` is optional in the parser.** `parseSkillMetadata`
   (`src/main/utils/markdownParser.ts:306`) falls back to the folder name for `name`
   (`:384-385`) and leaves `description` undefined if absent (`:389-390`).
3. **The `namespace` parameter exists and is dormant** — declared at `SkillService.ts:1123`,
   enforced by ownership guards at `:1127-1137` and `uninstallBuiltinSkill` at `:216-222`, but
   `builtinSkills.ts:53` never passes it. Passing it is how the mini's 22 avoid colliding with
   the-boss's 5.

**No name collisions today:** `comm -12` over both skill sets returns empty. 22 skills, 24 files,
132K. Two files must NOT ship: `skills/carried-payload.test.mjs` and `skills/AGENTS.md`.

### B-4 · Correction to the earlier plan

My `the-boss-integration-prep` assessment cited `src/main/services/skills/builtinSkills.ts` and
`.../SkillService.ts`. **That directory does not exist.** Real paths are
`src/main/utils/builtinSkills.ts` and `src/main/ai/skills/SkillService.ts`. The line numbers
happened to be right, so anything downstream that trusted those citations needs rechecking.

### B-5 · Open question for analyze

`resources/skills/` is **git-tracked**, not generated (`git log` shows hand-authored commits).
Adding the mini as a submodule and copying at build time means the copies are also tracked —
two sources of truth. The precedent for this is `build:builtin-knowledge` +
`build:builtin-knowledge:check` (`package.json:64`, `scripts/generate-cherry-assistant-knowledge/index.ts:53-69`),
which generates tracked files and fails CI when they are stale. **Analyze should decide whether
the sync script follows that precedent or whether `resources/skills/` becomes generated-and-ignored.**

## C · Docker — entirely absent

**NOT MET, and greenfield.** `grep -rl docker src/main --include=*.ts` returns 6 files; all are
incidental (`moveToTrash.ts`, `destructiveCommand.ts`, `assistantCommandSafety.ts`, a knowledge
pipeline test). There is no detection, no compose handling, no container lifecycle, nothing.

The mini's `mini-docker` check is written but currently `skip`s, because
`lib/platform/docker.mjs` is created by the not-yet-landed `docker-services` change. Endpoints are
fixed by `.claude/rules/docker-services.md`: surreal-memory `http://localhost:23001/mcp/sse`,
SurrealDB `127.0.0.1:28000`, liter-llm `http://localhost:4000/v1` — all three verified reachable
on this host today (23001 → 200, 28000 → 200, 4000/health → 200).

**Risk for analyze:** the mini's `docker-services` change and this phase's goal C would both
create Docker handling. They must not diverge. The mini owns detection + compose; the-boss owns
the UI and consent. That boundary needs to be explicit before either is built.

## D · Settings UI/UX

Inventory delegated to a parallel探索 of settings routing, preference schema, i18n and IPC;
**results were not available when this assessment was written** and are the first input analyze
must fold in. What is already established:

- **The doctor adapter contract is written** — `lib/doctor/contract.md` in the mini specifies the
  full mapping (`refused` → `{status:'failed', message}`, `summary` → `devMessage`/evidence,
  `warn`/`fail` needing an `attribution` and a catalog `detail.variant` only the-boss can supply).
- **the-boss cannot register the mini's checks directly.** `DoctorCheckRegistry` is exhaustive
  over a closed 31-id union (`src/shared/types/doctor.ts:80,113`;
  `diagnostics/doctor/types.ts:77`), `DoctorDomain` has ten members and no `mini`
  (`doctor.ts:13`), and `DomainOfId` enforces domain == id prefix at compile time (`:116-119`).
  Spawning `scripts/doctor.mjs` and mapping its JSON lines is the only available mechanism.
- **A repair contract exists to model on** — `checks/config.ts:22-35` shows
  `actions: [{kind:'fix', fixId}]` plus a `fixes` handler returning `requires_relaunch`.
- **The doctor's one fix, `copy-skills`, is the same operation goal D-13 needs** (copy, never
  symlink, refuse beside a full pack), so the UI drives an already-tested implementation.

**The four design skills (`impeccable`, `ui-ux-pro-max`, `anth-frontend-design`,
`frontend-ui-engineering`) are all installed** and confirmed present under `~/.claude/skills/`.

## Gaps in priority order

| # | Gap | Severity | Blocked by |
|---|---|---|---|
| 1 | No release exists on any fork | **blocking** | operator (tag + run; A-11) |
| 2 | `sycophancy-correction-skill` has NO CI and no releases | **blocking** | operator (fork/transfer + build CI from scratch) |
| 3 | No Docker handling anywhere in the-boss | high | the mini's `docker-services` change |
| 4 | No home-directory push; discovery is import-only | high | — |
| 5 | Settings surface does not exist | high | the parallel inventory |
| 6 | `namespace` never passed to `syncBuiltinSkill` | medium | — |
| 7 | Mini skills not in `resources/skills/` | medium | submodule decision (B-5) |
| 8 | `versions.toml` still unauthored | medium | operator (agents may not write it) |

## Open questions for analyze

1. **Tracked or generated?** Does `resources/skills/` stay git-tracked with a `--check` script
   (the `build:builtin-knowledge` precedent), or become generated and ignored?
2. **Who owns Docker?** The mini's `docker-services` change and goal C overlap. Proposed split:
   mini owns detection and compose, the-boss owns UI and consent. Needs confirming before build.
3. **Does the release workflow actually work?** Neither has run. If compass's or cargo-dist's
   first run fails, A-2 is larger than "tag it".
4. **Which mini checks does the-boss surface?** Each needs a catalog entry with its own id and
   `detail.variant` in the-boss's closed union. All eleven, or a subset?
5. **Windows verification.** Nothing here has been run on Windows. The four-arch matrix is a
   claim about CI, not an observation.
