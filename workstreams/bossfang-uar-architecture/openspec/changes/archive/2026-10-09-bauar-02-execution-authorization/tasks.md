# Tasks

> Current scope: operator removed F6/D0. Backend ordinals5 and6 are checked as closed-by-cancellation to preserve IDs and match canonical terminal status; their canonical status is CANCELLED, not a passing test or completed diagnostic. Task7 excludes the F6 matrix. See the phase execute-scope-amendment.md.

Repository child changes and exact write claims must be bound by Plan before apply. Author scenarios/docs with production changes; execute only at the complete shared delivery boundary, except the explicit unchanged-baseline F6 diagnostic below.

## 1. Root approval migration

- [x] 1.1 Resolve ROOT-APPROVAL-COMPATIBILITY: enumerate actual root approval callers/event contracts, strict cutover checkpoint and any operator-approved local exception. Verify a reviewed migration inventory exists; do not assume a compatibility window.
- [x] 1.2 After 01, preserve exact pending approval identity through UAR actor/thread/events/root response and retained C05 expected revision. Include missing/stale/foreign/replayed/cancelled decision scenarios and migration docs; verify the root cannot select pending authority by run alone.
- [x] 1.3 Update owned The Boss approval controller/lifecycle/response types and administrative forwarding to retain exact identity and reject unsupported old events. Migrate UAR remote_mcp_run_grants and principal_host/sidecar_process positive approval helpers to the originating event ID, preserving negative test intent. Include reconnect/edited-input scenarios and compatibility docs; verify no optional-ID fallback remains on migrated calls.
- [x] 1.4 Adopt cand-005 unchanged where conformant; fix only observed claim contract deltas. Include concurrent duplicate claim and lost-effect-response scenarios; verify one claim and explicit unknown outcome.

## 2. F6 diagnostic and conditional correction

- [x] 2.1 CANCELLED by operator — Execute F6-REPRODUCTION on the unchanged production /mcp/uar router with real JWT middleware, ordinary A/B tokens, valid sessions/protocol and private stores. Verify recorded POST/GET/replay/DELETE results, positive A/B controls, no A data/effect/deletion and the enforcing layer; do not use JWT-disabled test_config unchanged.
- [x] 2.2 CANCELLED by operator — If 2.1 reproduces crossover, implement the smallest owner/session correction covering all affected operations with its scenarios/docs. Otherwise record evidence-backed no-change closure. Verify the task outcome names either reproduced-and-corrected scope or the concrete denying layer; never mark a non-run branch passed.

## 3. Integrated authorization acceptance

- [x] 3.1 After complete selected production, run exact approval/claim/cancellation matrices against current UAR and The Boss integration. Verify every denial leaves the legitimate pending decision usable and effects counted once; retain historical evidence separately. F6 is excluded by operator scope correction.
- [x] 3.2 Run required repository build/checks at this completed boundary, record source/payload and platform limits, and reconcile existing shipping ownership. Verify no unrelated parent delivery gate is marked complete.

## Workflow follow-up

- Unsupported legacy clients remain visible; rollback must disable new admission rather than weaken strict remote authorization.

## Task model assignment reference

Execution model/route assignments and dependency batches are in [the phase plan](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/plan.md#task-model-assignments). Use full phase path bossfang-uar-authorization-and-execution, change bauar-02-execution-authorization, and numeric backend IDs 1–8 from kbd-apply list; displayed section ordinals remain part of the unchanged titles. Repository child worktree/ownership prerequisites remain mandatory. This reference is not a completion marker.


## 2026-10-09 — Operator directs implementation closure with verification deferred

Operator explicitly directs waiver and implementation-first/test-later closure. Remaining broad UAR regression/example/doctest batch, full cumulative independent delivery review and global formatting are deferred for later acceptance, not PASSED. Retain existing selected production-path acceptance, scoped checks, unsigned macOS package and external-current-UAR startup evidence. Close implementation/disposition tasks under this amendment; no shipping certification, deployment, external receiver acceptance or F6 reinstatement. Archive specifications and reflect with partial verification honestly recorded.

Authority: “Just waive it and continue. we can handle it later. That is my rule--implement first and test later. Go”

Tasks 02/8 and 04/10 now close by completed build/platform/ownership disposition plus the operator waiver, not by inventing passing broad checks. Certification remains incomplete/deferred. See evidence/execute/parent-resume-2026-10-08/operator-deferred-verification.json. No product code changes are introduced by this amendment.
