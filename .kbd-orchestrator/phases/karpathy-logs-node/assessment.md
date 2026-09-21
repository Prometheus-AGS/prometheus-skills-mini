ASSESSMENT: karpathy-logs-node
Project: prometheus-skills-mini
Date: 2026-09-21
Codebase baseline: 9 capabilities live; 220 tests, 219 pass, 0 fail, 1 skipped; `lib/platform/`, `lib/hooks/` and `lib/refiner/` complete. **No recorder exists** — `lib/karpathy/`, `lib/okf/` and `lib/memory/` are all absent.
Cross-tool progress: none. `progress.json` is a fresh 0/0.
Scope note: the operator extended this assessment mid-stage to cover **integration with The Boss** (the Cherry Studio fork), including embedding `compass` and `rust-mcp-filesystem`. That is Part 2. It is assessed here and is **not** a goal of this phase; see "What this means for scope".

PROVENANCE — every measurement, with the command that produced it
Commands are `node`, `git ls-files`/`git grep`, npm scripts and the `prometheus` CLI. Counts in other repositories were taken with `git ls-files` and `wc -l` **in those repositories**, which are not bound by this project's command policy; the policy binds what this project tells an agent to run.
- Baseline: `npm test` → 220 tests, 219 pass, 0 fail, 1 skipped. `node rules/build.mjs --check` → 21 files current. `node scripts/spec-validate.mjs` → 9 passed. `find openspec/specs -name spec.md` → 9.
- Node on this host: `node --version` → **v24.16.0**. Earlier phases recorded v26.5.0; the shell's Node now follows a different version file. Every Windows/LTS claim still rests on CI (Node 22 and 24), not on this host.
- Absence of the recorder: `node -e fs.existsSync` on `lib/karpathy`, `lib/okf`, `lib/memory` → all false.
- `.prometheus/` contents: `git ls-files '.prometheus/*'` → 14 files.
- `events.jsonl`: `node` parse → 2 events, 0 unparseable, both `kind: compiled`, keys `id, kind, session_id, project_root, scope, timestamp, payload, affects`.
- Upstream recorder: `wc -l` → `record-progress.py` 671 lines, `progress-memory-integration.py` 514, `karpathy-hook-dispatch.sh` 75. `grep -c -E '^(import|from) '` → **13** import lines, all stdlib. (A first draft said 12, counted by eye; the command says 13.)
- Hash probe: `node scratchpad/hashprobe2.cjs` against the one golden receipt — reported under "THE FINDING THAT CHANGES THE DESIGN".
- The Boss (evidence for every Part 2 claim is embedded in the review packet, after round 1 showed it was not): `package.json`, `electron-builder.yml`, `scripts/download-binaries.js`, `src/main/services/binaryManager/BinaryManager.ts`, `src/main/utils/binaryEnv.ts`, `src/main/ai/agents/builtin/BuiltinAgentProvisioner.ts`, `src/main/ai/mcp/servers/filesystem/`, `src/main/utils/builtinSkills.ts`, `src/main/ai/skills/SkillService.ts`, `src/main/ai/runtime/claudeCode/{hooks,environment,settingsBuilder}.ts`, `src/main/utils/binaryResolver.ts`, read at HEAD `10aa57f76c`.
- compass at HEAD `635b2c06`; rust-mcp-filesystem `Cargo.toml` v0.4.5 and `dist-workspace.toml`.

# PART 1 — the phase's own goals

IMPLEMENTATION STATUS
- `lib/karpathy/` recorder: MISSING.
- `events.jsonl` append-only writer: MISSING. The file exists with 2 events, but **this project did not write them** — see the contract finding below.
- `log.md` projection: MISSING. `.prometheus/log.md` does not exist.
- Receipts + `wx` lock: MISSING as code. One receipt exists on disk, written by the source pack's Python recorder on 2026-09-21T10:10:17Z. `lib/platform/lock.mjs` supplies the lock primitive.
- Learning queue under `os.homedir()`: MISSING.
- OKF v0.2 bundle: **PARTIAL and inconsistent.** `index.md` carries `okf_version: "0.2"`. But `decisions.md` and `gotchas.md` are single append-only files (97 and 204 lines; 3 and 6 dated entries), not one-concept-per-file under `decisions/` and `gotchas/` as README §5.3 specifies. `postmortems/` and `knowledge/` exist.
- v0.1 reader / v0.2 writer: MISSING. And the migration path is **already live in this repo**: `.prometheus/knowledge/wiki/empty-source-document.md` carries `timestamp:` — the v0.1 spelling — written by `pk` today.
- Trust tier from `verified[]`: MISSING.
- 256 KiB bound + secret rejection: MISSING as code. Upstream: `len(serialized.encode()) > 256_000` and a `SECRET` regex with **7** top-level alternatives (line 22; counted by a parser that respects groups and character classes — a first draft said 5, by eye).

THE FINDING THAT CHANGES THE DESIGN — hashes are not portable across the two runtimes
README §5.3 says the receipts "keep the source pack's on-disk contract, so a project can move between packs." Tested against the one golden receipt in this repo, a straightforward Node port **breaks that contract**:

| Canonicalisation | `eventSha256` |
|---|---|
| Recorded by the Python recorder | `760d332e…` |
| Node, sorted keys, compact separators, `observedAt` dropped | `ca79e321…` — **differs** |
| Same, but re-emitting Python's numeric token for `elapsedHours` | `760d332e…` — **matches** |

Cause: the event carries `"elapsedHours": 0.0`. Python's `json.dumps` writes a float as `0.0`; JavaScript's `JSON.stringify` writes `0`, and after `JSON.parse` the distinction is gone — my first type check reported "int" for exactly that reason. `eventIdentitySha256` and the receipt filename (`sha256(eventId)`) both **match**, because neither includes a float.

Consequence: upstream compares `eventSha256` on replay to tell a duplicate from a collision (`record-progress.py:572-575`). A project recorded by one pack and replayed by the other would see the same event as a *different* event. This is one observed case, from one receipt; whether other fields can carry floats is a question for analyze, not something established here.

THE CONTRACT QUESTION — two event shapes already exist
The 2 events in `events.jsonl` have keys `id, kind, session_id, …` and `kind: compiled`. The receipt's embedded event has keys `schemaVersion, eventId, boundary, status, phaseId, …`. **These are different schemas.** The first is `pk`'s compile log; the second is the progress-memory event. README §5.3 calls `events.jsonl` "the source of truth for progress events", but today it holds none — it holds `pk` output. Whether the recorder shares that file or gets its own is undecided, and writing to a file another tool also appends to is a real concurrency and format question.

WHAT THIS PHASE INHERITS AND MUST NOT REBUILD
`lib/platform/` — `paths` (the queue's home directory), `text` (CRLF-tolerant reads), `atomic-write` (the `log.md` projection), `lock` (receipts), `spawn`. `lib/hooks/` — SessionStart is where the queue drains, and `degradeSafely` is the contract a recorder hook must honour. Note `atomic-write` **replaces** a file; `events.jsonl` needs an **append**, which `lib/platform/` does not provide today. `lib/refiner/session.mjs` appends by read-modify-write, which is wrong for an unbounded log.

SPEC GAP SUMMARY
- No capability covers logging, OKF or the queue. This phase introduces at least three.
- `hooks/dispatch` may need a MODIFIED delta if the recorder registers a hook — and a MODIFIED delta must repeat every scenario.
- The "exactly six ported ids" scenario in `hooks/dispatch` will **fail** the moment a seventh hook is added. That is a spec change, not a surprise.

BUILD HEALTH
- tests: PASS — 220 / 219 / 0 / 1 skipped (win32-only, correct on macOS).
- build check: PASS — 21 files current. specs: PASS — 9 passed.
- constraints: PASS — 10 of 10 automated checks clean at the close of the last phase; not re-run here.

GOAL PROGRESS — all nine delivery goals NOT MET; nothing is built. Process goals are open by definition.

# PART 2 — integrating the mini pack into The Boss, with compass and rust-mcp-filesystem

Revised after review round 1. A cross-family judge (gpt-5.5) blocked the first draft on two CRITICALs, and
verifying them overturned one of my gaps and surfaced The Boss's real embedding mechanism. What changed is
marked **[corrected]** or **[new]**; nothing was quietly rewritten.

WHAT THE BOSS ALREADY PROVIDES
- **Skills auto-install when the AI service initialises.** `installBuiltinSkills()` (`src/main/utils/builtinSkills.ts`, 70 lines) is invoked as `void installBuiltinSkills()` at `AiService.ts:407`, under a comment that says it runs "after builtin skills have synced … this boot". I did **not** trace the path from app start to that line, so "every boot" is the code's own description, not something I verified. It syncs every directory under `resources/skills/` into `{userData}/Data/Skills/` and registers it; per its own comment a builtin is enabled for every agent by default. `ls -d resources/skills/*/` → 5 today.
- **Re-copy is driven by app version AND a full-directory content hash.** `syncBuiltinSkill` (`SkillService.ts:1119`) computes `computeBuiltinDirectoryHash(sourcePath)` and sets `filesUpdated = installedVersion !== appVersion || installedHash !== sourceHash`. (The file-level comment in `builtinSkills.ts` mentions only the version; the hash is in `SkillService`. Review was right that my first packet did not show it.)
- **`syncBuiltinSkill` has a `namespace` parameter** — signature `(folderName, sourcePath, appVersion, namespace: string | null = null)`. `installBuiltinSkills` calls it with three arguments, so builtins land in the default namespace today. Using a `prometheus` namespace needs a **call-site change in The Boss**; I previously wrote "without schema work", which was true of the schema and silent about the call site.
- **Builtins are copied, never symlinked**, and Windows always copies (`SkillService.ts:720-739`).
- **`asarUnpack: resources/**`** (`electron-builder.yml:82`) — bundled executables are runnable from disk.
- **[new] A build-time binary bundler already exists, and it is the embedding mechanism.** `scripts/download-binaries.js` holds one entry per tool with a pinned `version`, a `versionFile`, and a `packages` map keyed by platform, each with `url`, `archive`, `binaries` and a **`sha256`**. It feeds `resources/binaries/`. `BinaryManager.ts:198-214` mirrors it at runtime in `BUNDLED_TOOLS` — `mise`, `bun`, `uv`, `rg` today. Entries are keyed by six platforms — `darwin-arm64`, `darwin-x64`, `linux-arm64`, `linux-x64`, `win32-x64`, `win32-arm64` — and the `rg` entry carries all six. **[corrected]** A key is *not* enforced: `materialize()` reads `tool.packages[platformKey]` and does `if (!pkg) continue` (`download-binaries.js:118-119`).
- **[new] Builtin agents ship a whole `.claude/` directory as an SDK plugin.** `BuiltinAgentProvisioner.ts:53-60` resolves `<template>/.claude` as `pluginDirectory`, requiring `.claude-plugin/plugin.json`. `settingsBuilder.ts:194-202` passes `{ type: 'local', path, skipMcpDiscovery: true }` to the Agent SDK, and `discoverPlugins(cwd, agent.id)` adds workspace plugins. `ls resources/builtin-agents/` → `cherry-assistant`, `cherry-support`.

GAP 1 — the skills are not self-contained, so copying them one by one breaks them
Carried skills **and agents** invoke scripts relative to the pack root: `git grep -n -E 'node scripts/[a-z-]+\.mjs' -- skills agents` finds them in `skills/*/SKILL.md` and in `agents/artifact-validator.md` and `agents/pmpo-executor.md`. `installBuiltinSkills` copies each `resources/skills/<folder>/` alone, so `scripts/` and `lib/` do not travel. **[new]** The plugin route above is the likely answer — a plugin directory is a single root that carries `skills/`, `agents/`, `scripts/` and `lib/` together — but this pack is not laid out as a plugin today (no `.claude-plugin/plugin.json`; `hooks/`, `scripts/`, `lib/` sit at the repo root). Skills and agents are separate seams in The Boss; only the plugin route covers both.

GAP 2 — **[corrected]** `node` is available on demand, not bundled
My first draft said "there may be no `node` on the user's machine" and that The Boss "does not put a `node` executable on PATH". **That was wrong, and I had not looked.** `BinaryManager.ts:86` declares `RUNTIME_DEPS = { npm: 'node@22', pipx: 'python@3.12' }` and resolves `node` through mise (`:1247-1249`); `binaryEnv.ts` puts the mise shims directory ahead of PATH, and says so explicitly for Windows. `node@22` satisfies this pack's `>=22`.
What remains true: `node` is **not** in `BUNDLED_TOOLS`, so it is installed by mise on first need rather than shipped. That means a **network fetch before the pack's first hook or script can run**, and a first-run failure mode offline. Whether to add Node to the bundled set, or to run the pack's `.mjs` under the already-bundled `bun`, is open — and the second is **untested**.

GAP 3 — The Boss's own hooks are SDK callbacks; this pack's are a manifest
`buildClaudeCodeHooks` (`hooks.ts`, 313 lines) assembles in-process `HookCallback`s imported from `@anthropic-ai/claude-agent-sdk` — `toolGuardHook`, `skillDependencyAdvisoryHook`, `rtkRewriteHook`, `steerHook`. This pack's `hooks/hooks.json` does not go through that path. Routes: (a) ship the pack as an SDK local plugin and rely on the plugin contract to load `hooks/hooks.json`; (b) register callbacks in The Boss that import `lib/hooks/<id>.mjs` — this pack's payloads are already `run(payload)` functions, so (b) needs no `node` binary at all. **Neither is verified**: I have not confirmed that SDK 0.3.220 loads a local plugin's `hooks.json`.

GAP 4 — the Rust binaries do not cover the six-key matrix
**[corrected]** I first wrote that `download-binaries.js` *requires* all six keys. It does not — a missing key is skipped silently. That makes the gap worse, not better: a tool with no `win32-arm64` entry **builds cleanly and is simply absent at runtime on that target**, with nothing to flag it. `rust-mcp-filesystem`'s cargo-dist `targets` list five — **`aarch64-pc-windows-msvc` is missing**, which is The Boss's `win32-arm64`. compass has a `windows-2025` / `x86_64-pc-windows-msvc` CI leg (`compass-ci.yml:219-228`); its published release matrix was **not established**. Each new entry also needs a release URL and a SHA-256 per key, so both tools need **published, versioned release artifacts** — compass's `.mcp.json` points at `~/.cargo/bin/compass`, a local build, which is not that.

GAP 5 — The Boss already has a filesystem MCP server
`ls src/main/ai/mcp/servers/filesystem/` → `config.ts index.ts server.ts tools types.ts`; `tools/` holds `delete edit glob grep ls read write`; `git ls-files … | xargs wc -l` over its non-test files → 1,865 lines. It is an in-process TypeScript server. Embedding `rust-mcp-filesystem` adds a second with overlapping tool names. Replace, coexist under another name, or split by audience — an operator decision. (Review correctly noted my first packet embedded none of this evidence; it is embedded now.)

GAP 6 — compass needs a graph per workspace
`.mcp.json` runs `compass serve --transport stdio --graph <path>/graph.json`. Bundling covers the binary; building and refreshing a graph per workspace, and choosing where it lives, is unowned. Two further properties I asserted are supported by source, now embedded: `compass-mcp/src/transport.rs:174,204` contains a `TcpListener` + `axum::serve` HTTP transport, so STDIO-only holds **by configuration, not by construction**; and the Windows CI comment at `compass-ci.yml:215-218` describes an embedded store as "the engine shipped for Windows". I did **not** verify that compass starts no background process in every mode.

GAP 7 — **[new, found by review]** `${CLAUDE_PLUGIN_ROOT}` is undefined in The Boss
Every entry in this pack's `hooks/hooks.json` names `${CLAUDE_PLUGIN_ROOT}/scripts/hook-entry.mjs`. `git grep -c CLAUDE_PLUGIN_ROOT -- src packages resources` in The Boss → **0 files**. Under route 3(a) the SDK's plugin loader would be expected to define it; under a `settings.json` route nothing does, and the path would not resolve. This is separate from Gap 2: a working `node` does not help if the script path is a literal `${…}`. I missed this entirely; it was visible in my own manifest.

ALSO NOTED — `skipMcpDiscovery: true`
The Boss loads local plugins with MCP discovery off. Even if the pack ships as a plugin with an `.mcp.json`, compass and the filesystem server would **not** be registered that way; they must go through The Boss's own MCP catalog.

WHAT FITS WITHOUT WORK
`rust-mcp-filesystem`: `Cargo.toml:32` lists `"stdio"` among the SDK features and no HTTP feature; `src/cli.rs:12-19` defines `--allow-write` with help text "Defaults to disabled"; cargo-dist already emits an MSI and a `x86_64-pc-windows-msvc` build.

WHAT THIS MEANS FOR SCOPE
Four pieces of work in three repositories, one of them this pack's: (1) lay the pack out as an installable plugin with a stable root — *this repo*; (2) two new entries in `download-binaries.js` + `BUNDLED_TOOLS`, which presuppose published releases and a Windows arm64 build — *The Boss and upstream*; (3) MCP catalog registration and the hook route — *The Boss*; (4) the missing target — *upstream*. None is in this phase's goals. **Recommendation: its own phase, `the-boss-integration`, after this one.** I have an interest in that recommendation — it keeps this phase small — so the counter-argument stated plainly: piece (1) changes where `scripts/` and `lib/` live, and every phase that adds files before it happens adds files that will have to move.

RISKS AND OPEN QUESTIONS FOR ANALYZE / PLAN
1. **Float canonicalisation** decides whether receipts are portable. Options include forbidding non-integer numbers in hashed fields, emitting Python-compatible tokens, or declaring the packs' receipts incompatible and saying so. Each has a cost; analyze must choose with evidence.
2. **One `events.jsonl` or two.** `pk` already appends a different schema to it.
3. **Append is not in `lib/platform/`.** An append-only log needs a primitive that `atomic-write` deliberately is not, and Windows file-locking behaviour on concurrent append is unobserved here.
4. **Migrating `decisions.md` / `gotchas.md`** into one-file-per-concept rewrites files that CLAUDE.md §0 tells every agent to read at bootstrap. The rules source would have to change in the same change.
5. **The six-id scenario** blocks any new hook until the spec is amended.
6. **The primary judge is still unavailable; the fallback was used.** The liter-llm gateway (MiniMax-M3 critic, k3 judge) returns 401 because `$LITER_LLM_API_KEY` is unset in this session. The operator-named fallback — the openai-proxy on `:8181` — serves without a credential, and **`gpt-5.5` judged both review rounds of this assessment**. That is a different model family from the producer, so this is the first `verified-distinct` review in two phases. (An earlier draft of this line said the fallback "was not exercised as a judge". That was true when written and false once round 1 ran; I updated the Part 2 intro and not this line, and round 2 caught the contradiction.)
7. **The Boss integration has no owner or phase yet**, and it needs operator decisions on: the second filesystem server (Gap 5), bundling Node vs mise-on-demand vs bun (Gap 2), and which hook route (Gap 3).
8. **Two integration claims are unverified and load-bearing:** that SDK 0.3.220 loads a local plugin's `hooks/hooks.json` and defines `${CLAUDE_PLUGIN_ROOT}`, and that `bun` runs this pack's `.mjs` unchanged. Either could invert the recommended route.


ADVERSARIAL REVIEW
- Judge: **gpt-5.5** via the openai-proxy (`:8181`), the operator-named fallback. Producer: claude. Different model families — `cross_model_check: verified-distinct`, for the first time in two phases. Transport: REST, artifact-only packet, no conversation history (E-2).
- Round 1: BLOCK — 2 CRITICAL, 7 WARNING, 1 SUGGESTION. One CRITICAL was a genuine miss (`${CLAUDE_PLUGIN_ROOT}`, now Gap 7). Verifying a WARNING **overturned Gap 2**: The Boss manages `node@22` through mise, which I had not looked at before claiming there might be no `node`.
- Round 2: BLOCK — 1 CRITICAL, 3 WARNING. All ten round-1 dispositions were checked; 9 CONFIRMED FIXED, 1 not fully. The CRITICAL was a contradiction **I introduced in the rewrite**.
- This judge behaved differently from last phase's same-family judges: it could not run tools, so it held every claim to "is the evidence in the packet?". That surfaced claims I had verified but never shown — and two I had not verified at all.

UNRESOLVED REVIEW FINDINGS (two-round cap reached; carried verbatim, fixes UNREVIEWED)
- [CRITICAL, round 2] "The assessment contradicts itself about whether a cross-model/cross-family judge was used." — FIXED in risk #6 after the verdict; unreviewed. Searched the whole artifact for the pattern this time: 2 mentions, both now consistent.
- [WARNING, round 2] "auto-install 'on every boot' is not fully supported" — FIXED by narrowing the claim to the call site and saying the boot path was not traced; unreviewed.
- [WARNING, round 2] "overstates … requiring every tool to cover all six platform keys" — FIXED, and checking it showed the opposite of my claim: a missing key is skipped silently (`if (!pkg) continue`). Unreviewed.
- [WARNING, round 2] "Several factual measurements remain command summaries without raw output" — FIXED by the appendix below; unreviewed.

RAW COMMAND OUTPUT — for the measurements round 2 found unevidenced
- `wc -l (upstream recorder, test, dispatcher)`
```
671 skills/process/karpathy-progress-memory/scripts/record-progress.py
     514 skills/process/karpathy-progress-memory/tests/progress-memory-integration.py
      75 shared/scripts/karpathy-hook-dispatch.sh
    1260 total
```
- `wc -l .prometheus/decisions.md .prometheus/gotchas.md`
```
96 .prometheus/decisions.md
     203 .prometheus/gotchas.md
     299 total
```
- `dated entries: grep -c '^## [0-9]{4}-' `
```
.prometheus/decisions.md:3
.prometheus/gotchas.md:6
```
- `.prometheus/log.md exists?`
```
false
```
- `progress.json implementation counter`
```
0/0 PENDING
```
- `The Boss AiService.ts:404-407`
```
// always runs after builtin skills have synced to agent_global_skill this boot,
    // regardless of whether the install succeeded. Fire-and-forget as a pair so
    // neither blocks init.
    void installBuiltinSkills()
```
- `The Boss download-binaries.js:118-119`
```
const pkg = tool.packages[platformKey]
    if (!pkg) continue
```

ADDENDUM — 2026-09-21, after the assess stage closed (NOT reviewed; the two-round cap was already spent)

Operator decisions changed the ground under Part 1. Recorded in full in `.prometheus/decisions.md`; the phase
goals were revised to match. What analyze must now treat as the baseline:

- **The knowledge/OKF half is `pk`'s, not Node's.** Vendored at `tools/prometheus-knowledge` (`01a1dbe`, pk 1.8.0). This withdraws the "MISSING" rows above for the `events.jsonl` writer, the `log.md` projection, the OKF v0.2 writer and the v0.1 reader — they are no longer this pack's to build.
- **`pk` does not build for Windows today.** `pk-cli/src/main.rs:1216` uses `std::os::unix::fs::PermissionsExt` in a file with zero `cfg` guards (`git show origin/main:pk-cli/src/main.rs | sed -n '1216p'`). No CI workflows exist (`git ls-tree -r origin/main -- .github/workflows` → empty). `gh release list` → 0 releases. The operator's premise that it "supports windows, mac, and linux" is therefore **not yet true**, and making it true is work in another repository.
- **`pk` has no progress recorder.** `pk --help` lists 15 subcommands, none of which records progress events or writes receipts. The float-hash finding stands and belongs to whichever component ends up computing `eventSha256`.
- **Part 2, Gap 2 is closed by decision:** The Boss runs this pack under its bundled `bun`. Tested against The Boss's own 1.4.2 binary on macOS arm64 — six hooks, the self-invocation guard, stdin, the atomic write, the unknown-id exit code, `refine-validate` and the rules build all behave; cold start median ~22 ms vs ~40 ms under node. **Not tested on Windows.**
- **Part 2, Gap 5 is closed by decision:** both filesystem servers ship, so the overlap is a naming problem.
- **A third binary now needs The Boss's bundler:** `pk`, alongside compass and `rust-mcp-filesystem` — and unlike those two it has no release artifacts and no Windows build.
- **Two gates were adjusted to admit the submodule**, each with a mutation proving it still discriminates: `no-shell-or-python-files` (pathspec for the vendored directory) and the LF-endings test (gitlink entries, identified by git mode `160000`).

ASSESSMENT COMPLETE
