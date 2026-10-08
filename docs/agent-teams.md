# Agent teams: start with the outcome

This page is the mini executable request reference. Follow the [canonical team handbook](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/agent-teams) for the shared workflow, ownership and native boundaries. Mini commands use `skills/agent-team-creator`; full commands use `skills/process/agent-team-creator`. Resolve the actual creator directory when installed. Examples describe source contracts, not completed native execution.

Describe what should be different when the work is finished. You do not need to know agent
terminology or pick a team size first. The creator asks about scope, deliverables, budget,
independent review, and the tool that will execute the work, then proposes editable roles.

| Concept | What you choose |
| --- | --- |
| Role | A responsibility, such as implementing a change or reviewing its evidence |
| Skill | A reusable procedure the role can follow; verify it is installed before assigning it |
| Model | The model identifier and constraints used for the work |
| Harness | The native agent application that owns execution, tools, sessions, and permissions |
| Task | A bounded work item with one owner, dependencies, evidence, and a revision |

Use one implementer for an isolated change. Add a reviewer when a separate assessment is useful.
Add a designer, mobile specialist, security reviewer, documentation specialist, marketing
specialist, or product manager only for a concrete deliverable. A role should have clear inputs,
outputs, and file ownership before parallel edits. Suggested skill names are discovery leads,
not claims that those skills are installed or bundled in mini.

## Responsibilities at every level

| Level | Responsibility and durable record |
| --- | --- |
| User | Describe the outcome, authorized repositories, constraints and spending policy; decide scope changes that exceed the existing request. |
| Project | Preserve the selected team in `.agent-team/project-routing.json`, its real manifest and project instructions; keep discovery separate from the mutable task ledger. |
| Lead | Adopt the selected team, assign bounded tasks and disjoint paths, resolve dependencies, dispatch through the available harness and reconcile results with current state. |
| Role | Read the assignment and applicable instructions, work within owned paths, communicate blockers and return changed artifacts, evidence and explicit remaining work. |
| Harness | Own native sessions, tools, execution permissions and supported model controls; exported definitions do not launch a worker. |
| Cross-project owner | Accept or decline the requested scope in the destination project and return its local task and receipt references. |
| Service operator | Own optional endpoints, credentials, selected datasets and lifecycle; installing a team does not install or administer services. |

The lead is a coordination responsibility, not a required extra manifest role.
For a single-agent task, one person or agent can perform both lead and role work.
For parallel work, send each worker the absolute checkout path, owned files,
protected neighboring paths, inputs and expected outputs. Preserve other workers'
edits. On return, distinguish implementation finished, accepted handoff, task
completion and any separately authorized release; none implies the others.

## Four sibling skills, one runtime

| Skill | Use it for |
| --- | --- |
| `agent-team-creator` | Guided selection or an expert manifest, validation, native artifact staging, and project installation |
| `agent-team-manage` | Assignment, status, dependencies, cancellation, reassignment, and KBD-linked completion |
| `agent-team-models` | Model discovery, catalog interpretation, and explicit policy selection |
| `agent-team-handoff` | Context capture and acceptance when work moves to another owner or harness |

All four use `skills/agent-team-creator/scripts/cli.mjs`. Full and mini share local task/handoff contracts, but their current memory adapters
and card/intake support differ; do not assume compiled runtime parity. The
source is TypeScript **7.0.2** and the shipped `.mjs` files run on **Node.js >=22**, without
repository-root imports or runtime dependency installation. Copy the complete creator payload,
not just its entry file. Native harnesses, Git for Git snapshots, and an explicitly configured
KBD CLI for canonical completion are separate capabilities, not bundled agent runtimes.

The examples below run from the mini checkout. In an installed skill, replace
`skills/agent-team-creator` with that skill's actual directory. Save JSON with an editor;
no shell-specific redirection is needed.

## Guided creation

Save `guide.json`:

```json
{
  "id": "docs-team",
  "outcome": "Clarify the setup guide and verify its examples",
  "complexity": "simple",
  "areas": ["docs"],
  "deliverables": ["Updated setup guide", "Verification notes"],
  "budget": "balanced",
  "review": true,
  "harness": "codex",
  "scope": "project"
}
```

```text
node skills/agent-team-creator/scripts/cli.mjs guide --input guide.json
```

The response includes role reasons and single-agent alternatives. Missing inputs return
questions rather than creating state. Once scope is known, it returns `proposedRoles` and
ownership questions; only `ready: true` returns a `team`. `review` is a JSON boolean; `complexity`
is `simple` or `complex`, and `budget` is `economy`, `balanced`, or `quality`. The budget answer
sets a declared tier preference, not a dollar budget or a verified model ranking.

Inspect `proposedRoles`. Supply `ownership` for every proposed role, for example
`{"implementer": ["docs/**"], "reviewer": ["reviews/docs.md"]}`, then rerun `guide`.
Remove unnecessary specialists and choose available skills before accepting the ready team. Empty ownership is not permission to edit the whole project.
Expert users can write a manifest directly and skip `guide`.

## Initialize and stage an export

Save `init.json`. This smaller expert example deliberately uses one role:

```json
{
  "state": ".agent-teams/docs-team.json",
  "team": {
    "schemaVersion": 1,
    "id": "docs-team",
    "outcome": "Clarify the setup guide and verify its examples",
    "scope": "project",
    "harness": "codex",
    "roles": [{
      "id": "implementer",
      "description": "Owns the documentation change",
      "prompt": "Update the assigned guide, check its examples, and report evidence and remaining work.",
      "skills": [], "owns": ["docs/**"],
      "inputs": ["Requested setup clarification"],
      "outputs": ["Updated guide", "Verification notes"],
      "dependsOn": []
    }],
    "modelPolicy": {"tier": "medium"}
  }
}
```

Alternatively, place the edited `team` returned by `guide` under this request's `team` key.

```text
node skills/agent-team-creator/scripts/cli.mjs validate --input init.json
node skills/agent-team-creator/scripts/cli.mjs init --input init.json
```

Initialization creates state revision `0` and refuses to overwrite an existing state. Save
`export.json` with a new staging directory:

```json
{
  "state": ".agent-teams/docs-team.json",
  "target": "codex",
  "out": "team-exports/docs-team-codex"
}
```

```text
node skills/agent-team-creator/scripts/cli.mjs export --input export.json
```

Read the returned diagnostics, instructions, source/version verification, and export receipts.
Export stages proposals; it does not install native files, register service agents, or execute
a team. Existing files and path collisions are refused. Inspect the artifacts and native
permissions, validate them with the intended installed harness, then deliberately install or
register the chosen deployment form. For normal project creation, continue below with
`install-project`. Source-verified export is not live native acceptance.

## Install the project team

Normal project-team creation continues after export inspection with `install-project`.
Save `install-request.json` with the accepted manifest as `team` (the same manifest used
in `init.json`) and the authorized project path:

```json
{
  "project": "../My Project",
  "team": {
    "schemaVersion": 1,
    "id": "docs-team",
    "outcome": "Clarify the setup guide and verify its examples",
    "scope": "project",
    "harness": "codex",
    "roles": [{
      "id": "implementer",
      "description": "Owns the documentation change",
      "prompt": "Update the assigned guide and report evidence and remaining work.",
      "skills": [], "owns": ["docs/**"],
      "inputs": ["Requested setup clarification"],
      "outputs": ["Updated guide", "Verification notes"],
      "dependsOn": []
    }],
    "modelPolicy": {"tier": "medium"}
  }
}
```

```text
node skills/agent-team-creator/scripts/cli.mjs install-project --input install-request.json --dry-run
node skills/agent-team-creator/scripts/cli.mjs install-project --input install-request.json
node skills/agent-team-creator/scripts/cli.mjs install-project --project "../My Project" --check
```

The installer writes `.agent-team/docs-team/team.json`, `.agent-team/project-routing.json`,
managed discovery instructions and missing native project definitions. The earlier
`.agent-teams/docs-team.json` file is the separate mutable task ledger; installation does
not turn its filename into a discovery manifest. `export` remains proposal-only.

For an existing team, omit the JSON manifest and use `--project`. An explicit recorded
selection wins; a sole `.agent-team/<id>/team.json` is adopted automatically. If several
remain ambiguous, choose with `--team <id>`. A stale selection raises an error. Intentional
replacement of a differing manifest requires `updateTeam: true` in the request.

For **all code tasks**, read the active record and real manifest, then use relevant existing
roles. Preserve IDs, ownership, model policy, native permissions and concurrency. Existing
native files are kept byte-for-byte; differences are reported for a deliberate merge. The
installer creates definitions and instructions, not running agents or new permission grants.
Where native delegation is unavailable, use role instructions sequentially and disclose that
limitation. Independent review requires a separate context after the production phase.

UI roles conditionally bind `prometheus-ui-ux`; UI reviewers bind `prometheus-ui-review`.
Backend-only work does not load UI guidance. Project `.agents/UI_UX_PROTOCOL.md` wins over
the bundled protocol; refinement/review exclude taste. User-only `interface-review`,
`break`, `variant` and `explain-interface` are not automatically preloaded or read to
bypass their invocation restriction. Explicit conflicting native preload overrides retain
diagnostics for resolution before invocation.

Zed's first effective existing instruction file also receives the discovery pointer, in
addition to `AGENTS.md` and `CLAUDE.md`. Inspect `instructionFiles` in the active record.
External ACP agents retain their native configuration; parallel threads are not a delegation
API. Local recovery records preserve prior instruction bytes, including CRLF and supported
in-project links. The installer never creates links. Creator `--check` exits 2 for drift
and 1 for errors; dry-run/check write nothing.

See [UI/UX routing](ui-ux-routing.md) for installation, routing requests, Zed precedence,
platform limits and troubleshooting, and the [project installation contract](../skills/agent-team-creator/references/project-installation.md)
for all request fields and recovery behavior.

## Eight execution harnesses and a separate BossFang target

| Target identifier | Native output and important limit |
| --- | --- |
| `uar` | AgentArtifact registration payloads; no persistent native team API is asserted and execution is separate |
| `codex` | Native subagent TOML files and optional project config |
| `claude` | Claude Code project subagents or an alternative plugin; this does not automatically create an experimental agent team |
| `copilot` | GitHub Copilot CLI custom-agent Markdown; agent selection and Fleet execution remain native steps |
| `kimi` | Current Kimi Code project agents or alternative plugin/marketplace artifacts; per-role model frontmatter is not applied |
| `minimax` | MiniMax's own `mcode` CLI/user-data agent artifacts; `mcode exec` has no verified custom-agent selector |
| `opencode` | OpenCode Markdown agents and optional project config; plugins remain a separate native mechanism |
| `deepseek` | DeepSeek Harness Cordis persona profiles and a separate experimental team-service composition; members are not auto-created |
| `bossfang` | Separate native agent, Hand, or workflow registration alternatives; activation and execution are separate |

Set the manifest's `scope` to `project`, `uar`, or `bossfang`; its `harness` still names one
of the eight execution harnesses. `bossfang` is an export target, not a ninth harness value.
The native formats differ; a portable role list is not a universal native team API.

Use `role.native[target]` for role options and `team.native[target]` for declared native
`version`, `source`, optional `options`, and staged `files`. Unknown options are preserved with
diagnostics, not silently treated as validated support. File paths must be portable and cannot
collide with generated artifacts. Preserve credentials through native environment references,
not embedded secrets. See the [native contract reference](../skills/agent-team-creator/references/native-harnesses.md)
for exact paths, primary sources, plugin alternatives, and limitations.

## Task lifecycle request sequence

Use the initialized state from the earlier example. These revisions assume a
fresh state at `0` and no intervening mutations. Read `status` before each real
operation and replace the illustrated revisions with the returned values.
Save each object below in the named JSON file. Run the first command below, then repeat it with `start-task.json`, `block-task.json`, `resume-task.json` and your chosen completion or cancellation request:

```text
node skills/agent-team-creator/scripts/cli.mjs task --input add-task.json
```

Save `add-task.json`:

```json
{
  "state": ".agent-teams/docs-team.json", "expectedRevision": 0,
  "task": {
    "action": "add", "id": "setup-guide", "title": "Clarify the setup guide",
    "owner": "implementer", "harness": "codex", "dependsOn": [],
    "evidence": [], "remaining": ["Update the guide and collect integration evidence"]
  }
}
```

Save `start-task.json` after assignment:

```json
{
  "state": ".agent-teams/docs-team.json", "expectedRevision": 1,
  "task": {"action": "start", "id": "setup-guide", "owner": "implementer", "expectedTaskRevision": 0}
}
```

If work cannot continue, save `block-task.json`:

```json
{
  "state": ".agent-teams/docs-team.json", "expectedRevision": 2,
  "task": {
    "action": "block", "id": "setup-guide", "owner": "implementer", "expectedTaskRevision": 1,
    "reason": "Need the supported setup environment", "evidence": ["docs/setup-blocker.md"]
  }
}
```

After resolving that blocker, save `resume-task.json`:

```json
{
  "state": ".agent-teams/docs-team.json", "expectedRevision": 3,
  "task": {
    "action": "start", "id": "setup-guide", "owner": "implementer", "expectedTaskRevision": 2,
    "remaining": ["Finish the production change and record the final integration gate"]
  }
}
```

After the complete production boundary and actual required evidence, save
`complete-task.json`. References are illustrative; replace them with real evidence.
The runtime checks supplied evidence and remaining-work fields, not whether the
referenced test or review really ran.

```json
{
  "state": ".agent-teams/docs-team.json", "expectedRevision": 4,
  "task": {
    "action": "complete", "id": "setup-guide", "owner": "implementer", "expectedTaskRevision": 3,
    "evidence": ["docs/setup-integration.md"], "remaining": []
  }
}
```

As an alternative at the same pre-completion snapshot, save `cancel-task.json`:

```json
{
  "state": ".agent-teams/docs-team.json", "expectedRevision": 4,
  "task": {
    "action": "cancel", "id": "setup-guide", "owner": "implementer", "expectedTaskRevision": 3,
    "reason": "The owner withdrew this change"
  }
}
```

`complete` and `cancelled` are terminal. Create a new task for follow-up work.
Cancellation changes the ledger; stop native work separately when authorized.
Evidence merges with previous evidence; an explicit `remaining` array replaces
previous work, except that `block` always retains its reason.

To assign a different existing role, use `reassign` with the current owner and
both revisions plus `toOwner` and optional `toHarness`. Reassignment is immediate
administrative intervention; it does not require acceptance or carry a fresh
context packet. A running task becomes pending. Use a separate review task with
its own task dependency after all phase production is complete. There is no
universal `assign`, `update` or `task-accept` command: these operations are
`task` actions, and unsupported action names fail.

Local assignment/start is not a destination handshake. Use `handoff-create` and
`handoff-accept` for a context-bearing transfer. UAR draft.2 direct coordinator
acceptance is the provider's `taskAcceptance` schema policy, not a new local CLI
verb. Its empty `allowedWorkflows` form is valid only for
`mode: "coordinator-within-binding"`; operator mode requires workflow references.
Read the [canonical handbook's acceptance boundary](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/agent-teams#uar-direct-coordinator-acceptance)
and the vendored schema receipt before claiming provider execution. `uar-activate`
continues to refuse activation.

### Canonical completion and recovery

For linked work, preserve `kbd.projectId`, `runId`, `phaseId`, `changeId` and
`taskId` from canonical status. Local IDs and titles do not select canonical
work. Local `complete` refuses a KBD-linked task. `complete-kbd` uses the same
state/task revision fields, `cwd`, and `task.kbdCli` naming the actual executable;
the canonical task must be `in_progress` or already complete. See the
[complete KBD request](../skills/agent-team-creator/references/task-handoff.md#complete-a-task-linked-to-canonical-kbd).

A committed local event records the canonical command ID, identities, revision,
response hash and evidence. It does not bypass canonical claims or permission,
QA, review or phase gates. A crash between canonical commit and local persistence
requires status reads and reconciliation, not invented completion or rollback
of canonical history.

A lock conflict means another writer may still own `<state>.lock`. Inspect its
PID, timestamp and token and confirm no live writer before manually removing an
abandoned lock. Re-read current state and any uncertain remote/canonical result.
Use one reliable local filesystem; locks are advisory coordination, not an
identity check, sandbox, distributed lease or process-cancellation mechanism.

## Model discovery selection and persistence

These requests document source contracts. Use the actual installed creator path
and Node.js 22+. A local declared-catalog comparison needs no service; live
listing needs a compatible, authorized endpoint. Neither is successful inference
or tool-enabled execution. For KBD, choose task fit first within policy; the
helper's cheapest-eligible ordering does not replace that judgment.

Save `model-discovery.json` for an actually configured gateway. The URL/port are
illustrative and credentials remain in an environment reference:

```json
{
  "kind": "openai", "baseUrl": "http://127.0.0.1:8000",
  "auth": {"env": "GATEWAY_API_KEY"}, "timeoutMs": 10000
}
```

```text
node skills/agent-team-creator/scripts/cli.mjs models-discover --input model-discovery.json
```

The gateway route is `/v1/models`; UAR/BossFang instead need their explicit
`discoveryUrl` and service-native response shape. Save/review returned metadata
with an editor. `available: true` means configured or declared eligibility, not
that the selected model answered an inference or used workspace tools. Map a
gateway alias to exact catalog provider/model IDs explicitly; name similarity
or a provider prefix is not mapping evidence. Consult the
[discovery contract](../skills/agent-team-creator/references/models-memory.md#discovery-api) for request details.

Save `model-selection.json`. This complete normalized catalog is an **operator
declaration for illustration**, not live capability, pricing or route evidence.
The example ID must be exposed by the actual harness before use.

```json
{
  "state": ".agent-teams/model-demo.json",
  "team": {
    "schemaVersion": 1, "id": "model-demo", "outcome": "Clarify setup documentation",
    "scope": "project", "harness": "codex",
    "modelPolicy": {"tier": "medium", "capabilities": ["function_calling"]},
    "skillPolicies": {"documentation": {"capabilities": ["structured_output"]}},
    "roles": [{
      "id": "implementer", "description": "Owns setup documentation",
      "prompt": "Edit assigned documentation and report evidence and remaining work.",
      "skills": ["documentation"], "owns": ["docs/setup.md"],
      "inputs": ["Setup requirements"], "outputs": ["Updated setup"], "dependsOn": [],
      "modelPolicy": {"model": "gpt-6.1-sol"}
    }]
  },
  "roleId": "implementer", "skills": ["documentation"],
  "taskPolicy": {"capabilities": ["reasoning"]},
  "catalog": {
    "schemaVersion": 1,
    "models": [{
      "id": "gpt-6.1-sol", "available": true, "tier": "medium",
      "capabilities": {"function_calling": true, "structured_output": true, "reasoning": true},
      "pricing": {"inputPerMillion": null, "outputPerMillion": null},
      "provenance": {"availabilityBasis": "operator-declared"}, "freshness": {"stale": null}
    }]
  }
}
```

```text
node skills/agent-team-creator/scripts/cli.mjs models-select --input model-selection.json
```

Inspect `selected`, `policy`, `appliedLayers`, `rejected` and `warnings`. This
example can select the declared ID with unknown pricing because it has no price
ceiling. Capabilities accumulate across all layers; scalar model/tier/rate
ceilings override in team → role → explicitly ordered skills → task order.
Supplying `skills: []` means no skill-policy layer, even if the role lists skills.
A missing/false capability or unknown/disabled availability rejects a candidate.

For a deliberate unknown-price failure, add `"maxOutputPerMillion": 8` to
`taskPolicy`. The candidate must be rejected because output price is unknown;
`selected` is null. Do not weaken an actual budget to make an example pass.
Prices/freshness must come from current authorized evidence when used for work.
`low`/`medium`/`hard` are operator annotations, not effort controls or benchmarks.

Selection is read-only: it does not save its model, change a task or launch an
agent. To persist a reviewed concrete result, use `team-update` with current
state revision and the entire replacement manifest. For example, `init` can use
the same JSON file's `state` and `team`; it ignores
selection-only top-level fields and refuses an existing state. `models-select`
uses the supplied team/catalog and does not read the `state` path. Save
`model-status.json` as `{"state":".agent-teams/model-demo.json"}`, inspect status,
then save `model-update.json` below. The model and native effort are illustrative;
apply only if exposed by the installed Codex version and intended by the owner.

```json
{
  "state": ".agent-teams/model-demo.json", "expectedRevision": 0,
  "team": {
    "schemaVersion": 1, "id": "model-demo", "outcome": "Clarify setup documentation",
    "scope": "project", "harness": "codex",
    "modelPolicy": {"tier": "medium", "capabilities": ["function_calling"]},
    "skillPolicies": {"documentation": {"capabilities": ["structured_output"]}},
    "roles": [{
      "id": "implementer", "description": "Owns setup documentation",
      "prompt": "Edit assigned documentation and report evidence and remaining work.",
      "skills": ["documentation"], "owns": ["docs/setup.md"],
      "inputs": ["Setup requirements"], "outputs": ["Updated setup"], "dependsOn": [],
      "modelPolicy": {"model": "gpt-6.1-sol"},
      "native": {"codex": {"model_reasoning_effort": "high"}}
    }]
  }
}
```

```text
node skills/agent-team-creator/scripts/cli.mjs init --input model-selection.json
node skills/agent-team-creator/scripts/cli.mjs status --input model-status.json
node skills/agent-team-creator/scripts/cli.mjs team-update --input model-update.json
```

The replacement keeps historical role IDs and team identity. Inspect returned
state; `team-update` does not regenerate native files. Export to a new staging
directory and review it through the existing export/install procedure. Native
export uses role's explicit model, otherwise team's; it does not rerun skill/task
selection. A role native override can replace the exported model. Read the
actual artifact and worker result rather than relying on portable intent.

A task-specific policy may be recorded under `task.modelPolicy` on `add` and
passed as `taskPolicy` to selection, then applied through a supported native
invocation. There is no generic policy-update action or universal live switch.
Record changed assignments and actual route before dispatch. `modelPolicy`
rejects `reasoningEffort`, `contextWindow`, total-budget and fallback keys;
native settings and plan evidence hold those requirements separately.

Follow the [canonical native reasoning limits](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/agent-teams#reasoning-and-native-harness-limits)
and [budget/fallback policy](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/agent-teams#budget-fallback-and-independent-review).
Kimi ignores model frontmatter; DeepSeek export has no per-member model route.
Missing controls leave the route unresolved. liter-llm inference is separate
from an existing tool-enabled worker. No automatic fallback is implemented;
record an explicit authorized alternative, preserving evidence of failed attempts.
A same-family critic does not satisfy this repository's distinct-family KBD QA.

## Messages and context transfers

Use the current harness's authorized messaging channel for a question, blocker,
progress update or request for a decision. Include team/role and task identity,
the concrete question or result, reachable artifact paths and any decision needed.
Mini has no generic `message` CLI command or background inbox. A sent message
does not change the task ledger or prove that another worker has read it.

Use a handoff when a new owner or harness needs the context to continue the task.
Include the objective, current state, instructions, completed work, evidence,
remaining work and destination. Stop or coordinate the source worker explicitly;
creating or accepting a packet cannot stop a native process. The destination
reads the actual checkout and current task before accepting. Keep the accepted
packet ID and current task/state revisions with the assignment. Do not use an
acknowledgement message as a substitute for `handoff-accept` or task completion.

## Two-role handoff request sequence

This standalone example uses a fresh `.agent-teams/setup-review.json` ledger.
Both native harnesses must be available to execute the work; local records alone
need only Node.js 22+. These revisions assume no intervening mutation. Read
`status` before each actual operation and use returned values. Complete all
production in the active phase before local integration and independent review.
Evidence paths below are illustrative: create the actual authorized artifacts
and record results before claiming completion.

Save `review-init.json`:

```json
{
  "state": ".agent-teams/setup-review.json",
  "team": {
    "schemaVersion": 1, "id": "setup-review",
    "outcome": "Clarify setup and independently review its evidence",
    "scope": "project", "harness": "codex",
    "roles": [
      {
        "id": "implementer", "description": "Owns the complete setup change",
        "prompt": "Edit assigned setup files and record actual local integration evidence.",
        "skills": [], "owns": ["docs/setup.md", "evidence/setup.md"],
        "inputs": ["Setup requirements"], "outputs": ["Setup patch", "Integration record"],
        "dependsOn": []
      },
      {
        "id": "reviewer", "description": "Independently reviews the complete change",
        "prompt": "Read the patch and evidence; write findings only in reviews/setup.md.",
        "skills": [], "owns": ["reviews/setup.md"],
        "inputs": ["Complete patch", "Integration record"], "outputs": ["Review record"],
        "dependsOn": ["implementer"]
      }
    ]
  }
}
```

Run each command when its corresponding step is ready:

```text
node skills/agent-team-creator/scripts/cli.mjs init --input review-init.json
node skills/agent-team-creator/scripts/cli.mjs task --input implementation-add.json
node skills/agent-team-creator/scripts/cli.mjs task --input implementation-start.json
node skills/agent-team-creator/scripts/cli.mjs task --input implementation-complete.json
node skills/agent-team-creator/scripts/cli.mjs task --input review-add.json
node skills/agent-team-creator/scripts/cli.mjs handoff-create --input review-handoff.json
node skills/agent-team-creator/scripts/cli.mjs handoff-accept --input review-accept.json
node skills/agent-team-creator/scripts/cli.mjs task --input review-start.json
node skills/agent-team-creator/scripts/cli.mjs task --input review-complete.json
```

Save `implementation-add.json`:

```json
{
  "state": ".agent-teams/setup-review.json", "expectedRevision": 0,
  "task": {"action": "add", "id": "setup-patch", "title": "Clarify setup",
    "owner": "implementer", "harness": "codex", "dependsOn": [],
    "remaining": ["Complete production and record actual local integration"]}
}
```

Save `implementation-start.json`, then dispatch the authorized native implementer
with its assigned paths and prohibitions:

```json
{
  "state": ".agent-teams/setup-review.json", "expectedRevision": 1,
  "task": {"action": "start", "id": "setup-patch", "owner": "implementer", "expectedTaskRevision": 0}
}
```

After coherent phase production and the actual local integration boundary,
save `implementation-complete.json`:

```json
{
  "state": ".agent-teams/setup-review.json", "expectedRevision": 2,
  "task": {"action": "complete", "id": "setup-patch", "owner": "implementer",
    "expectedTaskRevision": 1, "evidence": ["docs/setup.md", "evidence/setup.md"], "remaining": []}
}
```

Create the separate dependent review task with `review-add.json`. The implementer
initially owns this dispatch record; it may not edit the reviewer's findings path.

```json
{
  "state": ".agent-teams/setup-review.json", "expectedRevision": 3,
  "task": {"action": "add", "id": "setup-review", "title": "Independently review setup",
    "owner": "implementer", "harness": "codex", "dependsOn": ["setup-patch"],
    "remaining": ["Independently review the patch and integration record"]}
}
```

Save `review-handoff.json`. Replace `cwd` with the actual authorized checkout:

```json
{
  "state": ".agent-teams/setup-review.json", "expectedRevision": 4, "cwd": "/path/to/project",
  "handoff": {
    "taskId": "setup-review", "owner": "implementer", "expectedTaskRevision": 0,
    "toOwner": "reviewer", "toHarness": "claude",
    "context": "Production is complete. Independently inspect docs/setup.md and evidence/setup.md. Write only reviews/setup.md; do not edit implementation files.",
    "evidence": ["docs/setup.md", "evidence/setup.md"],
    "remaining": ["Independently review the patch and integration record"],
    "memoryRefs": []
  }
}
```

Creation returns state revision `5`, a generated `handoffs[].id`, and the saved
fresh-context `prompt`; review task revision stays `0`, owned by `implementer`.
Deliver that packet through an authorized native/file channel. In the destination,
read current instructions and inspect Git/evidence availability. Replace the
packet ID below with the returned value; acceptance is a separate deliberate call.

Save `review-accept.json`:

```json
{
  "state": ".agent-teams/setup-review.json", "expectedRevision": 5,
  "id": "REPLACE-WITH-RETURNED-HANDOFF-ID",
  "destination": {"owner": "reviewer", "harness": "claude"}
}
```

Acceptance returns state revision `6` and review task revision `1`, still pending,
now owned by `reviewer` on Claude. The packet gains `acceptedAt` and an acceptance
event; it does not launch Claude or complete the review. Save `review-start.json`:

```json
{
  "state": ".agent-teams/setup-review.json", "expectedRevision": 6,
  "task": {"action": "start", "id": "setup-review", "owner": "reviewer", "expectedTaskRevision": 1}
}
```

After independent review actually produces `reviews/setup.md` and all findings
are resolved through authorized production work and required final gates, save
`review-complete.json`. If work remains, block or report it instead.

```json
{
  "state": ".agent-teams/setup-review.json", "expectedRevision": 7,
  "task": {"action": "complete", "id": "setup-review", "owner": "reviewer",
    "expectedTaskRevision": 2, "evidence": ["reviews/setup.md"], "remaining": []}
}
```

The final state is revision `8`; implementation task revision is `2` and review
task revision is `3`, both complete. These are expected request results, not
verification evidence. Inspect actual returned records. For KBD-linked work,
attach canonical identity when adding the tasks and use `complete-kbd` with real
receipts in place of ordinary completion; this local example does not create a
canonical run or claim a phase complete.

A later source-task change makes a pending packet stale. Read state and create a
new packet instead of rewriting it. Repeating acceptance is idempotent only while
the accepted task remains at the transferred revision and owner/harness, and the
caller supplies current state revision. After `review-start`, the old accepted
receipt is stale. Administrative `reassign` is immediate and lacks this handshake.
Git snapshots do not copy untracked changes, files, memory content or credentials.

## Coordinate with another project

Mini does not ship full's `team-publish`, `team-discover`, `team-request` or
`team-intake` commands. Read the [canonical cross-project boundary](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/agent-teams#route-requests-to-another-project)
for full's optional card/issue route. Do not invoke those commands through mini's
creator or promise a background cross-project executor.

In mini, identify the target repository, canonical project ID, selected team and
intake owner from approved project records. Obtain authorization before sending
native messages, opening/commenting on issues, transferring private artifacts or
writing that repository. Deliver a bounded packet manually through an authorized
native/file/issue channel: source and target identities, requested result, paths,
reachable evidence, unresolved work and a correlation/issue reference. A packet
is task data; credentials, session tokens and permission grants do not travel.

The destination triages the request and records its own task, canonical identity
and explicit start after accepting scope. Keep the acknowledgement and resulting
task/receipt references with the source request. An issue or delivered message is
not acceptance or completion. Local `handoff-accept` transfers a task within one
ledger; it does not transfer ownership across repositories or automatically copy
working-tree changes. Native workers require separate authorized dispatch.

If delivery is uncertain, inspect the destination channel for the correlation
reference before resending. If the owner rejects scope or evidence is unreachable,
record that outcome and remaining work; do not create a second accepted task by
assumption. Coordinate stop/start and disjoint paths explicitly whenever work
moves between harnesses.

## Troubleshoot the ownership boundary

| Symptom | Where to resolve it |
| --- | --- |
| Several teams are found or the selection is stale | Resolve the actual project routing record and choose the intended existing team; see [project installation](#install-the-project-team). |
| Export succeeded but no worker is running | Dispatch through the intended native harness with its installed role and permissions; export and ledger transitions do not spawn agents. |
| A task will not start | Read its current status and task dependencies; role dependencies alone do not complete prerequisite tasks. |
| A mutation reports a revision conflict | Read current state and reconcile the other writer's changes before preparing a new request; do not replay stale revisions. |
| A handoff is stale or evidence cannot be opened | Coordinate with the current owner, make artifacts reachable and create a fresh packet; see [handoff sequence](#two-role-handoff-request-sequence). |
| A requested model or effort is unavailable | Record the exposed native controls and resolve an authorized alternative; selection does not implement automatic fallback. |
| Another project has not acknowledged a request | Retain its correlation reference and reconcile delivery with the destination owner; see [cross-project coordination](#coordinate-with-another-project). |
| Memory stays queued | Preserve the outbox, resolve explicit project identity and the selected endpoint, and reconcile uncertain attempts before retrying. |
| A service is missing | Choose its owning installation and follow [service operations](service-operations.md); local task files remain usable without it. |

## Optional shared memory and verification limits

Mini's current learning delivery is Node-only and reduced: Claude SubagentStart
reads `.claude/agent-memory-local/<role>/MEMORY.md` and the local team digest,
fenced as untrusted information under 8,000 characters. It skips other harnesses,
unresolved roles and absent files. It does not ship full's Python lesson writer,
scoped remote SubagentStart recall, Codex digest SessionStart or Cortex feeder.
The shared [memory tiers guide](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/memory-tiers)
describes full's pipeline; those controls are not mini capabilities by implication.

Full's scopes distinguish role-private/addressed, lead, team, project, user and
global promotion. A shared digest or a forked parent may disclose context to
other roles, so do not paste private lesson text into a parent prompt or portable
handoff. Digest metadata and paths also need disclosure review. Consult approved
project memory procedures for lookup/writeback and promotion; mini's local file
hook is not a store authorization or cross-project privacy mechanism.

Mini ships `memory-queue`/`memory-publish` for an explicitly configured remote
contract or mapped HTTP API. Corrected source supports existing
`role:<id>`/`agent:<id>`, `lead`, `team[:id]` and `project[:id]` scopes. Team/project
suffixes do not select another project or team. It derives stored scope keys,
keeps author metadata separate and sends lesson text plus the full-compatible
learning-envelope trailer/categories/hash to canonical `POST /api/v1/memory`.
A supplied trailing slash is normalized before the request.

Supply a project identity explicitly in the entry/publication or top-level
request, agreeing with linked KBD identity. Alternatively, explicitly select
`project` root or `cwd` and its `.prometheus/project.json` marker. The source does
not infer identity from ambient process cwd, ledger location, homes or a global
fallback. `scopeMapping.userId` only confirms the resolved project;
`scopeMapping.agentId` supplies author metadata, not another role's storage key.
All providers require local project identity before network I/O. Missing identity
keeps a durable queued entry/receipt with `missing_project_id`; local file-tier
work remains available. User/global scopes are not this Node outbox's surface.

Save `mini-queue.json` (replace the illustrative ID with the actual project ID):

```json
{
  "state": ".agent-teams/setup-review.json", "expectedRevision": 8,
  "entry": {"id": "setup-lesson", "content": "Setup needs the supported environment.",
    "scope": "role:implementer", "projectId": "project:REPLACE-WITH-ACTUAL-ID",
    "provenance": {"evidence": "evidence/setup.md"}}
}
```

Save `mini-publish.json` with an authorized endpoint; the port is illustrative:

```json
{
  "state": ".agent-teams/setup-review.json", "expectedRevision": 9,
  "publication": {"id": "setup-lesson", "provider": "surreal-memory",
    "url": "http://127.0.0.1:8001/api/v1/memory",
    "scopeMapping": {"scope": "role:implementer"}, "auth": {"env": "MEMORY_API_KEY"}}
}
```

```text
node skills/agent-team-creator/scripts/cli.mjs memory-queue --input mini-queue.json
node skills/agent-team-creator/scripts/cli.mjs memory-publish --input mini-publish.json
```

These requests describe corrected production source. Compiled `.mjs` regeneration
and the final process/service integration gate remain deferred; existing installed
payloads do not acquire the fix from a documentation change. `mapped-http` uses
an explicit source/version-backed mapping; remote authorization and idempotency
are still unverified. Scope labels do not prove private server access control.

A legacy entry with a recorded publication key/body/target must not silently
migrate to the new envelope or endpoint. Reconcile the old remote outcome and
record an operator disposition, then deliberately queue a new entry if required.
An unattempted queued entry can acquire explicit project identity before its
first publication; do not rewrite attempted or published history. Keep secrets,
private session tokens and unauthorized personal content out of records.

Missing endpoints leave local tasks/handoffs usable. Remote publication receipts
retain target, local ID, remote ID/status when known and uncertainty. A crash may
follow a remote commit without a persisted local receipt, so delivery is not
exactly once. Team events do not become Karpathy boundaries and `pk` remains the
knowledge-bundle writer. Mini adds no resident services; its optional services
remain surreal-memory (with SurrealDB) and liter-llm.

Native execution, remote publication and file-tier delivery need actual installed
permissions and final integration evidence. These pages describe source behavior;
no examples here were executed as acceptance evidence.
