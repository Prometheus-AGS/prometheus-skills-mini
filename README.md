# Prometheus Skills Mini

Mini supplies portable skills, project workflows and agent-team tools for
AI-assisted development. Use it to plan a change, assign ownership, implement a
specification and retain progress without installing the full pack's native
toolchain.

[Documentation site](https://prometheus-ags.github.io/prometheus-skills-mini/) ·
[Skill catalog](SKILLS.md) · [Maintenance](docs/maintenance.md) ·
[Contribution rules](CONTRIBUTING.md)

## Choose mini or full

| | Mini | [Full skill pack](https://github.com/Prometheus-AGS/prometheus-skill-system) |
|---|---|---|
| Intended use | Portable process, team, research and UI guidance | Broad language/domain guidance, learning and optional native tools |
| Source layout | Flat `skills/<name>/` | Categorized skills, flattened for distribution |
| Core prerequisites | Node 22+; Git for a source checkout | Node, Git and Bash; individual workflows can require Python, jq or Rust |
| Platforms | Node entry points for Windows, macOS and Linux | Windows skills through Git Bash or WSL; native services on macOS/Linux |
| Optional infrastructure | HTTP memory/model services; a supplied Docker Compose stack | Native memory, knowledge, gateway, research and execution components |

Mini's portable entry points do not require Python, Git Bash or WSL. Individual
skills can still describe external toolchains or carry optional helpers with
their own prerequisites. Read the selected skill before using it. Source support
for a platform is separate from acceptance in a particular installed harness.
See [platform and release limits](docs/maintenance.md).

Do not install mini into a native home already containing the full pack. They
share skill names and can shadow each other. On such a machine, use mini only in
The Boss application's own managed data directory. The install-scope check
reports conflicting copies and offers no automatic deletion.

Counts, target IDs and existing release declarations come from
[skill-system.json](skill-system.json), [package.json](package.json) and the
owner-controlled [versions.toml](versions.toml). This README does not select a
new release or certify the candidate working tree.

## Get the skills

Keep a durable checkout for local plugin registrations and generated command
files; both can refer back to that checkout.

```bash
git clone https://github.com/Prometheus-AGS/prometheus-skills-mini.git
cd prometheus-skills-mini
npm ci
node scripts/doctor.mjs --human
```

The doctor reports runtime, tool, service, skill-copy, KBD and installation-scope
findings. Optional-service warnings do not prevent local file workflows. Its
plugin-source check inspects Claude Code registrations only; it does not inspect
Codex registrations or certify live hook execution.

On a machine without the full pack, the following explicit fix copies mini's
skills into the selected home's `.agents/skills` and `.claude/skills`:

```bash
node scripts/doctor.mjs --fix copy-skills
```

The fix creates ownership receipts for new copies. It updates only receipt-owned
files that have not been edited, preserves user-owned content, never deletes
extra files and refuses a detected full-pack installation. Read the fix result:
preserved files can still differ from the checkout. `MINI_DOCTOR_HOME` selects an
alternate home for this doctor and fix; normal execution uses your user home.

Claude and Codex plugin packages are a separate installation surface under
`dist/plugins/`. Register the accepted package through the owning harness's
supported marketplace flow, including its hook trust controls. Follow
[plugin distribution](site/docs/distribution/plugin-marketplace.md) for payload
layout, source-path recovery and registration limits.

For contributors preparing a complete source change, these commands materialize
the packages and compare them with their source:

```bash
node scripts/generate-skill-system-distribution.mjs
node scripts/generate-skill-system-distribution.mjs --check
```

Generation belongs after the whole production phase. A successful byte/mode
comparison establishes distribution consistency, not installed-harness
acceptance. POSIX mode checks report when their filesystem capability is
unavailable; see [distribution permissions](docs/distribution.md).

## Start a useful workflow

Open a project in your harness and ask for the installed skill by name:

> Use `kbd-process-orchestrator` to plan a small feature here. Record the
> specification, production entry point, acceptance criteria and file ownership.
> Implement the complete production change before its local integration gate.

KBD keeps change/task identity across sessions and uses OpenSpec as its spec
backend. The managed OpenSpec runner refreshes generated integrations with
explicit offline, pending and migration outcomes; see
[its lifecycle contract](lib/platform/openspec/README.md). Missing providers or
prerequisites must remain visible rather than becoming a completion claim.

Use `iterative-evolver` for an improvement cycle, `deep-research` for a sourced
investigation, and `prometheus-ui-ux` for UI or product copy. UI routing preserves
project design authority and chooses focused craft guidance. Start with
[UI routing and project adoption](docs/ui-ux-routing.md).

## Teams, models and memory

`agent-team-creator` creates or imports teams and stages native definitions.
`agent-team-manage` tracks tasks and ownership; `agent-team-handoff` records
destination acceptance before transferring a claim. Export produces a proposal;
normal project adoption finishes with `install-project`. Neither operation
launches agents or proves that a native harness discovered them.

Preserve an explicit selected team. Adopt a sole installed team; ask for a
selection when several are ambiguous. Use actual harness delegation and disclose
sequential fallback when unavailable. Model policy resolves from team to role to
skill to task. Choose concrete available model IDs and supported reasoning
efforts; catalog prices and capabilities are evidence inputs, not live inference
results. Independent review follows completed production.

Team state and lessons have a file tier. Optional publication uses a durable
outbox and the memory server's `POST /api/v1/memory` contract, with a learning
envelope and explicit project identity. Missing project identity blocks
publication with a durable diagnosis rather than routing a private lesson to a
global identity. These identity fields are retrieval filters; they do not
establish server authorization or private storage. Mini does not depend on the
full pack's Python or Cortex learning pipeline. Read [the team guide](docs/agent-teams.md) and
[models and memory](skills/agent-team-creator/references/models-memory.md).

## Optional services and Companion

The supplied Compose stack has three containers: SurrealDB, surreal-memory and
liter-llm. It uses loopback interfaces and persistent volumes; it does not install
Docker or require a host Rust toolchain. A managed application supplies private
credentials and selected image identities. Read [service operations](docs/service-operations.md)
and [the Compose README](docker/README.md) before starting or updating it.

```bash
node scripts/services.mjs status
```

Mini can discover existing full services without taking ownership of them. Full
native memory uses `memory/mcp`; mini Compose defaults to
`memory/main_local_384`. Changing service owners is an explicit dataset and
backup decision. The packs do not promise automatic data migration.

Prometheus Companion is a separate optional extension for connected control-plane
and peer-sync features. Mini remains usable without it. Companion owns its
installation and publication; no public Companion source or accepted release is
claimed here. See [the extension contract](docs/integration-contract.md) and
[deployment modes](docs/deployment-modes.md).

## Update, recover and uninstall

Record the accepted source/payload identity, installation scope and ownership
receipts before updating. Preserve user edits, project state and service-volume
backups. Update a clean durable checkout to an approved release, then replace
owned payloads through the original harness or application installer. For native
skill copies, the doctor's `copy-skills` fix updates eligible receipt-owned
files; it does not remove skills that disappeared from the new release.

Mini has no full-pack immutable-generation rollback API or blanket uninstall
command. Restore an approved previous payload through its owner. To uninstall,
remove its harness registration and only the copies identified by installation
receipts after preserving edits. Leave unrelated skills, project state and
service data alone. Stopping or taking down the Compose stack retains its named
volumes. A payload rollback does not reverse a database migration. Follow
[maintenance and recovery](docs/maintenance.md).

## Contribute and maintain

Read [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md) and
[CONTRIBUTING.md](CONTRIBUTING.md). Preserve provider schemas, upstream licenses,
attribution, protected scenarios and owner-controlled pins.

Complete the whole coherent production phase before authoring, modifying or
running tests, generation, builds or independent review. Then use local full
integration gates through real production entry points and collaborators. Hosted
CI, isolated unit results and historical platform receipts do not establish
acceptance of later work. Record exact source identities, commands, outcomes and
remaining limits before proposing a release or push.

Authored team runtime lives in `runtime/src/*.mts`; installed compiled `.mjs`
and generated payloads are reconciled at the final boundary. Published version
and compatibility decisions require owner approval. The original port analysis
and old measurements remain historical records, not current installation
promises.

Licensed under [MIT](LICENSE). Imported and adapted guidance retains its own
license and provenance records.
