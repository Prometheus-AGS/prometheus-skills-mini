# Proposal: Bossfang UAR harness delegation

## Why

The current UAR LlmDriver invokes a full UAR execution beneath Bossfang's agent loop. A dedicated harness adapter must preserve one authoritative execution and an identified job attempt through approvals, stream interruption and cancellation.

## What Changes

- Reuse UAR C05 provider; link Bossfang C05.1–3 consumer work instead of creating a second authority.
- Persist attempt/admission/epoch and receipt/cursor without plaintext secrets.
- **BREAKING**: UAR-harness jobs bypass the completion-shaped LlmDriver and never silently fall back to it.
- Make interrupted observation, cancel acknowledgement, unknown effects and unsupported recovery explicit.
- Keep Codex/Claude comparisons as reference; do not rewrite unrelated adapters.

## Capabilities

### New Capabilities

- `job-harness-delegation`: Capability-gated job attempts with admission reconciliation and one execution loop.

### Modified Capabilities

None in this isolated specification home. Existing product specs remain authoritative in their repositories; Plan must map these coordinating requirements to repository-local deltas before any product apply. This is not a claim that all described mechanisms are new.

## Impact

Bossfang runtime dispatch, kernel job/task persistence and a new feature-scoped UAR harness adapter, with librefang-llm-drivers/src/drivers/uar.rs only for explicit route selection/compatibility. UAR C05 is a consumed interface; provider edits require an observed delta. F1/F5; cand-001, reference cand-006/007, reject cand-008. Depends on bauar-01 and bauar-02 contracts.

Only planning artifacts are written here. This local OpenSpec root does not authorize edits in sibling product repositories. Plan must bind repository-owned child changes to isolated source worktrees and resolve overlapping active work; no `kbd-apply` from this root may reach outside its allowed edit root. All implementation tasks remain unchecked. Source baseline, cross-change ordering, prerequisites and validation boundaries are recorded in the phase specification index.

