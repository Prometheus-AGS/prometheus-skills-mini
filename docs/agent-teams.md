# Agent teams: start with the outcome

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

## Four sibling skills, one runtime

| Skill | Use it for |
| --- | --- |
| `agent-team-creator` | Guided selection or an expert manifest, validation, native artifact staging, and project installation |
| `agent-team-manage` | Assignment, status, dependencies, cancellation, reassignment, and KBD-linked completion |
| `agent-team-models` | Model discovery, catalog interpretation, and explicit policy selection |
| `agent-team-handoff` | Context capture and acceptance when work moves to another owner or harness |

All four use `skills/agent-team-creator/scripts/cli.mjs`. Full and mini distribute the same
runtime source and compiled artifacts; only the repository directory layout differs. The
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

## Model policy and cost

Model policy applies in team, role, selected-skill, then task order. Later scalar values
override earlier ones; required capabilities accumulate. Tiers `low`, `medium`, and `hard`
are explicit operator annotations, not conclusions inferred from names or price. A tier
constraint matches the declared tier; it is not an automatic benchmark score.

For example, this policy requests declared medium-tier models with tool use and explicit
USD-per-million-token ceilings:

```json
{
  "tier": "medium",
  "capabilities": ["function_calling"],
  "maxInputPerMillion": 2,
  "maxOutputPerMillion": 8
}
```

These are per-token rate ceilings, not a total spending limit. Unknown costs cannot satisfy a
ceiling. Provider availability, capabilities, tiers, and prices must be supplied or discovered
through supported contracts; unavailable evidence remains unknown. Discovery does not prove
successful inference. The liter-llm catalog adapter retains schema-version-1 provenance and
converts per-token rates explicitly. Stale catalog rates do not guarantee current prices.

`models-discover` reads configured OpenAI-compatible, UAR, or BossFang discovery endpoints.
`models-select` consumes the resulting catalog or an explicitly annotated available-model list;
it does not change a native session automatically. Apply an accepted identifier through the
destination's documented model settings. Some harnesses cannot express per-role overrides;
export reports that limitation. Use `agent-team-models` for the request details.

## Task revisions, ownership, and handoffs

Save `status.json`:

```json
{"state": ".agent-teams/docs-team.json"}
```

```text
node skills/agent-team-creator/scripts/cli.mjs status --input status.json
```

Task changes require the current top-level `expectedRevision`, plus the task's current
`owner` and `expectedTaskRevision` for updates. Dependencies must complete before a task
starts or completes. Completion requires evidence and no remaining work; complete and
cancelled tasks stay terminal. State uses exclusive local locks and atomic replacement, with
no automatic stale-lock stealing. It is not a distributed lease or an authentication system.

A handoff captures source/destination, task revision, context, evidence, remaining work,
memory references, and real Git HEAD/branch/dirty information. Unavailable Git data stays
unknown. Creation does not transfer ownership; the destination explicitly accepts the packet.
Acceptance and its receipt commit together. A stale, reassigned, or cancelled task cannot be
claimed through an old packet. Repeating the same accepted receipt is a no-op only while the
task is unchanged and the caller supplies the current state revision.

The destination receives a fresh prompt, not a portable source session or permission grant.
Open the native harness and provide reachable artifacts separately. Neither this skill nor
its `owns` fields implement Cedar policy or sandbox enforcement. Use local filesystem state,
not NFS or concurrent multi-machine writes, and stop source work before a new owner edits.

See [all task and handoff JSON requests](../skills/agent-team-creator/references/task-handoff.md)
for initialization, team updates, lifecycle operations, explicit acceptance, and manual lock
recovery. Linked KBD completion requires the actual canonical CLI and verified project/run/
phase/change/task identity. Other local task actions do not fabricate canonical boundaries.
KBD and team state are separate stores; failed or interrupted completion may require a
canonical status check and reconciliation rather than a blind retry.

## Optional shared memory and verification limits

Memory entries are queued locally with provenance and scope. Publication uses an explicitly
configured surreal-memory contract or operator-supplied HTTP mapping; service failures leave
receipts available for retry. Ambiguous remote outcomes require reconciliation because a
local lock cannot promise exactly-once remote delivery. Credentials stay in referenced
environment variables. Team events are not automatically Karpathy boundary events, and
`pk` remains the sole writer of its knowledge bundles.

This feature adds no resident services. Mini retains only surreal-memory (with SurrealDB)
and liter-llm; local manifests, staged exports, task coordination, and handoffs remain useful
without either. Live model discovery and remote publication need their configured endpoints.

The runtime is shipped as portable Node modules, but native harness availability, installed
configuration acceptance, service authentication, and Windows execution require separate
live evidence. No new Windows or cross-harness live certification is claimed by this guide.
