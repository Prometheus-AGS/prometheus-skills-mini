ANALYSIS: platform-foundation
Project: prometheus-skills-mini
Date: 2026-09-21
Inputs: assessment.md and its assess handoff; operator direction given with /kbd-analyze (Karpathy self-improvement on Windows incl. the pk Rust tools; Open Knowledge Format, latest version, for the logs; deep-research and adversarial-review in scope for the port; three tiers of karpathy log — project, personal, team — for both packs).
Machine contract: `library-candidates.json` (cand-001 … cand-019).

WHAT THIS ANALYSIS CORRECTS — four premises were checked and three were wrong
1. "The submodule points at a 404 URL." It does not. Both .gitmodules that reference pk (prometheus-skill-pack/.gitmodules:16 and universal-agent-runtime/crates/prometheus-skill-system/.gitmodules:16) already read https://github.com/Prometheus-AGS/prometheus-knowledge-rs.git. `git grep` for the misspelt or non-`-rs` URL across prometheus-skill-pack, universal-agent-runtime, prometheus-knowledge and surreal-memory-server returned nothing. No pointer was changed. The only difference from the requested form is https:// versus git@; switching to SSH would break any unauthenticated or token-based clone, so it was left for the owner to decide.
2. "The local pk checkout is v1.8.0." /Users/gqadonis/Projects/prometheus/prometheus-knowledge was v0.1.0, 9 crates, 30 commits behind origin/main. v1.8.0 (10 crates, 01a1dbe) is what the skill-pack submodule pins. The operator declined the fast-forward; that clone is unchanged.
3. A rule written earlier in this project was wrong. .claude/rules/node-scripts.md said to "resolve the .cmd shim, do not switch the shell on". Node's documentation states .bat/.cmd files cannot be launched without a shell at all. The rule source was corrected and rebuilt (cand-006).
4. The pk notes themselves were RIGHT. All three Windows blockers exist at the cited lines in v1.8.0, and every other unix-only use is cfg-gated, as the notes said.

LANDSCAPE AND BUILD-VS-ADOPT, per assessment gap
- Atomic write — BUILD (cand-001), reference write-file-atomic (cand-002) and graceful-fs (cand-003). Six dependency-free lines already exist in `rules/build.mjs`. The bounded EPERM/EBUSY rename retry is an EXPLICIT PHASE GOAL and is therefore required (an explicit requirement is one of A-2's four admissible sources). An earlier draft of this analysis called it "unobserved" and deferred it; that was wrong and was caught in review. Shape: win32 only; EPERM, EBUSY and EACCES only; a fixed small number of attempts with backoff; every other error rethrown at once. CI on windows-latest VALIDATES it — a test that holds the destination open while renaming — it does not decide whether it is written.
- Paths — BUILD (cand-019), trivially. lib/platform exposes `homeDir()` (os.homedir), `tempDir()` (os.tmpdir), `stateDir(...parts)` and `join`; nothing else in the repository may call os or read an environment variable for a location. Enforcement already exists and is mechanical: the blocking constraint `no-home-or-tmp-literals` greps every .mjs for `$HOME`, `process.env.HOME` and `/tmp/`. Tests inject the two roots so they never touch the real home directory.
- Lock — BUILD with fs.open(path,'wx') (cand-004); reject proper-lockfile (cand-005, unmaintained since 2022).
- Spawn on Windows — THE PHASE GOAL IS INFEASIBLE AS WRITTEN AND MUST BE REVISED. goals.md says "spawn with shell:false and Windows .cmd shim resolution". Node documents that a .cmd cannot be launched without a shell, so no amount of resolution makes that combination work. Proposed replacement goal text, for the owner to accept: "spawn with shell:false; npm CLIs are resolved to their JavaScript entry and run with process.execPath; a tool that exists only as .cmd is refused with a clear error." The lib/platform contract that follows: `spawnNodeCli(packageName, binName, args)` reads the package's `bin` field and spawns `process.execPath` with that file; `spawnExecutable(name, args)` is for real executables (git, docker); there is deliberately NO third function. ADOPT the pattern "process.execPath + the CLI's JS entry" (cand-006). Reference cross-spawn (cand-007); reject execa (cand-008, 12 dependencies against a 1 s hook budget).
- Locating openspec — ADOPT @fission-ai/openspec as a pinned devDependency (cand-009): registry latest is 1.13.1 (MIT, modified 2026-09-17, engines node >=20.19.0); 1.10.0 is what ran `openspec init` here, so pin 1.10.0 first and upgrade as its own change. Observed here: openspec lives under nvm's Node 24 while PATH has fnm's Node 26, so a global lookup fails even on macOS.
- node:test harness and package.json — BUILD, no dependency (cand-017). A minimal `package.json`: `"type": "module"`, `"private": true`, `engines.node ">=22"`, scripts `test` = `node --test`, `check` = `node rules/build.mjs --check`, `coverage` = `node --test --experimental-test-coverage`. The ONLY dependency is the pinned devDependency of cand-009. Conventions to settle in plan: Arrange-Act-Assert is a required STRUCTURE, enforced in review, not required comments (0 of the 20 existing tests carry markers and all follow the order). Tests-first evidence: the repository has no history yet, so from the first commit on, a change lands as a test commit that fails followed by the implementation commit, and the RED output is pasted into the OpenSpec change's tasks — that is checkable afterwards; a transcript is not. `rules/build.mjs` (0% covered) gets tests in this phase because it becomes lib/platform's first consumer.
- .gitattributes and CRLF tolerance — BUILD (cand-018). `.gitattributes`: `* text=auto eol=lf` plus explicit `binary` for images, so a Windows checkout with core.autocrlf=true cannot rewrite sources. That protects the repository, not the parsers: bundles cloned from OTHER repositories (team and personal logs) and files edited on Windows can still arrive as CRLF. So (a) lib/platform gains ONE text reader that normalises CRLF → LF, and every parser reads through it; (b) `splitFrontmatter` in `rules/lib/render.mjs:36`, which REJECTS CRLF today, is fixed to accept `\r?\n` as defence in depth, since it is exported and callable without the reader; (c) both get CRLF fixtures in `node:test`. The OKF frontmatter reader planned for a later phase inherits (a).
- First consumer of lib/platform — `rules/build.mjs`. It already contains a private atomic write and the private CRLF-normalising `readText`; both move into lib/platform and build.mjs imports them. That satisfies A-9 (nothing is tested before it is wired into a call graph), removes the duplicate the assessment predicted, and brings build.mjs under test. No other consumer exists in this phase, so nothing else is speculative.
- CI — ADOPT a GitHub Actions matrix, three OSes × Node 22 and 24 (cand-010). Job steps, in order: checkout; setup-node; `npm ci` (installs only the pinned openspec devDependency — without this step `openspec validate` has nothing to run); `node --test`; `node rules/build.mjs --check`; `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` — the same shell-free invocation lib/platform uses, so CI exercises the real path on Windows rather than a `.cmd` shim. Still blocked on the owner choosing a remote.

KARPATHY SELF-IMPROVEMENT ON WINDOWS — options
The loop has two halves: accumulation (events → distilled knowledge → bounded context injected into the next run) and gating (keep or discard against a metric). Only accumulation is analysed here.

Option A — Node only. Port record-progress / enqueue / learning-queue to Node; knowledge lives as OKF files; recall is a keyword scan.
  + Satisfies every constraint today; nothing to install; the only option that is certain to run on Windows.
  − Recall quality is the weakest of the four; no librarian, no bounded prompt snapshot; reimplements what pk already does.
Option B — pk native on Windows.
  + The real librarian, snapshot and search; file-backed, small, fits 16 GB.
  − Does not compile or run on Windows today (3 blockers). Needs a Rust toolchain or a published Windows binary on the host, which contradicts this project's constraint C7 if pk is REQUIRED. `pk doctor` checks for the source pack's bash hook files by name, so it fails against a Node-only pack on every platform. pk writes OKF v0.1.
Option C — pk in Docker on Windows.
  + No Rust on the host.
  − Hooks call `pk context` on every prompt; `docker exec` per prompt is slow, and this project's rules forbid exec-ing into a container from a hook. Would need pk-cherry's HTTP API instead — a third resident service, against "exactly two services".
Option D — Node primary, pk optional accelerator. RECOMMENDED.
  The Node port owns the write path (events.jsonl, receipts, queue, OKF files) and always works. When a `pk` executable is on PATH, recall and ingest go through it; when it is not, the Node fallback runs. This is exactly how the source pack already treats pk: every call site degrades gracefully (`pk context` → "status=unavailable reason=pk-not-found", `pk ingest` → log and continue, `pk search` → "(no prior decisions found)").
  + Windows works on day one; pk improves recall wherever it is installed; C7 holds because nothing REQUIRES pk; no third service.
  − Two recall implementations to keep honest. The contract between them must be the on-disk OKF bundle, not an API, or they will drift.

pk ON WINDOWS — what was verified and what was prepared
Verified by git ref at origin/main 01a1dbe, read-only:
- B1 pk-cli/src/main.rs:1216 — ungated `use std::os::unix::fs::PermissionsExt;` inside run_doctor. Compile error on Windows; takes out the whole pk binary.
- B2 pk-store/src/prompt_snapshot.rs:171 and pk-learning-worker/src/main.rs:922 — `File::open(dir)?.sync_all()`. Windows cannot open a directory handle this way; every atomic_replace, so every snapshot publish and queue transition, fails at runtime. Seven call sites reach it.
- B3 pk-cli/src/main.rs:984 — `Command::new("npx")`. Rust's Windows lookup appends only .exe; npx is npx.cmd. Affects `pk codegraph extract` only.
- All six other std::os::unix uses carry #[cfg(unix)] with non-unix fallbacks; no libc, nix, unix sockets or /tmp literals.
Prepared, NOT applied to any repository: a 3-file patch (+49 −8) against a scratch export of 01a1dbe — a cfg-split hook_log_mode_status reporting WARN on non-unix (WARN already exists in doctor's vocabulary and is not counted as a failure), a cfg-split sync_directory, and npx.cmd under cfg!(windows). Writing it surfaced a fourth defect the notes did not list: in pk-store, `File` is imported only for sync_directory, so gating the function leaves an unused import on Windows — a hard error under `-D warnings`. The patch removes the import and qualifies the call.
NOT verified: the Windows branch of any of it. No Windows Rust target is installed here, and openssl-sys / tikv-jemalloc-sys in the lockfile mean a cross-check may need a C toolchain. A native `cargo check -p pk-store -p pk-learning-worker -p pk-cli -j 4` of the patched export finished with exit 0 in 5m 21s on aarch64-apple-darwin — that verifies the unix branch still compiles and nothing else. The rename-retry the notes suggest was deliberately left out: the sharing violation is unobserved.
Two pk findings beyond the notes: `pk doctor` hardcodes karpathy-hook-dispatch.sh, detect-project-context.sh, memory-outbox-flush.sh … as required files; and pk is on OKF v0.1.

OPEN KNOWLEDGE FORMAT — latest is v0.2, and it is not what the repos implement
Source of truth: GoogleCloudPlatform/knowledge-catalog okf/SPEC.md, which declares Version 0.2. (An earlier search summary dated the release 2026-07-25; that date was not confirmed against the primary source.) The skill pack holds a copy of v0.1; pk, deep-research's manifest/report and adversarial-review's decision-log.sh all write v0.1.
- Required: frontmatter `type` on every non-reserved .md. Reserved: index.md, log.md.
- New optional families in 0.2: sources (mappings, `resource` required, optional id/title/author/usage_count/last_modified), generated {by, at}, verified [{by, at}], status draft|stable|deprecated, stale_after; an actor convention (<producer>/<version>, human:<id>, process:<id>); a derived trust tier (unverified / machine-confirmed / human-reviewed); a new type Attested Computation.
- Two renames despite the "minor" label: timestamp → generated.at; body "# Citations" → `sources` frontmatter. pk-store/src/markdown.rs writes `timestamp:` and `sources` as a list of strings — both are 0.1 shapes.
- For LOGS specifically: §9 log.md is date-grouped and NEWEST FIRST, and the spec states it does not address event streams or append-only records. An append-only session log cannot be an OKF log.md. Decision: events.jsonl stays the append-only truth, outside OKF; log.md is rendered from it by atomic rewrite.
- The fit with this project's rules is unusually direct: the derived trust tier is rule D-6 (a lesson becomes a rule only after human approval = human-reviewed); status: deprecated is "mark superseded, never delete"; generated.by is A-15 provenance; sources + footnotes is A-6.
Done in this stage, as evidence rather than design: .prometheus/ was given an index.md declaring okf_version "0.2", and its two existing documents were given conforming frontmatter; a §11 conformance check passes. README §5.3 now specifies the bundle.

THE TWO SKILLS — inventory, both portable without WSL
adversarial-review — 6,146 lines, nine bash scripts plus two shared libs; every script shells out to python3 (about 30 inline heredocs) and none has tests in a portable framework (hand-rolled bash, not bats).
- Mechanical: review-retry-loop, validate-decision-artifact, commit-before-reveal, decision-log (which must now write OKF 0.2, not 0.1).
- Medium: dispatch-judge (a clean fetch() port; the exit contract 0/2/3/4 and the temperature-omission list for k3 / kimi-for-coding / o1 / o3 / gpt-5 must survive), preflight-models, kbd-model-resolve (hand-rolled awk TOML reader; precedence must be preserved exactly).
- Hard: build-review-packet.sh (919 lines; hand-rolled YAML, whole-repo walk, an unquoted git pathspec that breaks on paths with spaces, an executable-bit check that is meaningless on NTFS) and shared sycophancy.sh (209 lines), which drives the sycophancy-correction MCP binary through a NAMED PIPE with sleep-based sequencing — mkfifo, /tmp, timeout, fractional sleep. It cannot be translated; rewritten with spawn + stdin it becomes simpler and deterministic. This is also why the anti-theater gate silently skipped in the assess review.
- The packet's file_tree is find -maxdepth 2 by design (depth 3 is 112 KB); cited_paths is the intended answer and reports EXISTS/MISSING for backtick-quoted paths. The false CRITICAL in the assess review happened because the assessment cited paths as "rules/lib/render.mjs:25" inside prose the resolver's pattern did not match as a bare backticked path. Artifacts in this repo should backtick every path they rely on.
deep-research — about 9,000 lines excluding the Rust server.
- The ten stage skills and nine agent prompts are Markdown only: copy.
- All ten Python scripts are stdlib-only and make no network calls; one optional import (jsonschema) always has a fallback. They are mechanical Node ports. Export is Markdown + JSON — no docx, pdf or pandoc.
- The work is in run-research.sh (569 lines, 29 jq calls, hard jq requirement, /dev/urandom via od) and check-research-package.sh (279 lines, 27 jq calls). Exit code 3 ("awaiting a stage") is the whole checkpoint protocol and must be preserved.
- Services: tavily or firecrawl — at least one is hard-required, both are Node stdio MCP servers, so Windows is fine. surreal-memory is optional with a documented disk-only mode. liter-llm is optional; without it the semantic contradiction judge records pairs as blocked. pk and forge are not used at all.
- substrate/prometheus-research (the Rust background server, stdio MCP + HTTP :7891) is OPTIONAL: the documented default is the agent-driven checkpoint loop. It compiles on Windows but job cancellation silently no-ops there (the only nix use is SIGTERM in src/job/cancel.rs:11) — a correctness bug, not a build failure. No Dockerfile exists. Recommendation: do not port or ship it; the mini pack uses the checkpoint path only.
- Discrepancy to settle in plan: the root .mcp.json says surreal-memory is on :23001; run-research.sh health-probes :8090.
- deep-research writes OKF v0.1 (manifest.json format_version 2.0.0, report frontmatter). The port targets 0.2.

THREE TIERS OF KARPATHY LOG — project, personal, team
Requirement (operator, 2026-09-21): support project logs inside the project repository, personal logs private to a developer in their own git repository, and team logs shared by a team and maintained by skills from one or more karpathy logs in their own repositories — for BOTH the source pack and the mini pack — such that KBD processes can and DO read every log selected for a project and consume updates easily.

What exists today (observed, read-only)
- `pk` has three HARD-WIRED local paths and nothing else: Project = `<repo>/.prometheus/knowledge/`, Shared = `~/.prometheus/knowledge/shared/`, Global = `~/.prometheus/knowledge/` (pk-cli/src/main.rs:909-913). "Shared" means cross-project on one machine, not shared with people. There is no git, remote, team, subscription or per-project selection concept anywhere in pk; the hook simply passes `--scope project --scope shared --scope global`.
- The personal tier already exists BY HAND on this machine: `~/.prometheus/knowledge` is a SYMLINK into the `knowledge/` directory of a private git repository elsewhere on this machine (named here deliberately not at all — see the rule this analysis proposes), with 35 "sync:" commits. Its last commit is 2026-08-23 and it has 35 uncommitted files today. So the tier is real, its maintenance is not, and it depends on a symlink — which is exactly what Windows cannot do without Developer Mode or elevation.
- The team tier does not exist in any form. pk's Shared directory sits INSIDE the personal repository's tree, so it cannot become a team checkout without moving.
- Nothing records which logs a stage actually read. "We read the logs" is currently unfalsifiable.

Options for wiring logs into a project
A. Git submodules in each project repo — REJECT. A personal log's private URL would be committed into every project; SHA pins churn on every log update; submodules are the most common source of broken clones.
B. Symlinks (today's personal setup) — REJECT for anything new. Not portable to Windows; invisible to git; silently dangling.
C. A sources registry plus plain clones under the user's home — RECOMMENDED. Detailed below.
D. surreal-memory as the team store — REJECT as primary, keep as secondary index. Not reviewable by pull request, so OKF's human-reviewed tier and rule D-6 have nowhere to happen; makes a service mandatory, against "everything works with both services down".
E. Publish the team log as a versioned package (npm) — REJECT. Release friction defeats "consume updates easily"; nothing in it that a git ref does not give.

Option C — the contract (on disk, so both packs can implement it)
1. Every log, at every tier, is an OKF v0.2 bundle in a git repository. One format, three locations. A tier is a property of WHERE a bundle lives and who may write it, not a different format.
2. A project SELECTS its logs in a registry:
   - `.prometheus/sources.json` — committed. Declares the project bundle and any TEAM sources: `{ id, tier, git, ref, subdir, required }`. Team URLs are fine to commit; the team owns both repositories.
   - `~/.prometheus/sources.json` — per developer, never in a project. Declares PERSONAL sources, which therefore follow the developer into every project ("an individual can benefit across projects") without any project repository ever naming a private repository.
   - `.prometheus/sources.local.json` — git-ignored. Per-project opt-out or pin for one developer.
   Merge order: project file, then user file, then local overrides. No symlinks anywhere.
3. Non-project sources are plain clones at `~/.prometheus/sources/<id>/`, created and updated by one command: `sources sync` = clone if absent, else `git fetch` + fast-forward only. Never a merge, never a rebase, never a force: a diverged clone is reported, not repaired.
4. READ — "can and do":
   - `sources sync` runs at session start and at `kbd-assess`, time-boxed, and a failure (offline, auth, diverged) degrades to the last good checkout. It never blocks a hook.
   - It writes a RECEIPT, `phases/<phase>/sources-receipt.json`: for each selected source — id, tier, resolved commit SHA, fetched-at, entry counts, and status (fresh | stale-offline | missing | diverged). The receipt is what turns "we read the logs" into a checkable fact.
   - The KBD stage gate for assess and plan requires a receipt no older than the stage, and the assessment template gains a "SOURCES CONSULTED" block copied from it. A `required: true` source that is missing blocks the gate; an optional one is reported.
   - The update digest — "team-platform: 3 new, 1 deprecated since your last session" — is computed from the previous receipt's SHA to the new one (`git log <old>..<new> --name-status`) and injected once. That is what "consume updates easily" means in practice: no one re-reads a whole log to find what changed.
5. RANKING when several tiers answer the same prompt: relevance first; then OKF trust tier (human-reviewed > machine-confirmed > unverified); then freshness (`status: deprecated` and anything past `stale_after` are excluded, not down-ranked); tier only as the tie-break, most specific first (project, team, personal). The bounded context budget (pk uses 6000 bytes) gets a per-tier floor so a large team log cannot crowd out a project's own gotchas.
6. IDENTITY across tiers: an entry promoted from personal to team is the same knowledge in two bundles. Give every entry a content-addressed id (sha256 of the normalised claim — the scheme deep-research's build-graph.py already uses for claims) and record lineage the OKF way, as a `sources:` link back to the origin, so recall can de-duplicate instead of injecting it twice.
7. WRITE, per tier:
   - Project — written by the hooks into the repository; travels with the code; reviewed in the project's own pull requests.
   - Personal — distilled from events across all projects into the personal clone and committed LOCALLY. The agent never pushes it (A-16); the developer pushes. An earlier draft proposed an `autoPush` opt-in; review correctly flagged that it contradicts this project's own no-push constraint, so it is NOT part of the adopted contract and stays an open question (8) that would need an explicit constraint change first. Consequence to accept: a personal log is only as fresh on other machines as the developer's last push — `sources sync` should therefore REPORT unpushed local commits and uncommitted files at session start, which is exactly the month-stale, 35-file state observed on this machine.
   - Team — NEVER written directly by a working agent. A team log changes only by pull request in the team repository.

Maintaining a team log — the skills
- `karpathy-share` (member side): propose one entry from a project or personal log to a team log. Opens a branch in the team clone with the entry, its lineage link, and `verified: []` — it arrives UNVERIFIED. This is a PUSH model: the member chooses what leaves their private log.
- `team-log-harvest` (team side): for upstreams the team already OWNS — its project repositories — read their project bundles and propose candidates. This is the PULL model, and it is deliberately limited to repositories the team can already read; it never reaches into a personal repository.
- `team-log-curate`: de-duplicate by content id, run the adversarial-review judge and the sycophancy gate, append `verified: [{by: adversarial-review/<model>}]` (machine-confirmed), open the pull request. A human merging it adds `verified: [{by: human:<id>}]` — human-reviewed. That merge IS rule D-6.
- `team-log-prune`: expire by `stale_after`, mark `deprecated` with a link to the successor, never delete.
- These run on a schedule in the TEAM repository's CI, or from a maintainer's session. They are Node scripts like everything else; nothing about them is platform-specific.
The trust boundary (A-3, a real one): a personal or client-project log can hold confidential material. Nothing crosses into a team log without (a) an explicit per-entry opt-in, (b) the existing secret-pattern rejection, and (c) redaction of absolute paths and repository names. Promotion is never inferred from a tag the agent wrote itself.

Both packs — why the contract is files, not an API
- Mini pack (Node): implements the registry, sync, receipt, digest and ranking natively. When a `pk` binary is present, it passes pk the resolved bundle paths; when not, its own recall runs over the same paths. Identical results are not promised; identical INPUTS are.
- Source pack (bash + pk): pk needs ONE change to take part — a repeatable `--kb <path>` (or `--sources-file`) alongside its three fixed scopes, so the hook can pass every selected bundle. Project and Global keep working unchanged; the registry simply adds roots. This is the third pk change this analysis has identified, after the Windows patch and OKF 0.2, and it is the smallest of the three.
- Migration for the existing personal repository: move `knowledge/` to be the bundle root of a personal source registered in `~/.prometheus/sources.json`; point pk's Global at the clone with `PK_KB_DIR` (pk-cherry already reads it); delete the symlink. pk's Shared directory, which lives inside that repository today, becomes either part of the personal bundle or a separate team source — it cannot stay both.

An ambiguity in the requirement that changes the design
"Team logs … maintained with skills that automatically update based on one or more team karpathy logs" reads two ways: (1) skills maintain the team LOG from several karpathy logs — designed above; or (2) SKILLS THEMSELVES are updated automatically from what team logs have learned. The personal repository already has a `skill-updates/` directory, which suggests (2) is also wanted. It is compatible with the design but not with "automatically" as stated: rule D-6 forbids updating a skill or rule from an agent's own evaluation without human approval. The supported form is: a team log entry of `type: Skill Update Proposal` that reaches human-reviewed generates a pull request against the skill. Automatic proposal, human merge.

SEQUENCING — the dependency this analysis makes explicit
Both skills and the Karpathy port need the same four primitives: atomic write, lock, spawn-a-Node-CLI, and home/temp paths — plus three that the assessment did not list and the inventory makes unavoidable: a gateway client (fetch, no-abort, exit-code contract), a TOML scalar reader, and an OKF frontmatter reader/writer. Porting either skill before lib/platform exists would create a second and third copy of each. Therefore platform-foundation stays first and gains no scope; the two skills become their own phases after it.
Proposed phase order (replaces README §8): platform-foundation → hook-entry + kbd-state-core → okf-v0.2-io + karpathy-progress-memory-node (Option D) → knowledge-sources (registry, sync, receipt, digest, ranking, stage-gate check) → team-log-skills → review-gateway (kbd-model-resolve + dispatch-judge + preflight) → adversarial-review-node → deep-research-node → docker-services / memory-bridge → pmpo / evolver ports → rust-toolkit → installer.
NOT done in this stage, deliberately: neither skill was ported. That is about 15,000 lines of behaviour with exit-code contracts other tools branch on, it depends on lib/platform, and this project's own A-17 routes it through an OpenSpec change.

OPEN QUESTIONS — owner decisions
1. pk: apply the prepared patch how — a branch in the standalone clone after a fast-forward, a PR from a fork, or hand it to the Codex session already working in that repository? The clone was not touched.
2. OKF 0.2 in pk: a second change (frontmatter struct, read-compat for timestamp and string sources, librarian prompt §8 → sources, bundle validator). Same question.
3. `pk doctor` and a Node-only pack: teach doctor a harness-agnostic check list, or accept permanent FAILs.
4. Submodule URL form: keep https:// or move to git@.
5. A git remote for this repository, without which no Windows evidence can exist. Carried from assess.
6. The Rust research server: confirm it is out of scope for the mini pack.
7. Team-log reading (1) or (2) above — or both.
8. `autoPush` for personal sources: acceptable as a per-source, user-level opt-in, or should pushing always stay manual?
9. Which team repository, and which project repositories it may harvest from. None exists yet.
10. pk change 3 (repeatable `--kb`): same routing question as the other two pk changes.

ADVERSARIAL REVIEW
- Round 1 (judge kbd-judge via rest-gateway, cross_model_check verified-distinct, producer claude-fable-5-1): BLOCK — 3 CRITICAL, 2 WARNING, all five accepted. The analysis had followed the operator's three added topics and dropped two of the phase's own five goals (node:test/package.json; .gitattributes/CRLF), had downgraded a third (the rename retry) from required to optional, had not pinned a version for cand-009, and had not named lib/platform's first consumer. All addressed above; cand-017 and cand-018 added.

- Round 2 (same judge, verified-distinct): BLOCK — 2 CRITICAL, 2 WARNING. All four accepted as correct. Two rounds is the cap, so no third review was run: the four fixes above (cand-019 paths; the .cmd goal declared infeasible with replacement text; the CI job steps; autoPush withdrawn) have NOT been seen by a reviewer.

UNRESOLVED REVIEW FINDINGS (round 2, carried forward verbatim per the two-round cap)
- [CRITICAL] "The required lib/platform path primitive is not evaluated by any candidate, so the plan can omit a goal-required abstraction." — addressed after review by cand-019; unreviewed.
- [CRITICAL] "The analysis does not provide an adopted solution for the goal-required Windows `.cmd` shim handling under `shell:false`." Suggested fix: "Either define the lib/platform spawn contract as resolving npm `.cmd` shims to their JavaScript entry and adopt that implementation, or explicitly mark the original goal infeasible and require goal revision before planning." — both done after review; the goal revision needs the OWNER's acceptance before /kbd-plan.
- [WARNING] CI job commands not analysed — addressed after review; unreviewed.
- [WARNING] "`autoPush` … contradicts the project no-push boundary." — withdrawn from the contract; unreviewed.

ANALYSIS COMPLETE
