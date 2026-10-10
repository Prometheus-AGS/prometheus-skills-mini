# Task 9 approved catalog/oracle and post-ack coordinator handoff

Status: AUTHORING COMPLETE / SOURCE FROZEN. No runtime acceptance or verification claimed. Parent may now begin complete-delivery verification after all authors are frozen.

## Authorization and product boundary

Fully read catalog-trace-scope-proposal.md and approved-three-amendments-dispatch.json. The user approved all three bundled amendments. This owner edits McpCatalogService.ts and the existing main/-mcp gate family; root additionally approved the cohesive launch helper path. Other owners retain driver/native dispatcher/checkpoint and post-ack helper ownership. No model-route switch was made or claimed.

The measured G2-06+ catalog leak crossed configured MCP credentials into telemetry through withSpanFunc argument serialization. McpCatalogService.ts now supplies exactly [{serverId: server.id}] to tracing. Its callback closes over the original untouched server and passes that original to the same cached listing function. Cache key/TTL, client connection/authentication, catalog results, status, invalidation and failure behavior are unchanged. The generic tracer and target-call production code were not changed. This is the actual configured-credential-to-telemetry boundary addressed under A-3; no blanket claim about unrelated logs or transformed secrets is made.

## Explicit approved oracle amendments

This delivery does change two original expressions, with user authorization. It must not be described as preserving every original expression.

1. Replaced the requirement that every MCP span input contain a redaction marker. Every observed MCP span must still be canary-free across complete captured attributes/status/events. Catalog-list spans require an exact array containing one object with only a nonempty string serverId. Catalog and target categories must both be present. Target calls retain redacted-input and error/success marker checks, now explicitly scoped to target spans. Unknown-category canary spans still fail the universal absence assertion; their counts remain visible. All logger canary/error-marker requirements remain.
2. Replaced the aggregate model-result marker requirement for ordinary transport errors only. Every correlated result must be canary-free. Success/isError retains the existing redacted marker predicate. Transport errors require both source-defined exact generic MCP failure equality and exact tool-call/tool identity plus MCP/failed/trusted_host provenance. These booleans were observed true for both profiles in earlier finite runs. Per-mode marker presence remains recorded, and the old allModelInputsRedacted diagnostic remains alongside allModelResultsAccepted. All other profile/effect/revision/approval/history/event/refusal assertions remain.

The exact predicates and allowed shape were sent to root for its verification.md update; this owner does not edit that document.

## Frozen coordinator contract

Existing launch behavior is moved verbatim into scripts/gates/bauar-secret-projection-launch.ts under launchProjectionDesktop; no assertions were moved merely to fit. Root approved this lifecycle boundary to keep main below 500 lines. The ordinary sidecar remains an explicit immutable selection. Required new Node gate inputs are THE_BOSS_UAR_POST_ACK_SIDECAR_PATH and THE_BOSS_UAR_POST_ACK_MANIFEST_PATH, distinct from ordinary THE_BOSS_UAR_SIDECAR_PATH. They do not introduce production configuration or a sidecar debug switch.

The native author owns exercisePostAckCases and its instrumented positive-calibration/cancellation implementation. Its manifest is root-staged schema1 with exact artifact/source-manifest paths and SHA-256 hashes and the actual expanded 14-feature list. Helper prelaunch verification is required for each instrumented profile; root additionally binds complete source content. Main must invoke once after the seven ordinary cases, preserve instrumented artifact provenance, remove only controls explicitly resolved by successful returned evidence, and require no unresolved controls before a success receipt. All helper applications are closed internally; ordinary artifact selection is not overwritten.

## Limits

No builds, compiler, tests, gates, formatter, dependency changes, service/default mutations, KBD/team mutations, commits or D0 access by this owner. Prior snapshot/SDK session/native evidence is preserved; it does not verify these new product/oracle/instrumented changes. Root owns verification after every author freezes, source/artifact bindings and the failed G2 rerun. No QA/Task10/Reflect, parent certification or publication is claimed.

## Final integration and hashes

Read the full frozen bauar-post-ack-cases.ts before wiring. Main imports exercisePostAckCases and postAckCaseProgress. The helper input is {launch(profile,sidecar),gateSidecar,gateArtifactManifest,baseUrl,canary,mcpUrl,targetEffects,conversation}; required Node inputs are checked before starting the ordinary gate. Helper call occurs once after the seven ordinary native cases. It internally runs one positive calibration and one cancellation on the same verified instrumented artifact and closes its applications before returning. No process.env or ordinary sidecar variable is changed. The existing ordinary launch/restart/storage calls still receive the original sidecar selection, and the main app is closed before the instrumented helper starts.

Successful helper cases are appended to finite nativeReceipts. Only returned resolvedControls remove matching native.blocked entries. Main asserts blocked.length === 0 before any success receipt. Failure JSON includes postAckCaseProgress(), preserving a completed positive calibration if the negative case or cleanup fails; it does not fabricate a successful case. The final nativeAcceptance object distinguishes ordinaryCaseCount from instrumentedPostAck, whose artifactSha256, sourceManifestSha256, instrumentedArtifact and caseCount come from the helper. Its combined case count and unresolved count are explicit. Removed the prior conditional nonzero exit after receipt-writing because unresolved controls now fail before receipt-writing; no blocked execution can emit an acceptance receipt.

Root-staged manifest input: e/development-uar-gate-payload-12/gate-artifact-manifest.json. Root retains complete source-item verification and source/artifact staging/binding; helper checks realpath, actual binary hash, actual source-manifest hash and exact expanded feature set before every instrumented launch, including bootstrap relaunch. Instrumented artifact evidence is never labeled ordinary acceptance.

Paths below are relative to /Users/gqadonis/.claude/worktrees/bauar-boss. Only these four source paths and this handoff were authored by this owner in this amendment. Native author owns all checkpoint consumer/helper changes. No source edits remain pending from this owner.

| Path | SHA-256 | Physical lines |
| --- | --- | ---: |
| src/main/ai/mcp/McpCatalogService.ts | 0ba88722902735f4334b479acd22a079d2a95ee54184e019ee14174a85b78d02 | 363 |
| scripts/gates/bauar-secret-projection.ts | 01565750b430bea9bd3c88cc76076d25ba26c95c55878b0e1bb3d3583e2b1eda | 484 |
| scripts/gates/bauar-secret-projection-mcp.ts | 19717b019902e427939ce5afe07d1f483c0639520ee9d30ac55e1e8c6acae53d | 420 |
| scripts/gates/bauar-secret-projection-launch.ts | fb44dfab7fa98f655f85658924b79815caf08904d7dea794ffceace7f0cacab8 | 24 |

Static source inspection and hashing only. No compiler/build/test/gate result is claimed. The app bundle needs root's rebuild for the catalog trace correction; UAR ordinary and instrumented artifacts are separately staged/verified by root. Existing SDK-session and snapshot fixtures were retained, not reimplemented. Parent owns verification.md disclosure of the oracle amendment, final gate verdict, state/checklist updates, commits and the Execute stop before Reflect.

