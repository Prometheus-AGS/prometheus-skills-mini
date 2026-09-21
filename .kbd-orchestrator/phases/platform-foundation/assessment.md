ASSESSMENT: platform-foundation
Project: prometheus-skills-mini
Date: 2026-09-21
Codebase baseline: 407 lines of Node ESM in rules/ (a rules renderer and its tests), plus documentation and configuration. No phase goal is fully implemented; three have no deliverable at all (lib/platform, CI, Windows evidence) and two have partial pre-existing capability that was not built for this phase (a working node:test runner without package.json; CRLF handling in one untested line).
Cross-tool progress: none

IMPLEMENTATION STATUS
- lib/platform (paths, atomic write, lock, spawn): MISSING — no lib/ directory exists. The only platform-like code is a private writeAtomic in rules/build.mjs:54-59 (temp file + renameSync, no retry). It will become a duplicate the moment lib/platform lands.
- node:test harness: PARTIAL — 20 node:test tests pass by auto-discovery. There is no package.json, so no engines field, no test/check scripts, and nothing declares that Node >= 22 is required.
  - Arrange-Act-Assert: PARTIAL — all 20 tests in rules/test/render.test.mjs follow arrange / act / assert order, but none carries the explicit // Arrange // Act // Assert markers the project convention shows (0 of 20). Whether the markers are required is undecided.
  - Tests written first: UNVERIFIABLE from the repository — there are no commits, so no history orders tests before code. The only evidence is this session's transcript (the suite was run and failed on the missing module before rules/lib/render.mjs was written). rules/build.mjs was written with no test at all, so for that file the answer is NO.
- Three-OS CI: MISSING — no .github/ directory. Blocked below the code level: `git log` answers "your current branch 'main' does not have any commits yet" and `git remote -v` prints nothing (git init was run on 2026-09-20, after constraints.md was generated — its sentence "this directory is not a git repository" was stale and has been corrected). With no commit and no remote, no hosted CI can run.
- .gitattributes: MISSING — core.autocrlf is unset on this machine; no CRLF exists in the tree today, which says nothing about a Windows checkout.
- Parsers tolerate CRLF on input: PARTIAL, and fragile — the repository has exactly one family of parsers, the rules renderer:
  - parseConf (rules/lib/render.mjs:25) splits on /\r?\n/ — tolerant, and covered by one test.
  - routingLayer0 (render.mjs:45-51) — tolerant in a direct probe (cells are trimmed), no test.
  - splitFrontmatter (render.mjs:36) — **REJECTS CRLF**: probed directly with a CRLF rule file it throws "has no paths: frontmatter", because its pattern requires a bare \n after ---.
  - countLines (render.mjs:20) counts \n only — correct for CRLF, no test.
  - The build survives CRLF sources today only because readText in rules/build.mjs:18 replaces \r\n before anything is parsed. That single line is in the file with 0% coverage, so the repository's CRLF tolerance is untested end to end, and any new caller of render.mjs that skips readText breaks on a Windows checkout.
  - No other parser exists yet. lib/platform has no read helper, so every future parser would have to rediscover this.
- Windows exit evidence: MISSING — not one behaviour in this repository has been observed on Windows. Every Windows claim in README.md, CLAUDE.md and the path rules is reasoning from macOS.

CROSS-TOOL PROGRESS
- NONE — progress.json was last written by kbd-new-phase; no change is recorded by any tool. (A Codex session is active on this machine, but in prometheus-skill-pack, not in this repository.)

SPEC GAP SUMMARY
- openspec/specs/ is empty and no OpenSpec change exists for this phase. The goals trace to README section 8 item 1 and .claude/rules/node-scripts.md, not to a spec. A-17 requires the plan to be an OpenSpec change; none has been proposed.
- Implemented but unspecified: the whole rules/ renderer, .kbd-orchestrator/ and .prometheus/. No spec covers them.
- README section 5.1 puts tests in a root tests/ directory; the only tests that exist are colocated in rules/test/. The layout is undecided and the two documents disagree.
- CLAUDE.md section 0 tells every agent to read versions.toml and .prometheus/decisions.md at bootstrap. Neither file exists.

BUILD HEALTH
- build check: PASS — node rules/build.mjs --check (17 files current, CLAUDE.md 57/120 lines).
- tests: PASS — node --test, 20/20.
- specs: UNKNOWN — openspec validate reports "No items found to validate"; it passes vacuously.
- known violations: NONE found by the nine automated checks in constraints.md; the symlink check is manual and found none.
- test coverage: PARTIAL — Node reports 98.74% lines, but only for rules/lib/render.mjs. rules/build.mjs (107 lines: drift detection, stale-file deletion, atomic write) is imported by no test and is absent from the report, i.e. 0%. By file size that is roughly 159 of 266 lines; the true figure was not measured. The 80% convention is not demonstrated.

CONSTRAINT CHECK
- AGENTS.md violations: NONE observed.
- constraints.md violations: NONE. Three blocking constraints have no mechanical check (no-symlinks, exactly-two-services, reference-repo-untouched), and compose-ports-loopback-only passes only because docker/ does not exist yet.

GOAL PROGRESS
- lib/platform: NOT MET — nothing exists.
- node:test harness + package.json: PARTIAL — runner works; package.json, engines and scripts absent; build.mjs untested.
- Three-OS CI: NOT MET — and cannot start without an owner decision on a remote.
- .gitattributes + CRLF tolerance: NOT MET — no .gitattributes; tolerance exists in one untested line and one parser rejects CRLF outright.
- Exit evidence on windows-latest: NOT MET — depends entirely on the CI goal.

RISKS AND OPEN QUESTIONS FOR ANALYZE / PLAN
1. CI needs a remote, and creating or pushing to one is an outward-facing act the agent must not take on its own (A-16). Until the owner decides, goal 3 and goal 5 are blocked, and goal 5 gates the phase.
2. Ordering: the EPERM/EBUSY retry and the .cmd shim resolution are admissible under A-2 only as explicit requirements; neither failure has been observed here. If they are written before windows-latest CI exists, their correctness is unverifiable at every tier available on this machine. CI should land first.
3. A-9 forbids testing code not wired into the call graph. lib/platform has no consumer. The only candidate is rules/build.mjs adopting its atomic write, which must be decided in plan, not discovered in execute.
4. The host runs Node v26.5.0 through fnm, which is a Current release, not LTS. Local green results do not show that anything works on Node 22 or 24. The CI matrix must pin LTS versions; nothing local does.
5. The KBD tooling driving this phase is the installed bash + jq original. This phase cannot be run through KBD on Windows at all until kbd-state-core lands several phases from now; "Windows-native" is unverified for the process itself as well as for the code.
6. Every KBD hook in this phase fails its memory mirror write (3 s client timeout against 1.7-5.4 s writes) and memory recall returned a stub. Lifecycle events from this phase are not reaching surreal-memory. Cause and reproducer: .prometheus/postmortems/2026-09-20-surreal-memory-mirror-write-failed.md. Upstream, not fixable here.
7. project.json model_policy still carries template defaults (frontier = claude-sonnet-4-6, local Qwen entries); the hosting model for this assessment was Claude Fable 5.1. Owner decision outstanding.

PROVENANCE — every measurement above, with the command that produced it (run 2026-09-21 UTC, macOS, Node v26.5.0)
- line counts: wc -l over every *.mjs outside .git → build.mjs 107, render.test.mjs 141, render.mjs 159, total 407.
- tests: node --test → tests 20, pass 20, fail 0.
- coverage: node --test --experimental-test-coverage → render.mjs 98.74% lines / 90.00% branches, uncovered 154-155; build.mjs absent from the report.
- build: node rules/build.mjs --check → exit 0, "17 files current".
- specs: openspec validate --all --no-interactive → "No items found to validate"; openspec list → "No active changes found".
- constraints: each check: command in constraints.md executed; all nine exited 1 (no match). find . -type l outside .git → no output.
- git: git log → no commits; git remote -v → empty; git config --get core.autocrlf → empty.
- node: node --version → v26.5.0, resolved through an fnm shim; ~/.nvm holds v22.20.0 and v24.16.0.
- CRLF: direct node -e probes of splitFrontmatter and routingLayer0 with \r\n input.
- presence: test -e for lib, lib/platform, package.json, .gitattributes, .github, scripts, hooks, tests, versions.toml, tasks/todo.md → all missing.
None of these outputs is stored in the repository; they are this session's observations and should be re-run, not trusted, by the next stage.

ADVERSARIAL REVIEW
- Round 1 (judge kbd-judge via rest-gateway http://localhost:8181/v1, cross_model_check verified-distinct, producer claude-fable-5-1): BLOCK — 1 CRITICAL (CRLF tolerance not assessed), 3 WARNING (AAA / tests-first not assessed; git-state claim inconsistent with constraints.md; measurements without provenance). All four accepted as correct and addressed above.
- Round 2 (same judge, verified-distinct): BLOCK — 1 CRITICAL, 2 WARNING. One WARNING accepted and fixed (the baseline sentence contradicted the PARTIAL ratings). The CRITICAL and the other WARNING are rejected with evidence — see "Unresolved review findings". Two rounds is the cap; no third round was run.
- The anti-theater gate on the judge's report did NOT run: check-findings-sycophancy.sh reported "sycophancy.sh lib not found — gate skipped".

SYCOPHANCY REVIEW
- detect_sycophancy, strictness standard, domain project_assessment: score 0.0, no patterns. Response saved to sycophancy/assess-2026-09-21T02-42-00Z.json.

UNRESOLVED REVIEW FINDINGS (round 2, carried forward verbatim per the two-round cap)
- [CRITICAL] "The assessment treats an existing rules renderer and node:test suite as present, but the packet file tree does not contain the cited implementation or test files." Evidence given by the judge: "The file_tree lists ./rules/lib and ./rules/test only as directories and lists no ./rules/lib/render.mjs or ./rules/test/render.test.mjs." Recommended fix: "either include the missing files in the packet/tree evidence or remove/qualify all claims about render.mjs, render.test.mjs, test counts, coverage, and CRLF parser behavior derived from them."
  - Producer response: the files exist — rules/lib/render.mjs is 7190 bytes and rules/test/render.test.mjs is 6331 bytes on disk. The judge could not see them because adversarial-review/scripts/build-review-packet.sh builds file_tree with `find . -maxdepth 2` (line 200), and both files sit at depth 3. The finding is correct about the packet and wrong about the repository. The claims stand; the next stage should re-run the PROVENANCE commands rather than take either side's word.
- [WARNING, same cause] "The cross-tool progress finding cites progress.json even though the packet tree contains no such file." — .kbd-orchestrator/phases/platform-foundation/progress.json exists (1094 bytes) at depth 4.
- Consequence for later stages: any artifact-mode review of this repository will raise the same false CRITICAL for every file deeper than two levels, which is where all of lib/<capability>/ will live. That is an upstream limitation of the packet builder, not something this repository can fix.

ASSESSMENT COMPLETE
