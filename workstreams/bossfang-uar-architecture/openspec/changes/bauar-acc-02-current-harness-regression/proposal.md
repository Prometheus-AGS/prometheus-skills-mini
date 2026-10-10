# Proposal

## Why

Earlier harness and authorization evidence is source/profile-specific; the newly bundled release has not completed the deferred eligible regression. Reuse the existing real API/kernel/UAR integration path and finite targets to close that evidence gap without changing execution ownership.

## What Changes

- Prepare a source-bound manifest of existing harness entry points, binaries and five eligible UAR integration targets.
- Reuse real embedded persistence, controlled model/MCP peers and fault proxy scenarios for delegation, approvals, interruption, reconciliation and native compatibility.
- Document test-profile versus packaged-profile limits and excluded paths.

## Capabilities

### New Capabilities

None. This change is bounded verification tooling/documentation for existing behavior; `skip_specs: true` is deliberate.

### Modified Capabilities

None. Acceptance applies existing `job-harness-delegation`, `uar-principal-authority`, `mcp-resource-authority` and `execution-bound-authorization` contracts. There is no new provider/recovery/security behavior.

## Impact

scope: new phase `acceptance/harness-inputs.json` and `acceptance/harness-scenarios.md`; no product source edits planned. Existing gate `/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-gate.mjs` and companions are invoked unchanged. A reproduced product defect requires a concrete bounded plan amendment before expanding owned source paths; a failing gate is never relabeled success.

Owner: change 02 owns harness manifest/scenario inventory. Change 03 owns executable coordination and receipts, avoiding shared-file writers. Node 24 is selected for Bossfang gate children. Builds, scenario authoring/execution and review happen only after the full parent production boundary.

## Phase boundary

Phase: `phase-bauar-release-acceptance`. Spec only; implementation awaits explicit Plan handover. [Prior context](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/prior-context.md) requires locked dependencies, matching child runtimes, retained rollback inputs and separate implementation/build/acceptance/publication evidence. [Analyze](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/analysis.md) is intent; its candidate decisions are reused, not proof of successful operation.

The inherited OpenSpec context says all F1–F7 and remote deployments. Later operator decisions override that context: F6 is cancelled; its two excluded UAR files must never be read, searched, hashed, diffed or tested. Remote receivers/IdP/custody and automatic UAR scheduling are excluded. Application/server configuration owns MCP credentials; no caller-JWT forwarding theory is reopened. No installed-cache edits, dependency/pin changes, service takeover, publication or shipping/C05 advancement.
