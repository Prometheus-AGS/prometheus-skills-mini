import type { ProjectionToolMode } from './bauar-secret-projection-mcp'
import type { CaptureDiagnostic } from './bauar-secret-projection-revision'

type RevisionCapture = { runSnapshotMatched: boolean; preparedRevisionsMatched: boolean; preparedInvocations: number }

/** Fixed scalar mirrors of the existing MCP assertions, without tool content or identifiers. */
export function mcpAssertionDiagnostic(
  mode: ProjectionToolMode,
  revisions: readonly RevisionCapture[],
  calls: ReadonlyArray<{ mode: ProjectionToolMode; originalArguments: boolean }>,
  before: number,
  toolInputs: ReadonlyArray<{ mode: ProjectionToolMode; redacted: boolean }>,
  stream: { present: boolean; containsCanary: boolean; category: string },
  capture: CaptureDiagnostic | null
) {
  const revision = revisions[0]
  const lastCall = calls.at(-1)
  const callDelta = calls.length - before
  const matchingInputs = toolInputs.filter((input) => input.mode === mode)
  return {
    mode, revisionCaptureCount: revisions.length,
    runSnapshotMatched: revision?.runSnapshotMatched === true,
    preparedRevisionsMatched: revision?.preparedRevisionsMatched === true,
    preparedInvocationCount: revision?.preparedInvocations ?? null,
    mcpCallCountBefore: before, mcpCallCountAfter: calls.length, mcpCallDelta: callDelta,
    matchingToolInputCount: matchingInputs.length,
    redactedMatchingToolInputCount: matchingInputs.filter((input) => input.redacted).length,
    streamErrorPresent: stream.present, streamCategory: stream.category,
    fieldMatches: {
      oneRevisionCapture: revisions.length === 1,
      runAndPreparedRevisions: revision?.runSnapshotMatched === true && revision?.preparedRevisionsMatched === true,
      onePreparedInvocation: revision?.preparedInvocations === 1,
      oneMcpCall: callDelta === 1,
      lastCallMode: lastCall?.mode === mode,
      originalArguments: lastCall?.originalArguments === true,
      streamCanaryAbsent: !stream.containsCanary,
      emptyStreamError: mode === 'error' ? null : !stream.present,
      redactedToolInput: mode === 'error' ? null : matchingInputs.some((input) => input.redacted)
    },
    capture
  }
}

export type McpRunContext = {
  mode: ProjectionToolMode; before: number;
  calls: ReadonlyArray<{ mode: ProjectionToolMode; originalArguments: boolean }>;
  toolInputs: ReadonlyArray<{ mode: ProjectionToolMode; redacted: boolean }>;
  providerRequests: ReadonlyArray<{ authorized: boolean; containsCanary: boolean }>;
}

/** Read existing counters after a failed run; never dispatch or resolve an approval. */
export function mcpRunDiagnostic(context: McpRunContext, capture: CaptureDiagnostic | null, turn: unknown, category: string) {
  const currentCalls = context.calls.slice(context.before)
  const matchingInputs = context.toolInputs.filter((input) => input.mode === context.mode)
  return {
    mode: context.mode, failureCategory: category, turn,
    actualCallDelta: currentCalls.length,
    calls: currentCalls.map((call) => ({ modeMatches: call.mode === context.mode, originalArguments: call.originalArguments })),
    providerRequestCount: context.providerRequests.length,
    authorizedProviderRequestCount: context.providerRequests.filter((request) => request.authorized).length,
    canaryFreeProviderRequestCount: context.providerRequests.filter((request) => !request.containsCanary).length,
    modelToolInputCount: context.toolInputs.length, matchingModelToolInputCount: matchingInputs.length,
    redactedMatchingModelToolInputCount: matchingInputs.filter((input) => input.redacted).length,
    capture
  }
}
