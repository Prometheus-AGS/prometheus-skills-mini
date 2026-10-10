# Boss task 4 projection caller handoff

Date 2026-10-07T12:21:09.249Z. Canonical child bossfang-uar-authorization-and-execution::desktop-mcp-projection-acceptance / bauar-05-native-discovery-admission / task4, remaining projection portion. boss-runtime; canonical task4 remains root-owned in progress.

## Edit

Only /Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-mcp.ts changed. Existing exerciseProjectedClaims manual invocation now explicitly binds executionKind host_mcp; actual SDK tools/call metadata copies that exact invocation kind. Both already import the shared version constant, now2, and post to bridge.toolAdmission.url, nowv2. Resolve/claim consumes the actual host-returned receipt intact, including kind; no manually rebuilt receipt or compatibility default. No new scenarios, policy changes or extra fields in unrelated schemas.

Current file 298 lines, SHA-256 7bd3364703b4aa1ca3f3a8e46349ce98bbd4618aafca699dd9c833b61358a275. This supersedes this file's task6 hash while preserving its selected-server profile wiring and all prior projection assertions.

## Finite Boss caller inventory

Read-only rg inventory covered src, scripts and tests TypeScript/TSX/MJS for exact admission paths, version constant, metadata key, managedMcpMetadata and tool_admission.

- src/main/ai/runtime/uar/toolAdmission/wire.ts: strict version/path/decoder owner (task2).
- src/main/ai/runtime/uar/UarHostToolAdmission.ts: prepared receipt producer, native/MCP consumer, imports and re-exports strict constants (task2).
- src/main/ai/runtime/uar/UarHostMcpBridge.ts: publishes version/path from owner; unchanged production caller transport.
- src/main/ai/runtime/uar/UarRuntimeConnection.ts: forwards bridge.toolAdmission directly. Its uar.run_policy version1 is unrelated and unchanged.
- scripts/gates/bauar-secret-projection-mcp.ts: this completed explicit host_mcp invocation + MCP metadata author; receipt is returned by host.
- scripts/gates/uar-exact-tool-admission.ts: existing synthetic invocation, receipt and MCP metadata authors; concurrently owned by boss_callers_v2, not edited here.
- tests/e2e/gates/bauarHostAdmissionDiagnostic.ts: existing admission URL observer and synthetic call author; concurrently owned by boss_callers_v2, not edited here. Initial inventory still observed /v1 while its writer was active, so root must reconcile the final sibling handoff before marking whole task4 complete.

The projection revision/event/turn modules observe or forward current data and do not independently mint admission version or receipt authority. Approval controller uses the distinct exact human approval API; store retains sanitized history and does not hydrate executable records. No further ordinary Boss protocol authors were identified in the bounded source search; this is not a claim about ignored/generated bundles or excluded peer files.

## Limits and next boundary

No compiler/build/test/lint/format or acceptance scenario authoring ran. New caller strictness is source evidence only until root's completed delivery compiler and G1/G2 gates. No excluded D0 file was opened/hashed; no UAR/Bossfang edit. Existing task2/5/6 changes and other writer paths are preserved. Root must combine this handoff with the separate G1/E2E and UAR task4 receipts, then freeze final production before task7. No KBD/team/checklist or commit mutation by this worker.
