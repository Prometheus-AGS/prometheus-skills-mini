# Boss task 9 — G2-05 boundary diagnosis and complete bounded gate correction

Observed G2-05: six completed exact profiles; 24 tracer requests, 18 observed MCP spans, 6 canary-bearing spans, 6 redacted-input spans, 2 redacted error spans, 4 redacted success spans. No observed canary-bearing selected logs. All six exact-correlated provider results have canaryAbsent:true. Only transport error modes have original redacted/marker predicate false. These are actual finite observations; category attribution and generic omission were not measured in this attempt. Native cases remain unrun.

Source-established boundary: McpCatalogService.ts:222-244 passes full configured server to withSpanFunc(`${server.name}.ListTool`, MCP, listFunc, [server]); traceMethod.ts:64-69 JSON-serializes arguments into span.inputs. Thus configured credential headers cross into the catalog trace input. The scoped source search found this catalog caller and the already-projected McpRuntimeService.ts:1185-1195 target-call path. Exact attribution of the six measured canary spans still awaits the fixed category counts; no raw span names/content/IDs were printed.

Product correction proposal only (NOT implemented): at McpCatalogService.ts listToolsForServer, separate credential-free trace identity metadata from the original server used for the list/cache call, retaining the original server in the closure. This requires root scope amendment; the child currently has no product ownership there. A generic-tracer change is unnecessary. The existing universal marker assertion also conflicts with benign catalog input with no captured secret, and generic MCP error omission; it remains unchanged pending the root/operator decision.

Frozen owned changes:
- -mcp.ts tags observed spans only with fixed catalog_list (source suffix .ListTool), target_call (the two exact fixture names) or other_mcp categories. Per-category counts distinguish canary in inputs/outputs/status/events and redacted inputs. Every span still contributes to the original overall checks. The observer still delegates real provider/span/end and restores. No filtering.
- finishMcpSinkCapture captures/restores at the original point and emits finite diagnostics; assertMcpSinkCapture contains all six original assertions verbatim. Main defers those plus unchanged logical authentication/model-input/configured-credential predicates until after independent event/native/restart/storage cases and before receipt_write, using snapshots from the original boundary. Failure remains failure; no receipt can bypass the retained checks. Event exceptions/native exceptions still stop; safe completed event/profile outcomes and native progress remain in failure JSON. sinkDiagnostic is retained even for later non-sink failure.
- Provider diagnostic adds separate UAR [REDACTED] presence and genericMcpFailure/failureProvenanceMatches from the exact correlated tool result. Existing <redacted> predicate and its conjunction remain unchanged. The known fixture server.id is passed transiently, mapped by agentMcpServers.ts:78 to mounted name, forwarded at UarHostMcpBridge.ts:81-84; allowed UAR runtime.rs:878-900 uses definition name and projected provider_name in ToolFailed. For these ASCII fixture identities JSON quoting matches the Rust debug string template. Failure provenance compares status:error, exact existing tool_call_id/tool, source:mcp, terminal_state:failed, observed_by:trusted_host. Missing/non-JSON result yields false; unknown server yields genericMcpFailure:null. Only booleans emitted, no identifiers or messages. These observations do not waive any assertion.

Read c/evidence/execute/uar-task9-mcp-error.md in full. Its source anchors runtime.rs:439-441,878-900 and orchestrator.rs:1033-1064 underpin the generic diagnostic. No excluded D0 source, private log or raw credential fixture was read. Production files were read only.

Completion limits: static readback and source hashing only; no compiler/build/test/gate/formatter/service changes. Runtime category, generic omission and independent cases are unverified. No leak fixed or acceptance pass claimed. Root owns compiler/source binding, failed G2 rerun and any required source/oracle amendment. Source frozen after this handoff.

Bindings:
[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-mcp.ts",
    "sha256": "b02da13cfd40abfc0bb36b36eaa14cf556459bf902e4d76a7c736a96762589a7",
    "lines": 360
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-provider.ts",
    "sha256": "52e46efaea31f22b510fb30496eea76b3006f27f2866146e82685a37dcce772b",
    "lines": 136
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection.ts",
    "sha256": "1ccf77011308510b389b82ead28367d11fc27effcb6942cd58ed130b41f3610e",
    "lines": 479
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/mcp/McpCatalogService.ts",
    "sha256": "89525ad81216df26b37d96c917630a3f37af813d176ff980794713a15bae1972",
    "lines": 363
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/mcp/McpRuntimeService.ts",
    "sha256": "843f4bea1fcc0053eea07255791facc19f01cbe35132e7c5650e8695dee6a728",
    "lines": 1441
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/observability/core/traceMethod.ts",
    "sha256": "81c5ed1b4be4bf1438f799183bdea50d5682676e608fa66397062c59a626c5c7",
    "lines": 105
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/agentMcpServers.ts",
    "sha256": "8a38641eb9a57ce2fe38815c2268780513fce4e8dfb54719675b67bd91ce4a4d",
    "lines": 195
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/UarHostMcpBridge.ts",
    "sha256": "f084d4c7801098183982df7ac455fe78243aaa365f9a9f517322ad17948fc9f9",
    "lines": 223
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/G2-05-finite-failure.json",
    "sha256": "fa8c39b054dce3ec4e75e3ff40e0985b2956fedd738663bdf4206cd9f3afba96"
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/uar-task9-mcp-error.md",
    "sha256": "366dfef35300432b2b82af771928eb3b6ba7e1ecf58f7a09cabb5feed1b8867e"
  }
]
