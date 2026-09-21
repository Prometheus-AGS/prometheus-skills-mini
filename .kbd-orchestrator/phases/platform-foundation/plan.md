PLAN: platform-foundation
Project: prometheus-skills-mini
Date: 2026-09-21
OpenSpec available: YES
Changes to implement: 6
Inputs: `assessment.md`, `analysis.md`, `library-candidates.json` (cand-001 … cand-019), `goals.md` (spawn goal revised and accepted by the owner 2026-09-21), `decision-log.md`.

GOAL → CHANGE TRACE (every goal, nothing else)
| Goal in `goals.md` | Change(s) | Candidate |
|---|---|---|
| lib/platform — paths | 3 | cand-019 |
| lib/platform — atomic write with bounded EPERM/EBUSY retry | 4 | cand-001 |
| lib/platform — lock (`fs.open` wx) | 4 | cand-004 |
| lib/platform — spawn, `shell:false`, npm CLIs via `process.execPath`, `.cmd`-only refused | 5 | cand-006, cand-009 |
| node:test harness, AAA, tests first; `package.json`, engines ≥ 22, test/check scripts | 1 (harness), every change (tests first) | cand-017 |
| Three-OS CI running `node --test`, `node rules/build.mjs --check`, `openspec validate` | 2 (then one step updated by 5) | cand-010 |
| `.gitattributes`; parsers tolerate CRLF | 1 (`.gitattributes`), 3 (reader + `splitFrontmatter`) | cand-018 |
| Exit evidence: every Windows claim observed on windows-latest | 6 | — |

PREREQUISITES — owner actions, stated once
- P1 · A baseline commit of the current tree. "Tests written first" is only checkable from history (a failing-test commit, then the implementation commit), and the repository has zero commits. Commits are local and carry `Assisted-by` (A-15); nothing is pushed by the agent (A-16).
- P2 · A git remote with GitHub Actions — WANTED BEFORE ROUND 3. Change 2 can be written without it but cannot run. If P2 has not happened when round 3 starts, changes 3–5 may still proceed, but every Windows-specific branch in them is then written blind and stays labelled self-reported (A-6) until change 6 — which is the situation the CI-first ordering exists to avoid. Change 6 cannot start without P2. This is the phase's critical path and it is not in the agent's hands.

CHANGE LIST (ordered)
1. project-scaffold: `package.json`, pinned OpenSpec devDependency, `.gitattributes`
   - Scope: repo root — `package.json`, `package-lock.json`, `.gitattributes`
   - Depends on: NONE (P1 first)
   - Recommended agent: claude-code
   - Est. complexity: S
   - Complexity score: Low
   - Model class: small
   - Customer value: HIGH — everything else in the phase imports from or is run by this
   - library: cand-017, cand-009, cand-018
   - Details: `package.json` with `"type": "module"`, `"private": true`, `engines.node ">=22"`, scripts `test` (`node --test`), `check` (`node rules/build.mjs --check`), `coverage` (`node --test --experimental-test-coverage`). One devDependency, `@fission-ai/openspec` pinned to exactly `1.10.0` (the version that ran `openspec init` here; registry latest is 1.13.1 — upgrading is a separate change). `.gitattributes`: `* text=auto eol=lf` plus `binary` for image types. No runtime dependencies, no test framework, no linter.
   - Done when: `npm ci` succeeds from a clean checkout; `node --test` still reports 20 passing (the runner must not descend into `node_modules`); `node rules/build.mjs --check` exits 0; `git ls-files --eol` shows `i/lf` for every text file.

2. ci-three-os: the GitHub Actions matrix
   - Scope: `.github/workflows/ci.yml`
   - Depends on: project-scaffold — deliberately BEFORE any Windows-specific code, so that code is first observed on windows-latest rather than written blind (the assess handoff required this ordering; an earlier draft of this plan had it backwards)
   - Recommended agent: codex
   - Est. complexity: S
   - Complexity score: Low
   - Model class: small
   - Customer value: HIGH — the only source of Windows evidence and of Node LTS evidence (the host runs Node 26, a Current release)
   - library: cand-010
   - Details: matrix `windows-latest`, `ubuntu-latest`, `macos-latest` × Node 22 and 24; `fail-fast: false` so one OS failing does not hide the others. Steps: checkout; setup-node; `npm ci`; `node --test`; `node rules/build.mjs --check`; `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` — invoking the JS entry directly, because `scripts/spec-validate.mjs` does not exist yet; change 5 switches this one step to it. The Windows leg sets `core.autocrlf true` BEFORE checkout so the `.gitattributes` from change 1 and the CRLF work in change 3 are tested against the hostile default. Triggers: push and pull_request. No secrets, no deploy, no write permissions.
   - Done when: the workflow file exists and its steps are exactly the commands above. It CANNOT be shown to pass until P2.
   - BLOCKED TO RUN ON: P2.

3. platform-paths-and-text: path helpers, one CRLF-normalising reader, CRLF-tolerant `splitFrontmatter`
   - Scope: `lib/platform/paths.mjs`, `lib/platform/text.mjs`, `rules/lib/render.mjs`, `rules/build.mjs`, tests
   - Depends on: project-scaffold, ci-three-os
   - Recommended agent: claude-code
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: medium
   - Customer value: HIGH
   - library: cand-019, cand-018
   - Details: `homeDir()`, `tempDir()`, `stateDir(...parts)`, `join` over `node:os` / `node:path`, with both roots injectable so no test touches the real home directory. `readText(path)` normalises CRLF → LF and is the only way a parser reads a file. `splitFrontmatter` in `rules/lib/render.mjs:36` — which REJECTS CRLF today — accepts `\r?\n`. `rules/build.mjs` drops its private `readText` and imports the platform one: that is the first consumer, so nothing is tested before it is in a call graph (A-9).
   - Done when: CRLF fixtures pass for `readText`, `parseConf`, `splitFrontmatter`, `routingLayer0` and `countLines`; `node rules/build.mjs --check` is unchanged on LF sources AND passes on a CRLF copy of `rules/src/`; the blocking constraint `no-home-or-tmp-literals` stays clean.

4. platform-atomic-write-and-lock: atomic write with the bounded Windows rename retry; `wx` lock; `rules/build.mjs` under test
   - Scope: `lib/platform/atomic-write.mjs`, `lib/platform/lock.mjs`, `rules/build.mjs`, tests
   - Depends on: platform-paths-and-text (both edit `rules/build.mjs`; serialised to avoid conflicting edits)
   - Recommended agent: claude-code
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: medium
   - Customer value: HIGH
   - library: cand-001, cand-004
   - Details: `atomicWrite(path, content)` = temp file in the same directory + rename. The retry is REQUIRED (explicit goal): `win32` only; `EPERM`, `EBUSY`, `EACCES` only; a fixed small attempt count with backoff; any other error rethrown immediately; the temp file removed on final failure. The file-system calls are injected so the retry is unit-tested on every OS by fault injection; the REAL behaviour — destination held open by another handle — is a test that runs only on `win32`; with P2 in place it is exercised by CI on the first push of this change. `acquireLock(path)` = `fs.open(path, 'wx')` returning a release function; no stale-lock recovery (unobserved; the source pack has none either). `rules/build.mjs` replaces its private `writeAtomic` with the platform one and takes the lock for the duration of a write run (single writer, A-10).
   - Done when: `rules/build.mjs` is imported by tests and appears in the coverage report — drift detection, stale-file removal and write path covered; line coverage over `lib/platform/` and `rules/` is ≥ 80% as reported by `npm run coverage`; a second concurrent write run fails fast with a clear message.

5. platform-spawn: run npm CLIs without a shell; refuse `.cmd`-only tools
   - Scope: `lib/platform/spawn.mjs`, `scripts/spec-validate.mjs`, a `spec:validate` script in `package.json`, one step of `.github/workflows/ci.yml`, tests
   - Depends on: project-scaffold (the devDependency), ci-three-os, platform-paths-and-text
   - Recommended agent: claude-code
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: medium
   - Customer value: HIGH — this is what makes OpenSpec usable from Node on Windows at all
   - library: cand-006, cand-009
   - Details: `spawnNodeCli(packageName, binName, args)` resolves the package's `bin` entry from its `package.json` and spawns `process.execPath` with that file, `shell: false`. `spawnExecutable(name, args)` is for real executables (`git`, `docker`). There is deliberately no third function: a tool that exists only as `.cmd` / `.bat` is refused with an error that says why and names the alternative. Arguments are always an array; nothing builds a command string. Consumer: `scripts/spec-validate.mjs`, a thin entry point that runs `openspec validate --all --no-interactive` through `spawnNodeCli`; `package.json` gains `"spec:validate": "node scripts/spec-validate.mjs"` and the CI step from change 2 switches to it. `.kbd-orchestrator/project.json` and `.kbd-orchestrator/constraints.md` are NOT edited by this or any change: `constraints.md` reserves them to `/kbd-init`. After this change lands the OWNER re-runs `/kbd-init --force`, which derives the command fields from `package.json` scripts — its designed mechanism.
   - Done when: `node scripts/spec-validate.mjs` exits with OpenSpec's exit code and output on this machine WITHOUT a global `openspec` on `PATH` (the global one here belongs to a different Node and cannot be found by the running one — the observed failure this fixes); a fake `.cmd`-only package is refused; the constraint `no-shell-true` stays clean.

6. windows-evidence: observe, fix, record
   - Scope: whatever the Windows legs have broken by then; `.kbd-orchestrator/phases/platform-foundation/evidence/windows.md`; `README.md` §9
   - Depends on: platform-atomic-write-and-lock, platform-spawn, P2
   - Recommended agent: claude-code, with the owner pushing
   - Est. complexity: M (unknowable in advance — it is the size of what Windows breaks)
   - Complexity score: High
   - Model class: frontier
   - Customer value: HIGH — it is the phase's exit criterion
   - Details: run the matrix; for each Windows-specific behaviour this phase claims — rename retry with the destination held open, `spawnNodeCli` with no shell, CRLF checkout under `autocrlf=true`, `wx` lock, `npm ci` + `node --test` on Node 22 and 24 — record the run URL, job, and the asserting test name. Failures are fixed at the root cause with a reproducer (A-16), each as a failing-test commit then a fix commit. `README.md` §9 entries that this phase settles move from "unverified" to the evidence link; the rest stay as they are.
   - Done when: every row of the evidence table has a passing windows-latest run on both Node versions, or is listed as NOT MET with the reason. A claim with no run stays labelled self-reported (A-6).
   - BLOCKED ON: P2.

EXECUTION ROUND ORDER
Round 1: project-scaffold
Round 2: ci-three-os — then P2, so every later round is observed on three OSes as it lands
Round 3: platform-paths-and-text
Round 4 (parallel): platform-atomic-write-and-lock, platform-spawn — disjoint source files; the one shared file is `package.json` / `ci.yml`, touched only by platform-spawn
Round 5: windows-evidence — cannot start before P2
Rounds 1–4 can be written with no remote. If P2 has not happened by the end of round 4, the phase STOPS there, incomplete: goals "three-OS CI" and "exit evidence" are NOT MET and the phase must not be reflected as done.

HOW EVERY CHANGE IS EXECUTED (the harness goal, applied)
- Tests first, provably: commit 1 adds the test and fails; commit 2 makes it pass. The RED output is pasted into the change's OpenSpec `tasks.md`.
- Arrange–Act–Assert is a required structure, checked in review; marker comments are not required.
- Tiers (A-9): T0 per edit `node --check <file>`; T1 per unit `node --test <that file>`; T2 at change completion `node --test`, `node rules/build.mjs --check`, and spec validation — which is `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` for changes 1–4 (available once change 1 has run `npm ci`) and `node scripts/spec-validate.mjs` from change 5 onward, since that script does not exist before it; T3 (the CI matrix) runs on push from round 2 onward; it is never run locally.
- Every module ≤ 500 lines, one responsibility; `lib/platform/` modules do not import each other except through `paths.mjs`.

TRADE-OFFS, CUTS AND WHAT THIS PLAN DOES NOT PROMISE
- The lock is the weakest-justified item. Its real consumers — idempotency receipts, the learning queue — are in a LATER phase. It is here because the goal names it, and it is wired to `rules/build.mjs` as a single-writer guard so that it is not dead code. If the owner would rather defer it to the phase that needs it, change 3 shrinks and the goal needs a second revision.
- No linter. None is configured and adding one is not a phase goal; `lint_command` stays `null`.
- No stale-lock recovery, no CR-only or mixed line endings, no retry on any platform but `win32`: all unobserved.
- OpenSpec stays on 1.10.0 although 1.13.1 exists.
- Explicitly OUT of this phase, each its own later phase: OKF v0.2 io, the Karpathy recorder, the knowledge-sources registry and three log tiers, team-log skills, `adversarial-review` and `deep-research` ports, hooks, Docker services. Nothing here pre-builds for them beyond the four primitives the goals name.
- The 80% coverage figure is over `lib/platform/` and `rules/` only — the only code that exists.
- Estimates are for an agent session and exclude round 5, whose size is whatever Windows breaks.
- `model_policy` in `project.json` is still template defaults (its "small" class names local Qwen models that this project puts out of scope). The model classes above are therefore advisory until the owner settles that block.

COMMANDS TO RUN
/opsx:new project-scaffold
/opsx:new ci-three-os
/opsx:new platform-paths-and-text
/opsx:new platform-atomic-write-and-lock
/opsx:new platform-spawn
/opsx:new windows-evidence

ADVERSARIAL REVIEW
- Round 1 (judge kbd-judge via rest-gateway, cross_model_check verified-distinct, producer claude-fable-5-1): BLOCK — 2 CRITICAL, 1 WARNING, all accepted. (1) Two changes edited `project.json`, which `constraints.md` reserves to `/kbd-init`; removed — the owner re-runs `/kbd-init --force` instead. (2) The evidence path omitted `.kbd-orchestrator/`; fixed. (3) CI was ordered AFTER the Windows-specific code, against the assess handoff's own sequencing; CI is now round 2.
- The judge also surfaced a second `project.json` at `.prometheus/project.json`. It was not written by any change: it is a runtime identity file created as a side effect of `prometheus kbd status --json`. Logged in `.prometheus/gotchas.md`.
- Round 2 (same judge, verified-distinct): BLOCK — 2 CRITICAL, both accepted, both residue of the round-1 reorder: the T2 command named `scripts/spec-validate.mjs` before change 5 creates it, and COMMANDS TO RUN still listed the old order. Both fixed above. Two rounds is the cap: these two fixes have NOT been seen by a reviewer.

UNRESOLVED REVIEW FINDINGS (round 2, carried forward verbatim per the two-round cap)
- [CRITICAL] "The universal change-completion command depends on a script that is not created until change 5, making changes 1–4 impossible to execute as specified." — fixed after review; unreviewed.
- [CRITICAL] "The command sequence contradicts the required implementation order by creating `ci-three-os` after changes that depend on it." — fixed after review; unreviewed.

PLAN COMPLETE
