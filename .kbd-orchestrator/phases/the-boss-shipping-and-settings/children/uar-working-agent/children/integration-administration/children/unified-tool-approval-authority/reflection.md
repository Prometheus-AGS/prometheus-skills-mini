# Phase Reflection: unified-tool-approval-authority

**Project:** prometheus-skills-mini coordinating Universal Agent Runtime and The Boss  
**Date:** 2026-09-25  
**Phase completion:** 100%  
**Changes completed:** 4 / 4

The main divergence was in delivery rather than the approval architecture. The first p1.14 native payload attempt exposed that the A2A build depended on an unprovisioned `protoc`; the fix pinned `protoc-bin-vendored = "=3.2.0"`, and replacement p1.15 payloads were built and published from the same UAR source for Windows x64 and Apple Silicon. A separate process defect also appeared at closeout: canonical task 4.1 was already in progress without the matching bottleneck start receipt. The start receipt was reconstructed from the active canonical boundary before task completion, rather than bypassing the guard.

## Goals

| Goal | Status | Notes |
| --- | --- | --- |
| Preserve UAR as effective run-policy and continuation owner while The Boss retains stricter host authority | MET | The prepared-admission contract composes both authorities restrictively; either denial stops dispatch and either Ask requires the recorded human decision. |
| Bind approval to the exact host-bound tool invocation | MET | The delivered v1 envelope binds invocation, root/executing run, owner, workspace, runtime/host epochs, catalog/server/tool identities, policy revisions, arguments and host digest. The Boss atomically claims the matching admission before forwarding the call. |
| Prevent duplicate or silently reused authority across reconnect, cancellation, descendants and restart | MET | Live reconnect reuses the same pending identity; cancellation and lineage checks are explicit; generation changes invalidate old authority; dispatched work without a terminal receipt becomes `outcome-unknown` and is not retried automatically. |
| Keep decisions and sensitive authority main-process scoped while providing useful approval UI | MET | Renderer contracts expose safe action projections and opaque decision identity. Final review fixed shared-installation attribution and missing accessible names/status feedback. |
| Prove the complete production path once, without unit-test loops | MET | Final Gate V passed across two Boss conversations and the packaged Apple Silicon sidecar. It covered exact MCP authority, an approved filesystem effect, reconnect/terminal evidence, shared-resource attribution, knowledge, A2A/ACP, administration adapters and responsive/accessibility behavior. |
| Feed corrected customer-platform inputs back to parent delivery | MET | UAR p1.15 archives are published for Windows x64 and Apple Silicon from `0f2ea3d4a8111bea3a425bfb6596acbc9fb09d26`; The Boss `42052486566adf90ef433353d60ac8f2bd49ca7a` pins both immutable URLs and checksums. |

## Delivered Changes

- `approval-integration-baseline` — preserved and reconciled the actual Boss/UAR source set, corrected the filesystem descriptor fixture, and recorded executable/source provenance. (by: Codex)
- `uar-exact-tool-admission` — replaced FIFO event-funded bridge authority with exact prepared admission, restrictive policy composition, safe UI projection and one-time host claim. (by: Codex)
- `uar-approval-lifecycle` — added owner-scoped pending replay, root/child cancellation and revocation, epoch invalidation, persisted claim intent, terminal receipt and explicit interrupted/outcome-unknown behavior. (by: Codex)
- `approval-delivery-checkpoint` — committed and pushed source changes, published both p1.15 native sidecars, pinned them in The Boss, refreshed the bundled mini/Compass skills, and recorded the parent handoff. (by: Codex)

## Artifact Quality Summary

| Metric | Value |
| --- | --- |
| Changes with per-change artifact-refiner logs | 0 / 4 |
| Cumulative phase integration gate | PASS |
| Cumulative independent review | PASS_AFTER_FIXES |
| Review findings | 0 critical, 1 high resolved, 1 medium resolved |
| OpenSpec verification/archive | 4 / 4 |

Per-change QA was deliberately absent because the active project rule requires implementation of the complete phase before one cumulative integration and review boundary. The retained cumulative receipts are `evidence/gate-v.json`, `review/final-findings.json` and `review/final-responses.md`.

## Technical Debt

- Installed Windows x64 and Apple Silicon application acceptance remains in parent tasks 5.3–5.5. This child proves the packaged sidecar and integration path; it does not prove installation on the customer Windows machine.
- Process restart recovery is deliberately fail-closed. A claimed invocation without a terminal receipt is shown as `outcome-unknown`; arbitrary external effects are not automatically retried and cannot be promised exactly once.
- The KBD bottleneck ledger had no start receipt for task 4.1 even though canonical runtime state already named it as active. The receipt was repaired at closeout, but the initiation path that wrote `uta-delivery-4-1-start-20260925` should use the guard-aware task driver in future phases.
- GitHub Actions reported that `actions/download-artifact@v6` still targets the deprecated Node 20 action runtime while GitHub forces Node 24. It did not affect the payload, but release workflow maintenance should update the action when its publisher provides a current runtime.

## Architecture Integrity

- AGENTS.md violations: NONE found in the completed phase. Production implementation preceded the single final integration/review boundary; generated rules and `versions.toml` were not edited.
- Constraint violations: NONE found in the phase artifacts. The four OpenSpec changes verified and archived successfully.
- Security boundaries preserved: provider arguments are validated before admission; Boss recomputes and checks host-effective arguments; host restrictions cannot be weakened; renderer replies cannot mint authority; pending authority is invalidated on epoch change; secrets and authoritative arguments remain outside renderer/log projections.

## Cross-Tool Coordination Notes

- Progress tracking: GAPS FOUND — source and runtime state were generally reliable, but task 4.1 lacked the bottleneck start receipt. Guard repair reconciled it before completion. The final runtime projection reports 4/4 implementation complete.
- Handoff quality: CLEAR — the source baseline, final review, Gate V receipt, native payload provenance and parent ownership are separated. The handoff explicitly avoids treating child success as installed acceptance.
- Recommendations: start every task through `kbd-apply begin-task`, retain exact source commits in build manifests before native dispatch, and keep native platform jobs independent while serializing only shared release metadata.

## Lessons Learned

- A host-facing approval must authorize a prepared invocation, not a UI event, an argument hash, or a FIFO credit.
- Restrictive composition lets UAR and The Boss keep independent authority without creating two competing approval systems.
- Reconnect and restart are different products: live reconnect can reattach to an existing waiter, while restart must invalidate executable authority unless durable continuation is explicitly designed.
- A build fixture that narrates success after any tool-role message can hide the decisive error and waste hours; integration evidence must retain the actual tool result.
- Native payload manifests must identify the exact source commit. An unchanged version string cannot prove that a corrected binary contains the fix.
- Platform release jobs need self-contained build dependencies. Vendoring `protoc` removed runner-specific provisioning from the UAR payload build.
- Build-time skill synchronization is a source update in The Boss because `resources/skills` is tracked; commit it explicitly so installed skill inventory matches the pinned mini and Compass payload.

## Next Phase Focus

Return to `integration-administration` with three immediate priorities:

1. Apply the completed Gate V receipt to parent task 8.5 and finish only the remaining production administration items that Gate V does not already prove.
2. Build and publish The Boss 2.2.0 installers for Windows x64 and Apple Silicon from manifest commit `42052486566adf90ef433353d60ac8f2bd49ca7a`, then update `RELEASES.md`, the GitHub Release and the live landing site.
3. Complete installed Apple Silicon acceptance locally and obtain operator-confirmed Windows x64 acceptance; fix and republish only the affected platform if either fails.

The separate Agent Fabric Convergence initiative should consume this exact-admission and lifecycle contract as a foundation for multi-agent orchestration. Its documentation branches are prepared, but implementation remains outside this child and must not delay the two customer-platform installers.

## Context for Next Phase

Use this file, `handoffs/parent-reentry.md`, `evidence/gate-v.json` and `evidence/delivery-checkpoint.json` as prior context when resuming `integration-administration`.
