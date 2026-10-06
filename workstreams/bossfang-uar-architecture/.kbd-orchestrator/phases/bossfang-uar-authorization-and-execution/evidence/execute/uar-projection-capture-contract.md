# R3 authenticated ingress and provider capture contract

Status: read-only implementation contract preparation. No product edits, compilation, test, security diagnostic, source QA, dependency mutation, service or canonical transition. Resource worker retains R1/R2 ownership. This supplements resource inventory findings 12 and 13; it does not revisit grant, stdio or canonical receipt design. Proposed APIs below do not exist yet unless explicitly marked existing.

Source worktree: /Users/gqadonis/.claude/worktrees/bauar-uar. Observed HEAD: 8bff32deb870f6363e94687a2e22492f91a34dfd; product baseline a7cb972992d4f83db6585449ea81af0fe4a1c990 plus documentation commit and current uncommitted identity/approval work. Pinned Liter checkout observed: 0617979022aea621dd13541dee07ad84ffcf7d21. Snapshot time: 2026-10-06T15:21:13.160Z.

## Decision: explicit redaction-only contribution, no identity field

Use a private-construction, cloneable, non-serializable redaction-only request extension, proposed AuthenticatedCredentialCapture. Store only a RunSecretScrubber contribution; redact Debug. Locate in new src/uar/security/credential_capture.rs with a declaration in security/mod.rs. Its capture constructor is security-module-visible, while consuming/merging its scrubber is crate-visible. No raw getter, privilege check, header forwarding or credential-provider interface. Existing RunExecutionRequest.host_secret_scrubber is the run carrier. Add a crate-visible merge method on that request if useful; no new UserContext, VerifiedIdentity, HostAuthority or ActorOwner fields.

The extension is data for output projection, never proof that the bearer was issuer-kind, a host, a scoped administrator or even a tenant identity. Existing proof and admission code remains authoritative. A synthetic internal caller may use an empty default contribution; that grants nothing. No global or task-local secret registry and no persistence of this extension.

## Exact ingress ordering

1. sidecar_guard.rs::enforce: after authority, Origin and constant-time token checks succeed, capture the actual accepted token into the redaction-only extension before removing Authorization. Then retain the existing header removal and HostAuthenticated insertion. Capture the bare value and accepted complete Bearer header form as dictionary contributions so encodings of either complete form are covered by the selected projector. Do not expose SidecarLaunchToken or make HostAuthenticated carry secret bytes. Rejected requests never contribute. Inner middleware must preserve this extension even when it also admits another actual credential after the launch bearer was consumed.
2. middleware.rs: successful verify_token branch may create the JWT contribution from the actual selected token. Return it with context through a private resolution result, or a private richer helper plus the existing context-only test wrapper. Do not infer verification merely because an Authorization header or named context exists. Optional invalid JWTs currently become anonymous; those must produce no authenticated contribution. Direct X-API-Key contributes only after validate_key returns Some(context), and only when that branch is selected (Authorization retains precedence). Workspace authorization must succeed before installing the admitted context and final merged capture extension. No capture from exchange JSON/body here: the exchange handler does not create a run, and later exchanged JWT requests capture their actually presented JWT.
3. a2a/grpc.rs::caller: after signature/claim verification and existing tenant/workspace/owner admission succeeds, return the capture beside the existing owner, instance and agent result. Prefer a small private AuthenticatedCaller struct over making the tuple harder to read. message_send forwards it before request.into_inner discards metadata; message_stream already delegates to message_send. Lookup/cancel/stream lookup do not create a new root or overwrite an existing root's corpus. gRPC currently has Bearer JWT ingress, not a direct X-API-Key verifier; do not invent one.

Capturing after successful validation does not sanitize arbitrary parser/verification failures before that point. Existing static authentication failures must remain static. No secrets or full request headers go to diagnostics.

## HTTP adapters: exact proposed claim extensions

Each adapter extracts Option<Extension<AuthenticatedCredentialCapture>> separately from UserContext and merges its contribution into the run request before enqueue/execute. Omission means empty contribution, not failed identity and not authenticated host. This preserves embedded callers and existing wire DTOs.

| Existing path | Exact propagation point |
| --- | --- |
| src/uar/api/routes.rs | create_run -> admit_run; merge before host-resource admission/execution. resume_run and resume_run_from_checkpoint merge the new authenticated request contribution into the newly constructed request. Do not reconstruct old login secrets from persistence. |
| src/uar/api/full_harness/handlers.rs | admit_task -> admit_run forwards the extension; preserve reserve/digest/idempotency/revision semantics. Redaction data stays out of canonical request body, admission digest and receipt. |
| src/server.rs | api_chat_completion root request construction at existing RunExecutionRequest::new/with_user_context path. No change to replay/lookup or session isolation. |
| src/uar/api/openai/routes.rs | chat_completions root RunExecutionRequest construction. |
| src/uar/api/acp/routes.rs | both HTTP closures -> handle_rpc/handle_rpc_stream -> dispatch carry the extension separately from wire params and headers. |
| src/uar/api/acp/handler.rs | dispatch -> handle_runs_create merges into its request. Other methods need no run capture. |
| src/uar/api/a2a/handler.rs | handle_rpc and handle_agent_rpc -> private dispatch -> a new crate-visible send_with_capture path described below. |
| src/uar/api/a2a/grpc.rs | caller -> message_send -> same send_with_capture path. |

These are proposed exact claims, not authorization to edit them. Existing public helper APIs should keep their current signature and delegate with an empty contribution where practical, avoiding unrelated fixture/embedded constructor churn.

## A2A mailbox and root/child inheritance

A2AThreadService::send currently reaches ActorSession::submit_prompt, not RunExecutionRequest directly. Passing capture only to UserContext or a route-local request would therefore lose it.

Smallest explicit private path:

- thread_service.rs: retain public send(owner, instance, agent, params) as an empty-capture wrapper; new crate-visible send_with_capture takes one redaction contribution. Preserve owner/contract/context validation. Only the accepted submission gets the contribution; do not store it in Task metadata, history, contexts or the service binding registry.
- actor/system.rs: retain submit_prompt and submit_reserved_prompt wrappers. Add a private shared submission implementation accepting the contribution plus a crate-visible submit_prompt_with_capture entry. Existing logical-instance pump remains unchanged and supplies the empty default through submit_reserved_prompt.
- actor/messages.rs: add redaction-only contribution to the existing UserRun envelope (not the serializable domain message and not ActorOwner). Only one construction was found: actor/system.rs. The only match that needs mechanical propagation is actor/agent_actor.rs. Debug must remain redacted through the contribution type.
- actor/agent_actor.rs: pass that contribution to a crate-visible execute_named_with_capture on the hosted session. Keep existing execute_named as empty-capture wrapper; do not add fields to long-lived actor state.
- thread/actor_host.rs: execute_named_with_capture constructs the same root request, then merges before execute_request/start_hosted_root_turn. Existing execute(content) and callers retain defaults. Root registration/persistence receives no credential data.
- turn/request.rs: reuse host_secret_scrubber, initialized by new/from_bound_agent as today. Existing external constructor literals stay unchanged.
- manager.rs: consume request capture in RunEventEmitter as today, then merge resolved model/provider and admitted MCP contributions before their first corresponding construction/error/output. Keep the complete run dictionary through the active run lifetime.
- turn/bindings.rs: add one private scrubber snapshot to RunDelegationBindings when manager creates it, after root capture is complete. This dictionary is projection data, not a provider/MCP grant. Narrowing child tools/models must not discard redaction of parent secrets the child might echo.
- thread/kernel.rs: CapturedThreadKernel::execute clones this root snapshot into the new child request before execute_captured_thread. Existing RunModelBindings::for_policy reuses captured drivers and does not resolve credentials again. A separate InheritedRunBindings field is unnecessary if the child request is populated before entry; verify implementation does not reset that existing request field when wiring it.

No new fields in every UserContext literal, no serialized secrets, no ambient re-resolution at child dispatch. A fresh root in a reused actor gets that turn's capture; a long-lived actor must not accumulate every prior login token indefinitely. Restart/checkpoint resume cannot reconstruct a discarded old token and must not pretend otherwise; new ingress and new resolved resource capture are available.

Exact mechanical envelope sites observed: AgentMessage::UserRun construction in actor/system.rs:149, match in actor/agent_actor.rs:118; execute_named calls in actor/agent_actor.rs:131 and thread/actor_host.rs:199; submit_reserved_prompt callers in actor/system.rs:128 and runtime/instance/pump.rs:202. Keeping wrapper signatures avoids changing pump.rs and its persistence contract. No blanket tests or constructor claims requested.

## Provider capture: one authoritative construction input

Current root order is manager route/catalog -> apply_credential_layer -> optional RunCredentials::config_for -> team primary/fallback resolution -> RunModelBindings::capture -> driver construction. The earliest UAR provider-service credential is cfg.api_key immediately after successful resolution (manager.rs around 505). The final ordinary primary/team fallback configs are around 4409–4529. Capture those selected values before subsequent error paths; resolver failures before any key exists should use static error categories rather than claiming a missing dictionary can scrub them.

But LlmConfig.api_key alone is not the actual universal key source. config.rs::build_client_config (1857–1893) resolves explicit api_key, then api_key_env, then LLM_API_KEY, then captured provider_keys. Capture the actual returned ClientConfig.api_key and base_url exactly once and pass that SAME ClientConfig by value to the existing LiterLlmDriver::new/from_endpoint_profile constructors. Never call build_client_config again merely to discover a key for redaction. This requires a surgical orchestrator helper accepting a capture accumulator, with existing build_driver retained as the compatibility entry; no new protocol adapter. Endpoint-profile branches in bindings.rs must use the same one-config pattern directly.

For native Anthropic, build_driver currently chooses api_key then provider_keys[anthropic], and the selected base_url, before AnthropicDriver::new. Capture those exact selected values at that boundary. Do not apply Liter's different environment precedence to the native path.

Fallbacks must each produce one final config using the existing three branches: selected endpoint profile, run credentials.config_for, or ordinary Orchestrator::fallback_llm_config. Make that existing ordinary config helper crate-visible if needed, rather than cloning its rules. Capture each selected key/base URL before constructing its client and before the existing fallback warning. Keep a failed fallback's contribution for projection of its returned error. Never return only a successful binding's dictionary, because construction can fail before binding exists.

A minimal accumulator contract is a mutable reference to the existing emitter.secret_scrubber (or its R3 projection replacement) passed through RunModelBindings::capture and the construction helper. Accumulate before calling the constructor. On failure the caller still owns the updated accumulator. Project construction error text before logging/returning it; use static errors when corpus completeness is unknown. On success clone the completed root snapshot into delegation bindings before descendants begin. This avoids a shared mutable global dictionary and avoids losing failed-construction contributions in Result::Err. The resource worker may choose the already-planned immutable projector type once contribution collection is finished; transport claims and ordering remain the same.

## Pinned Liter semantics and precise limits

Read-only pinned source: vendor/git/liter-llm/crates/liter-llm/src/client/mod.rs:714–792 and 984–1031, client/config.rs:124/155–165. DefaultClient::new first builds/validates its provider, then reads a provider-designated environment variable only when load_env is true AND config.api_key is empty. It fills missing values; it does not overwrite a nonempty key. It does not replace ClientConfig.base_url in this branch. ClientConfig.load_env is an existing public field; from_endpoint_profile already sets it false.

Therefore, for an already nonempty actual ClientConfig key, disabling this duplicate key discovery preserves that branch's behavior; use the same captured key and URL. For host-supplied/profile paths, retain their existing load_env=false and transport controls. Do not blanket set load_env=false for empty-key ordinary clients: it would remove an existing fill-missing path and its authentication error, altering behavior.

There is no public pre-construction complete provider-resolution snapshot in the inspected pinned client: build_provider is private. A generic UAR reimplementation of provider detection/env lookup would duplicate Liter logic and is outside this bounded contract. In addition, Bedrock provider construction may resolve omitted AWS fields from environment, and Vertex may install a refreshable ADC credential provider when no key/provider was supplied; load_env=false does not disable that ADC block. These values cannot be claimed as captured from ClientConfig.api_key/base_url alone.

For ordinary empty-key constructor-owned resolution or refreshable/provider-owned credentials, retain behavior, use static early failure reporting at the UAR boundary, and explicitly record capture incompleteness until a separately accepted supported snapshot/caller contribution exists. No dependency edits, environment scans, secret extraction from opaque clients or second ambient resolution are proposed. This is a concrete limitation, not acceptance of universal leakage protection.

The existing supplied_primary: Option<Arc<dyn LlmDriver>> is likewise opaque. Its actual credentials may differ entirely from adjacent LlmConfig. Do not label config values as that driver's known credential corpus. Preserve the supplied driver; accept an explicit caller-owned redaction contribution only where such a constructor contract is separately accepted. Otherwise mark provider corpus unknown and use static UAR early construction/binding errors. This cannot guarantee removal of unknown values emitted by an opaque driver or its own logging. Static UAR errors are not universal DLP and do not retroactively sanitize constructor/dependency-internal logs.

## Exact source claims for driver approval

Existing R3 manager, turn/bindings, host/mod and llm/orchestrator claims need the contribution/ordering slices above. Supplementary claims: security/middleware.rs; security/sidecar_guard.rs; security/mod.rs; new security/credential_capture.rs; turn/request.rs; thread/kernel.rs; API routes/full_harness handlers/server/openai/acp/a2a paths in the table; actor/messages.rs, actor/system.rs, actor/agent_actor.rs and thread/actor_host.rs. Source-root prefix for all shortened paths is src/uar except src/server.rs and src/llm/orchestrator.rs. config.rs and llm/liter_driver.rs were inspected; no changes are required merely to capture a single returned ClientConfig and call their existing APIs. Liter dependency files remain read-only. No pump.rs change is needed with wrappers. No additional test files are claimed by this contract.

The first implementation decision still requiring explicit disposition is how to label or constrain ordinary constructor-owned/refreshable credentials for the supported R3 acceptance profile. Do not resolve this by quietly altering provider selection or key precedence. Opaque supplied drivers retain the explicit unknown-corpus limit above.

## Source fingerprints for this contract

Hashes bind read source observations, not QA or runtime acceptance. Paths are relative to the isolated worktree; peers may subsequently change them.

| Path | SHA-256 |
| --- | --- |
| `src/uar/security/middleware.rs` | `89dd58660bb28a96ae60c18d1a4963f27c38f5bb4b09901028501c08d6570f3e` |
| `src/uar/security/sidecar_guard.rs` | `2345f5e543d6c246f901e0887efa52737f473ecf867e1a0f38b712c426da531a` |
| `src/uar/api/a2a/grpc.rs` | `0070670397758e4c2045564e5a126e81ba2b18c37162c9701bb05d59505f845c` |
| `src/uar/api/a2a/handler.rs` | `5676f635c74a91f46ff257bfcdca279027ac691908d99c9d2040b866a4226cda` |
| `src/uar/api/a2a/thread_service.rs` | `7b7386bb0ce54483d293ea6846f7a919e3ae8c1603c06e7a9c39c4bda37bc083` |
| `src/uar/runtime/actor/messages.rs` | `9b55d0906ce2730bfe092283699870a3324e05e41c943b6c792cfbd2485ad9fb` |
| `src/uar/runtime/actor/system.rs` | `4c3cfe32c5ad91542317fb8b31ef69fbe7c1d7cd125524c866df47296d10f03d` |
| `src/uar/runtime/actor/agent_actor.rs` | `b761bdc2273b39a4f308db20ee2d5cc205a207275d009a98257e5ddcd45e1129` |
| `src/uar/runtime/thread/actor_host.rs` | `5a32fe97c78fb15ca306a231d01c5cbaac72f270a4c3001a62242b5610fb1c20` |
| `src/uar/runtime/thread/kernel.rs` | `90675eac12a2f58bad8ebd5625f5e67a4b7cc127b99b621309e2dbaec8996c10` |
| `src/uar/runtime/turn/request.rs` | `babb566b745b5f3a37c532ac9d9859cb543b95eb9743abe2ef9d6123fa9b35d4` |
| `src/uar/runtime/turn/bindings.rs` | `a135b832dc888374bfcc06c2d7c91b124f9dd3a4b4cebcbc9089d29a12e6ab05` |
| `src/uar/runtime/manager.rs` | `e0832a36f6d7893bc1cb3bb9b0360845d8881e2744a28fcce7bcdb7a2b3f714a` |
| `src/config.rs` | `53f8d9b25ba9bbdb364abc49e8c96f64399663a679c12d257c460e426aad740b` |
| `src/llm/orchestrator.rs` | `9337d6f37153d33067f5fb8d7d042a47465c51742f99f076145468edcfd0fef3` |
| `src/llm/liter_driver.rs` | `ee25a3547a774694225f183af5ad2047f8aae523e2c9e0742c8e6a430d9d837f` |
