# Boss task 5 implementation handoff

Date: 2026-10-07T12:04:46.897Z. Canonical identity: bossfang-uar-authorization-and-execution::desktop-mcp-projection-acceptance / bauar-05-native-discovery-admission / task 5. Role boss-core boss-runtime; task start reported canonical revision223 and team revision18. Implementation/source evidence only, not runtime acceptance.

## Implemented contract

The existing controlled HTTP provider now owns one finite ProjectionProviderConversation per actual tool turn/session. It selects the exact expected provider name derived with the production encoder from the actual selected server ID and read_projection. It only proposes a name found in the received advertised tools, never selects by suffix.

If the target is initially advertised, it proposes it once. Otherwise it requires the actual advertised search_tools and proposes exactly one discovery call with the exact target provider name as the unique query. It requires that discovery's matching assistant call and tool result, then the target in the later advertisement, before proposing the target once. The query matches the inspected current native exposure search contract (exact provider-name ranking), without changing visibility/caps or running a tool in the provider.

Each proposed call has a fresh random UUID. Only history after the latest user message participates, so prior-turn fixture results cannot complete the current target. Every expected assistant call.id and function.name must match; exactly one tool.tool_call_id must match and follow its assistant call. Missing, duplicated, unrelated, out-of-order or substituted history fails with a fixed category. Normal completion occurs only after the exact current target result; only that result contributes the existing redaction check. Additional requests after completion fail. No additional loop, executor or retry was introduced.

Finite diagnostic state contains only modes, states, fixed failure categories, counts and booleans. No received payload, credentials, query, server ID or call ID is written to evidence. Protocol failures return a fixed HTTP400 error rather than a normal assistant completion, and any recorded conversation failure prevents the successful gate receipt. Existing benign streaming, controlled provider failure, MCP modes and projection assertions remain. Approval event turns receive a fresh conversation as well.

## Exact source inventory

- /Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection.ts: 430 lines; SHA-256 638335c27d77a153606311c7054a6c744962bba666b96229c89815a653d317e3
- /Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-provider.ts: 115 lines; SHA-256 06375ae5ee30f7ea38319d36041fcb04ae0cb0c46aac1567a0dea9818069831f

The new provider module was recorded by root in execution-manifest.json and evidence/execute/scope-amendments.json before creation: the prior main was419 lines and the cohesive finite conversation would exceed500 there. The module is fixture behavior, not a new executable acceptance scenario. No other task5 source file was edited.

## Static source basis and limits

Read scripts/gates/bauar-secret-projection.ts, -mcp.ts, -turn.ts, -mcp-diagnostic.ts; production uarToolNames.ts and agentMcpServers.ts ground selected-server encoding; UAR src/uar/runtime/native_skills/search_tools.rs grounds the reserved name/query schema and src/mcp/exposure.rs grounds exact provider-name search. The native tool is BuiltIn, model-only; real UAR still executes it. No excluded D0 source was accessed.

Task6 still must configure deterministic eager/deferred selected-server catalogs and source-specific counters; existing one-preparation assertions intentionally remain until that authorized task. Task4 still owns manual v2 authors. No compiler, build, lint, unit test or gate ran, and no new executable acceptance scenario was added. The actual advertised/history serialization and correlated completion remain unverified until the complete-child G1/G2 boundary. No inference about the historical runtime12 failure is made.

No dependencies, service ports, defaults, approval policies, sandbox policy, UI, Bossfang or publication changes. Existing dirty work and task2 work were preserved. Root owns canonical/team mutations, commits, later acceptance and next task assignment. This worker stops after task5.
