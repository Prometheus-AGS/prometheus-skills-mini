# Boss task 9 — G2-08 bounded setup/error diagnostics

Observed G2-08: completed exit1, registration_run/stream_assertion, nonempty returned stream error, unclassified reason, streamHttpStatus:null, zero provider requests, zero catalog/run captures and zero frames/inspection. This is not the G2-03 observed HTTP404. No numerical HTTP status or failure cause can be inferred. Read sequencing limitation fully: gate overlapped read-only compiler after failed prelaunch binding; compiler later passed and binding completed without intervening edits. This attempt cannot be relabeled sequentially verified or used alone for final acceptance.

Read-only source findings: UarRuntimeConnection.ts:171-198 performs sidecar readiness, session/agent/integration/workspace/model/skill resolution and bridge construction before catalog fetch; several may throw before any observed catalog/run request. UarSidecarService has exact fixed readiness/launch/capability/generation/authority error templates. Model assignment has fixed credential/provider-incompatibility templates. AiStreamManager onExecutionError sends SerializedError; serializeError.ts preserves name/message and optional statusCode, whereas the old gate retained message only. Source establishes candidate failure boundaries, not which failed this attempt. No raw private logs inspected.

Owned correction:
- -turn.ts adds only source-backed sidecar/model/runtime setup classification templates, plus a fixed error diagnostic with category, allowlisted error-name category, message-present boolean, and anchored numeric HTTP status. Returned turn diagnostic records IPC-open accepted, stream-error-event count, allowlisted event error name, integer 100-599 statusCode or null, done and chunk count. Original raw-message handling remains transient and unchanged; new evidence does not expose it.
- -revision.ts counts delegated actual transport entry, HTTP response, rejection and numeric status separately for existing capabilities/catalog/run/registered stream boundaries. It calls the original transport exactly once; rejection increments then rethrows the identical error. No catch-to-pass, extra network call, endpoint exposure, body read, retry or timeout.
- main records returned turn diagnostic separately from the outer thrown diagnostic. A returned-error assertion failure consequently has original stream metadata and a separate AssertionError category; thrown setup/run/capture errors remain thrown. All original assertions, capture/inspection behavior and cleanup remain.

Static readback/hash only. No product edits, compiler/build/test/gate/formatter/config/default/dependency/service changes. No D0/excluded sources or private raw logs/fixtures opened. Pending catalog/driver/postack amendments remain pending. Exact startup failure is unresolved until a properly sequenced actual run produces finite categories. Root owns C-main completion, prelaunch source/manifest binding and G2 invocation in that order.

Bindings:
[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-turn.ts",
    "sha256": "ad26130120d4c6f6a269e2c8d502de7982aefe415bdbdae46e839484048fc528",
    "lines": 161
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-revision.ts",
    "sha256": "46b4ee1e10b51616b831cfc902b1aacd2b78c3255732558a0573d6d1d1f448cd",
    "lines": 322
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection.ts",
    "sha256": "9fd41b1c03fc8e36b907130c7e0554e75e6c8cec1091cae346a3f825ff5fb8e2",
    "lines": 487
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/UarRuntimeConnection.ts",
    "sha256": "5b0e002e326761eb9ea59f71bbc072bb86a57b995f0dd5ff68fc791e0109df3e",
    "lines": 721
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/UarSidecarService.ts",
    "sha256": "847283ac6633807249f5f42b03312a0209c969f0016ceb592157e37828d5aa0e",
    "lines": 481
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/uarModelAssignments.ts",
    "sha256": "6a4625504d3aaa977772547574bdfb60ab7cf2852481b3b56785b88ff850b907",
    "lines": 129
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/utils/serializeError.ts",
    "sha256": "2d752d1cd46b2cdba53e3c978f6d93b837bc3b64b83c27adf6754f1bfd8570c7",
    "lines": 104
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/G2-08-finite-failure.json",
    "sha256": "95409578785fd2542e4ab0bd7e7b08d41efe78be00ecad5715d8fdb98a091ff2"
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/G2-08-sequencing-limitation.json",
    "sha256": "ea5b25d849a32bb324c12bde9018490882a161c070e29d2902ca1221a79f7e85"
  }
]
