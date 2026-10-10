# Independent child acceptance review

Functional verdict: scoped local A1–A6 acceptance is supported by the inspected source and actual finite receipts. No new reproduced functional defect was identified in the reviewed paths. Certification remains blocked. This is a team review, not a formal adversarial pass.

## Blocking findings

### CRITICAL: Original mini QA still has seven failing blocking constraints

The actual QA report retains tests-pass plus six structural failures. Passing content schemas, packet integrity and scoped A1–A6 acceptance cannot discharge these original constraints. The documentation repair proposal is still unapplied. Confidence: high. Category: governance; no new product defect asserted.

Evidence: [qa/validation-result.json](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/qa/validation-result.json:230), [qa/validation-result.json](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/qa/validation-result.json:249), [qa/validation-result.json](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/qa/validation-result.json:350).

Action: Keep certification blocked. Resolve each constraint through its authorized scope and retain actual failed-gate rerun evidence; do not rewrite constraints or infer baseline exemptions. This reviewer does not authorize the pending documentation scope.

Falsifier: A later authorized repair and actual original-check evidence demonstrate that all seven failed constraints now pass.

### WARNING: The source inventory does not establish the literal whole-repository no-symlinks constraint

The manual receipt inspected 5,364 tracked and 1,144 nonignored untracked entries and found no symlinks. It explicitly excludes ignored dependency/cache files and submodule contents. That supports the stated source scope only; neither an observed symlink defect nor a whole-repository pass follows. Confidence: high. Category: coverage_gap; no new product defect asserted.

Evidence: [mini-manual-constraint-review-01.json](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/mini-manual-constraint-review-01.json:4), [qa/validation-result.json](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/qa/validation-result.json:321).

Action: Retain unverified status unless an authorized interpretation defines source-only coverage or authorized additional coverage closes the gap. Do not probe excluded UAR files or Bossfang to widen this review.

Falsifier: An authorized scope decision or complete permitted evidence establishes the actual required scope.

## Acceptance assessment

### A1: supported within stated scope

Strict v2 required executionKind, exact invocation and receipt binding, source-derived NativeSkill/BuiltIn versus MCP classification, owner/run/revision/args checks. Thirty-one synthetic host cases and nine approval matrix cases passed; these are host-contract evidence, not native-body executions.

Source: [src/main/ai/runtime/uar/toolAdmission/wire.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/toolAdmission/wire.ts:53), [src/main/ai/runtime/uar/uarHostClaimRevalidation.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/uarHostClaimRevalidation.ts:35), [src/uar/tool_admission/mod.rs](/Users/gqadonis/.claude/worktrees/bauar-uar/src/uar/tool_admission/mod.rs:475).

### A2: supported within stated scope

UAR persists claim intent before native consuming acknowledgement; Boss persists claimed state before replying; the ordinary claim endpoint remains nonconsuming. Concurrent/repeated claims consume once, finish requires claimed. Actual ordinary native cases and focused positive body calibration support this ordering. BuiltIn, sandbox and delegation dispatch remain statically preserved; not all native bodies were exercised.

Source: [src/uar/tool_admission/lifecycle.rs](/Users/gqadonis/.claude/worktrees/bauar-uar/src/uar/tool_admission/lifecycle.rs:215), [src/main/ai/runtime/uar/UarHostToolAdmission.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/UarHostToolAdmission.ts:288), [src/main/ai/runtime/uar/UarHostToolAdmission.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/UarHostToolAdmission.ts:403), [src/llm/orchestrator.rs](/Users/gqadonis/.claude/worktrees/bauar-uar/src/llm/orchestrator.rs:654), [src/llm/orchestrator.rs](/Users/gqadonis/.claude/worktrees/bauar-uar/src/llm/orchestrator.rs:2799).

### A3: supported within stated scope

Seven ordinary native cases cover preapproval cancellation, acknowledgement loss/hold, host terminal persistence failure, restart non-hydration, and two real UAR persistence faults. Focused postack EXIT0 adds calibrated body count one and actual-owner cancellation body count zero with dropped_while_held, accepted cancellation, durable consume one, finish zero, unknown reconciliation and successful cleanup. The later dispatch guard did not run in that cancellation outcome.

Source: [src/uar/native_skills/search_tools.rs](/Users/gqadonis/.claude/worktrees/bauar-uar/src/uar/native_skills/search_tools.rs:97), [src/uar/native_skills/search_tools_gate.rs](/Users/gqadonis/.claude/worktrees/bauar-uar/src/uar/native_skills/search_tools_gate.rs:88), [src/uar/native_skills/search_tools_gate.rs](/Users/gqadonis/.claude/worktrees/bauar-uar/src/uar/native_skills/search_tools_gate.rs:137), [src/uar/native_skills/search_tools_gate.rs](/Users/gqadonis/.claude/worktrees/bauar-uar/src/uar/native_skills/search_tools_gate.rs:227), [scripts/gates/bauar-post-ack-cases.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-post-ack-cases.ts:244), [scripts/gates/bauar-post-ack-cases.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-post-ack-cases.ts:255).

### A4: supported within stated scope

Six authenticated real-UAR profile receipts show eager discovery zero/target one/one exact approval/one target effect; deferred 32 eligible fillers, discovery one/target one/two exact approvals/one target effect. Five negatives passed. Four malformed correlation/advertisement cases validate the fixture against copied real UAR traffic, not UAR robustness against malformed history. Filler dispatch one and protected target zero fulfills the specified filler OR duplicate branch; duplicate dispatch was not run.

Source: [scripts/gates/bauar-secret-projection-provider.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-provider.ts:51), [scripts/gates/bauar-secret-projection-provider.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-provider.ts:85), [scripts/gates/bauar-provider-negative-cases.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-provider-negative-cases.ts:100), [scripts/gates/bauar-secret-projection-mcp-diagnostic.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-mcp-diagnostic.ts:101).

### A5: supported within stated scope

Nine event scenarios and finite projection evidence retain canary absence, exact approval authority and history correlation. Catalog tracing supplies identity-only serverId while the closure retains real configuration. Typed SDK reasoning_content maps to actual ReasoningDelta. Error responses use the approved generic failure/provenance predicate; marker absence is retained. The aggregate G2 process exited one before the final sink assertion; its nine saved source-computed fieldMatches are all true and match the separately checked source predicates. No raw sink arrays are reconstructed.

Source: [src/main/ai/mcp/McpCatalogService.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/mcp/McpCatalogService.ts:229), [src/llm/liter_driver.rs](/Users/gqadonis/.claude/worktrees/bauar-uar/src/llm/liter_driver.rs:638), [scripts/gates/bauar-secret-projection-mcp.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-mcp.ts:350), [scripts/gates/bauar-secret-projection-mcp.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-mcp.ts:366), [scripts/gates/bauar-secret-projection.ts](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection.ts:429).

### A6: supported within stated scope

All 34 child-owned current-file hashes independently matched source17. Source15 to source17 changes are only the postack helper and new focused entry point. Ordinary binary emission is source12; instrumented emission is source13, with explicit scoped rebindings, not a fresh whole-source17 build. The focused receipt records all 239 bound entries unchanged after execution. Payload12 lacked its application manifest and payload13 corrects staging with identical binary bytes. Local macOS development acceptance only; historical protected baseline has hashes, not exact prior bytes.

Source: [final-source-manifest-17.json](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/final-source-manifest-17.json:1), [G2-postack-02-bound-receipt.json](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/G2-postack-02-bound-receipt.json:1).

## Evidence interpretation

G1-02 actually exited 0: 31 synthetic-host cases plus nine approval matrix cases. G2-12 actually exited 1; it retains six passing profiles, nine event outcomes, five provider negatives and seven ordinary native cases. The final aggregate sink assertion was not reached. Inspection confirmed that the nine retained source-computed sink fields match the nine actual assertion predicates, and all saved values are true; the separate finite predicate disposition is narrower than an aggregate gate pass.

G2-postack-02 actually exited 0 for the two remaining approved cases on source17. The positive calibration reached the real search_tools body once. The cancellation case accepted real-owner cancellation after durable native consume and before release, recorded zero body entries and dropped_while_held, and retained unknown reconciliation with no finish or replay. Successful cleanup is present. This neither claims the later guard ran nor generalizes the body counter to all native tools.

The identity-only catalog span, generic transport-error predicate and typed SDK reasoning mapping are source-backed and consistent with the approved scope amendments. Four provider-negative checks mutate a copy of authenticated UAR request data at the fixture boundary. The filler case makes one real filler dispatch and zero protected-target dispatches; the unrun duplicate branch is not required by the stated OR requirement.

## Provenance and limits

All 34 child-owned current hashes matched source17 during this review. Source15→17 changes are limited to the postack helper and new focused gate entry. Ordinary and instrumented binary emission provenance remains source12 and source13 respectively, with scoped rebinding; this review does not claim freshly compiled whole-source17 binaries. The focused bound receipt reports all 239 bound entries unchanged after execution. Protected baseline hashes cannot recover exact before bytes or attribute all existing HEAD differences to the child.

Normal binary SHA-256: bfd2194f5942474082d71ede227e01fda356afd9e1d93257bdf847dfae2d5f4f. Instrumented binary SHA-256: 8dbb697d267b846e946abee8177c539e39feb0142696c4fbe646118ee047244c. Source17 manifest SHA-256: 1aff9c28a596b80b36bfb9bbf4dadd59fcc9d34bc2334333ee7da8cc0c73dcc9.

Payload12 omitted its application manifest; the staged payload13 correction retains identical binary bytes. The earlier null runtime error has no retained exact message, so its exact cause is not retrospectively certified.

QA packet schema/integrity success for 36 finite files and valid mini ports does not waive original repository constraints. The seven QA failures are certification blockers, not newly attributed child runtime defects. The 6,508-entry manual scan establishes no symlinks only within tracked/nonignored source scope. No additional scan was attempted. Exactly-two-services and reference-repo-untouched conclusions remain confined to the reviewed authored file list and temporary-fixture cleanup.

Formal adversarial review was not performed. Backend verify/archive, Reflect, child exit, parent completion, release/install, Windows and remote OAuth are not certified. Selected route was gpt-6-astra/high; actual served identity is unknown, so no cross-model independence claim is made.

The two excluded UAR diagnostics were not read, searched or hashed by this reviewer. The separately recorded earlier one-line source exposure remains disclosed and was not used. No raw/private/full logs or Bossfang source were inspected. No tests, builds, live probes, KBD mutations, service mutations or product edits were performed. The only output writes are these two assigned review artifacts.

Initial read-only metadata used the ambient Node v26.5.0 before it was detected; subsequent scripts used Node v24.14.1 LTS. This is a reviewer tooling deviation, not a product verification result. Review coverage focuses on acceptance-critical source, helpers and callers; it is not an exhaustive proof of every branch. The local Rust auditor skill was absent; no substitute formal-audit completion is claimed.

Frozen evidence hashes are recorded in findings.json. This review does not change the source freeze or canonical lifecycle.
