# Post-ack Node consumer author handoff

Authoring frozen 2026-10-07 for approved Execute task 9. This is source delivery, not a compiler, runtime gate, QA, or task-completion verdict. Root retains all verification/build/install/gate/commit ownership. No compiler, build, test, or gate was run by this author.

## Owned source and hashes

Boss root: `/Users/gqadonis/.claude/worktrees/bauar-boss`.

| Path | Lines | SHA-256 |
| --- | ---: | --- |
| scripts/gates/bauar-native-admission-controls.ts | 319 | 7c6662b8f65029312cf522bafad4ecaf29890456ce93c729a8443fce6b9bad12 |
| scripts/gates/bauar-post-ack-cases.ts (new) | 283 | b487ae33b3f51ee0594fb8451e9e3db7283f01d3bd104be363b9e43c946876f7 |

The approved `bauar-native-desktop-cases.ts` needs no edit for this amendment. Its existing exported NativeFaultConversation is reused. All seven ordinary native cases remain intact. No production source was edited by this author. G1's exact host gate and host-case helper do not import the Electron controls module (explicit source search confirmed). The shared controls amendment is additive optional `postAck` arming: absent input returns immediately from arm and disables the stream observer. Existing HTTP prepare/claim/hold/drop/finish behavior is preserved; internal runtime request records additionally retain actual run URL and ID alongside the unchanged evidence URL and original headers. This is source inspection, not a regression-test claim.

## Frozen caller API

`exercisePostAckCases` exported by `scripts/gates/bauar-post-ack-cases.ts` accepts:

```ts
{
  launch(profile: string, sidecar: string): Promise<{ app: ElectronApplication; page: Page }>;
  gateSidecar: string;
  gateArtifactManifest: string;
  baseUrl: string;
  canary: string;
  mcpUrl: string;
  targetEffects(): number;
  conversation(value: NativeFaultConversation | ProjectionProviderConversation | undefined): void;
}
```

Returns `{ cases, resolvedControls: ['FC-POSTACK-CANCEL'], instrumentedArtifact: true, artifactSha256, sourceManifestSha256 }` only after both cases and their cleanup succeed. `postAckCaseProgress()` returns a cloned finite partial receipt with two categories, unrun/running/passed/failed status, fixed stage, cleanupConfirmed, and completed finite evidence. Main should retain this getter's result in failure evidence, so completed positive calibration is not lost if cancellation fails. Main wiring remains Boss owner's scope.

Controls exports add `PostAckArmConfig`, `PostAckControlState`, and `postAckControl(app, 'read' | 'cancel' | 'terminal')`. Existing `installNativeControls` accepts optional fifth argument `{workspace, controlId, deadlineUnixMs}`. Post-ack control state contains only armed, correlationDigest, cancelAcknowledged, runStatus, finalizationFailed, and streamObserved. Ordinary evidence does not print identities, raw requests, tokens, canaries, payloads, or exception messages.

Required Node-only caller inputs are `THE_BOSS_UAR_POST_ACK_SIDECAR_PATH` and `THE_BOSS_UAR_POST_ACK_MANIFEST_PATH`. No production environment passthrough or environment mutation is introduced. Root's manifest schema is `{schemaVersion:1, artifactPath, artifactSha256, sourceManifestPath, sourceManifestSha256, features}`. Both paths must be absolute; both hashes lowercase SHA-256. Before **each launch**, including the bootstrap relaunch, the helper verifies sidecar realpath equality, actual binary hash, actual source-manifest hash, and the exact expanded feature set. Both cases require the same manifest binding. Root separately verifies all source entries and creates this manifest from the actual build receipt.

Exact expanded features: `a2a-transport`, `admin-ui`, `api-docs`, `bauar-native-admission-gate`, `cedar-governance`, `document-intelligence`, `local-models`, `minimal`, `response-quality`, `server`, `server-full`, `surreal-backend`, `telemetry`, `wasm-runtime`.

## Two authored cases and actual oracles

1. `post_ack_positive_calibration` — fresh actual profile/workspace, genuine launcher and instrumented full-feature artifact, actual host preparation and approval, one durable consuming acknowledgment, matched UAR checkpoint, release without cancellation, explicit final bodyEntries 1 with released_then_guard_allowed, actual terminal done, exactly one successful finish and matching durable succeeded state, and actual correlated search result in the second provider request. No target MCP tool body executes.
2. `post_ack_pre_dispatch_cancellation` — another fresh actual profile/workspace, identical artifact binding and single exact discovery claim, then real authenticated owner-bound cancellation for the armed run after matched checkpoint and durable consume. Require HTTP success with cancelled true before writing release. Require explicit matching final bodyEntries 0, runCancelled true, no observer error, no finish request, actual cancelled terminal, retained runtime OutcomeUnknown and host outcome-unknown, one provider request, no replay, and zero target MCP effects.

The negative accepts only the truthful UAR outcomes dropped_while_held or released_then_guard_observed, and records which occurred. Release never implies that the later guard ran. This proves the approved accepted-ack/prebody interval for the actual SearchToolsTool, not every native body or the guard branch on every scheduler outcome.

The optional host-response hook arms synchronously from the authentic v2 invocation and authentic preparation before forwarding that response; it does not invent or alter a receipt or acknowledgment. The digest is SHA-256 of compact UTF-8 JSON array `['bauar-post-ack-gate/1', executingRunId, invocationId, modelToolCallId, runtimeEpoch, hostEpoch, 'runtime_native', admissionId, authorityRevision]`, without newline. Cancellation and terminal inspection use the original headers captured from the exact actual run-creation call and match the armed run ID.

The fresh canonical nonsymlink workspace owns `.bauar-post-ack-gate/{arm,reached,release,final}.json`; arm is the ownership document, with no fifth marker. Readers require bounded regular nonsymlink files (4096 bytes maximum), canonical parent, exact identity/keys and expected fields. Atomic pending-file publication is used for Node's arm/release. Missing reached/final is pending until the bounded wait fails; missing files never imply zero body entries. The deadline is 120 seconds. Protocol details match the UAR author's frozen handoff.

The actual run SSE response is forwarded byte-for-byte through a bounded observer. The fixed RUN_ERROR code `NATIVE_ADMISSION_GATE_FINALIZATION_FAILED` sets a sticky failure flag; it invalidates acceptance even if final.json appears later. Parse/bound failures also fail observation. Final control state is checked after the actual turn finishes and its history session closes. No raw frame is retained in the receipt.

## Cleanup and remaining verification limits

Each case owns two sequential launches in its isolated profile (preference bootstrap, then scenario). On every exit it clears the provider conversation, requests real cancellation best-effort if controls exist, releases an armed checkpoint only as cleanup if necessary, closes the warm history session, awaits the running turn, restores fetch/HTTP hooks and closes the SQLite handle, then closes Electron through the genuine app lifecycle. Only after these steps return does cleanupConfirmed become true; failures remain failed, never passing. The caller owns the shared ephemeral provider/MCP fixtures and their final shutdown. Profiles/workspaces and bounded sanitized control evidence are retained; no uncertain evidence is deleted. The helper does not replace or overwrite the ordinary artifact or change the caller's ordinary sidecar selection.

Both new cases are **UNRUN** at author freeze. Runtime cleanup, feature separation, compiler compatibility, actual checkpoint operation, same-artifact calibration, terminal lifecycle persistence, and cancellation acceptance remain for root's complete-delivery verification. No result is inferred from source alone. No D0 probe/reroute occurred; neither excluded UAR source file was opened or hashed. Source scans were limited to the explicit Boss gate paths and named approved evidence documents.
