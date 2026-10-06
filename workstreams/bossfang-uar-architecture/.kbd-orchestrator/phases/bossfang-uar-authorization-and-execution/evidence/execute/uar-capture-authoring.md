# R3Capture and R4 source authoring handoff

Status: source authored; acceptance pending. Child resource task4 allocation revision84. Worktree /Users/gqadonis/.claude/worktrees/bauar-uar; HEAD 8bff32deb870f6363e94687a2e22492f91a34dfd. Product baseline remains a7cb972992d4f83db6585449ea81af0fe4a1c990; current dirty source includes earlier identity and exact-approval work. Recorded 2026-10-06T15:37:26.910Z.

## Delivered boundary changes

- security/credential_capture.rs introduces AuthenticatedCredentialCapture with private storage, crate-only constructors, redacted Debug, no serialization and no raw accessor. It is an output-redaction contribution, never identity/host/key issuance authority. middleware captures only verified selected bearer/direct API-key branches, preserving optional anonymous failure behavior and bearer precedence. SidecarGuard captures the accepted consumed launch token before header removal without changing HostAuthenticated. Existing launch capture is preserved when inner authentication contributes another actual selected credential.
- RunExecutionRequest::with_credential_capture merges into the existing host_secret_scrubber. API create/resume and full-harness admission, server chat, OpenAI and ACP run adapters carry the separate extension. It stays out of DTOs, canonical request digests, admission receipts and persistence. Full-harness expected_revision/admission handling and strict approval semantics are unchanged.
- A2A HTTP/gRPC carry per-turn capture through send_with_capture -> submit_prompt_with_capture -> AgentMessage::UserRun -> execute_named_with_capture -> the root request. Existing send, submit_prompt, submit_reserved_prompt, execute_named and ACP dispatch remain empty-capture wrappers; no UserContext, VerifiedIdentity, HostAuthority, ActorOwner or logical-instance pump field changes. gRPC tuple gains one private capture component; message_stream reuses message_send.
- orchestrator::capture_client_config takes the actual once-built ClientConfig by mutable reference, captures its actual key/base URL, and disables only redundant environment fill for a nonempty key. That same config is passed to the existing constructor. No second build_client_config call discovers secrets. Native Anthropic captures its distinct selected key and URL. RunModelBindings::capture retains contributions from failing fallback constructors via a caller-owned mutable accumulator; ordinary fallback config uses the same existing helper, now crate-visible.
- manager passes &mut emitter.secret_scrubber to capture, uses static/public-code early construction failure reporting, and records the completed snapshot in RunDelegationBindings.secret_scrubber. CapturedThreadKernel copies that snapshot into each child's request; no ambient credential rediscovery or new grant. Resolver/fallback warnings no longer print their raw error. Provider and model selection, empty-key constructor-owned behavior and supplied opaque driver remain intact.
- Validated inline artifacts now pass through with_catalog_metadata("inline") in resolve_run_agent before run/tool-admission consumers. Existing source provenance is retained, stale client revision is overwritten with the provider's content revision, and registered/bound resolution remains unchanged. This corrects the snapshot-versus-tool catalog revision discrepancy without changing ToolAdmissionContext's public API.

## Scenario source authored

tests/bauar_inline_revision.rs (new, below500 lines) imports existing sidecar_process, stub_llm and resource_peer fixtures without modifying them. It authors three real-router admissions: missing metadata, stale client revision with explicit source, and a changed projected prompt retaining source provenance. A loopback paired-admission receiver records the actual PreparedToolInvocation; scenario assertions compare catalogRevision with the run inspection's agent_revision and provider-computed normalized revision. One receiver effect per admitted run is the positive control, with exact originating approval handled by the shared fixture. Source only: no fixture, listener, process, test or compiler was run.

## Constructor and adapter handoff

Exact changed consumers are listed in the source table. AgentMessage::UserRun has one source constructor in actor/system.rs and one match in actor/agent_actor.rs. Existing actor submission/named-execution wrappers preserve logical-instance pump and external helper signatures. RunModelBindings::capture has one source caller in manager.rs; RunDelegationBindings has one source constructor there. admit_run callers in routes.rs and full_harness/handlers.rs both pass ingress capture. No broad public principal constructor migration was introduced.

R3 projector owner may now edit the released manager.rs, turn/bindings.rs, llm/orchestrator.rs and api/routes.rs slices. APIs to retain: RunSecretScrubber::{extend,from_values,scrub}; new capture_client_config and build_driver_captured; request.host_secret_scrubber; delegation.secret_scrubber. The finite accumulator is still available as emitter.secret_scrubber through model construction and into root capture. No raw executable tool argument changed.

Earliest shared configured MCP root access observed: manager capture_root_mcp_resources around1352; root assignment around2979–3003; next explicit bound resources block around3006 precedes later discovery/activation around4066. Add immutable catalog/environment contributions after successful root capture and before first selected transport discovery, preserving root capture owner checks. This note is a handoff reference, not a new grant-source review. No edits were made to resource-owned host modules, MCP runtime, projection modules or persistence.

## Limits and remaining work

Supported finite corpus is explicit resolved nonempty ClientConfig credentials and captured request/host resources. Pinned Liter fills empty keys internally only; no new provider detection, environment scanning or duplicate resolution was added. Constructor-owned empty-key/refreshable ADC/Bedrock credentials and supplied opaque Arc<dyn LlmDriver> remain unknown to this corpus. Static UAR early errors do not sanitize dependency-internal logs or arbitrary unknown driver output. Do not report universal DLP or remote receiver certification.

Ingress capture is separate from authority. It preserves the consumed launch token for projection but forwards no authentication credential to model/tool/receiver request payloads. Root inheritance extends protection, not permissions. New roots get their current request capture; old login secrets are not reconstructed from checkpoints.

Removing manager's prior RunCredentials::scrub call may leave that crate-private helper unused; its credentials.rs owner was notified, and no unclaimed cleanup was performed. No runtime or compile claim is made. Core finite projector/canonical receipt/history/event wiring is the next owner's task; these capture edits alone do not complete R3 or V1/V2.

## Commands and phase discipline

Only Node24 file reads/writes, rg source discovery and read-only git snapshots were used. No test/compiler/build/lint/formatter/service/dependency/commit/canonical commands were run. The older repository per-edit Cargo rule conflicts with the explicit phase/task no-gates policy; the explicit task policy was followed. No D0 fixture or session-manager source was read or changed in this allocation. Skills applied: prometheus-rust-workspace, rust-router, rust-best-practices and rust-async-patterns. Existing pinned APIs were read in source; no library migration or dependency decision was introduced.

All23 changed source/scenario files are within the accepted R3Capture/R4 list. No unrequested product paths were edited. The new guards/data capture trace to the actual authenticated ingress, provider construction error and inline artifact revision boundaries. Production source authoring is handed off, not certified complete.

## Snapshot hashes

Scoped tracked diff SHA-256 against HEAD: d574da0a455c3f3a560a82ddbe8c43097a007f51d67300f4b66a83758f95abd7. This hash includes earlier dirty changes on shared files and excludes new untracked files; the per-file hashes below include every new file and bind the actual handoff source.

| Source path | Lines | SHA-256 |
| --- | ---: | --- |
| `src/uar/security/middleware.rs` | 565 | `1069bef5193d6876ea8fbc0661b853704a09f7a969f2fafac813475d9be9312e` |
| `src/uar/security/sidecar_guard.rs` | 187 | `ccb4111bcd9dfae57b4d5750e1c4567589241f7cea63c17943135692734ab477` |
| `src/uar/security/mod.rs` | 16 | `ca12ec2b2aaf93db12ec0b9dbade688f5f8af1de7900e91cbb7d4842b7845bdb` |
| `src/uar/security/credential_capture.rs` | 30 | `23665e408a2c8735a82275c58f492b607fc9cb30c681387e07bc4eebf1191755` |
| `src/uar/runtime/turn/request.rs` | 298 | `f407b8d8f4bac034b9efdd28bbc1608624fadec2798acf6e43c1eddae16027a0` |
| `src/uar/runtime/turn/bindings.rs` | 469 | `d2a77d2b307108781b60f85a4715ac73fc8fa03f89a054df683e8e6c97a712f8` |
| `src/uar/runtime/thread/kernel.rs` | 667 | `c473af8a5c59df1c9f0240132ac133b1d7582cc4e37c4d9549a35fdc12a7620f` |
| `src/uar/runtime/manager.rs` | 7442 | `395b48f24fb5ac73ae32a0ca73e98c4cb66211a71d3d2a3cbd8c71abc3a304ac` |
| `src/llm/orchestrator.rs` | 3311 | `1cc5aabc9f135681d364e2f60a9416272bdcc1f6260434fcdf8006bc6f59d983` |
| `src/uar/api/routes.rs` | 1633 | `239904c15f76e335e656a653a8ba0274f4cf9b9aa6ddb705ee3c163b318d0df4` |
| `src/uar/api/full_harness/handlers.rs` | 450 | `3acc910c63638dff49a962c851f075e95ff19ecaebce1c5002ea6e4fe96d0c37` |
| `src/server.rs` | 7377 | `e3f3aeb84eb230829582575ae7f9ce34d44f7fa14b59354bfddf5c2db030de9c` |
| `src/uar/api/openai/routes.rs` | 208 | `d03159b33806e4d7f8a7d0abefdca9773c72a53cd70b4a1a87f6a4aa8989782a` |
| `src/uar/api/acp/routes.rs` | 178 | `2058f097da663eebaabd4a2b77f1278de319ba13395f10993ab9a8951d6d1f9d` |
| `src/uar/api/acp/handler.rs` | 360 | `e2aeb8c8042c831fec6b8f93a0badb2539d0c4effa813e0189980d9c925f9012` |
| `src/uar/api/a2a/handler.rs` | 459 | `edc674f91ec0465516520ba402572dbc5c918c65ec2b27b739fab27bb3800848` |
| `src/uar/api/a2a/grpc.rs` | 574 | `5b51acb47561762b4053fd2618c6fce04adada4d001df5f750621e89e5ba7da3` |
| `src/uar/api/a2a/thread_service.rs` | 541 | `deeb7c7421c615d20d206447c5b0e269ef8e7247f8510d77eb355415205fa660` |
| `src/uar/runtime/actor/messages.rs` | 184 | `e8cecce072a4981490aa203a93b2938e37391a508806f243bceaf86da4d9c063` |
| `src/uar/runtime/actor/system.rs` | 670 | `6e42d10c83c2bb87c045bf0224f6dfedfa17603ef460f8254dfabf43b24835dc` |
| `src/uar/runtime/actor/agent_actor.rs` | 184 | `d890da10b95892f1acfdb3476f8f810eca1a6220a8391bb2787f81b252a0bc76` |
| `src/uar/runtime/thread/actor_host.rs` | 518 | `7069488876e7655d04b2fb14137cc5801b0ff150e5a0b6cbf8f157f79d5bd36e` |
| `tests/bauar_inline_revision.rs` | 136 | `84b0188c6929af49ef6ab937f3fd9445474dafa5657a943ba969d00125b2c15e` |
