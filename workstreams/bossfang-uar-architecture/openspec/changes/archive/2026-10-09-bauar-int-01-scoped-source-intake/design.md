# Design

## Context

See proposal.md for motivation. The phase intake evidence binds 126 UAR, 43 Boss and 72 Bossfang paths; all are working-tree deltas. The observed UAR target is a7cb972992d4f83db6585449ea81af0fe4a1c990; Boss target 822ed9990bd7626bbf76b04eeae184739c0f0655 retains two target-only commits. Bossfang old main 16beef0fcf3053970a901990df4fedbdf86bd87d is 279 commits behind accepted bac04.

The prior-context lessons constrain this design: capture actual working-tree content; separate implementation from certification; preserve application/server-owned MCP credentials. Existing authorization and delegation specs are unchanged.

## Goals / Non-Goals

**Goals:** a finite portable intake manifest, three recoverable isolated checkpoint commits, and a compatible cross-repository source set for the payload producer.

**Non-Goals:** adapting the completed implementation to old Bossfang main; rewriting any agent/auth contract; treating the 279 baseline commits as phase-authored or independently accepted; altering primary branches, published artifacts, services or generated canonical KBD files by hand.

## Decisions

1. **Reuse cand-001 scoped Git intake.** Generate candidate content only from the explicit approved inventory plus the chosen baseline. Preserve file bytes/modes and explicit deletion/absence. Stage/commit only that scope in isolated candidates. A source-tip merge misses the uncommitted delta; a whole dirty-worktree commit captures unrelated files.
2. **Reuse cand-002 established Bossfang substrate.** The pre-existing full-run client/types, correlation persistence, queue and observation contracts are present at bac04. The local candidate openly inherits this history. This is lower additional implementation work than an unknown prerequisite backport; it is not the smallest history delta against old main.
3. **Keep strict contracts paired.** Boss approval producers/callers and UAR root/full-harness decisions stay at the same candidate set. Bossfang remains the job orchestrator; UAR owns delegated model/tool/approval continuation. Model-only adapters return proposals; observations never execute. No runtime MCP defaults or implicit login-token forwarding is added.
4. **Receipt format is explicit.** Populate phase `source-intake.json` with schemaVersion 1, phase, snapshotTime, repository identities, acceptedBase/sourceHead/candidateBase/candidateCommit, candidateRoot, selected paths with operation/sourceSHA256/candidateSHA256/mode, target-only/inherited history, ownership and exclusions, retained evidence references and separate implementation/acceptance/publication statuses. A structured contract lives with the phase; no new product persistence schema or service is introduced.
5. **Implement first.** Source comparison/checkpoint receipts are intake mechanics, not runtime tests. No test authoring, product acceptance or implementation-review dispatch occurs before both changes' production source/pin wiring is complete. Deferred broad checks remain outside this implementation task list.

## Scope and ordering

Scope for product transfer is exactly the finite file list from `evidence/intake-comparison.json`; do not use unrestricted diff/status to expand it. Exclude UAR `tests/bauar_session_owner.rs` and `src/uar/mcp_server.rs` from direct inspection/hash/search/diff/test dispatch under the F6 withdrawal. Baseline inherited code is not a license to review or execute that withdrawn scenario.

Tasks 1.1–1.5 own source intake. Change 02 owns the later Boss local-UAR pin edit; its final Boss commit supersedes the source-only Boss checkpoint for packaging. One writer owns each candidate root; Plan records exact `codex/` branch names and reuse/create decisions before mutations. Any new integration repair outside this finite transfer is an observed deviation requiring a revised bounded scope, not silent adjacent cleanup.

## Risks / Trade-offs

[The newer Bossfang baseline has279 inherited commits] → disclose this in every candidate receipt and preserve old main; no wholesale shared-branch merge.
[Binding can become stale] → compare only declared inputs and explicitly reconcile changed owned paths; this traces to observed uncommitted/concurrent intake.
[Prior passes cover different source/artifact boundaries] → retain their original identities; no re-certification from byte equality.
[Unselected dependency compatibility remains unbuilt] → preserve current dependency authority and identify any actual compile failure at the coherent build boundary; do not introduce speculative fixes.

## Migration Plan

After approved Plan: assign isolated candidate roots, bind the manifest, capture the three deltas and checkpoint commits, then pass the set to change02. Keep original source indexes/worktrees and target refs intact. Rollback selects the prior candidate checkpoint or abandons the isolated candidate; do not reset another user's checkout or delete needed caches. Local generated commits require Assisted-by attribution, never Signed-off-by.

## Analyze candidate evidence retained by Plan

Reuse the selected candidates below; this is evidence from Analyze, not a new runtime verification. Exact candidate IDs map to the plan's library annotations.

### cand-001: Git scoped checkpoint and full-index binary patch intake

Verdict: adapt. Gap: intake-complete-working-tree. Reuse Git; assemble an explicit inventory checkpoint in isolation rather than commit the whole source worktree.

- Tier 1: Assess intake-summary.json:241 uncommitted selected paths,94 additions; HEAD-only transfer omits deltas.
- Tier 2: Three-way apply needs blob identities/available objects; full-index and binary patches supported. [Primary source](https://git-scm.com/docs/git-apply).

Risks: A tracked diff alone can omit untracked additions. Concurrent target changes require fresh binding; no apply/merge has run.

### cand-002: Accepted Bossfang baseline for isolated local intake

Verdict: adapt. Gap: bossfang-baseline-prerequisites. Explicit newer local candidate preserves implemented prerequisites and avoids inventing a minimal oldmain backport.

- Tier 1: intake-summary.json and evidence/analyze/bossfang-baseline-analysis.md:bac04 includes baseline delegation/projection infrastructure absent or changed at oldmain16beef0.

Risks: Accepted base includes279 commits beyond observed oldmain. Baseline choice does not certify integrated compilation/runtime.
