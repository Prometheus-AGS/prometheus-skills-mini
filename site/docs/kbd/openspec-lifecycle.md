---
title: OpenSpec lifecycle updates
sidebar_label: OpenSpec lifecycle
description: Pack-pinned OpenSpec 2.0 selection, phase-entry refresh, verify-only session start and recoverable update receipts.
---

# OpenSpec lifecycle updates

The pack is certified against **exactly OpenSpec 2.1.0** ([release notes](https://github.com/Fission-AI/OpenSpec/releases/tag/v2.1.0), [upgrade guide](https://openspec.dev/docs/upgrade-to-2)). `package.json`, `config/spec-engines.json` and the managed runner's `PINNED_VERSION` (`lib/platform/openspec/state.mjs`) carry the same exact pin. The runner never follows the npm registry past it: a newer release is reported as `newerAvailable`, a newer major as `migrationRequired`, and adopting either is a pack release (or an explicit operator pin). OpenSpec 2.1.0 needs Node.js 22.20.0 or newer, and the runner refuses an older Node with a failed receipt before installing anything. OpenSpec is the primary spec engine for new projects: `/kbd-init` runs the runner's `init` command (`node lib/platform/openspec/cli.mjs init --project <root> --tools claude,codex`), which reports `already-initialized` when `openspec/` exists. GitHub Spec Kit is the supported backup.

## What OpenSpec 2.0 changed

- **One shared skill copy.** Skills are written once to `.agents/skills/openspec-*`, and `.agents/skills/.openspec-target` records which tools own them. Upstream gives Claude Code one relative symlink per skill in `.claude/skills/`; Codex, Cursor and OpenCode read `.agents/skills` directly. Mini never keeps symlinks: after a successful refresh the runner replaces each link with a real directory copy and resyncs the copies in any harness skill root that held them before (`.claude/skills`, `.cursor/skills`, `.opencode/skills` in this repository). The receipt lists those paths as `materialized`.
- **No `/opsx:*` commands.** Each removed command has a skill of the same name: `/opsx:propose` → `openspec-propose`, `/opsx:new` → `openspec-new-change`, `/opsx:apply` → `openspec-apply-change`, `/opsx:verify` → `openspec-verify-change`, `/opsx:archive` → `openspec-archive-change`, and so on. Invoke a skill by name (`/openspec-propose` in Claude Code, `$openspec-propose` in Codex). KBD itself creates changes with the CLI (`openspec new change <id>` through the runner) and implements them only through `/kbd-apply`.
- **The first 2.0 refresh migrates.** `openspec update --force` removes the 1.x per-tool copies and generated command files. This one-time migration can take longer than a short budget; a `pending` receipt means: run the long refresh once (`--timeout-ms 120000` or more). Re-running is idempotent.
- **Never edit an `openspec-*` skill.** `update` overwrites it without a backup. Put project instructions in `openspec/config.yaml` (`context`, `rules`) or in a skill whose name does not start with `openspec-`.

## What OpenSpec 2.1.0 changed

- `openspec init --tools <ids>` installs skills globally by default in a new repository. The runner's `init` passes `--scope project`, so skills stay in the project.
- Installing or refreshing skills clones the OpenSpec repository, so it needs Git and access to GitHub. `refresh` asks `openspec update --dry-run --json` first (this works offline) and skips the update when nothing in the project would change. If an update is needed and the network is unavailable, the result is `refresh-unavailable` with exit 0, and phase entry continues with the skills already in place.
- `verify` reports `current` from the same dry run; 2.1.0 skills carry no `generatedBy` stamp.
- Node.js 22.20.0 or newer is required.
- On Windows the standalone OpenSpec executables are now labelled and signed, after an antivirus product had been removing `openspec.exe`. This pack runs OpenSpec through Node and was not affected. OpenSpec 2.1.0 has not been exercised on Windows from this pack.

## What updates automatically

Session start **verifies** and never mutates: the startup context hook runs the runner's `verify` operation, which compares the `generatedBy` stamp of each `.agents/skills/openspec-*` skill with the pinned version (and checks the pinned CLI is cached) and prints one line when a refresh is needed. A new session, including a harness switch in the middle of a phase, therefore cannot rewrite generated procedure text under a bound phase contract. The mutating refresh runs at phase entry: the new/next phase and child entrypoints run the longer refresh before lifecycle mutations. Stage instructions require the same preflight when the harness has no startup hook; raw canonical CLI use must follow that preflight too.

A project must have an openspec directory and a recognized KBD identity or waypoint. Unrelated directories are skipped. The runner invokes upstream openspec update --force to regenerate the configured agent skills and supported legacy integrations.

**Authored specifications are preserved.** This is not a semantic migration of specification prose, a fabricated schema-version rewrite or a replacement of KBD task identity. Existing project notes, missing configuration or observed authored-file changes can require explicit migration work. Validate the project's changes separately after resolving that prerequisite.

## Run the same CLI throughout a task

From this pack's source checkout:

```text
node lib/platform/openspec/cli.mjs verify --project /path/to/project
node lib/platform/openspec/cli.mjs refresh --project /path/to/project --timeout-ms 120000
node lib/platform/openspec/cli.mjs run --project /path/to/project -- list --json
node lib/platform/openspec/cli.mjs run --project /path/to/project -- validate change-id --type change --strict
```

In an installed package, locate the complete bundled helper directory through the installed skill. Preserve all helper modules together. The run command keeps OpenSpec stdout intact, including JSON, while lifecycle receipts go to stderr.

The managed installation lives under ~/.prometheus/openspec/versions. It executes the package's JavaScript entry with Node and shell disabled. Exact versions are installed without lifecycle scripts or binary symlinks. It does not upgrade project dependencies or global CLI installations. Mini retains its Node-only portability contract; Windows execution still requires independent runtime validation.

For a separately installed global CLI, use the package manager that owns that installation and verify every executable found on PATH. An npm-managed installation can be explicitly upgraded with npm install --global @fission-ai/openspec@2.1.0. A newer managed KBD CLI does not prove an older global shim was replaced.

## Availability and operator controls

| Condition/control | Behavior |
| --- | --- |
| Registry available | Install the pinned 2.1.0 if needed and probe its CLI version; record `registryLatest`, plus `newerAvailable` / `migrationRequired` when the registry is ahead. The selection never moves |
| Registry unavailable | Use the pinned version (installed if cached) and record `registryError` |
| Short refresh budget with insufficient time to install | Report pending (exit 75); complete the longer refresh before OpenSpec work |
| Concurrent managed operation | Report contention (exit 75); no parallel updater or background daemon |
| PROMETHEUS_OPENSPEC_HOME | Set a different managed cache, receipt and backup root |
| PROMETHEUS_OPENSPEC_VERSION | Pin an exact stable version at or above 2.1.0 instead of the pack pin; report operator-pin |
| PROMETHEUS_OPENSPEC_LATEST_URL | Replace the registry latest endpoint (isolated runs); affects reporting only |
| PROMETHEUS_OPENSPEC_DISABLE=1 | Record disabled refresh; managed run exits 2 without executing OpenSpec |

The normal refresh budget is 120 seconds. A short refresh budget never begins installation with fewer than 60 seconds remaining; session start only verifies and never installs. A timeout can leave partially regenerated files; use the recorded backup or retry after resolving the failure.

## Receipts and recovery

Before mutation, the selected OpenSpec package's own declarations identify generated files to back up, including legacy commands and relevant global generated configuration. An incompatible upstream API fails before update instead of guessing the update footprint. Authored specs, changes, configuration and KBD identity/waypoint data are fingerprinted for audit; the runner never rolls back another agent's authored edits.

Receipts live under receipts/project-hash with a latest.json pointer; backups under backups/timestamp-uuid contain a manifest naming original paths, saved copies and fingerprints. Retain them until the update is accepted. Inspect status, policy and newerAvailable: exit 0 alone can mean refreshed, skipped or explicitly disabled. Exit 2 signals a migration prerequisite or disabled run; exit 75 signals pending or contention.

After a hard-killed process, inspect the operation.lock owner before removing a leftover lock. Restore only the generated paths named in the backup manifest, accounting for later edits. Do not claim semantic compatibility merely because CLI selection or generated refresh succeeded.

## Release and publication

The lifecycle was already present in Mini 0.2.0 and Full 1.11.0. For the checkout in front of you, read Mini’s pack version in `package.json` and its selected engine version in `config/spec-engines.json`. Reload existing harness sessions after updating the pack. On machines using the full pack, distribute the full pack only and preserve custom harness configuration and the previous generation.

The GitHub Pages workflow builds the Docusaurus site and skills catalog after these changes reach main. Local builds validate content before publication; hosted deployment is not runtime certification. A PR alone is not evidence that the public site has updated.

See [Task model assignments](/docs/kbd/task-model-assignments) for the planning and execution contract.
