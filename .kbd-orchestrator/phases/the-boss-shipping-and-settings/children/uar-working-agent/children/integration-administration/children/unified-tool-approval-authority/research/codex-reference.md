# Codex reference assessment

Inspected HEAD: 986ff1cc7ced0081ec5014b700a376333d87f869 at /Users/gqadonis/Projects/references/codex. Read-only source study, no builds/tests/network.

- core/src/tools/approvals.rs:495: common request_approval routes hooks, Guardian or user decisions. core/src/tools/orchestrator.rs:125: earlier Forbidden/network restrictions and later independent proxies remain authoritative. core/src/mcp_tool_call.rs:205: app tool disablement precedes approval.
- core/src/tools/orchestrator.rs:208: approval awaits before sandbox/execution over the same request. core/src/session/mod.rs:2637 registers pending identity before emission; :3203 removes waiter on resolution.
- codex-mcp/src/binding.rs:169 captures client, immutable config, tool metadata and catalog revision. :305 rejects stale catalog and retains read lease through execution. core/src/mcp_tool_call.rs:455 transforms hosted-file args after approval, so logical approval does not imply identical wire bytes.
- protocol/src/mcp_approval_meta.rs and core/src/mcp_tool_call.rs:1835 provide UI/routing metadata, not a cryptographic execution capability. app-server/src/bespoke_event_handling.rs:907 maps a separate JSON-RPC request ID to original approval identity.
- core/src/state/turn.rs:88 and app-server/src/outgoing_message.rs:104 hold live oneshot maps in memory. outgoing_message.rs:362 replays still-live requests; :457 removes callback for the first response; :425 cancels. request_processors/thread_lifecycle.rs:791 replays pending requests when resuming a running thread.
- core/src/mcp_tool_call.rs:1628 remembers server/connector/link/tool permissions without arguments only in Auto; :2086 normalizes remembered decisions in Prompt/Writes; :2142 persists config approval policy. This is not persistence of outstanding execution transactions.

Adopt correlated runtime-owned continuation, prepared catalog authority, independent enforcement, register-before-emit and single-consumption callback behavior. Do not infer distributed authorization receipts, crash-restorable pending decisions, rollback after cancellation or exactly-once remote effects. These would require additional Boss/UAR contracts.
