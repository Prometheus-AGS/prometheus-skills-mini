---
title: Agent Teams
sidebar_label: Overview
---

# Agent teams

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

## Choose the right skill

| Skill | Responsibility |
| --- | --- |
| `agent-team-creator` | Guided or expert manifest creation, validation, native export staging and project installation |
| `agent-team-manage` | Task assignment, dependencies, status, cancellation, and reassignment |
| `agent-team-models` | Model discovery and explicit tier, capability, and cost policy |
| `agent-team-handoff` | Fresh-context packets and explicit destination acceptance |

The four skills share the creator's compiled `.mjs` runtime. It runs on **Node.js >=22** with
no repository-root runtime dependencies or install step. Source is **TypeScript 7.0.2**; full
and mini ship the same source and compiled runtime. Copy the whole creator payload when using
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

## Budget and model choice

`low`, `medium`, and `hard` are declared tiers, not inferred rankings. Policy applies in team,
role, selected-skill, and task order; scalar overrides replace prior values and capabilities
accumulate. A policy can require tool use and explicit USD-per-million-token input/output
ceilings. Unknown prices cannot satisfy a ceiling; rate ceilings are not a total spending cap.

Discovery reads configured OpenAI-compatible, UAR, or BossFang interfaces and preserves
provenance. The liter-llm schema-version-1 catalog adapter keeps per-token units explicit.
Discovery does not prove successful inference, and stale catalog prices do not guarantee
current rates. Unsupported native per-role model overrides are reported rather than assumed.

## Durable tasks and accepted handoffs

Task mutations require current state and task revisions plus the current owner. Dependencies
must complete before start/completion; complete and cancelled tasks are terminal. Local
exclusive locks and atomic file replacement coordinate cooperating writers on one filesystem.
They are not authentication, distributed leases, or Cedar policy enforcement. Do not use NFS
or shared multi-machine writes; crashed locks require verified manual recovery.

A handoff includes context, evidence, remaining work, memory references, and actual Git
HEAD/branch/dirty information. Unknown values remain unknown, and a snapshot does not copy
untracked work. Creation does not transfer ownership. The targeted destination explicitly
accepts; the ownership change and receipt commit together. A stale/reassigned/cancelled task
cannot be reclaimed by an old packet. A repeated acceptance is idempotent only while the
accepted task is unchanged and the caller supplies the current state revision.

The destination opens a fresh native context. Source credentials, sessions, approvals, and
sandbox permissions do not transfer. Stop source edits and make artifacts reachable before
the destination starts work. See the [task/handoff request reference](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/skills/agent-team-creator/references/task-handoff.md)
for exact JSON examples and recovery steps.

KBD-linked completion uses a real canonical CLI and verifies project/run/phase/change/task
identity. Local task events do not fabricate KBD boundaries or trigger arbitrary Karpathy
hooks. Canonical KBD and local team state are separate stores; interruptions may need status
checks and reconciliation rather than blind retries.

## Optional memory and honest validation

Shared memory uses a local outbox and explicit provenance/scope. Configured remote publication
can fail without losing the queued entry; uncertain outcomes require reconciliation before
retry. Memory is optional, and `pk` remains the sole knowledge-bundle writer. No new resident
service is added beyond mini's existing surreal-memory and liter-llm integrations. Local
team operations work without them; remote publication and live discovery need their endpoints.

Source-linked exports do not certify native CLI acceptance, service authentication, or Windows
execution. Those require separate live evidence. Project installation writes native definitions
and discovery instructions; it does not launch, activate or authorize native execution.
