## Why

The operator hands an active KBD phase from one harness to another (for example Claude Code to Kimi Code). The handoff is written by hand today (`HANDOFF-KIMI.md` in kubo's `agent-backend-settings` phase) and nothing checks that the receiving harness can actually resume: open boundary obligations, a dirty or unpushed worktree, missing native role definitions and broken `kbd-*` skill links all surfaced only after the switch. The full pack's lease-based `kbd-handoff` was removed with the lease API (`prometheus-skill-pack` 8157450). Both packs now get the same lease-free contract; this change is the mini half, implemented in Node.js only.

## What Changes

- New skill `skills/kbd-handoff/SKILL.md` and entry point `scripts/kbd-handoff.mjs` (`--to <harness>`, optional `--phase <name>`, `--dry-run`).
- New library `lib/kbd/handoff/`: harness registry, read-only KBD state reader (`prometheus kbd status --json` with a timeout and closed stdin, else the projection files), target-harness checks, git worktree checks and the packet renderer.
- The command never edits `progress.json`, the waypoint or any canonical state and issues no lease command. It refuses (non-zero exit) on open boundary obligations or a missing phase, warns on dirty or unpushed worktrees, and writes one packet `.kbd-orchestrator/phases/<phase>/harness-handoffs/<harness>-<UTC>.md` with a `.json` sidecar.
- `scripts/kbd-handoff.mjs` joins the lifecycle entries that every plugin package ships; the KBD skills page lists the new skill.

## Capabilities

### New Capabilities

- `kbd-handoff`: lease-free, read-only harness handoff packet for the active KBD phase.

### Modified Capabilities

None.

## Impact

One skill, one entry point, one `lib/kbd/handoff/` module set, entry-level `node:test` coverage, docs page row, regenerated plugin packages. No new service, daemon, port or dependency; `versions.toml` is unchanged.
