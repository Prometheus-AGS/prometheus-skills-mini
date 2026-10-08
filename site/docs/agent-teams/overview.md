---
title: Agent Teams
sidebar_label: Overview
---

# Agent teams

Use the [canonical team handbook](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/agent-teams) for the shared lifecycle and native boundaries, and the [mini request reference](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/agent-teams.md#task-lifecycle-request-sequence) for runnable JSON examples with mini's script paths. This page explains mini's entry points and prerequisites; it does not claim live harness or service acceptance.

Start with what you want to finish, not a team size. `agent-team-creator` asks about the outcome,
scope, deliverables, budget, and need for independent review, then proposes a small editable
team. One implementer is enough for an isolated change. Add a reviewer or specialist only
when a separate responsibility and deliverable justify the extra coordination and model cost.

| Term | Meaning |
| --- | --- |
| Role | The responsibility an agent owns, with inputs, outputs, and file ownership |
| Skill | A procedure the role can follow; check that it is installed and suitable |
| Model | The configured model identifier and declared capability/cost policy |
| Harness | The native application that executes the work and enforces its permissions |
| Task | A bounded assignment with one owner, dependencies, evidence, and a revision |

Complex work may benefit from a designer, mobile specialist, security reviewer, documentation
specialist, marketer, or product manager. The guided flow offers a single-agent alternative
and reasons for each proposed role. Suggested skill names are discovery leads, not installation
claims. Assign disjoint write ownership before parallel edits.

## Work at the right level

| Level | What to do |
| --- | --- |
| User | State the outcome, authorized scope and constraints. |
| Project | Preserve the selected team, project instructions and canonical task identities. |
| Lead | Assign owners and disjoint paths, coordinate dependencies and native dispatch, then reconcile results. |
| Role | Work within the assignment; return artifacts, evidence, blockers and remaining work. |
| Harness | Apply its own session, permission, model and delegation controls. |
| Other project | Have its intake owner accept scope and return a destination task reference. |
| Service operator | Manage optional endpoints and datasets through their owning installation. |

Lead is a responsibility, not a mandatory extra role. One agent can coordinate
and implement a small task. For parallel work, supply each worker the absolute
checkout, owned and protected paths, inputs and expected outputs. See the
[responsibility guide](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/agent-teams.md#responsibilities-at-every-level).

## Choose the right skill

| Skill | Responsibility |
| --- | --- |
| `agent-team-creator` | Guided or expert manifest creation, validation, native export staging and project installation |
| `agent-team-manage` | Task assignment, dependencies, status, cancellation, and reassignment |
| `agent-team-models` | Model discovery and explicit tier, capability, and cost policy |
| `agent-team-handoff` | Fresh-context packets and explicit destination acceptance |

The four skills share the creator's compiled `.mjs` runtime. It runs on **Node.js >=22** with
no repository-root runtime dependencies or install step. Source is **TypeScript 7.0.2**.
Full and mini share the local lifecycle, but card/intake and current memory adapters differ. Copy the whole creator payload when using
it outside the repository. Native harnesses remain separate tools.

## Try guided selection

Save this as `guide.json` in the mini checkout:

```json
{
  "id": "docs-team",
  "outcome": "Clarify the setup guide and verify its examples",
  "complexity": "simple",
  "areas": ["docs"],
  "deliverables": ["Updated guide", "Verification notes"],
  "budget": "balanced",
  "review": true,
  "harness": "codex",
  "scope": "project"
}
```

```text
node skills/agent-team-creator/scripts/cli.mjs guide --input guide.json
```

Inspect `proposedRoles`, reasons and alternatives. Supply an `ownership` map for every
proposed role and rerun `guide`; only `ready: true` returns `team`. Confirm available skills,
then place that team in an `init` request. Expert users may write the manifest
directly. Commands take JSON request files, so no shell-specific pipelines are needed.

The [repository guide](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/agent-teams.md)
includes complete initialization and export examples. Export creates a staging directory and
receipts; it does not install agents, register services, or execute a team. Read the diagnostics,
review native permissions, and validate with the intended installed harness before deployment.

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

See [UI/UX routing](/docs/ui-ux/overview) for installation, routing requests, Zed precedence,
platform limits and troubleshooting, and the [project installation contract](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/skills/agent-team-creator/references/project-installation.md)
for all request fields and recovery behavior.

## Native targets differ

| Identifier | Native form or limit |
| --- | --- |
| `uar` | AgentArtifact registration payloads; execution is separate and no persistent native team API is asserted |
| `codex` | Native subagent TOML and optional project config |
| `claude` | Claude Code subagents or alternative plugin artifacts; not automatic experimental team creation |
| `copilot` | GitHub Copilot CLI custom agents; Fleet remains a separate native workflow |
| `kimi` | Current Kimi Code agents and optional plugin/marketplace forms; role model frontmatter is not applied |
| `minimax` | MiniMax's own `mcode` CLI and user-data agent artifacts; no verified custom-agent selector in `mcode exec` |
| `opencode` | Native Markdown agents and optional project config |
| `deepseek` | DeepSeek Harness Cordis persona profiles and experimental team-service composition; no automatic member creation |
| `bossfang` | Separate native agent, Hand, or workflow registration target, not a ninth harness identifier |

Portable roles are not a universal native team model. Preserve harness-specific options and
files through `native` configuration with source/version provenance. Unknown fields survive
with diagnostics and still need native validation. Generated-file collisions are refused.
UAR/BossFang deployment needs operator endpoints, credentials, and retained native receipts;
discovery does not authorize mutation or activation.

See the [native contract reference](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/skills/agent-team-creator/references/native-harnesses.md)
for exact formats, primary sources, and supported plugin alternatives.

## Assign and start bounded work

The project discovery manifest `.agent-team/<id>/team.json`, routing record and
mutable `.agent-teams/<id>.json` ledger are separate schema-version-1 records.
Import a reviewed portable manifest through `init` or `install-project`;
there is no universal native-agent import command. UAR draft.2 definitions
are a separate provider-owned immutable profile.

Read `status`, then use `task` with `add` to assign a pending task to an existing
role. `start` records running status only after task dependencies complete.
Use `block` with a reason when work cannot continue; restart after resolving it.
Evidence and explicit remaining work can accompany supported transitions. There
is no generic `update` action. `cancel` requires a reason; `complete` requires a
running task, evidence and no remaining work. Both terminal states stay in history.

Role dependencies do not automatically become task dependencies. Assign disjoint
write paths and a separate review task/findings path. Keep review dormant until
all production work in the phase is complete. Dispatch native workers separately;
ledger assignment does not launch them and cancellation does not stop them.

Local `reassign` is administrative and immediate. A context-bearing handoff needs
explicit destination acceptance. UAR's draft.2 `taskAcceptance` policy is a third
boundary: coordinator mode permits an empty workflow list, while operator mode
requires workflow references. It adds no local `task-accept` command or execution guarantee.
Read the [direct coordinator acceptance contract](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/agent-teams#uar-direct-coordinator-acceptance)
before using that schema; `uar-activate` still refuses activation.

Follow the [mini lifecycle request sequence](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/agent-teams.md#task-lifecycle-request-sequence)
for exact state/task revisions, canonical identity fields and recovery.

## Model policy budget and native controls

Use the [canonical model handbook](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/agent-teams#choose-a-model-for-the-task)
and [mini executable model requests](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/agent-teams.md#model-discovery-selection-and-persistence)
for discovery, effective policy and persistence. Record concrete canonical
assignments through [task model assignments](/docs/kbd/task-model-assignments).

KBD chooses task fit first within owner policy; the helper filters declared
constraints then sorts eligible models by known price sum. Team → role → ordered
skill → task layers override scalars and accumulate capabilities. Unknown prices
cannot satisfy ceilings; stale rates do not guarantee a whole-task budget.
Reasoning effort/context/fallback are native/plan requirements, not portable
policy fields. Selection/export does not switch a worker or prove inference.

Current native controls differ: Codex model/effort depends on exposed role/tool
settings; Claude alias/provider settings can change the observed model; OpenCode
uses configured provider/model variants; Kimi ignores model frontmatter and
DeepSeek export has no per-member model control. Record the actual route and
leave missing controls unresolved. liter-llm supplies inference, not a worker.
No automatic fallback is implemented. Different-family KBD QA needs actual
producer/critic identity evidence, not another same-family alias or effort.

## Communicate and accept a handoff

Use an authorized native message for questions, progress, blockers or decisions.
Name the task and recipient, include reachable artifacts and state the requested
action. Mini has no generic messaging CLI or background inbox; messages do not
mutate its ledger. Use a context handoff when another owner or harness must
continue work, and coordinate stopping the source worker explicitly.

Use the [two-role mini request sequence](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/agent-teams.md#two-role-handoff-request-sequence)
from team creation to dependent review task, Codex-to-Claude context transfer,
destination acceptance, start and actual completion evidence. Current revisions
and the generated packet ID are required; source task changes make a packet
stale. Native dispatch, reachable artifacts and stopping source work remain
separate actions. Messages, administrative reassignment and acceptance receipts
do not complete tasks or transfer native permissions.

Mini does not ship full's team-card/discovery/request/intake commands. Use an
explicitly authorized native/file/issue channel for another project, name source
and target repository/project/team/role, and retain correlation plus owner
acknowledgement. The destination triages and creates its own local/canonical
assignment. A request or issue is not accepted work, and local handoff does not
transfer a task's ownership between repositories. Read the
[canonical communication and intake boundaries](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/agent-teams#communicate-within-the-team)
and [mini cross-project procedure](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/agent-teams.md#coordinate-with-another-project).

## Scoped memory and delivery limits

Mini's Node-only Claude SubagentStart recalls its role-local `MEMORY.md` and
digest files under an 8,000-character untrusted fence. It does not ship full's
Python writer, scoped remote role recall, Codex digest SessionStart or Cortex
feeder. Read the [canonical memory tiers](https://prometheus-ags.github.io/prometheus-skill-system/docs/guide/memory-tiers)
for the full pipeline and [mini's actual memory contract](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/agent-teams.md#optional-shared-memory-and-verification-limits)
for its reduced delivery and outbox.

Keep private lesson text out of shared parent forks and portable handoffs;
review digest metadata too. Scope labels are routing data, not proof of server
access control. Memory references convey no authorization. Optional remote
outbox publication needs an explicit endpoint/mapping and durable receipts;
uncertain results require reconciliation before retry. Mini's corrected outbox source normalizes canonical memory routing, derives
scopes and requires an explicit/selected project identity. Missing identity queues
without network I/O; legacy attempted receipts need deliberate reconciliation.
Compiled regeneration and actual service acceptance remain deferred. Source examples do not certify installed delivery.

Mini adds no resident services beyond optional surreal-memory and liter-llm.
Local handoffs work without them. Export/install prepare definitions and discovery;
they do not launch workers, activate teams or grant native permissions.

## Troubleshooting and ownership

For ambiguous teams, revision conflicts, blocked dependencies, stale packets,
unavailable model controls and queued memory, follow the
[ownership troubleshooting table](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/agent-teams.md#troubleshoot-the-ownership-boundary).
Read current project and task records before retrying an operation. A stopped
native worker, cancelled task, accepted handoff and completed task are separate
states and must be reconciled explicitly.

Use [services and recovery](/docs/services/docker-services) for service owners
and [the full/mini comparison](/docs/reference/comparison-with-full-pack) before
following a full-pack procedure. Full's Rust/native tools and shared-memory
pipeline are not installed by copying mini skills.
