# Boss task 9 — G2-02 sink diagnostic correction

Observed: finite G2-02 receipt reports mcp_sink_assertions and omits sinkDiagnostic. It retains final deferred/error correlated provider state. Source control flow reaches this stage only after the six eager/deferred success/isError/error profiles; G2-02 lacks explicit completed-profile receipts. All native cases remain unrun.

The old finishMcpSinkCapture returned only after six sink assertions; main assigned sinkDiagnostic after that return. Therefore a capture retrieval error or any sink assertion erased its comparison evidence. No raw log, credential fixture or excluded D0 source was read. The exact failed sink assertion and any actual leak remain unknown; missing evidence is not a leak diagnosis.

Changes (root-authorized owned helper family only):
- scripts/gates/bauar-secret-projection-mcp.ts adds a typed diagnostic callback invoked after capture retrieval and before every unchanged original sink assertion. Fixed counts cover observed logs/spans, canary-bearing logs/spans, redacted error logs, redacted input spans, redacted error spans and redacted success spans. Six fixed booleans mirror the original assertions exactly. No names, IDs, canary values, raw logs or content are exported.
- scripts/gates/bauar-secret-projection.ts initializes sink diagnostics before capture, includes eager/deferred authentication and model-input comparison booleans, and retains the bounded capture diagnostic. A null capture distinguishes failure before receipt of captured scalar observations. The typed finite profile receipt list now survives failure JSON; each profile is appended only after all its original assertions pass.

No leakage assertion, acceptance threshold, policy, product behavior or scenario changed. No leak fix claimed. Static readback only; no compiler/build/test/gate/formatter executed. Root owns compiler/source rebind and failed G2 rerun. Exact sink diagnosis awaits finite runtime evidence; native acceptance remains unrun.

Current bindings:
[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-mcp.ts",
    "sha256": "39a096af573c4f9f6f30e32af0a7cda17c2168c144a7c24f6701aa2eb3c24a6c",
    "lines": 323
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection.ts",
    "sha256": "8da48000c6323bb1f29d4d5ba5fe790a3bf95858f33ec3f86222e78a1f249b21",
    "lines": 472
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/G2-02-finite-failure.json",
    "sha256": "1d01695715cdf1c65cb11b555f4dd91a5dad2d6cb6727b3856864ba44edc0820",
    "lines": 48
  }
]
