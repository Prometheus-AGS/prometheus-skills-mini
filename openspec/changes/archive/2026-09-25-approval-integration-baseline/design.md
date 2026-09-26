## Context

See proposal.md for the observed problem. This is change 1 of the reviewed unified-tool-approval-authority plan. Boss active integration and tests/e2e/gates/uarExperienceGate.test.ts; UAR active integration and pnpm-lock.yaml; Liter crates/liter-llm/src/http/{eventstream,request,streaming}.rs and tower/service.rs where present after consolidation. Capture actual paths after refreshed baseline; no broad directory copy.

## Goals / Non-Goals

Implement this vertical slice through its production entry points. Preserve unrelated WIP and upstream-friendly adapters. No replacement runtime, new daemon, general workflow engine or automatic crash continuation. Parent delivery scope remains intact.

## Decisions

establish one traceable production source set
- library: cand-001, cand-002, cand-003; build_required: scoped checkpoints, Liter reconciliation, source/binary provenance.
- Depends on: NONE.
- Scope: Git/source ownership, required Liter dependency, Boss/UAR integration fixture and provenance.
- Recommended agent: Codex / GPT-5.6-sol high. Est. complexity: M; complexity score: High; model class: frontier (cross-repository semantic conflicts).
- Customer value: HIGH — prevents rebuilding or diagnosing a different implementation from the one being edited.
- Details: Preserve the 33-worktree inventory and unique WIP privately before modifying selected inputs. Consolidate active Boss/UAR and only their required dependency changes; correct Gate V's file_path fixture and its false success narration.
- Acceptance: exact production source inputs and executable provenance are recorded; one real catalog-to-tool baseline result retains the actual failed or successful tool result. A recorded known failure is acceptable here and does not count as product acceptance.


Use the phase plan and source inventory as the source-selection and ownership contract. Do not confuse a clean textual merge or published payload with installed acceptance.

### Reuse and evidence

- cand-001 (adopt): Existing Git worktree, commit and merge-tree mechanisms. Already installed, sufficient; no added consolidation framework. Evidence: Official source repository located via gh search repos; local Git is 2.54.0. [https://github.com/git/git] merge-tree inspects committed merge without changing index/worktree; actual simulations retained under research/consolidation/. [https://git-scm.com/docs/git-merge-tree]
- cand-002 (adapt): Existing KBD canonical state and replica/conflict interfaces. Preserve one shipping identity; independent convergence KBD identity remains separate. Evidence: Installed prometheus kbd help exposes replicas, conflicts, resolve, status and typed phase/stage transitions; mini conflicts are current-waypoint.json and position.json.
- cand-003 (adapt): Existing integration-sources and tool/payload manifests. Extend existing manifest contracts, avoid a new registry or daemon. Evidence: Active Boss build/integration-sources.json pins UAR c29af47be3 and mini 86b2c7e1a7 while active source has later changes; UAR vendor Liter pin differs from mini.

## Risks / Trade-offs

- Dirty source or pin drift → preserve first and bind evidence to commits and binaries.
- Approval result mistaken for execution result → retain separate decision, claim and terminal identities.
- Cross-process failure → interrupted/outcome-unknown, never automatic write replay.
- Longer historical recovery → keep outside this child unless a selected dependency requires it.

## Migration Plan

Apply in phase dependency order. Keep prior source refs and known artifact manifests as rollback checkpoints; do not rewrite or delete unrelated work. Protocol v1 requires the corrected pair; incompatibility fails visibly rather than weakening authority. Backward-readable audit additions use existing persistence with additive versioning; audit history does not reconstitute execution authority. Complete the slice before its integration gate.

## Verification

Preserved refs, recovery locations and source diff/ancestry records; runtime claims are demonstrated only at Gate B0. Tasks are implemented using static reasoning; no per-edit unit loops.
