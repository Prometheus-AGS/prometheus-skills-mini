# Execute scope amendment — operator decisions, 2026-10-06

This supplements the reviewed Plan and supersedes its three unresolved product inputs. It does not skip any lifecycle stage or claim acceptance.

## Direct user decisions

1. Restart: “Report unsupported/unknown and require reconciliation (recommended)”. Retain a stable attempt receipt; never automatically create a replacement admission after unknown effects or runtime epoch loss. Durable UAR recovery is outside this release.
2. Remote receivers/IdP/custodian: “None. Remove all of the defaults there for now, since the application has them.” No named external receiver integration or new credential custody system is selected. Remove UAR's shipped runtime MCP presets (Tavily, Surreal Memory and Kreuzberg) from mcp.json. Keep application-managed configuration, runtime catalog/grant APIs, and developer .mcp.json intact. This is a requested configuration change in Execute.
3. Approval compatibility: “Strict cutover; update owned callers together (recommended)”. Require exact decision identity; migrate owned callers. Unknown installed/external legacy callers are not promised compatibility.

## Task disposition and acceptance

Change 04 keeps its numeric IDs for traceability, but tasks 5–8 now record empty external receiver scope, application custody, removal of runtime defaults, and preservation of explicit application configuration. Their previous receiver-specific implementation is superseded by this direct instruction, not silently skipped. Generic host/grant boundaries and independently configured receiver responsibility remain architectural requirements. Existing Bossfang inbound MCP classification remains in scope.

No external production receiver deployment will be certified by this phase. Local desktop and remote-facing common boundaries retain separate evidence. An empty external receiver selection no longer blocks completion of the selected phase scope; lack of actual receiver evidence still prohibits claims about such a deployment.

Plan table P4R now means application-owned configuration/default removal; there is no new remote credential adapter or service. Original 32 requirement/59 scenario counts describe the reviewed version; additional empty-configuration acceptance is recorded in the amended delta. Final review must inspect these changes.

## Source reconciliation in progress

## Independent client scheduling amendment

The UAR D0 lockfile/pin inconsistency blocks UAR production, not the separately isolated The Boss controller. Its accepted provider event already supplies approval_id; the strict client requires that existing field and does not depend on the new identity structs. Therefore the driver may author The Boss 02/3 client slice and 02/4 scenarios while UAR remains unchanged. This supersedes P1-before-P2 only for those disjoint client files. No tests or integration acceptance move earlier; coordinated cutover and full V1/V2 still wait for all selected production. UAR02 implementation and Bossfang03 continue to wait for their actual provider dependencies.

UAR current a7cb972 includes ancestor C05 provider fcfce6d with identical full-harness provider files. Bossfang main lacks full-run consumer work already implemented on a separate release branch; accepted consumer checkpoint and residual scope require a source-binding amendment before code. No other worktree is merged or modified here.

## Independent default-configuration scheduling amendment

The user's explicit removal of runtime presets is a disjoint configuration change. Parent 04/7 may therefore be authored before 01–03, with a repository child for the exact `mcp.json` edit. This supersedes the old `additionalDefaultsClaim: mcp.json after D0` scheduling restriction only for this ordinary configuration file. It does not run, assist or retry the blocked D0 diagnostic, authorize UAR Rust changes, or move V1/V2 earlier. Runtime empty-default and application-supplied configuration acceptance remain deferred to the complete production boundary. The only immediate observation is the resulting JSON shape and bounded diff.

The initial D0 dependency inconsistency was resolved using the existing recorded Liter source override. The current D0 blocker is automatic safety review, not an unresolved dependency choice. No session-isolation behavior was executed or established.

## Isolation and observed setup (continued)

## Continued development after blocked diagnostic — 2026-10-06

The operator explicitly directed continued development because this phase blocks the main release. D0 remains blocked by automatic safety review: do not retry, rephrase, move its execution to another agent/route, or infer a result. Parent02/5 and conditional02/6 remain unresolved; release certification still requires eligible evidence or an explicitly permitted waiver, neither of which is supplied here.

The former blanket D0-before-product-edit scheduling rule is narrowed to work whose correctness depends on its result: session-manager ownership correction. Approved identity, exact-approval, secret-projection and resource-boundary authoring may proceed independently, and Bossfang storage/selection may proceed after corrected design acceptance against the existing provider contract. The accepted pre-edit source remains identified by a7cb972 and D0's hashes; any future eligible baseline observation must name that exact source, not the modified implementation. No diagnostic is performed by this amendment.

The Boss finite run-secret projection may be authored alongside UAR identity in its disjoint worktree, using the already-authored strict client as its serial predecessor. Final integration/review/build gates stay at the full selected delivery boundary. Corrected material design review is a planning prerequisite, not a partial production QA gate. No source finding is closed by this scheduling change.

Three clean product worktrees were created under ~/.claude/worktrees/bauar-{uar,bossfang,boss}. Each has a separately registered nested workstreams/bauar KBD UUID. The Boss's existing checkout hook automatically ran pnpm install and reported Passed during worktree creation; working-tree status remained clean. No service was started, no dependency version was selected or changed by this driver, and that hook output is not product acceptance.

Task01/6 component authoring is parallel on only the new JWKS cache module. The identity worker retains exclusive verifier/mod.rs integration ownership. This changes scheduling only; configured 60/300/5-second policy, single-flight semantics and completed-boundary acceptance are unchanged. No D0 operation is involved.

### Design confirmation availability — 2026-10-06T14:08:24.229Z

The corrected material design confirmation through MiniMax-M3 timed out after one 300000ms attempt. This is not a PASS and the prior BLOCK remains recorded. Apply adversarial-review’s documented fresh-context native fallback when a team slot is free: exact artifact mandate plus packet only, gpt-6.1-sol/high native route, same model family isolation disclosed and producer identity unknown. This is planning review, not premature production QA. Independent approved production remains eligible while this receipt is pending. The D0 diagnostic remains blocked and is not retried or substituted.

Native fallback adaptation: the confirmation packet is 146624 bytes. Use a fresh file-backed packet wrapper containing only the mandate and exact packet path; the reviewer must hydrate that one packet in full and inspect no product source or conversation. Log this as harness-native-file-backed, not the stronger literal REST payload guarantee. No production QA is opened by this planning review.

### Accepted material refinement and independent storage

Native confirmation returns zero findings with twelve explicit checked classes. Original BLOCK and primary timeout receipts are preserved. This approves the corrected repository-specific design for source authoring only; full provider/strict-approval handover remains required before control integration. Parent03/1 and child prerequisite1 remain open until that final checkpoint exists. Independent F-STORAGE task2 may begin against existing bac04cb6/uar a7cb972 contract after this design acceptance; it does not exercise providers or make runtime claims. Exact initial paths are recorded in execution-bindings.json; schema storage handoff precedes selection writes.

UAR identity task3 adds exact cohesive policy.rs and tests.rs under security/api_keys to partition the existing541-line module by responsibility; no UserContext fields or broader directory grant.

### Concrete storage presentation and client scheduling

The accepted durable-presentation invariant requires non-executable history text, not merely event metadata. Within F-STORAGE owned types/store paths, accept ordered Message(speaker,text) and ToolResult(name,outcome,text) parts, with explicit SecretExcludedText producer obligation; this wrapper does not sanitize or verify content. Observation owner must apply finite run-secret projection and existing message bounds before construction. Persist no executable arguments, credentials, headers or raw envelope. Old metadata-only events retain explicit unavailable text. This fulfills the already reviewed event/cursor/outcome transaction contract without executable recovery or additional persistence surfaces.

Boss secret-projection task3 may consume the completed approval-client task2 source-authoring handoff as its serial source predecessor. That approval task canonical exit explicitly requires V1 and therefore remains in_progress; do not manufacture acceptance solely to satisfy authoring order. This clarifies the earlier independent projection scheduling amendment; complete cutover acceptance remains at the combined gate.

### Typed privileged host and key provenance

Task5 implements the reviewed typed trust requirement with exact operator security.trusted_host_principals records (enforced issuer/subject/tenant plus host_id), defaultempty, retaining grant_policy.trusted_hosts checks. Sidecar launch proof still comes only from the actual guard. API-key exchange signs uar_credential_kind=api_key; configured service-host/cross-owner admin proof requires issuer-controlled signed kind=issuer. Missing/unknown markers retain user/owner authority, never privileged non-key inference, so old exchange JWTs are not upgraded by omission. Explicit privileged reissue is documented. No new IdP or daemon is selected. Exact cohesive host/mcp_tests.rs source extension is accepted; actual positive/destination-valid scenarios are authored, not executed early.

### Exact selected connection reservation

Existing prepare_projection retains credentials before durable job reservation. The selected path splits read-only descriptor preparation into an opaque private pending admission and reserves the stable attempt before install/admit. Only the Created reservation winner installs its exact connection into an empty slot; an existing attempt never prepares or replaces credentials, and an installation conflict remains unknown. Legacy/manual preparation behavior is preserved. Exact driver module/retained/selection source slices are accepted in execution-bindings; no runtime concurrency proof is claimed.

### Independent UAR resource source sequencing

UAR identity and exact-approval source have handed over their files. Existing common grant, captured environment and supervision contracts do not depend on unfinished Bossfang product presentation/wakes. R1 grant scenario and R2 stdio stderr correction may therefore proceed before Bossfang03 completes, with exact claims and begun tasks. Most grant invariants already exist; source presence is not runtime proof, and no grant rewrite is justified merely by task wording. All final common/combined runtime gates remain after complete selected production. R3 projection and R4 inline normalization require their explicit later source-contract/claim handover.

### Actual selected-job service identity mapping

Bossfang task storage has no existing trusted UAR selection/tenant policy, and its existing transport uses the application service credential. Task4 therefore supplies an explicit service-scoped selected-job producer from authenticated non-synthetic registered local Owner plus authorized real stored job/assignedagent. Initiating local ownership remains distinct from UAR service authority; delegated-user/tenant mode is unsupported without an actual verified mapping. Synthetic/no-auth selected admission is refused; native behavior is preserved. A stable reserved selected namespace and private retained-slot ownership tag protect against legacy/manual transport replacement, including restart classification; automatic retry_count never creates a new selected admission. Exact new mapping modules are bound; runtime acceptance remains pending.

### Captured credential corpus and provider revision authority

The read-only R3 capture contract is accepted for exact redaction-only ingress propagation and once-resolved provider construction inputs. Authenticated capture does not change UserContext, typed host provenance or authorization. Explicit nonempty constructor inputs and admitted host resource values form the supported finite corpus; opaque drivers, constructor-owned empty-key fill and refreshable provider credentials retain behavior and an explicit incomplete-corpus limitation. Do not duplicate dependency resolution or disable empty-key behavior to imply complete coverage. Static UAR early errors limit unknown-corpus reporting; they cannot sanitize dependency-internal logs. Manager/bindings/orchestrator capture ownership is exclusive until source handover to projection wiring.

R4 normalizes validated inline artifacts through the existing provider metadata/revision mechanism before admission consumers. The provider revision is authoritative; The Boss must consume that value and may not promise arbitrary cross-language numeric hash equivalence. Exact paths are in execution-bindings.json. Bossfang kernel_api.rs receives the exact trait/forwarding selected-job seam needed by actual Arc<dyn KernelApi> callers; no broad trait refactor.

### Selected control and presentation source contract

Task4 mapping source is frozen in mapping-handoff snapshots. Task5 uses exact controlClaims, privately capturing the original runtime bearer and locally supplied run resource values with existing zeroizing dependencies and no ambient re-resolution. Provider-owned secret projection remains independently required. Apply a selected policy of 1MiB complete-frame/decoded-event maximum before parsing/persistence, at most1000 presentation parts and4MiB aggregate UTF-8 per event (history-based values are newly selected presentation policy, not an existing observer limit). Oversize/malformed/gaps preserve unknown outcome without cursor advancement or effect replay. Control uses original owner/attempt/approval identity and caller-observed revision; no fresh lookup may silently replace decision revision.

### Finite canonical output projection

Accept the R3 receipt proposal in uar-resource-authoring.md with additive version1 optional serde-default secret_projection metadata (policy version1, actual-redaction flag, count of omitted raw segments). Absent metadata on old receipts never implies projection. Replay equality/validation include the metadata. Project before the no-store early return and receipt acquisition/save. Verified UTF-8 raw is transformed then rehashed/recounted through the existing constructor; opaque/unavailable raw is explicitly omitted, with original acquisition failure still incomplete. This deliberately gives up original-byte/lossless retention to keep credential echoes outside ordinary stores; completeness refers only to the declared projected view. No original archive/hash-length mismatch or silent key collision is accepted. Structured content-key collisions produce explicit non-lossless representation; typed control keys/identities/live arguments remain intact.

Exact R3Projection claims record independent core work now and manager/orchestrator wiring only after capture-owner release. Raw/JSON-escaped/percent-encoded/standard and URL-safe base64 variants are finite, deduplicated and matched longest-first over original input; distinct copied streams have bounded tails and terminal flush. Captured destination secret-reference header values must join the run corpus before connect/logging. Native Anthropic pre-UAR raw SSE warning becomes static within its exact log slice. Runtime/canary acceptance remains pending; unknown/provider-owned/binary source limits stay explicit.

### Cursor continuity and atomic fragment groups

Source inspection at provider full_harness/handlers.rs186–269 shows contiguous source history before sse.rs324–372 filters RuntimeStep. Suppression makes legitimate visible cursor jumps, so consumer-only gap rejection would fail valid selected streams. Accept a full-harness-only nonexecutable uar.cursor frame containing exact source id/request_id for suppressed events and descriptor event_cursor_profile=contiguous_cursor_frames_v1; selected preflight requires that observed profile, while old manual validation remains compatible. Exact Cursor claims and consumer wire/selection fields are bound.

Private fragment carry groups commit projected typed events/cursor/outcome in one existing SQLite transaction via additive apply_uar_attempt_events; single-event API remains a wrapper. Group limit4MiB decoded, each event/frame1MiB. Incomplete/oversize/malformed/true gap has no group cursor advance or effect replay. Optional tool admission_id stays distinct from full-harness admission key. The isolated afc-c05 gate source exception updates only three owned approval bodies with actually caller-observed revisions; original source/receipts/shipping gates stay untouched.

### First ordinary retention after capture

Observed manager input/history/run-context and early emitter sinks precede actual selected provider capture. Use private run-local staging and content-free active shell until the same once-resolved provider corpus completes; bound staged content at4MiB/1000events, static failures discard it. Preserve session identity/authority and publish projected content through existing append/replace behavior, never wholesale overwrite a stale shared-session clone. No session-manager or D0 correction. Pre-capture awaited approvals require explicit source inspection to avoid withholding a decision needed to finish routing.

Executable retained agent_snapshot is authority, so generic redaction with an old revision is forbidden. A known captured credential variant in that control-bearing snapshot gives static SECRET_IN_EXECUTABLE_ARTIFACT before ordinary retention/model use; this deliberately rejects that unsupported request rather than silently changing authority. Unknown dependency-owned corpus remains a disclosed limitation. Exact selected connections.rs branch now projects safe control outcomes and never persists/returns raw receipt/client diagnostics; missing original dictionary remains unknown after reattachment.

### Retained terminal observation after host crash — 2026-10-06T19:39:13.624Z

HARNESS12 reproduces normal board reconciliation success and host-restart failure after the original UAR run has completed and all presentation events were applied. A2A observation requires the lost process-local secret dictionary and overwrites the durable terminal recovery state with reconciliation_required. Existing stored cursor is the applied cursor and does not separately retain the provider terminal cursor; terminal_at or generic State event kinds cannot prove complete drain.

The approved atomic cursor/outcome and crash-before-board-reconciliation contract is implemented with a private version1 SQLite terminal-observation correlation record, sealed in the same transaction as successfully validated contiguous, fully projected event application. Seal only if actual original terminal receipt cursor equals committed applied cursor; bind original epoch/task/run/revision, and validate reservation/owner/workspace through existing selected paths. Unknown, partial, oversized, malformed, gap, refusal and legacy unsealed rows retain fail-closed behavior. A matching durable seal permits reading only already-projected, non-executable terminal history/usage and reconciling its outcome after Bossfang host restart without reopening streams, credentials, admission or effects. Existing effect_unconfirmed remains unchanged; this proof does not certify effect certainty, restore UAR execution, or alter the operator-selected unsupported/unknown UAR-restart policy.

Exact storage/kernel observation paths are already owned by task03; any cohesive private helper is bound in the source handoff and kept under500lines. Complete correction precedes the failed-only current-source retry. Independent reviewers remain dormant. [Reproduced checkpoint](evidence/execute/final-gates/bossfang-harness-runtime-12.json).

## Operator scope correction — 2026-10-08T23:39:17.118Z

The operator instructed: “Forget about this and move forward. There is no vulnerability.” F6/D0 session-owner investigation and conditional remediation are removed from this release phase’s acceptance scope. Tasks02/5 and02/6 are withdrawn/cancelled, not passed or evidence-backed disproved. Task02/7 now covers exact approval/claim/cancellation only. Do not inspect, execute or retry the excluded diagnostic. No assertion of a demonstrated vulnerability or a verified absence of one follows. Application/service credentials on the selected Bossfang→UAR path and configured resource credentials on outbound MCP connections remain the accepted architecture. Other identity, exact-decision/effect, formatting, package/platform and independent-review requirements remain in force. This supersedes earlier F6 dependency and blocker statements in historical plans/reports.

## Operator phase-formatting waiver — 2026-10-09T06:02:14.635Z

Direct operator approval waives the global UAR formatting gate for this isolated phase; the recorded command remains FAILED. Retain baseline/vendor/excluded-path debt for the parent release and the scoped formatting passes separately. This supersedes only the earlier unwaived-global-format prerequisite for parent completion, not any acceptance outcome, F6 exclusion, remaining eligible checks, independent review, source/payload/platform limits or shipping ownership. See [authorization](evidence/execute/parent-resume-2026-10-08/global-format-operator-waiver.json). No product/rule change.


## 2026-10-09 — Operator directs implementation closure with verification deferred

Operator explicitly directs waiver and implementation-first/test-later closure. Remaining broad UAR regression/example/doctest batch, full cumulative independent delivery review and global formatting are deferred for later acceptance, not PASSED. Retain existing selected production-path acceptance, scoped checks, unsigned macOS package and external-current-UAR startup evidence. Close implementation/disposition tasks under this amendment; no shipping certification, deployment, external receiver acceptance or F6 reinstatement. Archive specifications and reflect with partial verification honestly recorded.

Authority: “Just waive it and continue. we can handle it later. That is my rule--implement first and test later. Go”

Tasks 02/8 and 04/10 now close by completed build/platform/ownership disposition plus the operator waiver, not by inventing passing broad checks. Certification remains incomplete/deferred. See evidence/execute/parent-resume-2026-10-08/operator-deferred-verification.json. No product code changes are introduced by this amendment.
