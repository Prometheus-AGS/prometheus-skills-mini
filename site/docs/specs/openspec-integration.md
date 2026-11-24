---
title: OpenSpec Integration
sidebar_label: Overview
---

# OpenSpec Integration

Mini uses OpenSpec by default. Projects can select Spec Kit at initialization or keep native-kbd for existing native changes.

## What OpenSpec generates

```bash
openspec init --tools claude,codex,cursor,opencode --no-animation .
```

| Path | Contents |
|---|---|
| `openspec/config.yaml` | `schema: spec-driven`, plus project context encoding every hard constraint (Node-only, no shell, no Python, the two-services rule, etc.) so every generated proposal inherits them |
| `openspec/specs/`, `openspec/changes/` | Specs and changes, empty at init time |
| `.agents/skills/openspec-*` | 12 skills, written once (OpenSpec 2.0); Codex, Cursor and OpenCode read this root directly |
| `.agents/skills/.openspec-target` | The tools that own the shared skills |
| `.claude/skills/openspec-*`, `.cursor/skills/openspec-*`, `.opencode/skills/openspec-*` | Real directory copies of the 12 shared skills. Upstream links `.claude/skills` with symlinks; this repository never commits symlinks, so the managed refresh turns links into copies |

OpenSpec 2.0 generates no `/opsx:*` command files. Each former command is a skill of the same
name (`/opsx:propose` is `openspec-propose`, `/opsx:new` is `openspec-new-change`, and so on).

The OpenSpec CLI (`@fission-ai/openspec`, pinned exactly `2.1.0` in `package.json` and the managed runner; it needs Node.js 22.20.0+) is itself a Node
package, satisfying the Node-only constraint with no extra runtime.

See [OpenSpec lifecycle updates](/docs/kbd/openspec-lifecycle) for verify-only session start, phase-entry refresh, explicit overrides, offline behavior and backups. Generated tool counts depend on the selected OpenSpec version and profile.

## The SpecBackend contract

`lib/kbd/spec-backend.mjs` implements the six-operation contract every KBD spec backend must
satisfy, ported from the SpecBackend contract embedded in the full pack's `kbd-apply.sh`:

| Op | OpenSpec implementation |
|---|---|
| `detect` | `openspec/` exists; commands use the managed CLI |
| `list_tasks` / `progress` | `openspec instructions apply --change <c> --json` |
| `mark_done` | flip `- [ ]` → `- [x]` in `openspec/changes/<c>/tasks.md` |
| `verify` | `openspec validate <c>` |
| `archive` | `openspec archive <c> --yes` — `--yes` is mandatory or the CLI blocks on an interactive prompt |

### Choose an engine

| Your project | Select | Where the task lives |
| --- | --- | --- |
| New project or existing OpenSpec changes | OpenSpec (default) | `openspec/changes/<change>/tasks.md` |
| Existing Spec Kit specs, or a team choosing that format | Spec Kit 1.3.0 (`/kbd-init --spec-engine speckit` for a new project) | `specs/<change>/tasks.md`, next to `spec.md` |
| Existing native KBD changes | native-kbd | `.kbd-orchestrator/changes/<change>/tasks.json` |

An explicit project pin takes priority. Otherwise Mini detects OpenSpec, then Spec Kit, then native-kbd. An unavailable OpenSpec tool leaves its change with that engine. The Spec Kit adapter reads and updates Markdown directly. Its verification checks for the spec file and completed checkboxes. Archiving moves the change under `specs/archive/`. A structurally complete specification still needs evidence for its user outcome.

**Invariant kept from the full pack:** `kbd-apply` drives **per task**, and never calls a backend's
"implement everything" command. See [KBD Overview](/docs/kbd/overview).

## Windows note: the `.cmd` shim problem

npm installs `openspec` as `openspec.cmd` on Windows, which `child_process.spawn` cannot launch
with `shell: false`. `lib/platform/spawn.mjs` resolves the CLI's actual JavaScript entry point and
runs it directly with `process.execPath`, rather than turning the shell on. See
[Windows Constraints](/docs/platform/windows-constraints).

## Validating specs

```bash
node scripts/spec-validate.mjs
```

An entry point only — it resolves, runs, and forwards the exit code from OpenSpec's own validator,
using the same shell-free spawn helper.

## See also

- [KBD Overview](/docs/kbd/overview) — how `kbd-spec`, `kbd-plan`, and `kbd-apply` use this backend.
- [npm scripts](/docs/getting-started/npm-scripts) — `npm run spec:validate`.
