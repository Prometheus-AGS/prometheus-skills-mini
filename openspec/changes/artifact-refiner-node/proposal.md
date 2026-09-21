## Why

`platform-foundation/reflection.md` Delta 2 recorded that `execution.md` promised a QA gate —
`/refine-validate` before every adversarial review, writing to `.refiner/artifacts/` — that **never ran
once in six changes**. The substitution was made silently. Corrective action 3 left the operator a
decision: wire artifact-refiner in, or drop it from the contract.

**Operator decision, 2026-09-21: artifact-refiner is IN**, and must work on Windows without WSL.

Upstream (`GQAdonis/artifact-refiner-skill`) is POSIX-only where it is executable: 39 `.sh` (5,357 lines), three of
the four state scripts invoking `python3`, plus two `python3` blocks in the agent the gate dispatches.
C1, C3 and C4 forbid all of it here.

## What the port actually is — measured, not estimated

Counts from `git ls-files` and `wc -l` (newline-terminated lines) in the upstream submodule.
An earlier draft used `split('\n').length`, which counts a trailing newline as an extra line and
inflated every figure by one per file; the numbers below are the corrected `wc -l` counts.
"Installers" is every `.sh` matching `install` — 16 under `scripts/installers/` plus
`scripts/install-template-forge.sh`.

| Category | Files | Lines | Reachable from the refinement loop? |
|---|---|---|---|
| Scaffolders | 7 | 2,879 | Only from `scaffold-*` skills and `refine-mcp-ui` |
| Installers | 17 | 1,540 | Not referenced by the skill payload — but `README.md` documents them as the install path, including for claude-code |
| **Core loop + validation** | **10** | **661** | **Yes** — `SKILL.md` invokes 5; validation and session scripts add 5 |
| `lib/kebab-case.sh` | 1 | 86 | Scaffolders only |

Already Node upstream: **19 `.mjs`, 4,501 lines** — these need a Windows *review*, not a port.

The decisive finding: **`refine-validate`, the skill the KBD QA gate invokes, references no shell script
at all.** It is instructions plus two JSON schemas. The gate itself is nearly free; the work is the
state lifecycle beneath it.

Every `python3` call is `json.load`/`json.dumps` or `uuid.uuid4()` — `JSON.parse`/`JSON.stringify` and
`crypto.randomUUID()` in Node. The port is mechanical, not a rewrite.

## What Changes

- Port the **661-line core** to `lib/refiner/`: state lifecycle (init, checkpoint, finalize, provider
  resolution), workflow dispatch, manifest and constraint validation, session finalize, reflection log.
  No `.sh`, no `python3`, no `jq`, `sed`, `grep`, `awk`, `date -u`, `mktemp` or `curl`.
- Carry over all **20 sub-skills**, **5 agents** and **11 schemas**, rewriting the two `python3` blocks
  in `agents/artifact-validator.md` as Node.
- **Carry the 19 `.mjs`** from the upstream submodule into this project — they are upstream files, not
  files this project already has. An earlier draft called them "19 existing `.mjs`", which was false
  here: this project has exactly two `.mjs` under `scripts/` (`spec-validate.mjs`,
  `coverage-report.mjs`). Without carrying them, the Windows review below would edit absent files.
- Review the carried `.mjs` for Windows hazards and fix the one found:
  `scripts/lib/model-routing.mjs:36` resolves `scripts/check-openai-proxy-health.sh` and runs it with
  `execSync`. Replaced with a Node fetch against the configured `health_probe` URL.
- Wire `/refine-validate` into the QA gate so `execution.md`'s contract and reality agree.

## Decisions

- **Scaffolders and installers are not ported in this change.** Installers are unreferenced by the skill
  payload and target harnesses this project does not ship. Scaffolders are 2,879 lines of React/Vite/
  Tauri/Flutter project generation — a different problem from the QA gate, and porting them would dominate a phase whose named goal is hooks. A `scaffold-*` skill that survives must call Node or be
  **marked unavailable rather than silently broken**. Recorded as a follow-up change, not smuggled in.
- **`openai-proxy` is not a third service.** The probe URL is configurable via `model_policy` in
  `project.json` and §P permits exactly two services; in this port the probe points at the liter-llm
  gateway. No new daemon, no new port. (An earlier draft also claimed "no `.mjs` imports
  `model-routing.mjs`". That is false — there are two importers, named in `design.md` — and it is not
  needed for the no-third-service conclusion.)
- **`$HOME` is never read directly.** `state-resolve-provider.sh` reads `$HOME/.refiner/provider.json`;
  the Node port uses `lib/platform/paths.mjs`, which is the only module allowed to call `os.homedir()`.

## Capabilities

### New Capabilities
- `refiner/qa-gate`: the Node state lifecycle, the validation contract, the degradation rule, and the wiring into the KBD QA gate.

## Impact

- New `lib/refiner/`; the carried skill payload into `.claude/skills/` and `.claude/agents/`; the 19
  carried `.mjs` into `scripts/` and `scripts/lib/`; edits
  `scripts/lib/model-routing.mjs` (health probe) and `.kbd-orchestrator/phases/<phase>/execution.md`
  (the QA gate contract, task 7.1). `execution.md` is declared here because an undeclared edit to it is
  the same class of drift that produced Delta 2.
- Consumes `lib/platform/` (paths, text, atomic-write, lock, spawn) and re-implements none of it.
- **Sequenced after `hook-entry-node-only`.** The two share `lib/platform/` but no files, so this is an
  ordering choice, not a dependency: hooks are the phase's named goal and carry the 1 s-budget unknown.
- The gate applies from this change's own completion onward — it does not retroactively gate the hooks.

## Non-goals

- Porting the 7 scaffolders or the 16 installers as bash, or rewriting them here.
- The image/logo rendering paths beyond a Windows review of the existing `.mjs`.
- Editing `.kbd-orchestrator/project.json` or `constraints.md` — reserved to `/kbd-init`.

## Unresolved review findings

Two adversarial rounds ran; the cap is 2. Round 1: 2 CRITICAL, 3 WARNING, 2 SUGGESTION. Round 2:
2 CRITICAL, 1 WARNING, 1 SUGGESTION — **all new, none a repeat**. Every finding was accepted and fixed.
Details in `.kbd-orchestrator/phases/hook-entry-node-only/review/spec-r2/findings.json`.

**The round-2 fixes are UNREVIEWED.** The cap is spent, so they were self-reviewed instead: every
corrected count recomputed with `wc -l`, the carry premise checked against this project's actual
filesystem, the six `.mjs`-only skills derived with `comm`, and the MODIFIED delta re-checked for
regression. That is weaker than a review and is recorded as such.

**Root cause of both round-2 CRITICALs, fixed at the source:** I described 19 `.mjs` as "existing" and
specced a review of them. They exist *upstream*; this project has two. Nothing carried them, so tasks
edited absent files and a `.sh`-only scan let six `.mjs`-only skills through. Recorded in
`.prometheus/gotchas.md`: when porting, every "existing" claim must name which repository, and a file
path in a task is a claim that the path resolves **here**.

**Carried, not resolved:**
- Scaffolders (7 files, 2,879 lines) and installers (17 files, 1,540 lines) are deliberately not ported.
  Skills that name an unported script — of any extension — must declare themselves unavailable.
- **Judge caveat:** same model family as the producer (gateway auth failure). Weaker than cross-model.
