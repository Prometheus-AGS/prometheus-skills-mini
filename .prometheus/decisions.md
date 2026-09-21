
## 2026-09-21 — artifact-refiner is IN the QA contract, and is ported to Node

**Decision (operator, 2026-09-21):** artifact-refiner joins the QA gate rather than being dropped from
it. This closes the question left open by `platform-foundation/reflection.md` corrective action 3,
where `execution.md` promised a gate that never ran. It must work on Windows without WSL.

**What the port actually requires — measured, not assumed:**

- The upstream repo (`GQAdonis/artifact-refiner-skill`, submodule at
  `prometheus-skill-pack/skills/imported/artifact-refiner`) has **555 tracked files, 39 `.sh`, 0 `.py`**.
  Most of the shell is harness installers and scaffolders the mini port does not need.
- **`refine-validate` — the skill the KBD QA gate actually invokes — references no shell script at all.**
  It is instructions plus two JSON schemas. This is the reason the port is small.
- The `.sh` dependency is confined to the **state lifecycle**: `state-init.sh` (105), `state-checkpoint.sh`
  (47), `state-finalize.sh` (57), `state-resolve-provider.sh` (45) = **254 lines of bash**.
- **Correction to an earlier statement in this session:** I reported "zero Python" on the strength of
  `git ls-files '*.py'` returning 0. That was wrong as a dependency claim. Three of the four state
  scripts *invoke* `python3` from inside bash, and so does `agents/artifact-validator.md` (2 blocks).
  A file-extension count does not measure an interpreter dependency.
- Every `python3` call is JSON read/write or UUID generation — `JSON.parse`/`JSON.stringify` and
  `crypto.randomUUID()` in Node. The port is mechanical, not a rewrite.
- Other POSIX deps found: `date -u` (3 scripts) → `toISOString()`; `sed` (state-finalize) and `grep`
  (state-resolve-provider) → string ops. All forbidden by the project's own command policy anyway.

**Consequence for `hook-entry-node-only`:** this is a second change in the phase, not a blocker on the
hook work — the two share `lib/platform/` but no files. The gate it enables applies from its own
completion onward.

### Scoping the "full skill port" — measured triage, 2026-09-21

Operator chose **full skill port**, sequenced **after the hooks in this phase**. Measuring what that
means before speccing it, because the literal reading (39 `.sh`, 5,396 lines) overstates the work by
about 5x and most of it is not artifact refinement:

| Category | Files | Lines | Reachable from the refinement loop? |
|---|---|---|---|
| Scaffolders | 7 | 2,886 | Only from scaffold-* skills and `refine-mcp-ui`; `scaffold-react-vite.sh` alone is 1,200 lines that generate a React/Vite starter |
| Installers | 16 | 1,496 | **No** — unreferenced by `agents/`, `skills/`, `prompts/` and `SKILL.md`. Target harnesses this project does not ship |
| **Core loop + validation** | **10** | **671** | **Yes** — `SKILL.md` invokes exactly 5 (`state-init`, `state-checkpoint`, `state-finalize`, `state-resolve-provider`, `workflow-dispatch`), plus the validation and session scripts |
| lib | 1 | 86 | `kebab-case.sh` — used by scaffolders |

Already Node: **19 `.mjs`, 4,520 lines.** These need a Windows *review*, not a port. A hazard scan
(`/tmp` literals, `process.env.HOME`, `shell: true`, `.sh` references) found exactly one:
`scripts/lib/model-routing.mjs:36` resolves `scripts/check-openai-proxy-health.sh`.

**Scope taken:** the 671-line core → Node, the 19 `.mjs` reviewed and the one hazard fixed, and all 20
sub-skills + 5 agents + schemas carried over. Scaffolders and installers are **not** ported as bash and
not rewritten in this change — a scaffolder that shells out to a POSIX toolchain is a separate problem
from the QA gate, and porting 2,886 lines of project generator would dominate a phase whose named goal
is hooks. Any scaffold-* skill that survives must call Node or be marked unavailable; that is its own
change, recorded as a follow-up rather than smuggled in here.

This is a narrower reading than "convert all 39 scripts". Flagged to the operator rather than assumed.
