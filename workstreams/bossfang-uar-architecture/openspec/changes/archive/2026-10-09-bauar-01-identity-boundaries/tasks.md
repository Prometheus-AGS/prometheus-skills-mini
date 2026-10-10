# Tasks

These coordinating tasks are NOT dispatchable from this planning root. Plan must bind them to repository-owned child changes/worktrees with exact files and immutable dependency checkpoints. All boxes remain unchecked. Verification below describes future completion evidence, not work performed in Spec. Per A-9, author relevant scenarios/docs with each production group but run integration only after the agreed complete delivery; no partial-code/unit-only certification.

## 1. UAR identity policy and storage

- [x] 1.1 Bind this scope to a UAR child change at an accepted source checkpoint; enumerate key storage backends and tenant/workspace authorization integration. Verify a file-ownership/schema-migration record reconciles current jwt-hardening/tenant specs and excludes other writers.
- [x] 1.2 Reuse cand-002 and implement explicit local/remote verifier configuration and required verified tenant/workspace policy. Include deployment/migration docs and invalid-claim/leeway scenarios; verify final diff covers admission with no anonymous remote fallback.
- [x] 1.3 Adapt cand-009 key issuance, persisted metadata, direct use and exchange to attenuated roles and retained owner/tenant. Include legacy-key reissue and unsupported exchange-mode behavior/scenarios; verify all record consumers and supported backends use the versioned contract.
- [x] 1.4 Enforce owner/tenant or explicit scoped-admin listing/revoke and bound exchange lifetime. Include revocation-window docs/scenarios; verify denied cross-owner requests cannot return metadata or mutate keys.

## 2. Host and JWKS authority

- [x] 2.1 Replace ordinary mintable-role host trust with authenticated typed launch/service provenance at host admission. Include legitimate-host and forged-role scenarios with registered destination/downstream-valid token; verify existing grant/destination/policy checks remain.
- [x] 2.2 Add single-flight bounded JWKS refresh using the selected 60/300/5-second policy; atomically replace keys and deny stale authentication. Include removal, same-kid replacement, outage and concurrent-unknown-kid scenarios and operational docs; verify no failed fetch advances last-successful age.
- [x] 2.3 After the complete shared delivery, execute the 01 real-router/key/verifier matrix and required repository checks once. Record source/configuration, actual outcomes and security limitations; rerun only failed gates after fixes. This task cannot complete from static or unit-only evidence.

## Workflow follow-up

- Preserve original shipping/C05 acceptance ownership; do not archive or claim phase completion from this task list alone.


## Task model assignment reference

Execution model/route assignments and dependency batches are in [the phase plan](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/plan.md#task-model-assignments). Use full phase path bossfang-uar-authorization-and-execution, change bauar-01-identity-boundaries, and numeric backend IDs 1–7 from kbd-apply list; displayed section ordinals remain part of the unchanged titles. Repository child worktree/ownership prerequisites remain mandatory. This reference is not a completion marker.
<!-- Failed-gate correction scope, 2026-10-06: required formatting check. -->

### Formatting correction within the active shared acceptance task

The observed check failed in 132 normalized files. Preserve unchanged baseline,
vendor and excluded D0/session-owner files. Correct the 23 new phase files only;
partition API key tests, identity cases/helper and secret scenario by responsibility
before formatting where the projected file would exceed 500 lines. Do not change
assertions, production contracts, credentials, feature profiles or scheduling.
Keep edited incumbent formatting debt visible; do not perform a broad rewrite.
Freeze exact handoffs after the complete correction batch, then check only owned
format/line limits and compile the selected integration targets. Preserve passing
runtime receipts; rerun a behavior scenario only if changed behavior or a failure
justifies it. Global inherited formatter failure remains failed, without a waiver.
No implementation counter or D0 task is reopened by this gate correction.

### Operator-approved task7 acceptance boundary — 2026-10-08T23:24:26.255Z

The operator approved the four-point identity-task7-disposition: accept the eight recorded real AUTH/KEY cases, scoped formatting/line and compiler/profile evidence for task7 and this coordinating identity change. Global formatting remains FAILED and unwaived; the broad T2 suite remains NOT RUN, both retained as parent-phase/release requirements. D0/F6, independent review, package/platform and original C05/shipping gates remain open. This amends only task7 completion scope; no archive, phase completion or Reflect handover is authorized. Evidence: `.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/evidence/execute/parent-resume-2026-10-08/identity-task7-acceptance.json`.
