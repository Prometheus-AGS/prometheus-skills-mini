# Boss task 9 — G2-01 bounded gate correction

Observed completed-child failure: G2-01 finite receipt reports eager/success mcp_assertions failure. All existing fieldMatches are true, target correlated, target effect delta 1, and revisions match. It does not record approval counts or name comparisons, so the exact failed assertion is not runtime-observed.

Source-observed defect: AgentSessionRuntimeService.ts:2486-2492 emits tool-approval-request with approvalId and toolCallId only. The prior gate read chunk.toolName. UarToolApprovalController.ts:73 calls ensureToolInput before prompting, and UarAguiAdapter.ts:306-327 emits tool-input-start with the exact returned namespaced toolCallId and name. Therefore the prior gate cannot classify a target approval through the actual stream contract. This is a source-grounded explanation for the failed source assertion, not a claim that the absent comparison was captured in G2-01.

Correction (gate only, root-approved scope):
- bauar-secret-projection-turn.ts correlates each approval to exactly one prior tool-input-start in the current turn using exact toolCallId, and records the matched name transiently. Missing/duplicate input matches do not produce a classified name.
- bauar-secret-projection-mcp-diagnostic.ts preserves every existing exact approval request/decision ID, uniqueness and count assertion, and adds the exact single-input correlation assertion. Its finite diagnostic reports expected/request/discovery/target/unique request/decision/correlated request counts and fixed comparison booleans only.
- bauar-secret-projection.ts passes the current approval capture and target into the diagnostic before assertions. No raw chunks, names, IDs, credentials or canary are added to evidence.

Static readback completed. Changed source files have 117, 137 and 467 lines respectively. All other prior production/scenario edits are preserved. No product, policy, persistence, provider loop, cap, transport or approval decision behavior changed. No new fallback, retry, security/product guard, test scenario or compatibility path.

Verification limit: no compiler, build, test, gate, formatter or executable acceptance scenario run by this worker. Root owns C-main/source rebinding and failed G2 rerun. Approval correlation at runtime and G2 outcome remain unverified. All native fault cases remain unrun. Excluded D0 sources and private logs/raw fixtures were not opened.

## Current source bindings

[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-turn.ts",
    "sha256": "fc0f9b44f5108b1f84e1d2aeb1def092aecf7c5e0ce56f8336c2a9b1b53c3a90"
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-mcp-diagnostic.ts",
    "sha256": "bf41dd56167c7229602d22b06a820a73e1f3d41a282e408076c9d98cfd1f8246"
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection.ts",
    "sha256": "cb6e8d8d4b49c74a81c2be66b39ff8b3a5d0db732bdaa2378d7efa92c3b341f1"
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/agentSession/AgentSessionRuntimeService.ts",
    "sha256": "168e767394245841da933e75d187803e76ea95445e41835b1f1837f458fced49"
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/UarToolApprovalController.ts",
    "sha256": "74bec6dbd5b054cc7b1a5b5372393d1d51e8445e4b46b6f54c93739ddadf187c"
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/UarAguiAdapter.ts",
    "sha256": "d233bc2074337d8d84142c45232d4c41bf8d0a10c7a25a197832fc81ce0f178b"
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/G2-01-finite-failure.json",
    "sha256": "ac07f1bd68fe95ad42b89a0bf4e0e877325d8332458d68ef7c15e9b0813a284b"
  }
]
