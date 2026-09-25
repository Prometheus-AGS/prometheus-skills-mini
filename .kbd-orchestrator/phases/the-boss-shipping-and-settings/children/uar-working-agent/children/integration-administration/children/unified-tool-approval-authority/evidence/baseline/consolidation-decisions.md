# Consolidation decisions

Captured: 2026-09-24

The private recovery snapshot in `preservation.json` precedes every decision below. No rejected hunk was destroyed without a private patch or untracked-file copy.

## The Boss

- Selected tree: `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar`
- Accepted checkpoint: `8143c393b6` (`fix(uar): preserve effective policy administration`). It retains the installation-scoped administrative principal, effective-policy inspection projection, and the observed bounded response to sidecar HTTP 429s.
- Accepted upstream merge: `298e76f707`, incorporating refreshed `origin/main` at `f1314b46ad` without conflicts.
- Quarantined and restored from the active tree: release-manifest formatting, release-script formatting, process/PATH/skill-copy formatting, SurrealDB formatting, generic integration-field formatting, MCP resolver formatting, and unrelated import ordering. These remain in the private recovery patch and are not part of the approval source set.
- Preserved outside this checkpoint: the untracked Gate V production-path fixture. It is owned by baseline task 1.3, where its descriptor and tool-result behavior are corrected before use.
- Preserved dirty nested input: `resources/prometheus-skills-mini`. The merge advanced the recorded submodule input while the nested repository retains its independent working state; this phase does not reset it.

## Universal Agent Runtime

- Selected tree: `/Users/gqadonis/Projects/prometheus/worktrees/uar-the-boss-sidecar`
- The feature branch already contained refreshed `origin/main` at `c29af47be3`; no synthetic merge was added.
- Accepted checkpoint: `de62d0b5ef` (`fix(runtime): retain effective run policy`). It exposes the complete effective run policy, uses configured provider context limits, and prevents the host governance bypass from erasing an explicit Ask or Deny policy.
- Rejected lock delta: the 2,541-line `pnpm-lock.yaml` change was generated while `frontend/packages/prometheus-entity-management` was uninitialized. It rewrote the A2UI link from the declared nested workspace to `frontend/packages/a2ui-react` and removed the missing workspace importers. It does not describe the repository's intended dependency graph, so it was restored. The pre-commit package install reproduced that local-only delta and it was restored again.
- Quarantined and restored: `rustfmt`-only edits in MCP/server/A2UI modules and integration fixtures. They carried no selected behavior and remain recoverable from the private snapshot.

## Liter LLM

- Original dirty tree preserved in place: `/Users/gqadonis/Projects/references/liter-llm` at `d27dfa235`, including independent `.prometheus/knowledge` work.
- Consolidation tree: `/Users/gqadonis/.claude/worktrees/liter-uar-host-transport`, branch `codex/uar-host-transport-v2`, based on refreshed `origin/main` at `928c41a6e`.
- Accepted credential-isolation adaptation: `52a0ea28b`. Conflict resolution kept upstream URL-redacted transport errors and upstream removal of raw tracing spans while retaining per-client proxy disablement, redirect refusal, and base-URL debug redaction.
- Accepted streaming/cancellation production adaptation: `046c998eaf`. The Tower service now forwards the already-owned static provider stream instead of buffering the complete response, preserving downstream backpressure and drop cancellation.
- Quarantined from the independent dirty tree: Karpathy knowledge/session files and the WIP live-test module. The production streaming correction was accepted; test execution and any gate fixture belong at the completed integration boundary rather than this source checkpoint.

## Pin rule

The UAR `vendor/git/liter-llm` gitlink moved only after `046c998eaf` was published to `origin/codex/uar-host-transport-v2`. UAR commit `3f564fefea` replaces `e627af981b`, whose host-isolation commit was based before the refreshed upstream merge and did not include incremental Tower streaming.
