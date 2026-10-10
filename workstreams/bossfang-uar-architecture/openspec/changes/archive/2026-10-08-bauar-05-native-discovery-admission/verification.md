# Production integration acceptance

Status: EXECUTION IN PROGRESS. The original Spec-time declarations below are retained as historical requirements; current receipts and the approved amendment below govern actual disposition. Canonical child bossfang-uar-authorization-and-execution::desktop-mcp-projection-acceptance, change bauar-05-native-discovery-admission. Source baseline is UAR 8bff32deb870f6363e94687a2e22492f91a34dfd and Boss e2ae2ce21245030293c0bea96ed02ae853b820a7 plus Analyze's recorded dirty inventory; acceptance must bind the future complete candidate tree and artifacts, not these HEADs alone.

## Shared exact gate declarations

G1: cwd /Users/gqadonis/.claude/worktrees/bauar-boss; executable /Users/gqadonis/.local/share/fnm/node-versions/v24.14.1/installation/bin/node; argv ["--import","tsx","scripts/gates/uar-exact-tool-admission.ts","/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/host-admission-v2-acceptance.json"]. TSX_TSCONFIG_PATH=tsconfig.node.json. This existing real host HTTP/MCP gate must be extended after production completion for the declared v2/native cases. Its synthetic invocation producers do not substitute for actual UAR execution.

G2: same cwd/executable; argv ["--import","tsx","scripts/gates/bauar-secret-projection.ts","/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/desktop-projection-v2-acceptance.json"]. TSX_TSCONFIG_PATH=tsconfig.node.json; THE_BOSS_UAR_SIDECAR_PATH points to the newly compiled, source-bound production-feature development sidecar. /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance is the absolute canonical child directory containing this change's handoff, not an unexpanded shell token. Plan emits the concrete argv/paths into its execution manifest. Existing gate has no profile CLI option: implement both deterministic profiles inside its controlled fixture rather than claim a nonexistent flag.

The finite G1/G2 receipts must name every exercised case, exit code, source inventory hash, bundle and sidecar hashes and actual oracle counts. Receipts now exist under child evidence/execute; their actual pass/fail status is recorded in execute-status-2026-10-07.md. Neither command was run at Spec or Plan. New filenames distinguish this boundary from prior parent receipts.

## Behavior A1: strict execution authority reaches its owned executor

| Field | Required declaration |
|---|---|
| Canonical identity | child / bauar-05 / tasks 1.1, 1.2, 1.4, 3.2 |
| Source identity | Complete coordinated UAR/Boss candidate trees and owned caller inventory, recorded by 3.1 |
| Production entry point | Actual authenticated Boss host /uar/admission/v2 prepare/resolve/claim/claim-native/finish and MCP tools/call; UAR HTTP port via G2 |
| Real collaborators | Boss host admission owner, actual approval controller, HTTP bridge, mounted MCP receiver, UAR sidecar |
| Boundary exercised | Loopback authenticated process boundary and receiver-side pre-effect authority |
| Observable result | Required source-derived kind equals prepared invocation and receipt; native/MCP consumption separated |
| Negative control | v1/missing/unknown/substituted kind, wrong receipt, changed arguments/source/revision, wrong owner/run or exact approval ID: fixed refusal and zero effects; no D0 session-owner diagnostic |
| Isolation | G1's isolated host workspace/store and ephemeral receiver; G2 fresh Electron workspace/userData/store and private loopback collaborators, all owned/closed by gate runner |
| Prerequisites | All production and caller migration complete; isolated locked Node/SDK/Electron/native ABI prerequisites; exact approvals remain active |
| Final local gate | G1 full host protocol cases plus G2 actual UAR caller; no direct internal helper certification |
| Evidence | Future host-admission-v2-acceptance.json and desktop-projection-v2-acceptance.json, source manifests and exit codes; pending |
| Limitations | Private desktop bridge acceptance only; does not establish deployed remote OAuth/JWT receiver or excluded D0 behavior |

## Behavior A2: admitted native execution consumes once before its effect

| Field | Required declaration |
|---|---|
| Canonical identity | child / bauar-05 / tasks 1.1–1.3, 3.2 |
| Source identity | Complete lifecycle/dispatcher/host tree and fresh genuine sidecar/main bundle from 3.1 |
| Production entry point | Actual UAR native discovery, including its native registry execution route, and Boss claim-native |
| Real collaborators | UAR lifecycle persistence, current Cedar/envelope/lease/budget checks, Boss durable admission owner, exact approval flow |
| Boundary exercised | Durable claim intent → authenticated host durable consume → actual native dispatch → terminal persistence |
| Observable result | Single acknowledged native execution, claimed-only finish and one consumption per invocation |
| Negative control | Concurrent/repeated native claim; native-kind MCP dispatch; MCP-kind native claim; unclaimed finish; inactive lease/budget; failed pre-effect UAR or host persistence: refusal/no second effect |
| Isolation | Same G1/G2 scratch stores and private loopback processes; persistence failure controls stay inside those stores; no real harness/memory roots |
| Prerequisites | Completed production claim ordering and sandbox requirements; actual UAR sidecar for native positive path; controlled negative faults declared in Plan |
| Final local gate | G1 host native/cross-kind/concurrency cases and G2 actual native positive/negative path, at task 3.2 |
| Evidence | Future G1/G2 finite claim-state, execution and effect counts; pending; no raw tool payloads |
| Limitations | Host protocol probes alone cannot establish UAR native dispatch; an unexercised UAR branch remains unverified |

## Behavior A3: uncertain or interrupted execution remains unreplayed

| Field | Required declaration |
|---|---|
| Canonical identity | child / bauar-05 / tasks 1.2, 1.3, 3.2 |
| Source identity | Complete host/UAR lifecycle/persistence source and artifact hashes |
| Production entry point | Actual UAR run cancellation, claim acknowledgment, terminal writes, host teardown/restart within isolated desktop gate |
| Real collaborators | UAR cancellation/lifecycle/persistence, real host claim record, exact approvals, scratch durable stores |
| Boundary exercised | Response-loss after durable claim, cancellation before/after acknowledgment, terminal persistence failure and process restart |
| Observable result | No unauthorized dispatch/retry; durable unknown/interrupted reconciliation, or TERMINAL_RESULT_PERSISTENCE_FAILED; old history nonexecutable |
| Negative control | Drop native claim response after consumption, cancel before dispatch, fail terminal persistence, restart with live/kindless/v1 history: no replay and no false completed or rollback report |
| Isolation | Fault injection and restart only gate-owned processes/transports/stores; preserve ordinary system services and parent receipts |
| Prerequisites | Production ordering complete; Plan must assign real transport/storage/process fault controls, not replacement executor mocks |
| Final local gate | G1 host state/refusal cases plus G2 actual UAR cancellation/uncertainty cases at complete task 3.2 boundary |
| Evidence | Future safe case status, claim/dispatch/effect counts and reconciliation booleans in G1/G2 receipts; pending |
| Limitations | Resume is intentionally unsupported; a protocol-only uncertainty case cannot certify runtime restart handling |

## Behavior A4: eager and deferred discovery reach the same approved target

| Field | Required declaration |
|---|---|
| Canonical identity | child / bauar-05 / tasks 2.1, 2.2, 3.2 |
| Source identity | Completed provider/catalog/MCP fixture and counters plus source-bound desktop/UAR artifacts |
| Production entry point | Actual Boss selected-server agent save/prepare, UAR advertised schemas/model conversation, exact approval request/decision and mounted MCP call |
| Real collaborators | Direct-launched Electron Boss, genuine UAR sidecar, controlled HTTP model provider and mounted SDK MCP receiver, actual app stores |
| Boundary exercised | Desktop application → UAR loop → provider discovery proposal/result → later advertised target → host approval → receiving MCP effect |
| Observable result | Eager: discovery 0, target prepare/approval/effect 1. Deferred: discovery 1, target proposal/prepare/effect 1, total prepare/exact approvals 2. Both bind target by source/identity, not suffix alone |
| Negative control | Missing/unadvertised target, unrelated or missing tool_call_id result, filler dispatch or duplicate target proposal: finite failure/no invented completion; wrong approval refuses |
| Isolation | G2 workspace from mkdtemp(bauar-projection-), separate Electron userData and app database, provider/receiver listen(0,127.0.0.1), run-owned cleanup; no HOME/CODEX_HOME overrides |
| Prerequisites | Normal visibility, selected-server filtering and existing caps preserved; 32 eligible lexically earlier fillers; query uniquely selects target; exact human decision API retained |
| Final local gate | G2 executes both internal catalog profiles using the real app and UAR; G1 cannot replace this path |
| Evidence | Future per-profile safe advertisement/history correlation booleans, source-specific counts and artifact hashes in G2 receipt; pending |
| Limitations | Controlled provider validates orchestration, not arbitrary external model performance; historical runtime12 exact cause remains unknown |

## Behavior A5: discovery corrections preserve projection refusal and leakage checks

| Field | Required declaration |
|---|---|
| Canonical identity | child / bauar-05 / tasks 2.2, 3.2, 3.3 |
| Source identity | Completed gate family and application boundary, bound to fresh bundle/sidecar hashes |
| Production entry point | Existing actual desktop secret-projection gate success/isError/error, history, ordinary logs, persisted traces, event splitting, partial streams, reconnect, snapshot-error, approval and cancellation branches |
| Real collaborators | Actual Boss event/store/approval surfaces, UAR projection, mounted receiver and controlled provider |
| Boundary exercised | MCP/provider values → model/events/persistence/logs and approval capabilities; interruptions and reconnect |
| Observable result | Every original reached assertion retained; safe positive/negative counts separated; no credential or known canary echo in protected surfaces |
| Negative control | Existing known-value echoes, error payloads and split/partial/reconnected events; denied approval and cancelled turns remain effect-free where their declared stage permits |
| Isolation | G2 isolated app stores/providers/receiver; canaries stay only transient fixture memory, never persisted in research or ordinary evidence |
| Prerequisites | Whole original gate preserved; source-specific counter changes do not erase checks for either native or MCP admissions |
| Final local gate | Full G2 retained cases at 3.2, then only failed gate reruns under 3.3 |
| Evidence | Future finite per-case pass/fail/unrun statuses in G2 receipt, no raw model bodies, credentials, error traces or sensitive user data |
| Limitations | Unreachable assertions are untested, not passes; no release or deployed multi-user stack certification |

## Behavior A6: evidence certifies the completed candidate artifacts

| Field | Required declaration |
|---|---|
| Canonical identity | child / bauar-05 / tasks 3.1–3.4 |
| Source identity | HEAD + dirty source inventory hashes + successful compiler/build receipts + emitted artifact hashes; never HEAD alone |
| Production entry point | Actual new main bundle and production-feature development sidecar used by G2; matching owned callers used by G1 |
| Real collaborators | Existing locked TypeScript/electron-vite build, actual UAR feature build, Electron native ABI modules and model/policy resources |
| Boundary exercised | Completed source → compiler/build → emitted executable/bundle → actual run |
| Observable result | Receipt source and artifact identities match completed implementation; no stale payload relabeling |
| Negative control | Wrong version or source hash/artifact, missing isolated dependencies/ABI or failed compilation: blocked, never substituted success |
| Isolation | Product worktrees and their separate target/output directories; one writer per build directory; dependency-mutating commands serialize |
| Prerequisites | Locked dependencies restored in Execute, Node 24.14.1 and native artifacts verified; no pin changes, downloads via package/release bypass or new service |
| Final local gate | Main compiler argv ["node_modules/typescript/bin/tsc","--noEmit","-p","tsconfig.node.json","--composite","false"]; E2E compiler if its owned caller changes: ["--max-old-space-size=8192","node_modules/typescript/bin/tsc","--noEmit","-p","tsconfig.e2e.json"]. Then fresh existing build adapter and G1/G2 at complete boundary |
| Evidence | Future compiler/build/source/payload manifests under child evidence/execute and exact G1/G2 receipt hashes; pending |
| Limitations | Development acceptance on current macOS host; installed/package/platform release acceptance remains a separate parent gate |

Existing Boss main build adapter executable is pinned Node with argv ["--max-old-space-size=8192","/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/evidence/execute/run-boss-existing-electron-build.mjs","app"]. Plan resolves the absolute parent path and the genuine UAR build argv from the retained successful boss-uar-sidecar-profile-build-03-manifest.json without changing features or pretending its old artifact is current. Utility bundle rebuild is required only if its source/artifact changes. Package dev/start/build:mac routes do not replace this boundary.

## Execution boundary and retained parent gate

Repository A9 and the operator's approved bounded child override the upstream template's full-parent-only timing: complete this entire coherent coordinated child production delivery before executable scenario authoring/tests/builds/gates. Parent bauar-04 final integration, parent bauar-02 exact authorization acceptance, remote receiver evidence, excluded D0, formatting and packaged release gates remain unchanged. This child reports evidence to those gates; it cannot close them.

No real harness/memory roots or shared service ports are used. Existing short-lived loopback test collaborators are not new resident services. Plan must record concrete resource allocation/cleanup and fault controls before Execute. Missing tools, protected approvals or usable isolation are BLOCKED. Exit 0 counts only if the declared observable and negative control were exercised. Publication and installed operation stay separate. No product tests/builds ran during Spec.

## Approved task9 acceptance amendment — 2026-10-07T18:27:01.143Z

Operator Approved! the three bundled scope amendments. All other A1–A6 requirements remain. Original marker predicates explicitly replaced below are not described as unchanged.

- Every observed MCP span remains canary-free. Require positive catalog-list and target-call counts. Each catalog input is exactly one DTO containing only serverId; no headers, env, endpoints, arguments or complete configured object. Target spans retain original redacted input and success/error output checks. Unknown-category canary spans fail.
- Every correlated model result remains canary-free. Success/isError retain the replacement-marker requirement. Transport error instead requires the exact source-defined generic failure and MCP/failed/trusted_host provenance; record marker absence separately. G2-11 observed generic/provenance matches true, so this corrects an omission-path oracle without weakening secret absence.
- Typed SDK reasoning_content must reach existing UAR ReasoningDelta, secret projection, actual AG-UI events and durable history. Existing split/partial controls remain; reasoning-event absence fails.
- FC-POSTACK-CANCEL uses the separately built server-full + bauar-native-admission-gate artifact, never relabeled ordinary production. Node supplies THE_BOSS_UAR_POST_ACK_SIDECAR_PATH, distinct from normal sidecar selection. Positive calibration on that exact artifact requires one real discovery body entry, genuine correlated result and explicit finalization. Negative case requires real exact consumed claim1, matching post_ack_pre_guard checkpoint, owner-bound cancellation API success before correlated release, explicit final bodyEntries0/no observer error, no success finish/replay, retained uncertainty and orderly cleanup. Distinguish dropped_while_held from released_then_guard_observed; neither host consumption nor missing files substitutes the body counter. This proves the search_tools body only, not every native implementation or mandatory execution of the later guard branch.
- Normal full-feature artifact excludes gate feature. Gate protocol exists only with the nondefault compile feature; no default, dependency, endpoint, credential, auth, lifecycle or release packaging change. Fresh source/build/artifact receipts bind both binaries; missing finalization or cleanup is failure.

These amendments authorize execution; they do not mark acceptance, QA, review, archive, Reflect, child exit or parent release complete.
