## Context

See proposal.md for the observed problem. This is change 4 of the reviewed unified-tool-approval-authority plan. Boss build/integration-sources.json, actual integration binary manifests/native jobs and release handoff. Source and artifact metadata advance only together for produced platforms. Existing parent tasks own installers and site deployment.

## Goals / Non-Goals

Implement this vertical slice through its production entry points. Preserve unrelated WIP and upstream-friendly adapters. No replacement runtime, new daemon, general workflow engine or automatic crash continuation. Parent delivery scope remains intact.

## Decisions

align packaged inputs and return to parent acceptance
- library: cand-003; carries baseline and admission evidence forward.
- Depends on: uar-approval-lifecycle.
- Scope: accepted commits, Boss integration source/binary manifests, parent handoff and KBD evidence.
- Recommended agent: Codex / GPT-5.6-sol high. Est. complexity: M; complexity score: Medium; model class: medium (explicit operator execution-model override).
- Customer value: HIGH — the installer pipeline consumes the corrected code.
- Details: Commit the complete feature and updated source references, publish/pin the needed UAR native payload using existing release machinery, and give the parent one immutable checkpoint. Restore parent work without falsely completing its broader Gate V or installer acceptance.
- Acceptance: both required platform payloads identify the corrected sources, package selection cannot silently use c29af47be3, and parent tasks cite this child's evidence with remaining work explicit.


Use the phase plan and source inventory as the source-selection and ownership contract. Do not confuse a clean textual merge or published payload with installed acceptance.

### Reuse and evidence

- cand-003 (adapt): Existing integration-sources and tool/payload manifests. Extend existing manifest contracts, avoid a new registry or daemon. Evidence: Active Boss build/integration-sources.json pins UAR c29af47be3 and mini 86b2c7e1a7 while active source has later changes; UAR vendor Liter pin differs from mini.

## Risks / Trade-offs

- Dirty source or pin drift → preserve first and bind evidence to commits and binaries.
- Approval result mistaken for execution result → retain separate decision, claim and terminal identities.
- Cross-process failure → interrupted/outcome-unknown, never automatic write replay.
- Longer historical recovery → keep outside this child unless a selected dependency requires it.

## Migration Plan

Apply in phase dependency order. Keep prior source refs and known artifact manifests as rollback checkpoints; do not rewrite or delete unrelated work. Protocol v1 requires the corrected pair; incompatibility fails visibly rather than weakening authority. Backward-readable audit additions use existing persistence with additive versioning; audit history does not reconstitute execution authority. Complete the slice before its integration gate.

## Verification

Recorded immutable artifacts and manifest/handoff evidence; installed acceptance belongs to parent gates. Tasks are implemented using static reasoning; no per-edit unit loops.
