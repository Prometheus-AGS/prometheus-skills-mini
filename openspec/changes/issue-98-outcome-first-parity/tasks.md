# Tasks

Each group is one pull request. Run its boundary packet once, at the end of the
group: `npm run check`, `npm run check:distribution`,
`npm run check:selected-method`, `npm run check:contract-templates`,
`npm run validate:strict`, `npm run spec:validate`, `npm test`.

## 1. Outcome-first text

- [x] 1.1 Rewrite "Which change am I on" in `skills/kbd-apply/SKILL.md` to state the adopted outcome, last evidence and next authorized action first, keep runtime order as ordering inside the adopted slice, and add helper-absent and legacy-plan wording; verify by reading the section against the first four requirements of `kbd-outcome-first-execution`
- [x] 1.2 Rewrite `skills/kbd-goal-check/SKILL.md` examples, patterns and CONTINUE step to judge the oracle and evidence, remove test-count / next-unchecked-task examples and the `goal.json`, `STATE.md`, `TASKS.md`, `.goal-run` references; verify no such string remains in the file
- [x] 1.3 Add the opt-in outcome-ranked scope (ranking order, hard dependencies) to `skills/kbd-plan/SKILL.md` and `skills/kbd-assess/SKILL.md`; verify the packaged example command lines are unchanged
- [x] 1.4 Add outcome and next-authorized-action presentation to `skills/kbd-resume/SKILL.md`, `skills/kbd-status/SKILL.md`, `skills/kbd-execute/SKILL.md` and `lib/kbd/handoff/packet.mjs` without touching the shared selected-method section; verify with `npm run check:selected-method` and `scripts/kbd-handoff.test.mjs`
- [x] 1.5 Add the tier sentence to `skills/kbd-process-orchestrator/references/boundaries.md` and the outcome-first line to `skills/prometheus-context-bootstrap/references/AGENTS.base.md`; verify `lib/context-bootstrap/resident-budget.test.mjs` still passes
- [x] 1.6 Run `npm run build:distribution`, add a CHANGELOG entry, and run the boundary packet; verify the six check commands exit 0 and `npm test` has no failure that is absent on `main` (2026-11-26: checks exit 0; `npm test` fails 128 of 1399 identically with and without this slice, so it does not exit 0 on `main` either)
- [ ] 1.7 Load the packaged `kbd-apply` and `kbd-goal-check` in a scratch project with and without the `prometheus` helper and confirm the stated outcome and next action, and that an adopted legacy plan is unchanged; record the result in the pull request

## 2. Bounded memory lookup

- [x] 2.1 Create `lib/kbd/recall.mjs` (one Surreal lookup keyed to outcome and blocker, one `pk search` fallback with timeout, always resolves, its own untrusted fence) with `lib/kbd/recall.test.mjs` covering: Surreal hit, Surreal down then `pk`, both down, `pk` absent; verify the test file passes
- [x] 2.2 Add `--outcome` and `--blocker` to `scripts/kbd-memory-recall.mjs`, keeping pre-assess behaviour, and add a `--screen` mode that screens a lesson for promotion with `secretPattern()`; verify existing recall tests and a new secret-refusal test pass
- [x] 2.3 Add the recall rule (when, once, evidence not instruction, record how it changed the next action, safe promotion) to `skills/kbd-apply`, `kbd-execute`, `kbd-resume` and `kbd-memory-recall` SKILL.md; verify against the three memory requirements
- [x] 2.4 Add `scripts/kbd-memory-recall.mjs` to the payload list in `lib/distribution/package-builder.mjs` (its imports, including `lib/kbd/memory.mjs` and `lib/kbd/recall.mjs`, follow by closure); verify the script and those two modules exist under `dist/plugins/claude` and `dist/plugins/codex` after `npm run build:distribution`
- [x] 2.5 Add a CHANGELOG entry and run the boundary packet; verify the six check commands exit 0 and `npm test` has no failure that is absent on `main` (2026-11-26: checks exit 0; `npm test` 1408 tests, the same 128 failures as `main`, 9 new tests pass)

## 3. Advisory blockers and installed-rules audit

- [x] 3.1 Create `lib/kbd/blocker-advice.mjs` (pure classifier) with tests for: approval wait not counted, running job not counted, new evidence resets, two completed same-blocker attempts yield one of four dispositions; verify the test file passes
- [x] 3.2 Add an `advise` mode to `scripts/kbd-bottleneck-detector.mjs` that works without the `prometheus` guard, update `skills/kbd-bottleneck-detector/SKILL.md`, and add the script and its modules to the payload list; verify `scripts/kbd-bottleneck-detector.test.mjs` passes and the script exists in both `dist` packages
- [x] 3.3 Add a separate read-only `audit-rules.mjs` beside the existing-project script (which the active `mini-bootstrap-existing-project-goals` phase pins and this change does not edit) to report nested instruction files, harness rule directories, linked worktrees, outcome-policy conflicts and installed version, read-only; verify with a new integration test that asserts the working tree is unchanged and both versions are reported
- [x] 3.4 Document the audit output in `skills/prometheus-context-bootstrap/SKILL.md`, add a CHANGELOG entry and run the boundary packet; verify the six check commands exit 0 and `npm test` has no failure that is absent on `main`

## 4. Qualification evidence

- [x] 4.1 Add opt-in cases to `evals/vlbv-protocol/cases/` for scope dilution, mixed product/fixture failure, approval wait, release setup failure, quiet running build, and the four memory behaviours; verify the corpus loads and unknown case IDs still fail
- [x] 4.2 With operator go-ahead, run the cases against the installed Mini entry point on one full-capability harness and one fallback with no `prometheus` helper; store receipts under this change's `receipts/` directory and report each case as PASS, FAIL, BLOCKED or NOT_EXERCISED
- [ ] 4.3 Evaluate the opt-in outcome-ranked scope on one new phase and record the comparison; verify no default was changed
- [x] 4.4 Record the Full comparison as NOT_EXERCISED with its reason in the receipts

## Workflow follow-up

- Operator decides whether #98 closes on Mini evidence or waits for Full #256.
- Archive the change after the fourth pull request merges.
