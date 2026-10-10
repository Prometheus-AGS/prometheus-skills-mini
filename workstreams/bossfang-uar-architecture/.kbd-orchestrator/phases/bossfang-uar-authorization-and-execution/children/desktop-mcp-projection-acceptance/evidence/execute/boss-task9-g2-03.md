# Boss task 9 — G2-03 stream status diagnostic

Observed finite G2-03 receipt: registration_run / stream_assertion; streamErrorPresent true; reason stream_http; providerRequestCount 0; catalog and run HTTP success; stream status not_found with zero frames; inspection not observed; empty completed-profile receipts. All native cases unrun.

Source-grounded numerical interpretation: bauar-secret-projection-revision.ts:104-111 maps only HTTP 404 to not_found. At :215-218 this category comes from the response to GET on a stream URL registered from the successful created-run response. Therefore the observed final stream response was HTTP 404. This does not identify why that endpoint returned 404, nor prove a missing run, owner mismatch, transient state or resolution.

Read-only production path: UarRuntimeConnection.ts:265-274 requests the returned created.stream_url with stream_mode=agui_spec, existing principal and sidecar generation. Its existing responseError at :717-719 includes the numerical HTTP status in a fixed prefix. No product path, retry, route, principal or generation behavior was changed.

Surgical correction: only scripts/gates/bauar-secret-projection.ts now records registrationDiagnostic.streamHttpStatus before the original empty-error assertion. A strict anchored match of the existing UAR stream failed (HTTP N) prefix returns the three-digit 100-599 integer, otherwise null. No response body, raw error, header, ID, URL, log, or credential enters the finite diagnostic. Original registration and sink assertions remain intact.

Static readback only. No compiler, build, tests, gate, formatter or service mutations run. No raw logs/private fixtures/excluded D0 sources read. Root owns C-main/source rebind and failed G2 rerun. Startup stream cause remains unresolved; this is diagnostic completion, not a successful run or product fix.

Current bindings:
[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection.ts",
    "sha256": "860e1d11cbbc77514f1634200df8c3df6416ca428b10cbf80fd427ad576154b0",
    "lines": 474
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-revision.ts",
    "sha256": "f5eac45d73874c68962faf2828b9719f6dbc2cf53dc0fc6b9299609839bbb6f6",
    "lines": 302
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/UarRuntimeConnection.ts",
    "sha256": "5b0e002e326761eb9ea59f71bbc072bb86a57b995f0dd5ff68fc791e0109df3e",
    "lines": 721
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/G2-03-finite-failure.json",
    "sha256": "cf96e4773576f8d97abd92885075d3ecb8fd74797ff10914f658042747af8e3a",
    "lines": 67
  }
]
