## 1. State lifecycle in Node

- [ ] 1.1 RED: write `lib/refiner/state.test.mjs`: a fresh init generates a refinement id and writes atomically; an existing non-finalized state resumes rather than being truncated; a finalized state starts a new cycle recording the prior id; no `os.homedir()` or `process.env.HOME` in `lib/refiner/`. Run `node --test <that file>`, see it FAIL, commit the failing test alone and paste the output.
- [ ] 1.2 GREEN: implement `lib/refiner/state.mjs` (init, checkpoint, finalize) until the tests pass, replacing `state-init.sh`, `state-checkpoint.sh` and `state-finalize.sh`. Use `crypto.randomUUID()` and `toISOString()`; write through `lib/platform/atomic-write.mjs`; read through `lib/platform/text.mjs`. Under 500 lines.
- [ ] 1.3 Self-review by mutation: revert the resume branch and confirm the resume test fails.
- [ ] 1.4 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(refiner): state lifecycle in Node, no bash or python`. Do not push.

## 2. Provider resolution

- [ ] 2.1 RED: write tests for the waterfall — env var beats project-local beats global — and that the home directory comes from `lib/platform/paths.mjs`. See them FAIL; commit alone; paste the output.
- [ ] 2.2 GREEN: implement `lib/refiner/provider.mjs` replacing `state-resolve-provider.sh` (which uses `grep` and reads `$HOME` directly) until the tests pass.
- [ ] 2.3 Commit locally with an `Assisted-by` trailer: `feat(refiner): resolve the provider without grep or $HOME`. Do not push.

## 3. Validation — replacing the two python3 blocks

- [ ] 3.1 RED: write tests for a manifest missing a required field, a manifest naming an absent file, a zero-byte referenced file, and a valid manifest. See them FAIL; commit alone; paste the output.
- [ ] 3.2 GREEN: implement `lib/refiner/validate.mjs` until the tests pass, replacing `validate-manifest.sh`, `validate-constraints.sh` and both `python3` blocks in `agents/artifact-validator.md`.
- [ ] 3.3 Rewrite those two blocks in the carried `agents/artifact-validator.md` to call the Node validator. Confirm no `python3` remains in any carried agent or skill file.
- [ ] 3.4 Self-review by mutation: revert the zero-byte check and confirm its test fails.
- [ ] 3.5 Commit locally with an `Assisted-by` trailer: `feat(refiner): validate manifests and constraints in Node`. Do not push.

## 4. Dispatch, session finalize and the reflection log

- [ ] 4.1 RED: write tests for workflow dispatch and session finalize, including exit 0 with a degraded result when a service is unreachable. See them FAIL; commit alone; paste the output.
- [ ] 4.2 GREEN: implement the Node replacements for `workflow-dispatch.sh`, `post-execute-check.sh`, `finalize-session.sh` and `log-reflection.sh` until the tests pass.
- [ ] 4.3 Commit locally with an `Assisted-by` trailer: `feat(refiner): dispatch and session finalize in Node`. Do not push.

## 5. Carry the skill payload

- [ ] 5.1 Copy the 20 sub-skills, 5 agents and 11 schemas into this project's skill and agent directories, **and carry the 19 `.mjs`** into `scripts/` and `scripts/lib/`. These are upstream files: this project has only `scripts/spec-validate.mjs` and `scripts/coverage-report.mjs`, so without this step section 6 would review and edit files that do not exist here.
- [ ] 5.2 Rewrite the **six** carried skills that instruct an agent to run a `.sh` so each states it is unavailable in this project and names the follow-up change: `refine-mcp-ui` (a `refine-*` skill, not a scaffolder — it runs `bash scripts/scaffold-react-vite-mcp-ui.sh`), `scaffold-react-vite`, `scaffold-react-vite-a2ui`, `scaffold-react-vite-agui`, `scaffold-react-vite-tauri`, `scaffold-flutter-a2ui`. Identify by the property (implementation not ported), never by name prefix. Command: `git grep -ln '\.sh' -- skills/ agents/`.
- [ ] 5.3 Mark unavailable the six skills that name only an unported `.mjs` — `convert-htmx-pdf`, `convert-htmx-react`, `convert-md-to-htmx`, `design-svg-logo`, `rebrand-artifact`, `refine-moodboard` — if their scripts are not carried in 5.1. Command: `comm -23 <(git grep -ln '\.mjs' -- skills/ | sort) <(git grep -ln '\.sh' -- skills/ | sort)` run in the upstream submodule.
- [ ] 5.4 RED/GREEN: write a test asserting that every script path a carried skill or agent instructs an agent to run — **any extension** — resolves in this project, unless that skill declares itself unavailable; and that no carried file invokes `python3`. A `.sh`-only scan passes a broken `.mjs` skill, which is the defect this test exists to catch. See it fail against the unedited copies; make it pass.
- [ ] 5.5 Commit locally with an `Assisted-by` trailer: `feat(refiner): carry the skill payload with unported skills marked unavailable`. Do not push.

## 6. Windows review of the 19 carried .mjs

- [ ] 6.1 Review all 19 carried files for `/tmp` literals, `process.env.HOME`/`USERPROFILE`, `shell: true`, `.cmd`/`.bat` assumptions and `.sh` references. Record what was checked and what was found — a review that reports nothing must say what it looked for.
- [ ] 6.2 RED: write a test asserting no `.mjs` resolves or executes a `.sh`; see it FAIL on `scripts/lib/model-routing.mjs:36`; commit alone; paste the output.
- [ ] 6.3 GREEN: replace the `execSync` of `check-openai-proxy-health.sh` with a Node fetch against the configured `health_probe` URL, pointed at the liter-llm gateway. Confirm no third service or port is introduced.
- [ ] 6.4 Review the two live importers of `model-routing.mjs` — `scripts/lib/openai-client.mjs:21` (`resolvePhase`, the LLM call path) and `scripts/model-routing-probe.mjs:13` (`resolveAllPhases`) — and add a test asserting that an unhealthy or unreachable probe yields a decision with `healthy: false` and a reason rather than a throw. The behaviour exists upstream; the test is what keeps it.
- [ ] 6.5 Commit locally with an `Assisted-by` trailer: `fix(refiner): probe endpoint health in Node, not curl via bash`. Do not push.

## 7. Wire the gate and close Delta 2

- [ ] 7.1 Update the QA gate contract so `execution.md` names the gate that actually runs: `/refine-validate` before the adversarial review, writing to `.refiner/artifacts/<change-id>/`.
- [ ] 7.2 State explicitly in the change record that the gate applies from this change's completion onward and did not retroactively gate `hook-entry-node-only`.
- [ ] 7.3 T2 at change completion: `node --test`, `node rules/build.mjs --check`, `node scripts/spec-validate.mjs`. State which tier ran (A-6, A-9).
- [ ] 7.4 Commit locally with an `Assisted-by` trailer: `feat(refiner): wire the QA gate into the KBD contract`. Do not push.
