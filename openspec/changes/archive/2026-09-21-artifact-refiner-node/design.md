# Design — artifact-refiner-node

## Why the port is 661 lines and not 5,357

Upstream carries 39 `.sh` / 5,396 lines, but the refinement loop reaches almost none of it. `SKILL.md`
invokes exactly five scripts (`state-init`, `state-checkpoint`, `state-finalize`,
`state-resolve-provider`, `workflow-dispatch`) plus two `.mjs` that are already Node. Validation adds
`validate-manifest`, `validate-constraints`, `post-execute-check`, `finalize-session` and
`log-reflection`. That is the 661 lines.

The remainder is separable and was verified so, not assumed:

- **Installers (17 files, 1,540 lines)** — `git grep -l 'installers/'` across `agents/`, `skills/`,
  `prompts/` and `SKILL.md` returns nothing. They target Cursor, Zed, Warp, Windsurf, Kilo, Roo and ten
  other harnesses this project does not ship.
- **Scaffolders (7 files, 2,879 lines)** — reachable only from `scaffold-*` skills, `refine-mcp-ui`,
  `convert-htmx-react` and `rebrand-artifact`. `scaffold-react-vite.sh` alone is ~1,200 lines that
  generate a React/Vite starter project.

## The python3 calls are JSON and UUIDs

Three state scripts and `agents/artifact-validator.md` invoke `python3`. Every call uses only the
Python **standard library** — JSON load/dump, `uuid.uuid4()`, `os.path.exists` checks, and list/dict
logic — each with a direct Node equivalent. (An earlier draft said "every call is `json`/`uuid`", which
was an overclaim: `post-execute-check.sh:27` branches on `artifact_type` over `manifest.preview.runs`,
and `validate-manifest.sh:39` accumulates errors and warnings with `isinstance` checks.) What matters is
what is absent: no third-party package, no scientific code, nothing needing an interpreter. This is why
the port is mechanical.

Other POSIX dependencies map as directly: `date -u` → `toISOString()`; `sed` and `grep` in
`state-finalize` / `state-resolve-provider` → string operations; `cat` of a config file → `readText`.

## What `lib/platform/` already supplies

State writes are exactly what `atomic-write.mjs` exists for — a predictable temp path opened for
truncating write is the data-loss bug this project already fixed once. Config reading goes through
`text.mjs` so a CRLF file parses identically. `$HOME/.refiner/provider.json` goes through `paths.mjs`,
the only module allowed to call `os.homedir()`. Any child process goes through `spawn.mjs` with
`shell: false`. The refiner re-implements none of these.

## The one Windows hazard in existing Node code

A scan of all 19 upstream `.mjs` for `/tmp` literals, `process.env.HOME`, `shell: true` and `.sh` references
found exactly one: `scripts/lib/model-routing.mjs:36` resolves `scripts/check-openai-proxy-health.sh`
and runs it through `execSync`. That script requires `curl` and targets
`http://localhost:8181/health`.

Two problems, one fix: it executes a shell script (C1/C3), and `curl` is not present by default on a
clean Windows shell. Replaced with a Node fetch against the endpoint's configured `health_probe` URL.

**Correction (review round 1).** An earlier draft of this document claimed "no `.mjs` imports
`model-routing.mjs` (only phase documents reference it)". That is false, and it was the sole evidence
offered that this edit is contained. `git grep -n "from ['\"].*model-routing" -- '*.mjs'` returns **two
importers**:

| Importer | Import |
|---|---|
| `scripts/lib/openai-client.mjs:21` | `import { resolvePhase } from "./model-routing.mjs"` — the live LLM call path |
| `scripts/model-routing-probe.mjs:13` | `import { resolveAllPhases } from "./lib/model-routing.mjs"` |

The error came from grepping `'*.mjs' '*.md'` together, seeing a wall of `.md` phase documents, and
reading past the `.mjs` matches. The blast radius is therefore larger than stated: task 6.3 edits a
module with live importers.

What the importers do on a failed probe was then checked rather than assumed. `resolvePhase` does **not**
throw when nothing is healthy — it returns a decision carrying `healthy: false` and a `reason`
(`<endpoint>_unhealthy_no_alternative` or `..._fallback_to_<other>`), so callers see the unhealthy state
in the return value. The degradation path exists; what was missing is a requirement asserting it stays
that way, which this change now adds.

**This still does not introduce a third service.** The probe URL comes from `model_policy` in
`project.json` and is configurable, and §P permits exactly two services. In this port the probe points
at the liter-llm gateway.

## Unported skills must be honest

Six carried skills instruct an agent to run a `.sh`, and — caught in review — **one of them is not a
`scaffold-*` skill**: `skills/refine-mcp-ui/SKILL.md` runs
`bash scripts/scaffold-react-vite-mcp-ui.sh`. A reader would reasonably assume a `refine-*` skill is in
scope for a refiner port, so the rule keys on the **property** (its implementation is not ported), never
on the name prefix. The six are `refine-mcp-ui` plus the five `scaffold-*` skills.

Carrying such a skill unedited creates a skill that looks available and fails on invocation. Worse, it would instruct an agent to execute a `.sh`, which this project forbids
outright. Each such skill therefore states that it is unavailable and names the follow-up change. A
loud absence is better than a silent breakage — and §0 already requires naming an absent skill rather
than narrating what it would have done.

## Sequencing, and what the gate does and does not cover

This change is sequenced after `hook-entry-node-only`. They share `lib/platform/` but no files, so the
order is a choice: hooks are the phase's named goal and carry the 1 s-budget unknown, and delaying them
behind 661 lines of unrelated porting would serve nothing.

The consequence is stated plainly rather than papered over: **the QA gate applies from this change's own
completion onward.** It does not retroactively gate the hook change. That is the honest cost of this
ordering, and it is the same class of gap that Delta 2 recorded — so it is written down here instead of
being discovered in the next reflection.
