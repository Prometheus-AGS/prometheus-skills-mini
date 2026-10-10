# Verification requirements — bauar-acc-01-private-packaged-desktop

All entries below are specifications, not executed evidence. Stable canonical phase: `phase-bauar-release-acceptance`; IDs retain backend task identities. Every behavior carries the complete acceptance template. Relative scenario evidence names resolve under `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/`.

The proposed exact integration gate is:

```text
/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/local-release-acceptance.mjs" --config "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/candidate-inputs.json" --stage integration
```

The proposed exact final aggregation gate, after component adjudication and completed-product review, is:

```text
/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/local-release-acceptance.mjs" --config "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/candidate-inputs.json" --stage finalize
```

Both commands use cwd `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture`. These commands/files do not yet exist. Plan must pin executable locations and immutable config without changing dependency versions. Child environment comes from that schema-bound config: fixture-only secrets, private HOME/CODEX_HOME/XDG/TMP, no inherited external UAR override or ambient keys. Integration runs only after all parent production and packaging are complete and scenario source readiness is recorded; finalize rereads matching receipts and runs no tests. Exit0 means all mandatory results for that selected stage observed; exit1 observed failure; exit2 unavailable/incomplete inputs/evidence/isolation/review. Historical evidence never silently supplies a newly changed behavior.

No test authoring/execution or product review before the coherent production barrier. Missing prerequisites are BLOCKED, not skips. Only owned children are stopped; retain sources, candidates, caches, rollback inputs and failed evidence. No shared service or live-profile mutation. F6 files are excluded from reads/search/hash/diff/test; no wildcard repository traversal. Wider platforms/signing/installation/remote/publication remain out of scope for selected local acceptance.
## Behavior D01: Private packaged startup and bundle selection

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-01-private-packaged-desktop / 1.1,1.2,2.1; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Boss baseline 7a5bdb4b7c02e9f13875fc7f837815c03fe3dacd plus completed 01 source; frozen candidate manifest must bind new source/asar/marker and bundled UAR digest. |
| Production entry point | Actual retained new The Boss.app/Contents/MacOS/The Boss via Playwright Electron launch, no THE_BOSS_UAR_SIDECAR_PATH or other external override |
| Real collaborators | Actual Electron main/preboot/logger/boot-config/path registry, supervised bundle UAR, real authenticated local health/API |
| Boundary exercised | Process launch, private configuration/profile/log/temp/UAR-store filesystem and authenticated loopback |
| Observable result | app.isPackaged true; all declared owned paths beneath R; binarySource bundle and actual child executable/digest match package; authenticated readiness succeeds |
| Negative control | Relative/empty/nonexistent/file/inaccessible supplied root terminates before owned profile/effects; private boot-map points to another disposable root but selected R wins, conflicting root untouched |
| Isolation | Fresh phase-owned R/config, user-data, session-data, logs and temp; private HOME/CODEX_HOME/XDG; UAR persistence beneath R; unique fixture workspace/peers on loopback port0; finite live selected-profile metadata/digests remain unchanged. Coordinator owns shutdown, no retained artifact deletion. |
| Prerequisites | Approved Plan, completed full production barrier and 01/1.2 source-bound package; installed locked Playwright/Electron with Node24.11.1 child, GUI session and controlled peers. No shared memory gateway required; missing GUI/tool/path isolation is BLOCKED. |
| Final local gate | Exact integration command above; argv --config candidate-inputs.json --stage integration; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/d01.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Default-profile absence compatibility is supporting scoped source review only, not runtime-certified: no live default startup. No universal OS sandbox, external provider imports, signed/installed/platform/remote claim. |

## Behavior D02: Exact desktop approval cutover

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-01-private-packaged-desktop / 2.1; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Boss baseline 7a5bdb4b7c02e9f13875fc7f837815c03fe3dacd plus completed 01 source; frozen candidate manifest must bind new source/asar/marker and bundled UAR digest. |
| Production entry point | Packaged renderer IPC ai.stream.open and ai.tool.respond_approval against actual managed UAR |
| Real collaborators | Actual router, root UAR approval endpoint and mounted configured MCP filesystem receiver; reused approval-client fixture logic |
| Boundary exercised | Renderer/main IPC, authenticated HTTP approval protocol and receiver target filesystem |
| Observable result | approve/reconnect produce one target effect; exact originating approval retained; foreign and consumed decisions rejected without consuming a legitimate pending decision |
| Negative control | Missing/empty/whitespace exact-ID events are explicitly mutated real streams and trigger client incompatibility with no decision/effect; deny, edited, cancel and unavailable/headless decisions produce no target effect |
| Isolation | Fresh phase-owned R/config, user-data, session-data, logs and temp; private HOME/CODEX_HOME/XDG; UAR persistence beneath R; unique fixture workspace/peers on loopback port0; finite live selected-profile metadata/digests remain unchanged. Coordinator owns shutdown, no retained artifact deletion. |
| Prerequisites | Approved Plan, completed full production barrier and 01/1.2 source-bound package; installed locked Playwright/Electron with Node24.11.1 child, GUI session and controlled peers. No shared memory gateway required; missing GUI/tool/path isolation is BLOCKED. |
| Final local gate | Exact integration command above; argv --config candidate-inputs.json --stage integration; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/d02.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Mutated event controls prove client compatibility; headless task runs through existing desktop task dispatch, not automatic Bossfang UAR scheduling. No F6 session ownership investigation. |

## Behavior D03: Eager/deferred catalogs and native claim outcomes

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-01-private-packaged-desktop / 2.1; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Boss baseline 7a5bdb4b7c02e9f13875fc7f837815c03fe3dacd plus completed 01 source; frozen candidate manifest must bind new source/asar/marker and bundled UAR digest. |
| Production entry point | Packaged ai.stream.open → UAR native search_tools / configured host-MCP target |
| Real collaborators | Actual host preparation/claim persistence, UAR loop, controlled provider and real MCP effect receiver |
| Boundary exercised | Native/host executor boundary, admission persistence, HTTP acknowledgment and observable target count |
| Observable result | The three owned helper paths scripts/gates/bauar-native-admission-controls.ts, scripts/gates/bauar-native-desktop-cases.ts and scripts/gates/bauar-secret-projection-lifecycle.ts receive the actual packaged app main-directory input and resolve the loaded bundle application chunk; their omitted-input development default remains unchanged in scoped source review. Eager: zero discovery, one target admission/approval/effect. Deferred32-fillers: one discovery, two admissions/exact approvals, one target effect. No second executor loop |
| Negative control | Before-approval cancellation; drop/hold claim acknowledgment; post-ack cancellation; host-terminal/claim-intent/local-terminal persistence fault controls retain refusal or unknown and no unauthorized target effect; restarted old admission/history cannot execute |
| Isolation | Fresh phase-owned R/config, user-data, session-data, logs and temp; private HOME/CODEX_HOME/XDG; UAR persistence beneath R; unique fixture workspace/peers on loopback port0; finite live selected-profile metadata/digests remain unchanged. Coordinator owns shutdown, no retained artifact deletion. |
| Prerequisites | Approved Plan, completed full production barrier and 01/1.2 source-bound package; installed locked Playwright/Electron with Node24.11.1 child, GUI session and controlled peers. No shared memory gateway required; missing GUI/tool/path isolation is BLOCKED. Existing test-only persistence fixture binary must be source-bound if used; it does not replace product sidecar. |
| Final local gate | Exact integration command above; argv --config candidate-inputs.json --stage integration; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/d03.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Fault controls mutate real transport/private persistence; do not mock dispatch. Actual in-flight effects may remain unknown; no undo or durable recovery promise. Test fixture profile recorded separately. |

## Behavior D04: Observation and credential-safe projection

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-01-private-packaged-desktop / 2.1; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Boss baseline 7a5bdb4b7c02e9f13875fc7f837815c03fe3dacd plus completed 01 source; frozen candidate manifest must bind new source/asar/marker and bundled UAR digest. |
| Production entry point | Packaged stream observation/detach/attach and approved target invocation through actual UI/IPC/runtime |
| Real collaborators | Controlled model/HTTP MCP peers, UAR event storage, desktop projection/logger and actual configured receiver |
| Boundary exercised | SSE split/partial/error/reconnect and ordinary persisted/model-visible/log projection |
| Observable result | Same execution/cursor after detach/reconnect; target performed once; known synthetic system credentials absent in retained ordinary logs/events/model projections and evidence |
| Negative control | Split/error/partial stream and deliberate known-canary tool echo retain original redaction/error assertions; cancellation cannot be reported as rolled-back effect; unavailable observations are BLOCKED |
| Isolation | Fresh phase-owned R/config, user-data, session-data, logs and temp; private HOME/CODEX_HOME/XDG; UAR persistence beneath R; unique fixture workspace/peers on loopback port0; finite live selected-profile metadata/digests remain unchanged. Coordinator owns shutdown, no retained artifact deletion. |
| Prerequisites | Approved Plan, completed full production barrier and 01/1.2 source-bound package; installed locked Playwright/Electron with Node24.11.1 child, GUI session and controlled peers. No shared memory gateway required; missing GUI/tool/path isolation is BLOCKED. |
| Final local gate | Exact integration command above; argv --config candidate-inputs.json --stage integration; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/d04.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Known-canary detection only, not general sensitive-data classification. Safe finite observations replace raw body/trace/screenshots; current bundle required. |
