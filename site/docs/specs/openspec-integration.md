---
title: OpenSpec Integration
sidebar_label: Overview
---

# OpenSpec Integration

OpenSpec is this pack's spec backend and planning system by binding constraint
(`openspec/config.yaml`), not merely a preference. **There is no ZeeSpec** — no `.zeespec/` gate is
read anywhere in this repository, and none may be reintroduced.

## What `openspec init` created

```bash
openspec init --tools claude,codex,cursor,opencode --no-animation .
```

| Path | Contents |
|---|---|
| `openspec/config.yaml` | `schema: spec-driven`, plus project context encoding every hard constraint (Node-only, no shell, no Python, the two-services rule, etc.) so every generated proposal inherits them |
| `openspec/specs/`, `openspec/changes/` | Specs and changes, empty at init time |
| `.claude/skills/openspec-*` + `.claude/commands/opsx/` | 12 skills, 12 commands (Claude Code) |
| `.agents/skills/openspec-*` | 12 skills (Codex — skills only, no commands) |
| `.cursor/`, `.opencode/` | 12 skills + 12 commands each |

The OpenSpec CLI (`@fission-ai/openspec`, pinned `1.10.0` in `package.json`) is itself a Node
package, satisfying the Node-only constraint with no extra runtime.

## The SpecBackend contract

`lib/kbd/spec-backend.mjs` implements the six-operation contract every KBD spec backend must
satisfy, ported from the SpecBackend contract embedded in the full pack's `kbd-apply.sh`:

| Op | OpenSpec implementation |
|---|---|
| `detect` | `openspec/` exists **and** `openspec` resolves on `PATH` |
| `list_tasks` / `progress` | `openspec instructions apply --change <c> --json` |
| `mark_done` | flip `- [ ]` → `- [x]` in `openspec/changes/<c>/tasks.md` |
| `verify` | `openspec validate <c>` |
| `archive` | `openspec archive <c> --yes` — `--yes` is mandatory or the CLI blocks on an interactive prompt |

**native-kbd** (a `tasks.json` file) is the always-available fallback when the OpenSpec CLI is
missing. **Spec Kit (`speckit`)** is detected (`detectBackend` still returns `'speckit'` when
on-disk evidence — an explicit pin, or `specs/*/tasks.md` — says so) but has no implemented
operations in this pack; `kbd-apply`'s own upstream behavior already treats `speckit` as a no-op for
`verify`/`archive`, and porting its markdown-checklist parsing was judged out of scope for the batch
that ported `kbd-apply`.

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
