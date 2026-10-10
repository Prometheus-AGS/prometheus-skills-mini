# Boss task 9 — G2-04 observer correction and model-input diagnostic

Observed G2-04: all six exact eager/deferred success/isError/error profile receipts persisted; all target effects 1, filler effects 0, exact approval decisions and revision counts correct. Sink captured 10 logs, 0 spans; canary-bearing logs 0; redacted error logs 4. Aggregate allModelInputsRedacted false. These facts do not prove a leak or locate the missing marker by mode. All native cases remain unrun.

Source-grounded observer defect: package.json places @opentelemetry/api in devDependencies; electron.vite.config.ts:94-113 bundles devDependencies. Built NodeTracer imports API from out/main/esm-BmHaznk3.js, whose TraceAPI method is distinct from the CJS API required by the gate. Old observer patched only its own CJS trace.getTracer. Installed API 1.9.0 and bundled API both resolve getTracer through the compatible globally registered provider. The relevant MCP path is McpRuntimeService.ts:1185-1195 -> core/traceMethod.ts:54-74 withSpanFunc, whose trace.getTracer executes per invocation, so the targeted path is not the cached NodeTracer.defaultTracer.

Context7 resolve-library-id -> query-docs used for /open-telemetry/opentelemetry-js. Official SDK registration documentation confirms getTracerProvider returns the registered global provider and getTracer uses it: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/sdk-registration.md . Installed exact API source and actual bundle provide the version-specific cross-copy implementation evidence; no package/config/pin changes.

Changes frozen for root rerun:
- -mcp.ts wraps only the existing shared provider.getTracer, preserving original provider, startActiveSpan callback and end delegation; restores original method. No new tracer/provider/registration or mock span. Fixed tracerRequests and mcpSpansStarted counters accompany existing sink comparisons. All six original sink assertions unchanged.
- -provider.ts calculates canaryAbsent and redactionMarkerPresent separately from the exact correlated target result and retains redacted as their original conjunction. It carries a finite eager/deferred/event profile label.
- main passes current fixture profile and records only mode/profile plus those three booleans into sinkDiagnostic.modelInputs. Original aggregate marker predicate and all per-profile assertions unchanged. Six completed finite profile receipts remain in failure evidence.

Static readback only. Runtime observer correction and exact model-input cause remain unverified. No compiler/build/test/gate/formatter/service changes. No raw logs, payloads, IDs, canary strings, private fixtures or excluded D0 source were read or exported. Product source read-only; no production fix or security change claimed. Root owns source rebind, compiler and failed G2 rerun; UAR error-source anchors may follow independently.

Bindings:
[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-mcp.ts",
    "sha256": "bd7bfb737a3b63b2ea32c7461206b08b051212a8757db20153db0f42f874a3cb",
    "lines": 331
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-provider.ts",
    "sha256": "4e7f7f879890885c1173d5dbb3d3f15d5396d947bfa9b43866adda9ec2b0d1e4",
    "lines": 119
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection.ts",
    "sha256": "21d55c5966bcd04a318bc116beba89d8cbc851ba1e8e602545520678c02ff1ea",
    "lines": 476
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
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/observability/runtime/NodeTracer.ts",
    "sha256": "b3b855bc0468db971a12fa3343e80301cdd786f319047c4364328072b0cab079",
    "lines": 59
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/electron.vite.config.ts",
    "sha256": "aa332cf54290bbb8cf6adb03ff7b14c75cb7eed9e58b0673b0cac9ad30573b38",
    "lines": 321
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/package.json",
    "sha256": "31fea5b69c367c82e0c5df8d7ff42f003593ab1c4a418f38f877f4a9df493bf0",
    "lines": 595
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/out/main/esm-BmHaznk3.js",
    "sha256": "33d598dfc9f50ac4a2b1cdcb4fc90f51a3eba71c2975892b6717a16123c30a12",
    "lines": 1846
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/node_modules/@opentelemetry/api/build/src/api/trace.js",
    "sha256": "9af9e7a9ec61a804255b836a183d031fd5dba864700dddaf7507680bf0450f96",
    "lines": 79
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/node_modules/@opentelemetry/api/build/src/internal/global-utils.js",
    "sha256": "df56e2848ff67afd8fc920396dcff569cd3673920563bdbb2bf9b1df4b45b836",
    "lines": 64
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/G2-04-finite-failure.json",
    "sha256": "d66f88e8b42cf2c7af5babaf8ab940a80387a69b9dec8040b2bef36b70ab511b"
  }
]
