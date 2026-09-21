ASSESSMENT: hook-entry-node-only
Project: prometheus-skills-mini
Date: 2026-09-21
Codebase baseline: 7 capabilities live; 88 tests, 87 pass, 1 skipped, 0 fail; `lib/platform/` complete (paths, text, atomic-write, lock, spawn). **No hook exists yet** — `hooks/`, `hooks/hooks.json`, `scripts/hook-entry.mjs` and `lib/hooks/` are all absent. Commands in PROVENANCE below.
Cross-tool progress: none. `progress.json` is the runtime's fresh projection at 0/0, written by `kbd-runtime`.

PROVENANCE — every measurement, with a command that reproduces it
Commands are `node`, `git ls-files`/`git ls-tree` and npm scripts only. An earlier draft cited `find`,
`grep -c`, `wc -l` and `test -e`; review flagged that as inconsistent with this project's own command
policy (no `grep`/`find`/`wc`, and everything must run identically from `cmd.exe` and PowerShell 5.1).
The policy binds what the project TELLS an agent to run, so citing those tools as the reproduction
recipe contradicted it. Every count below was re-derived with compliant commands and is unchanged.
- Hook inventory: `node -e` over `prometheus-skill-pack/hooks/hooks.json` → 31 entries, 31 distinct hook ids, 7 events (SessionStart 5, UserPromptSubmit 1, PostToolUse 6, SubagentStop 16, Stop 1, TaskCompleted 1, PreCompact 1).
- Declared timeouts, same file: 1000 ms on `sessionstart-kbd-control`, `taskcompleted-kbd-receipt`, `precompact-kbd-control`; others 5000–35000 ms.
- Node cold start, this host (macOS, Node v26.5.0), 10 runs each, `spawnSync` wall time, median: bare `node -e 0` **46 ms**; empty `.mjs` **48 ms**; `.mjs` importing three `lib/platform` modules **59 ms**.
- Unreviewed fixes: `node -e` reading each archived `tasks.md` and matching `/UNREVIEWED/g` → **8 markers** across the four changes (2 each in `platform-paths-and-text`, `platform-atomic-write-and-lock`, `platform-spawn`, `windows-evidence`).
- Capabilities: `git ls-files "openspec/specs/*/spec.md" "openspec/specs/*/*/spec.md"` → 7.
- Tests: `npm test` → 88 tests, 87 pass, 1 skipped, 0 fail.
- Symlinks: `git ls-files -s`, counting mode `120000` → 0. This is the mechanical check `no-symlinks` says it lacks: git records symlinks as a distinct mode, so it is portable and needs no `find`.
- Absence of hooks: `node -e` with `fs.existsSync` on `hooks`, `scripts/hook-entry.mjs`, `lib/hooks` → all false.
- Three-OS/two-Node greenness is **not** re-measured here: it is the previous phase's recorded evidence (run 35585743561, `phases/platform-foundation/evidence/windows.md`), cited, not re-run.
- Dispatch table to port from: `shared/scripts/generated/hook-dispatch-v1.sh` in the reference repo, 128 lines (`node -e` line count).

IMPLEMENTATION STATUS
- `hooks/hooks.json` (exec form): MISSING — no `hooks/` directory.
- `scripts/hook-entry.mjs` (in-process dispatch): MISSING. `scripts/` holds only `coverage-report.mjs` and `spec-validate.mjs`.
- `lib/hooks/<id>.mjs` payloads: MISSING — the directory does not exist.
- Manifest-resolution test: MISSING. The rule requiring it exists in the **source** `rules/src/project/node-scripts.md` (generated to `.claude/rules/node-scripts.md` and `.cursor/rules/node-scripts.mdc`; `npm run check` reports 19 generated files current). It was added after the source pack shipped a payload without its own entry file. Nothing enforces it here.
- Cold-start measurement on Windows: MISSING. Measured on macOS only (above); the Windows figure is the phase's open question.
- Degradation contract (a service-touching hook always exits 0): NOT APPLICABLE YET — no hook, and no service client until a later phase. It must be designed in now rather than retrofitted.
- Re-review of the four unreviewed fixes: NOT STARTED. This is goal 1 and blocks new code on `lib/platform/`.

WHAT THIS PHASE INHERITS AND MUST NOT REBUILD
`lib/platform/` supplies everything a hook needs: `paths` (no `$HOME`/`/tmp` literals), `text` (CRLF-tolerant reading), `atomic-write` (bounded Windows rename retry), `lock` (single-writer), `spawn` (shell-free, `.cmd` refused). All five are proven on `windows-latest` with named asserting tests in both Node versions. A hook that re-implements any of them is a defect, not a shortcut.

SPEC GAP SUMMARY
- No capability covers hooks. `openspec/specs/` holds `project-tooling`, `continuous-integration`, and `platform/{paths,text,atomic-write,lock,spawn}`. This phase introduces at least one new capability; `continuous-integration` may need a MODIFIED delta if CI gains a hook check — and a MODIFIED delta must repeat **every** scenario of the requirement it replaces (the defect CI caught last phase).
- `rules/src/project/node-scripts.md` (the editable source; `.claude/rules/` and `.cursor/rules/` are its generated outputs) already states the binding rules: exec form, `shell: false`, hooks exit 0 on a missing service, a 1 s hook imports nothing heavy, and every file `hooks.json` names must ship with a test that resolves it. The spec work is to turn those into scenarios, not to invent policy.
- The source pack's 31 hook ids are the upper bound of scope, not the target. Most are for services this project does not ship (`pk-health`, `memory-outbox-flush`, sycophancy artifacts). README §4.3 already classifies them; that classification is an input to analyze, and it needs re-checking against what now exists rather than being taken on trust.

BUILD HEALTH
- tests: PASS — `npm test` → 88 tests, 87 pass, 1 skipped (the win32-only test, correctly skipped on macOS), 0 fail.
- build check: PASS — `npm run check` → 19 files current.
- specs: PASS — `npm run spec:validate` → 7 passed, 0 failed.
- constraints, automated: PASS — 10 of 13 have a `check:` expression; all 10 run clean (each executed, none printed a match).
- constraints, manual: `no-symlinks` is now **mechanically checked** — `git ls-files -s` counting mode `120000` → 0, portable and policy-compliant. That check should replace the constraint's "no portable one-line check exists" note; it is a small task for plan. `exactly-two-services` and `reference-repo-untouched` remain **UNCHECKED**: unverified assertions, not results.
- CI: green on the last run across six jobs.

CONSTRAINT CHECK
- AGENTS.md violations: NONE observed.
- `constraints.md` violations: none found by the 10 automated checks. The three manual ones are listed above as unchecked rather than passing. `compose-ports-loopback-only` passes vacuously: `docker/` does not exist.

GOAL PROGRESS
- Re-review the four unreviewed fixes: NOT MET — not started, blocks everything else.
- `hooks.json` + `hook-entry.mjs` in-process dispatch: NOT MET.
- Manifest-resolution test: NOT MET.
- Hooks exit 0 on a missing service: NOT MET.
- Cold start measured on `windows-latest` against 1 s: NOT MET — macOS baseline exists (59 ms median with imports), Windows unmeasured.
- Windows exit evidence with named asserting tests: NOT MET.
- Process goals: counts are now command-sourced in this document, after review pointed out that four were not. Self-review by mutation and the artifact-refiner decision are open.

RISKS AND OPEN QUESTIONS FOR ANALYZE / PLAN
1. **The 1 s budget looks comfortable but is unmeasured where it matters.** 59 ms median on macOS is ~6% of budget; Windows process creation is materially slower, and CI runners are noisy. The risk is not the median but the tail — a p99 spike under antivirus. Plan should measure repeatedly on `windows-latest` and record a distribution, not a single number. If it does not fit, the honest move is to raise the budget (it is ours to set) rather than reach for a compiled dispatcher, which C7 forbids.
2. **Which hooks to port at all is undecided.** 31 ids exist upstream; most serve services this project does not ship. Porting all 31 would be scope creep; porting too few leaves the KBD loop without its lifecycle signals. Analyze must produce the list with a reason per id, re-derived from what exists now.
3. **A hook has no test harness yet.** Every hook is a process started by a harness with JSON on stdin. Testing means spawning it — which `lib/platform/spawn.mjs` already does, and which the coverage reporter already handles for child processes. That machinery exists; the gap is a fixture convention.
4. **Harness coverage is unverified beyond Claude Code.** Exec-form hooks with `${CLAUDE_PLUGIN_ROOT}` come from the source pack's Claude Code configuration. The other harnesses are configured here for skills, commands and rules only — `.agents/skills/`, `.cursor/{commands,rules,skills}/`, `.opencode/{commands,skills}/` exist at HEAD (`git ls-tree`); none has a hooks directory. Whether they support this contract at all is an open question, carried from README §9.
5. **Goal 1 is a dependency, not a formality.** The four unreviewed fixes are in `lib/platform/`, which every hook imports. Reviewing them after building on them would invert the order that made them worth reviewing.
6. **The QA gate contract is still wrong.** `execution.md` for the last phase was corrected, but the decision — artifact-refiner in or out — is the operator's and is unmade. It should be settled before `/kbd-execute`, not discovered mid-phase again.

ADVERSARIAL REVIEW
- Round 1 (judge kbd-judge, rest-gateway, cross_model_check verified-distinct, producer claude-opus-5):
  BLOCK — 1 CRITICAL, 3 WARNING, all accepted. The CRITICAL ("`.claude/rules/node-scripts.md` does not
  exist") was an artifact of MY packet filter, which excluded `.claude/`, `.cursor/`, `.opencode/` and
  `.agents/`; all four exist at HEAD. The assessment was corrected anyway to cite the editable source
  `rules/src/project/node-scripts.md`, which is the better citation. The three WARNINGs were right:
  four counts had no producing command, the harness claim named no paths, and manual constraints were
  presented as passing.
- Round 2 (same judge, verified-distinct): BLOCK — 1 CRITICAL, 1 WARNING, both accepted. The CRITICAL
  was again my packet: its `goals` field still held `platform-foundation`'s goals, cloned from the
  packet I based it on. The artifact embeds this phase's goals correctly; the packet field was stale.
  The WARNING found a real inconsistency — my provenance cited `find`, `grep -c`, `wc -l` and `test -e`,
  which this project's own command policy forbids. Every count was re-derived with `node` and
  `git ls-files` and is unchanged. That work also produced a portable symlink check the constraint
  file says does not exist.
- Two rounds is the cap. The round-2 fixes are **UNREVIEWED**.

UNRESOLVED REVIEW FINDINGS (carried forward verbatim)
- [CRITICAL, round 2] "The assessment is scoped to hook-entry-node-only goals while the packet's
  authoritative `goals` field is the platform-foundation goal set." — a packet defect, not an artifact
  defect: `goals.md` for this phase is embedded in the packet body and is what the assessment assesses.
  Fixed in the packet after the review; unreviewed. The hand-assembly that causes this class of error is
  tracked in `.prometheus/gotchas.md` and is a task in the `adversarial-review-node` phase.

ASSESSMENT COMPLETE
