# UAR administration surface — revision 2

Inspected UAR c29af47be3. Router source is authoritative; standalone frontend and partial OpenAPI are references. Paths below are relative to the selected UAR service. Aliases do not create separate UI destinations. Implementation must complete a method-level inventory from mounted routers at its frozen baseline and keep this mapping current.

| Internal UAR destination | Existing REST family / source | Administration behavior and missing contract |
|---|---|---|
| Overview & storage | /health*, /readyz, /metrics, /api/uar/capabilities; Boss sidecar launcher | Version, effective connection/storage, readiness, logs, restart; expand capability metadata without replacing existing host vocabulary. |
| Providers & models | /api/uar/providers and /{id}/models, /test, /default; /api/models, /api/catalog, /api/uar/resolve-model | Provider CRUD/default/test; model lists and configuration via provider config; Boss-linked, gateway-linked or UAR-owned selections. No invented standalone model CRUD route. |
| Agents | /api/agents GET/POST and /{id} GET/PUT/PATCH/DELETE; /api/uar/discovery/agents | Persisted/builtin/federated origin, editor, duplicate/import/export, validated revisions and selection. Shared catalog resolver for execution; errors cannot look like empty successful catalogs. |
| Definitions & compiler | /api/uar/compiler; /a2a/compiler when a2a-transport built | Validate/compile/register native UAR-AGENT-MD; native JSON import/export; signed descriptor verification. A2A cards describe federation, not native executable artifacts. AGENTS.md is project instructions. Other standards need a named importer, not a silent conversion claim. |
| Skills | /api/uar/skills; /api/uar/agents/{id}/skills; /api/uar/skills/reload | CRUD/toggle/match/provenance/import/update/config, bind to registered agents. Keep installed pack refresh distinct from runtime catalog enablement. |
| Presentations & A2UI | /api/uar/presentations; /api/uar/a2ui/schemas, /components; run /a2ui/messages, /actions, /artifact-response | Owner-scoped presentation CRUD/CAS and policy assignment. Extend missing persistent custom catalog lifecycle; builtin schemas read-only, duplicate to customize. Preview approved components through supported renderer, never executable arbitrary code. |
| Runs & AG-UI | /api/uar/runs create/stream/cancel/checkpoints/resume/tool-approval; session cancel; /api/uar/actors | Inspect/control owned runs and agents, approvals and checkpoints. Add list/detail metadata if mounted APIs cannot support console. Preserve agui_spec stream and replay cursors. Diagnostic trigger routes stay diagnostic. |
| Conversation policy | session agent-config/effective-config/context-stats/prompt-caching; /api/uar/conversations/{id}/policy | Requested versus effective agent/model/tool/context policy; session ownership, readable provenance, no silent escalation. Surface within Runs and relevant model/agent editors. |
| Knowledge & memory | /api/uar/knowledge-bases; /api/upload, /api/attachments/{id}, /api/ingest; /api/admin/memories, /api/memory | Owned KB/document/search/import and available memory administration. Sidecar internal memory is currently locked off; expose external memory through Services and state why. Do not globally unlock cross-session memory. |
| Tools & MCP | /api/tools and /{name}/execute; /api/uar/mcp/health and /servers | Inspect/discover/configure actual host-owned MCP definitions through Boss bridge; operations obey tool approval. Global MCP mutation is locked in sidecar. Run grants are separate from persistent declarations. |
| Security & governance | /api/uar/auth, /credentials, /user; settings security/governance/presentation-policy | Admin credentials, caller capabilities, provider secret presence and set/clear; masks are not encryption. Feature-disabled governance is shown explicitly. Preserve per-session ownership while giving the trusted admin explicit authorized scope. |
| Runtime settings | /api/uar/settings/types, drift, generic keys and namespace groups | Schema-driven controls for registered settings, source/default/override, field errors, conflict handling and saved/effective/apply lifecycle. Restart-required and host-locked are distinct. No fake save for unconsumed keys. |
| Protocols & federation | /a2a/agents/{id}, /a2a/registry/*, /.well-known/agent.json; configured /acp and /acp/stream; /.well-known/uar-config and reload | Feature/config-gated cards, registry and transport settings/status. Preserve remote peer authority. JSON-RPC transports are protocol integrations, not REST CRUD. |
| API coverage & diagnostics | /api/live*, /api/uar/sync/stream; /api/config/persistence; /api/chat/completion; /api/uar/route; /api/generate-title; /v1/chat/completions, /v1/messages, /v1/models | Show route-family support and operational diagnostics. Streaming/inference/file paths power workflows instead of one sidebar item per endpoint. Disabled legacy /api/chat and /api/sessions endpoints are explicitly marked retired, not fabricated as working admin APIs. |

Navigation groups: Runtime (overview/models/settings), Agents (catalog/compiler/skills), Experience (presentations/runs/knowledge), Administration (tools/security/protocols/diagnostics). Reuse Boss settings shell and controls. Deep links, search, compact-width navigation, keyboard focus and dirty-form protection apply throughout. Display operational language first; raw REST paths belong to advanced API coverage details.

## Catalog evidence

- Boss src/main/ai/runtime/uar/UarRuntimeConnection.ts:173,332: inline buildArtifact per turn; null schemas, reduced fallbacks/memory/UI. Runtime settings alone cannot repair this.
- UAR src/uar/api/routes.rs:41,127,232,287: mandatory inline artifact and unconditional artifact_inline marker when attaching host resources.
- src/uar/domain/agent_store.rs: shared transport-free CRUD, patch compare-and-set, protected builtin delete, create/replace upsert semantics. Do not claim all writes already have revision protection.
- src/uar/api/discovery.rs:259–308: persisted-first resolution; unknown explicit IDs in legacy run resolver fall back to default. list_agents masks some backend failures.
- src/uar/runtime/manager.rs:1778: strict resolve_registered_agent is reusable. Continuation around1942 reloads or reattaches artifact; plan must pin original resolved definition for resumed runs.
- src/uar/mcp_server.rs:177 uses list-and-find for persisted agents; reported events/status URLs around203 do not match run router. Normalize registered-agent entrypoints and returned URLs while preserving intended builtin discovery behavior.
- src/uar/api/compiler.rs: compile-and-register saves directly; route through shared catalog write policy. Do not turn existing upserts into unexplained breaking create-only semantics.

## Issue #296 evidence and decision boundary

- src/mcp/config.rs:52: RemoteHttp(url, env), no headers.
- src/mcp/registry.rs:657,1319: legacy configured connections use from_uri; snapshot connector:745–781 can apply supplied headers, disables ambient proxy and redirects.
- src/uar/runtime/turn/host/mcp.rs:18–22: run headers; :76–84 restricts loopback HTTP; :127–156 supplies new binding identity and run-owned cache/connector.
- src/mcp/runtime.rs:66–167: private redacted headers, transport application and run connector. SnapshotTransport retains frozen headers for reconnect. This is usable substrate, not proof general issue #296 is already fixed.
- REST run admission requires UserContext → verified owner; admission of remote grants must additionally require a trusted host/BFF capability and registered destination. A tenant_id in model arguments is not that authority.
- rmcp is pinned =3.1.2 in UAR Cargo.toml; local crate supports custom_headers/auth_header at connection configuration. Docs for latest are supporting research, not proof of per-call overrides on this pin.

Required demonstration: two authenticated principals run the same registered agent against the same remote MCP URL concurrently; downstream verifies distinct audience-bound identities; reconnect/refresh/continuation cannot mix identities; a forged tenant argument cannot widen access. Static service header alone, per-agent static identity alone and loopback-only Boss bridge alone do not satisfy the issue. Capture only sanitized outcomes, never tokens.

## Explicit ownership and application semantics

Boss stores integration choices, links, presentation preferences and protected local credentials. UAR stores runtime-native providers, agent definitions, presentations, policies and catalog metadata. Secrets cross only authenticated main-process/server paths. Boss must provision independent settings-admin authority, not reuse its launch bearer as universal remote credentials. Define explicit administration scope without replacing session principals. Existing standalone settings remain authoritative after initial seed; do not overwrite API edits from generated launch files on every restart.

Every mutable field needs source, saved revision, effective revision and application mode (live, next turn, restart, host controlled, unavailable). Report partial errors in bulk saves. Sidecar-locked internal memory/skill-evolution and global MCP settings retain isolation; provide their host-owned equivalent where applicable and an explanation where unsupported. Completing administration means no unexplained route-family omissions; it does not mean turning on every optional subsystem.
