# Focused01 pretransport diagnostic author handoff

2026-10-07; source frozen for root's next complete-delivery compiler/focused failed-boundary run. No compiler, test, build or gate was run by this author. No runtime behavior, authority, artifact choice, assertion, retry or fixture step changed.

Observed in `G2-postack-01-finite-failure.json`: registration operation stream_assertion; openAccepted true, streamErrorEvents 1, streamErrorName Error, null HTTP status, one chunk, no provider request, and zero entered capability/catalog/run/stream transport requests. The actual message remains unclassified. This narrows the observed failure to the app path before captured UAR transport, but does not identify a root cause.

Only edited source: `/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-post-ack-cases.ts`, 348 lines, SHA-256 `ff99b00fd725b599ef3463e8605f8a9ae66f3df4dc1ca4f1250e199656e57a17`.

Focused entry remains unchanged: `scripts/gates/bauar-post-ack-gate.ts`, 128 lines, SHA-256 `a95080010ffb9f3338e39ff4bde267c871309b77d1226378d638c370070c75da`.

The registration receipt now includes pretransportError before its unchanged empty-error assertion. It compares the actual registration.error transiently against fixed source-defined errors and records only category, exact-match categories, prefix-match categories, message character count, and SHA-256. Raw message text and interpolated paths/identifiers never enter the receipt. Unmatched messages remain unclassified; their digest is correlation only, not a diagnosis. No private log was read.

Source anchors read for the classification:

- `UarRuntimeDriver.ts`: session validation and `UarRuntimeConnection.start()` call.
- `UarRuntimeConnection.ts`: start calls `UarSidecarService.ensureReady()` before model assignment/signature; run preparation also awaits readiness.
- `UarSidecarService.ts`: startOwnedProcess calls requireUarPayload before provisioning/spawn/readiness/capabilities.
- `uarPayload.ts`: exact configured/packaged payload-unavailable messages. The configured override requires its adjacent payload-manifest.json with valid schema/name/version/platform, valid declared paths, existing sidecar, models config and all three policy files. The separate gate-artifact-manifest.json alone does not meet this app-side payload contract.
- `agentRuntimeCapabilities.ts`: exact disabled-release error.
- `integrationConfig.ts` / `uarStorageProfile.ts`: exact managed-secret storage/decryption errors.
- `AgentSessionRuntimeService.ts`: session-write pause, unavailable connection, unsupported runtime errors.
- `agentSessionWorkspace.ts` / `agentDataDirectory.ts`: source-defined workspace/storage containment and real-directory errors.
- `uarModelAssignments.ts` / `data/types/model.ts`: model assignment path and invalid/empty model identity errors.

Configured payload unavailability is a source-grounded **candidate**, not an observed cause: no predicate has yet executed against the actual error in retained evidence. Root received this candidate while independently inspecting app payload staging. All previous exact error classification remains alongside these new predicates. Passing prior cases retain their original boundary; only the existing two-case focused entry is pending. No excluded UAR source was searched/opened/hashed and no D0 probe occurred.
