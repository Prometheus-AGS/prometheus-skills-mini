# UAR task 3 — actual executor claim and cancellation boundary

Canonical identity: bossfang-uar-authorization-and-execution::desktop-mcp-projection-acceptance / bauar-05-native-discovery-admission / backend task 3.

Status: production source implementation complete, static inspection only. No compiler, build, test, formatter or executable acceptance scenario ran. A2/A3 remain runtime-unverified until the complete delivery boundary.

## Scope and source identity

The sole UAR writer changed src/llm/orchestrator.rs and the coordinator-approved extra path src/uar/runtime/tool_admission/mod.rs. The additional mod.rs change is only is_cancelled(), a read-only view of the existing admission runtime token. Root recorded the exact amendment in the execution manifest and scope amendments before the edit. No new token, state store, task, production file, dependency, service or retry is introduced.

| UAR-relative path | Lines | SHA256 |
|---|---:|---|
| src/llm/orchestrator.rs | 3413 | c0e6186b949ad587f4c17f55bde95f8c85e4f0d17abbacee62c8fa526921d8a7 |
| src/uar/runtime/tool_admission/mod.rs | 932 | ed74ec7865fe92352726d4874e647da85f09f928d2c545c37e5d761eb187d1d9 |

Both source files were already over 500 lines; changes remain on the affected dispatch/admission responsibilities with no unrelated partition. Task 1 mod.rs hash remains a historical task-boundary identity; this record supersedes it for current source.

## Actual dispatch contract

prepare_and_admit_tool still awaits the task-1 claim operation before returning an admission. That operation persists intent and, for runtime_native, awaits exact consuming host acknowledgment. Its failure message now truthfully says claim refused/unconfirmed, or claim and cancellation unconfirmed; it no longer incorrectly asserts that local intent was never persisted after an acknowledgment loss.

ensure_tool_dispatch (orchestrator.rs:577) validates invocation and receipt kind against the actual branch and observes the existing run token at the final executor entry. On refusal it uses existing lifecycle cancellation, returning a fixed typed ToolDispatchBlocked error. The success path has no suspension between that observation and returning to the executor call.

- NativeSkill branch (637): native registry lookup completes first; runtime_native and current cancellation are checked immediately before execute_native. The existing verified owner, thread policy, terminal scope, artifact collector and presentation context remain passed through unchanged.
- BuiltIn registry branch (1099): the is_native_tool route inside call_mcp_tool requires runtime_native immediately before call_native_with_context. The function name does not classify this native executor as MCP.
- MCP transport branch (1105): requires host_mcp before the existing preflight or namespaced transport; exact receipt metadata remains forwarded and consuming MCP authority remains receiver-owned.
- Sandbox branch (2771): requires runtime_native after the actual native sandbox adapter builds its request and before bound scope.execute. Existing requires_sandbox, runner.enforces_isolation, explicit adapter and bound lifetime scope requirements remain intact; unsupported MCP sandbox execution remains refused.

The read-only token accessor is mod.rs:679. Inspected read-only native_skill.rs:279 and registry.rs:1704 confirm delegated verified-owner/policy checks remain inside their existing actual native entry points. No excluded D0 source was read or hashed.

## Truthful pre-dispatch and terminal outcomes

ToolDispatchBlocked distinguishes a body that was never entered from execution/terminal persistence failure. finish_tool_execution (609; called by both sequential and scheduled branches) skips host/local finish for that typed pre-dispatch outcome, preserving cancelled or consumed/unknown evidence rather than replacing it with finish(false). The direct registry fallback preserves this typed refusal instead of converting it to an ordinary failed tool result. The existing graph MCP caller also returns before finish on the same typed refusal, including its existing external cancellation observation.

Both main execution paths emit TOOL_DISPATCH_REFUSED for this fixed pre-body category and stop the tool loop. Actual canonical/terminal persistence errors retain TERMINAL_RESULT_PERSISTENCE_FAILED and are not replayed. Known executed success/failure continues through the existing terminal lifecycle. Consumed native cancellation retains task-1 unknown disposition; no rollback is claimed.

## Static evidence and remaining limitations

Read-only rg and Node source inspection followed the preparation, parallel scheduling, native/BuiltIn/MCP branches, sandbox execution, graph caller, terminal result emission and actual native delegation entry points. Node SHA256 and line counts bind exactly the two files above. These operations establish source identity and inspected control flow, not compilation or runtime acceptance.

Existing Rust skills and pins from task 1 remain applicable. No new library API, dependency choice, model route, executor implementation or external protocol beyond the frozen v2 contract was introduced. Guards trace to A1/A2/A3 requirements at the actual tool-execution and cancellation boundaries, with no speculative adjacent hardening.

Uncomfortable limitation: deterministic cancellation after acknowledgment but before body entry and actual UAR persistence faults still require the planned real-path controls; source inspection does not make those cases pass. Required manual/custom-port migration is deferred to canonical task 4, so full compilation is deliberately pending. No D0 diagnostics, KBD mutation, checklist updates, commits or publication occurred.
