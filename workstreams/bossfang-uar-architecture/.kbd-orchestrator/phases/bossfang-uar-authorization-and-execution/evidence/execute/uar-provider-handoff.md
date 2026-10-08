# UAR provider source handoff for parent03/1

Interface prerequisite only, captured 2026-10-06T15:07:46.384Z. No runtime acceptance or production review. Workspace: /Users/gqadonis/.claude/worktrees/bauar-uar.

## Exact source binding

Product baseline a7cb972992d4f83db6585449ea81af0fe4a1c990; current HEAD 8bff32deb870f6363e94687a2e22492f91a34dfd is the planning-only 8bff32 commit above that baseline. Current identity/approval product source is dirty and uncommitted. C05 ancestor fcfce6d226b50eee502c5f272e9215112d933e29 is incorporated; all six captured full_harness provider source files equal their C05 content (true). This is ancestry/content evidence, not acceptance.

SHA-256 of scoped tracked diff from HEAD: 50c68bf8536db8d74dc68d7c9bce1b798f1db6d20fc5109ccdca852a4d579f72. From product baseline: 50c68bf8536db8d74dc68d7c9bce1b798f1db6d20fc5109ccdca852a4d579f72. Exact source manifest SHA-256: 880a1ff8f5765375fd87b75cd09d7f82255e040af9429a06b0a7cc6f45703a1d. The paired JSON records 42 exact files, byte counts, current/base/HEAD hashes, untracked content separately and C05 comparisons. The diff hashes cover only its enumerated secret-free source/config/docs files; they exclude diagnostic fixtures, unrelated work, dependency checkout contents and canonical state. Every captured file was re-read to establish stable bytes during this handover. Later edits supersede these hashes.

## Provider selection

GET /api/uar/full-harness/v1/capabilities advertises profile full_harness_v1, a process runtime_epoch, recovery unsupported_after_restart, retention process_ephemeral with configured terminal TTL/cap, and steer_supported=false. Cargo package version is1.0.0; the route/profile v1 is the interface version. A consumer must discover the advertised profile and not infer recovery from package version.

/api/chat/completion and /v1/chat/completions are model-completion-compatible paths implemented by server.rs::api_chat_completion. Their request type is server-local ChatCompletionRequest, not the smaller similarly named OpenAI adapter type. They accept model/messages or message and optional UAR policy/session/stream fields; temperature and tools are compatibility inputs, not arbitrary effect authority. They do not supply the full-harness admission/task/revision contract. Explicit model-route selection and full-harness delegation are different consumer contracts.

## Wire operations

All paths below are relative to /api/uar/full-harness/v1. Except capabilities, requests need x-uar-workspace-id and the same authenticated owner/workspace scope.

| Method/path | Request contract | Response/outcome |
|---|---|---|
| GET /capabilities | no body; authenticated principal | RuntimeDescriptor: profile,runtime_epoch,recovery,retention,steer_supported |
| POST /tasks | {"required":{"admission_id":"nonempty string","native_task_id":"nonempty string","input":"string"},"agentSelector":"artifact OR agent_id OR deployment_binding_id; ambiguity rejected","optional":["service_placement","session_id","run_credentials","mcp_servers","tool_admission","working_directory","reasoning_effort","history","skill_attachments","flattened presentation negotiation"]} | 202 TaskReceipt; reservation precedes native run entry; same owner/workspace/admission and identical canonical body digest replays frozen admission response |
| GET /admissions/{admission_id} | same owner/workspace; no body | current process-local TaskReceipt or explicit unresolved/expired result |
| GET /tasks/{task_id} | same owner/workspace; no body | TaskReceipt with current revision/state/cursor |
| GET /tasks/{task_id}/stream | optional last_event_id:u64 query or Last-Event-ID header; query wins | existing native SSE history followed by live stream; duplicates suppressed; unrecoverable gap emitted rather than silently jumping |
| POST /tasks/{task_id}/tool-approval | {"expected_revision":"u64 required","approved":"boolean required","approval_id":"nonempty string from exact originating pending event required"} | TaskReceipt; 409 revision_conflict or approval_unresolved leaves no alternative waiter selected |
| POST /tasks/{task_id}/cancel | {"expected_revision":"u64 required"} | TaskReceipt.cancellation separates requested,acknowledged,terminal,cleanup_uncertain; acknowledgement is not terminal/effect reversal |
| POST /tasks/{task_id}/detach | {"expected_revision":"u64 required","observer_id":"nonempty string required"} | observer detach receipt; no execution cancellation |
| POST /tasks/{task_id}/steer | owned task identity | 422 capability_unsupported |

TaskReceipt retains admission_id,task_id,native_task_id,run_id,workspace_id,runtime_epoch,revision,state,retention,cancellation,created_at,detach state,links; optional agent_id,cursor,effective_service_binding,diagnostics and terminal/expiry times. Preserve these identifiers separately. Full-harness approval continues to enforce expected_revision before exact broker delivery; the identity/02 handoff did not edit C05 handlers.

## Input and authority mapping

- input: Full harness uses CreateRunRequest.input, a string; do not send OpenAI messages as an implicit substitute.
- model: Agent artifact policy.provider.default {provider,model}, with explicit fallback list; no top-level model field in full-harness CreateRunRequest.
- budgets: No top-level full-harness budget request field. Artifact extensions.budgets carries BudgetsSection: max_tokens_per_turn,max_tokens_per_session,max_tool_calls_per_turn,max_cost_per_session_usd,timeout_seconds,rate_limit{requests_per_minute,tokens_per_minute}; consumer must map supported semantics deliberately, not assume arbitrary extra JSON is enforced.
- history: history {session_id,messages}; exact request session match; <=1000 messages and <=4MiB counted payload; only user/assistant/tool roles; valid unique tool calls and corresponding nonduplicate results; warm session may ignore seed.
- tools: Artifact tool allow/deny,max_concurrent,execution_mode; effective policy/governance and prepared host admission still apply. Chat compatibility tools field is not a tool grant.
- pairedAdmission: tool_admission camelCase {version:1,hostEpoch,url,headers}; actual SidecarGuard authority required, HTTP loopback /uar/admission/v1; not enabled by ordinary JWT role or configured MCP service-host proof.
- credentials: Run-local provider set requires default/fallback coverage; provider_kind openai_compatible or anthropic; secrets nonserialized/redacted. MCP grants require registered destination, typed host proof, scope/lease/owner constraints.
- reasoning: none|low|medium|high|max only
- workingDirectory: canonical existing directory input; not by itself filesystem authorization

Credentials authenticating the UAR caller are distinct from downstream provider/MCP credentials. Remote identity requires verified issuer/subject/tenant plus operator workspace mapping. Authenticated local SidecarGuard provenance remains installation identity. Configured service-host authority additionally requires signed issuer credential kind and exact trusted-host principal mapping, then destination trusted_hosts; direct/exchanged keys and unclassified legacy tokens cannot acquire that privilege. The paired-host tool_admission endpoint still specifically requires SidecarGuard authority. Resource-boundary changes are future separately owned work; this handoff does not promise those pending changes.

## Failure and recovery contract

The JSON enumerates error statuses/codes. Key consumer distinctions: conflict is409, retention or unresolved current-epoch stream is410, foreign scope is non-disclosing404, prior epoch is409 recovery_unsupported, and steering is422 capability_unsupported. Native run admission rejection retains its original status/diagnostic and reserved identity. Error envelope is {error:{code,message,task_id?,admission_id?}}. Authentication/configuration middleware may reject before provider routing.

Identical create retries under the same owner/workspace/admission reuse the frozen admission response; changed digest conflicts. Lookup by admission reconciles a lost response only while authoritative process-local state exists. Restart recovery is unsupported; disappearance or lost effect response must remain unknown/unsupported with reconciliation, never automatic re-execution. Cancellation requested/acknowledged/terminal/cleanup_uncertain are separate facts. Detach is observer bookkeeping and does not cancel execution.

## Consumer handover checklist

- Discover capabilities/profile and runtime_epoch before selecting full-harness behavior.
- Bind authenticated identity/workspace independently of downstream credentials.
- Retain admission_id + exact request body across uncertain create response, and task_id/native_task_id/run_id/epoch/revision/cursor from receipt.
- Submit exact approval ID plus current expected_revision; never substitute latest pending implicitly.
- Map budgets, model, history and tool constraints only through supported fields; report unsupported semantics.
- Treat cancellation receipt stages distinctly; never turn unknown or unsupported recovery into automatic replay.

Prior exact identity/approval receipts: uar-prerequisites.md, identity-policy-authoring.md, key-attenuation-authoring.md, key-management-authoring.md, jwks-integration-authoring.md, host-provenance-authoring.md, exact-approval-authoring.md. No dependencies selected or changed. Existing recorded Liter operator override remains authoritative over the historical versions entry. No original/C05 worktree state or gates changed. Read-only git/Node/rg source inspection and evidence writing only; several attempted narrow lookups named absent candidate directories before actual declarations were located, with no mutations. No tests, compiler, build, lint, services, D0 fixture/session-manager activity, canonical writes, or product edits. The uncomfortable limit is that source interface preservation cannot establish successful execution, packaged compatibility, lossless recovery or provider acceptance.
