
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

## 2026-09-21 — detect-project-context reports THIS project's context, not GitOps

**Decision (operator):** port `sessionstart-detect-project-context`, but change what it detects.

Upstream (`shared/scripts/detect-project-context.sh`, 34 lines) detects Kustomize overlays, ArgoCD
Application CRs and Terraform cluster resources, then advertises four devops skills:
`gitops-bootstrap · gitops-transform · argocd-multicloud · kustomize-overlay`.

README §4.3 puts devops skills out of scope here, and the analyze inventory dropped
`posttool-validate-gitops-write` for that exact reason. Porting the detection verbatim would advertise
four skills this project does not ship — a hook telling the operator about capabilities that do not
exist is worse than no hook.

**What it reports instead:** KBD phase and position, the spec backend and capability count, the Node
version against `engines`, and whether the two permitted services are reachable (both optional, both
reported as degraded when down).

This is a **behaviour change from upstream, made deliberately and recorded**, not a porting error. The
hook id, event and timeout are unchanged, so the manifest and the six-id scenario still hold.

## 2026-09-21 — provider resolution ports 4 of 6 tiers; tiers 4–5 are dead upstream

`state-resolve-provider.sh` declares a six-tier waterfall. Tiers 4 and 5 read:

```sh
if command -v mcp 2>/dev/null | grep -q "refiner_state" 2>/dev/null; then
```

`command -v` prints the **path** of an executable, not a list of tools it offers. On this machine
`command -v mcp` prints `/Users/gqadonis/.pyenv/shims/mcp`, which contains neither `refiner_state` nor
`memory`, so **neither tier can ever fire** regardless of what MCP servers are configured. Verified by
running the comparison.

**Decision:** port the four reachable tiers — env var, project-local, global config, filesystem default —
and do not port the two unreachable ones. Carrying them would reproduce a latent bug and add code with
no observed problem (A-2). If MCP-backed state is wanted later it needs a real capability probe, which
is a change with its own spec, not a line resurrected from a broken conditional.

The filesystem default is unchanged and is what actually runs today, so no behaviour anyone depends on
is lost. The only non-markdown reference to the script anywhere in the upstream repo is the script
itself.
