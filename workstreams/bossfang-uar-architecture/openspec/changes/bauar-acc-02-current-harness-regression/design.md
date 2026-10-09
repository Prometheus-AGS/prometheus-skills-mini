# Design

## Context

This tooling change intentionally skips spec deltas. See [proposal](proposal.md) and existing workstream contracts `job-harness-delegation`, `uar-principal-authority`, `mcp-resource-authority`, `execution-bound-authorization`. Existing gates use actual API/kernel hosts, real UAR, embedded Surreal persistence and bounded loopback model/MCP peers. The operator excluded F6 and production remote certification.

## Goals / Non-Goals

**Goals:** bind a finite existing scenario set to current sources/artifacts and preserve the model-provider / execution-harness / job-orchestrator separation.

**Non-Goals:** change product delegation, auto-select UAR for cron/ephemeral jobs, add durable restart recovery, duplicate the existing gate, invent production receiver/IdP/custody configuration.

## Decisions

1. Change 02 writes only `acceptance/harness-inputs.json` and `acceptance/harness-scenarios.md` in the active phase. Schema/coordinator/config implementation belongs solely to 03. Existing product gates run unchanged; no test is authored in this preparation task.
2. Exact harness entry point: Node 24.11.1 invokes `/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-gate.mjs` with argv `[apiHostTestBin,kernelTestBin,bundledUarBin,uarSource]`. Freeze canonical paths and digests in harness-inputs, including each host's source revision/features. Never choose a newest matching binary by filename alone. Existing API target `bauar_harness_host` and kernel target `bauar_harness_delegation` supply the real hosts. Plan names the concrete retained executables or missing-target build argv before Execute; gate itself does not build.
3. Supporting UAR batch: `cargo executable with literal argv ["test","--locked","--features","server-full,test-probes","--test","bauar_identity_boundary","--test","bauar_resource_grants","--test","bauar_stdio_boundary","--test","bauar_secret_projection","--test","bauar_full_harness_cursor","--","--test-threads=1"]`, cwd UAR. Cargo's CARGO_BIN_EXE_uar-sidecar binds the supporting test-feature sidecar. Use an isolated declared CARGO_TARGET_DIR and explicit toolchain/runtimes. This profile cannot replace bundled server-full acceptance. Require nonzero selected scenario counts; cfg-disabled/zero tests fail evidence completeness.
4. Real synthetic issuer/JWKS peers prove configured admission and tenant/key boundaries only. Resource peer proves configured destination/action/revision/lease and per-run snapshots; stdio proves captured environment/owned subprocess behavior. Do not report fixture results as an external production MCP/IdP deployment, and do not add a caller JWT forwarding requirement.
5. Single authoritative UAR loop, admission identity and execution-scoped cursor remain the basis of effects. Interrupted observation does not submit work. Lost acknowledgement/partial terminal persistence reconcile original identity. New runtime epoch yields unsupported/unknown; no automatic replay. Required durable recovery and unsupported job selection are actual rejected-capability controls.
6. Parent production completes before any runtime batch/build/review. Reuse prebuilt source-matching executables. If a missing host needs compilation, Plan enumerates only its existing test target/features, no workspace/all-tests gate. Do not recompile unchanged release UAR. Dependency-mutating operations and shared Cargo writers remain serialized.

## Risks / Trade-offs

- Supporting profile ≠ product bundle → record separately; actual packaged desktop required in sibling 01.
- Gate may be costly, e.g. JWKS hard-age checks → retain finite targets, one final batch; no reruns of already passed scopes absent changed inputs/failure.
- Negative result can reveal product defect → keep failed receipt; concrete plan amendment names the reproduced defect and files before expanding scope, then batch correction and rerun failed gate only.
- Historical remote specs contain unselected work → operator exclusions govern this phase; no historical spec rewritten and no remote closure claimed.

## Migration Plan

None. Existing execution/configuration behavior and earlier passes retain their boundaries. New evidence is additive and old sources/build inputs remain available.

## Acceptance and dependencies

See [verification](verification.md). 02/1.1 and 1.2 prepare immutable inputs before 03 production completion; 03/2.1 executes the final batch; 02/2.1 adjudicates its component receipts before readiness. Task-level ordering avoids a false whole-change dependency cycle.

## Plan reuse evidence

Plan references the existing Analyze candidates without reopening its research budget. 
- library: cand-003; ADAPT: Bossfang production-path full harness gate. Use current sources/binaries and preserve unsupported/unknown restart reconciliation without automatic replay. Evidence: [Accepts prebuilt API host/kernel test/UAR binaries and source; requires Node24; normal/stream interruption, cancellation, fault and restart cases.](/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-gate.mjs); [Private child environment, actual UAR/router and embedded operational persistence, controlled peers; no shared daemon startup.](/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-runtime.mjs); [Real kernel and production API router host.](/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/crates/librefang-api/tests/bauar_harness_host.rs). Risks retained: Standalone harness cannot certify packaged desktop bootstrap. Cron/deferred producers without selected JobAttemptRef remain native. Current candidate test binaries/features must be source-bound before use.

- library: cand-004; ADAPT: Eligible UAR real-boundary regression targets. Plan a finite current-source feature-specific gate; no whole-workspace sweep or invented JWT-forwarding requirement. Evidence: [Identity target gated by server and test-probes, distinct from production bundle features.](/Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_identity_boundary.rs); [Existing real stdio environment/child/stderr scenario.](/Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_stdio_boundary.rs); [Existing filtered cursor/reconnect and retention-gap cases.](/Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_full_harness_cursor.rs). Risks retained: Test-probes success is supporting regression, not production packaged certification. F6 excluded files may not be inspected or run; exact eligible targets required.

See [Plan](../../../.kbd-orchestrator/phases/phase-bauar-release-acceptance/plan.md). Proposed commands/runtime/input records remain unexecuted; task timing and source boundaries are governed by the full-production barrier.
