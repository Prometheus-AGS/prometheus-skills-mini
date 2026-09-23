---
title: KBD Overview
sidebar_label: Overview
---

# KBD Overview

KBD (Knowledge-Based Development) is the lifecycle this whole pack exists to run:

```
Assess → Analyze → Spec → Plan → Execute → Reflect
```

`skills/kbd-process-orchestrator/SKILL.md` is the coordination and reference document — it has no
executable logic of its own. It documents the `progress.json` schema, the waypoint contract, the
hook taxonomy, and the sub-skill list; the actual work happens in the `kbd-<stage>` skills and the
`lib/kbd/` modules underneath them.

`analyze` and `spec` are **optional** stages: when no handoff exists for them, the stage-gate walks
back to the nearest earlier stage instead of failing.

## The state machine: `lib/kbd/`

Ten focused modules, each a Node port of a `shared/lib/*.sh` file from the full pack:

| Module | Ported from | What it does |
|---|---|---|
| `progress.mjs` | `progress.sh` (218 lines) | Canonical KBD completion semantics. `completion.implementation` is the only source for the implementation counter when present; legacy `changes_completed`/`changes_total` remain supported as aliases for pre-v4 ledgers. Evidence, certification, and publication are independent dimensions and must never be read as reducing implementation. |
| `waypoint.mjs` | `waypoint.sh` (226 lines) | Reads the KBD waypoint, renders the phase chain, resolves the on-disk node directory for an arbitrary-depth `path[]`, and validates worktree-root membership. Path canonicalization uses `fs.realpathSync`, falling back to `path.resolve` for a not-yet-existing child (the source's `cd && pwd -P` defeats a macOS `/var` vs `/private/var` symlink ambiguity that has no Windows analogue). |
| `stage-gate.mjs` | `stage-gate.sh` (243 lines) | Stage precondition gates and handoff artifacts across the six stages above. Returns `{ status, stdout, stderr }` rather than throwing, so callers can inspect remediation text directly. |
| `rollup.mjs` | `rollup.sh` (89 lines) | Aggregates child-loop progress up the ancestor chain: `rollupChildren(nodeDir)` recomputes one node's `children` block from each child's own `progress.json`; `rollupChain(root, path)` rolls up every ancestor along a path, deepest first. |
| `memory.mjs` | `memory.sh` (78 lines) | Normalizes any surreal-memory endpoint (a REST base or an MCP transport path like `/mcp/sse`) down to its service origin. |
| `memory-log.mjs` | `memory-log.sh` (83 lines) | Mirrors each hook fire into surreal-memory as a `kbd_lifecycle_event` entity. Every branch is soft-fail by design — a hook that touches a service always exits 0. |
| `hooks.mjs` | `hooks.sh` (419 lines) | The KBD hooks dispatcher: `hooksFire(kind, edge, name, index, total, ctx)` fires `<kind>:<edge>` lifecycle events from three layered sources (builtin → user → project, last wins on override), running each matched command and recording a JSONL log plus a rolling `hooks-status.json`. Hook commands never go through a shell — see `hook-command.mjs`. |
| `hook-command.mjs` | — (new) | The `runCommand` implementation every ported KBD entry point passes to `hooksFire`. Supports exactly one hook-command shape: a JSON string `{"program": "<name>", "args": [...]}`, spawned via `spawnExecutable` with no shell — the source's `bash -c "$command"` shell-string commands have no direct argv equivalent and are out of scope for this batch. |
| `bottleneck-guard.mjs` | `bottleneck-guard.sh` (37 lines) | Whether the `prometheus` CLI is on `PATH` and its installed version advertises the `guard` subcommand — a CLI that predates `guard` is treated the same as an absent CLI. |
| `check-child-scope.mjs` | `check-child-scope.sh` + `path-scope.sh` (102+ lines) | `PreToolUse(Write\|Edit\|MultiEdit)` **advisory** enforcement of a child loop's `scope.json`: writes outside a child's `allowedWritePaths` are flagged. This is hook-level advisory isolation, not an OS sandbox — the threat model is agent drift, not an adversary. Glob matching is a hand-rolled `matchesAnyGlob` rather than a `python3 -c fnmatch` subprocess. |
| `runtime-authority.mjs` | `runtime-authority.sh` (31 lines) | Whether `.kbd-orchestrator/current-waypoint.json` was produced by the canonical `prometheus kbd` runtime, versus a hand-authored or legacy projection. A missing file or unparsable JSON reads as "not authoritative," not an error. |
| `spec-backend.mjs` | the SpecBackend contract inside `kbd-apply.sh` | The six-op backend contract: `detect`, `list_tasks`/`progress`, `mark_done`, `verify`, `archive`, implemented for OpenSpec and native-kbd. The Spec Kit (`speckit`) adapter is detected but not implemented — `detectBackend` still returns `'speckit'` when on-disk evidence says so, but no `speckit`-specific operations exist yet. |

## `kbd-apply`: driving a spec backend one task at a time

`scripts/kbd-apply.mjs` (a port of `kbd-apply.sh`, 602 lines) is the KBD-owned spec-apply driver.
It wraps a spec backend — OpenSpec today, native-kbd as the always-available fallback — and drives
it **one task at a time**, so KBD stays the source of truth: every task boundary fires the KBD
hooks, emits a plain-text position signal, and syncs `progress.json` plus the waypoint.

**Hard invariant, preserved exactly from the source:** this driver never invokes a backend's
"implement everything" command (a bare `/opsx:apply` or `/speckit.implement`). It always calls the
backend per task.

Subcommands: `detect | list <change> | progress <change> | begin-task ... | end-task ... |
mark-done <change> <id> | verify <change> | archive <change>`.

## Position, waypoints, and recovery

The canonical runtime is `prometheus kbd status`; `.kbd-orchestrator/current-waypoint.json` is a
projection of it, never a source of truth on its own — `runtime-authority.mjs` is how code checks
which one it is looking at. `kbd-audit` provides a read-only causal view (exact position, lifecycle
history, plan revision, ownership, blockers, uncommitted work) without mutating anything, and
`kbd-status` reads `progress.json` to surface work completed by any tool across a session
(Antigravity, Roo, Cursor, Cline, Codex, etc.) — not just this one.

## See also

- [KBD skills](/docs/kbd/skills) — every `kbd-*` skill with its real description.
- [Adversarial Review](/docs/review/adversarial-review) — the QA gate that runs inside `kbd-assess`/`analyze`/`plan` (artifact mode) and `kbd-execute`'s per-change diff mode.
- [Karpathy Progress Memory](/docs/karpathy/progress-memory) — how boundary transitions are durably recorded.
