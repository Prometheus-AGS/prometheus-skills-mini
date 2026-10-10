# The Boss prerequisite discovery and child handoff

Observed 2026-10-06. Role: existing boss-core boss-runtime with boss-security contract. This is static discovery and completed child-document validation, not product acceptance. No product source, test, build, service, credential or canonical task-state mutation was performed by this worker.

## Position and authority

Parent workstream: /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture. Phase: bossfang-uar-authorization-and-execution. The original mini shipping waypoint still names the-boss-shipping-and-settings/uar-working-agent; it was read and left unchanged. The assigned workstream, not that historical exactNextCommand, determines this task.

Read parent plan.md, repository-bindings.json, approval-client-inventory.md and bauar-02/bauar-04 proposal/design/tasks/specs; read The Boss AGENTS.md, active team routing, manifest/role prompts and tool policy. The Boss versions.toml and CLAUDE.local.md are absent; .prometheus/decisions.md and gotchas.md contain only their headings. Package pins remain authoritative. The Boss DCO signoff instruction conflicts with mini A-15; no commit was created and no signoff added. The agent-team-handoff skill was inspected as role context; no handoff/state command was run because this assignment allows only evidence and child documents. openspec-propose was applied for the authorized child documentation.

Driver relayed user decisions: coordinated strict approval cutover with owned callers migrated together; no local compatibility exception; UAR restart remains unsupported/unknown with reconciliation. Remote selection is none: remove runtime defaults; application owns configured receivers/custody. No receiver, identity provider or remote custodian is selected by this receipt.

## Source and isolation

Original source: /Users/gqadonis/Projects/prometheus/the-boss. Observed HEAD e2ae2ce21245030293c0bea96ed02ae853b820a7 matches the parent's reviewed baseline. Driver accepted the same base for isolated /Users/gqadonis/.claude/worktrees/bauar-boss. Source status has unrelated .prometheus knowledge edits/untracked sessions, modified resources/prometheus-skills-mini gitlink, untracked .minimax/agents/.builtin, .prometheus/project.json, docs research and manifests. None overlaps the proposed approval source claims; none was copied, reverted or edited. This is a scoped conflict assessment, not an assertion the original checkout is clean.

Child planning root: /Users/gqadonis/.claude/worktrees/bauar-boss/workstreams/bauar. Registered child UUID supplied by driver and read from .prometheus/project.json: 1778473f-37c3-4dff-af17-e967c84499e2. Child change: boss-bauar-approval-client. Driver reported the checkout hook automatically ran pnpm install and returned Passed with no source-status changes; this is driver-reported, not worker-observed dependency verification. This worker did not run install.

## Compass evidence and source fallback

The Boss .compass/verification.json and .compass/config.toml are absent. Compass search_symbols for UarToolApprovalController returned no_match with incomplete coverage (63 quarantined edges); get_callers at depth 1 / max_nodes 30 / max_edges 60 and get_impact at depth 2 with the same node/edge bounds also returned no_match. The two traversal queries first exceeded an overly small 2,000-byte response cap; retried at 5,000 bytes they completed without transport truncation. This is not evidence of absent callers.

Graph identity: a51cedc6c98e4bfd649c78291156416e2270527d9a01631f21a4fa486a11c105. Build generation: sha256:b24ad56e71ca661de70e42202f24db44c520530426e7d3c8cf170dee3d231995. Search digest b0c60d184294bb02f6e99265d70d257ee27e6947d8367bd7b4a8e8486db19c51; callers 140c66583748ca918ee875b59d1e6637eaf0eb0b94dc81cba360fc1df736b2c9; impact 70370b5a4a0c956a13687977d70ec5c315b4d951521244009594092a0eddcb98. Freshness cannot be established; direct source below supplies the usable evidence. No graph rebuild or watcher was started.

## Exact approval contracts and callers

Paths in this section are relative to the accepted The Boss product root, and line numbers refer to the baseline.

| Boundary | Source and observed contract | Migration consequence |
|---|---|---|
| Event input | src/main/ai/runtime/uar/UarAguiAdapter.ts:233-251 forwards CUSTOM uar.tool.approval_required.value to controller.handle; adapter validates SSE event ID and run, :103-113 | Preserve event provenance/reconnect; no new sender |
| UAR value | UarToolApprovalController.ts:10 UarApprovalValue has optional unknown approvalId, admissionId, invocationId, toolCallId, name, arguments; handle at 48 validates toolCallId/name/admissionId only | Require nonempty raw approvalId before ensureToolInput and decision side effects |
| Retained decision | Controller PendingApproval:31 uses rawApprovalId?: string; prompt:79 builds uar:run:(approvalId or toolCallId) | Remove fallback; preserve raw identity separately from namespaced UI key |
| Root POST | Controller resolve:131-145 sends approved plus conditional approval_id through requestCurrent, authenticated principal and captured generation | Mandatory exact approval_id on approve and deny; no current-pending lookup |
| Host decision | recordAndResolve:124 first calls bridge.recordHumanDecision(admissionId, approved); dispatch:104 handles cancellation and denies edited input | Preserve ordering, cancellation and edited-input denial; an unsupported event must fail before host decision |
| Runtime-neutral event | src/main/ai/runtime/types.ts:101 AgentRuntimeToolApprovalRequest requires approvalId, toolCallId, toolName, input, presentation; AgentRuntimeEvent has tool-approval-request | Already exact UI identity; keep unchanged |
| Renderer/main response | src/shared/ai/transport/stream.ts:232 ApprovalDecision requires approvalId/approved, optional reason/updatedInput; AiToolApprovalRespondRequest adds optional topicId/anchorId; response is {ok:boolean} | Already carries required opaque UI key; keep unchanged |
| IPC | src/shared/ipc/schemas/ai.ts:304 strict ai.tool.respond_approval requires approvalId min(1); src/main/ipc/handlers/ai.ts:185 calls AiService | Preserve schema and dispatch |
| Registry return path | src/main/ai/AiService.ts:450 -> AgentSessionRuntimeService.respondToolApproval:1450 -> ToolApprovalRegistry.peek/dispatch; registry dispatch:101 removes exact key before resolving its closure | Controller closure is the raw UAR identity holder; no registry-type expansion required |
| UI consumers | src/renderer/hooks/useToolApprovalBridge.ts:24-28 and src/renderer/pages/agents/useAgentChatRuntimeState.ts:328-341 send match.approvalId | No renderer redesign or mutation required |
| Pending snapshot | uarApprovalLifecycle.ts:7 rawPendingApproval requires version/runId, pending version/eventId/cursor/rootRunId/approvalId/callIndex/toolCallId/name/argumentsJson/riskReason; admissionId optional nullable | Snapshot already receives the exact approval ID |
| Inspection projection | projectRuntimePending:80-101 drops approvalId and uses admissionId or approvalId as invocationId; src/shared/types/prometheusIntegration.ts:336 UarApprovalLifecycleInspection lacks approvalId | Add a distinct approvalId field for runtime pending records; do not treat the existing display surrogate as effect authority |
| Host persistence | UarApprovalLifecycleStore.ts:37 persists UarHostAdmissionSnapshot in appState with version/processEpoch and bounded records; process restart maps claimed to outcome-unknown | Store does not own raw pending approval decisions; no storage/migration change needed |
| Administration | UarAdministrationAdapter.ts:163/170 allowlist entries runs.approve and approvals.resolve; readUarAdministrationSnapshot:333 projects metadata; Operational adapter:299-307 GETs pending records | Correct parent assertion of generic forwarding: no administrative POST implementation found; keep adapter unchanged |

Scoped source search covered src/main/ai/runtime, service adapters, shared IPC/types, main IPC handlers and renderer approval/settings consumers. No other Boss root approval sender was found there. This is not a complete audit of external clients. UAR PendingApprovalSnapshot in src/uar/runtime/thread/approvals.rs:33 has root_run_id, approval_id, admission_id and tool-call display fields but no invocation_id; avoid inventing that field on the Boss side. C05 expected task revision belongs to the full-harness contract, not this existing root client's payload.

## Compatibility: observed versus unknown

Source package version is 2.2.4. Read-only Info.plist metadata shows /Applications/The Boss.app 2.2.12 and /Applications/Cherry Studio.app 2.0.14. No installed asar/payload behavior or source provenance was verified, and no installed app was launched or altered. Version strings alone cannot identify the installed root approval shape. External HTTP callers and their deployed versions remain unknown. The user-selected strict cutover supplies the policy disposition: unsupported run-only clients are incompatible, not silently grandfathered. Driver still needs the exact joint UAR/Boss source and packaged payload checkpoint before release acceptance.

The parent's UAR positive-fixture inventory remains assigned to UAR: remote_mcp_run_grants.rs, support/principal_host.rs, support/sidecar_process.rs and their callers; negative owner/retention scenarios must not become passing solely due to missing identity. This worker did not edit or independently certify those tests.

## Claim-before-effect preservation

UarHostMcpBridge.ts:125-134 requires loopback address, expected Host, absent Origin and the per-bridge bearer. At 146 it calls admissions.claimToolCall; only after successful claim does :158 dispatch mounted.transport.handleRequest. UarHostToolAdmission.ts:121-139 compares admission metadata version, runtime/host epochs, invocation ID, server/tool names, argument digest, current disposition and authorized state; :141 persists claimed before returning success. A failed persistence operation blocks dispatch. Teardown :185 maps claimed to outcome-unknown; lifecycle persistence performs the same classification after process-epoch change. No production change to these files is justified by static discovery alone.

The existing scripts/gates/uar-exact-tool-admission.ts is a narrower bridge integration reference. Planned concurrent/lost-response scenario additions must run only at the shared completed delivery boundary. No scenario was executed here, no F6 claim was made, and no missing lease behavior was inferred from this host file alone: UAR and its captured resource-grant contract are separate boundaries.

## Credential custody and actual runtime defaults

The Boss UarRuntimeConnection.ts:196 sends selected run_credentials, :198 sends the application-created bridge servers, and :217-220 builds a per-run redaction list from provider credential values and bridge.redactions. responseError:663 redacts known strings from selected HTTP error bodies. UarAguiAdapter tool-output/event paths and the bridge error callback are ordinary projection surfaces for the later bauar-04 task; this limited error helper is not proof that every tool echo/model/persistence sink is protected.

UarRuntimeConnection.createMcpBridge:281-313 resolves the agent's configured MCPs, snapshots mcpServerService entries, builds existing application servers and creates the bridge. UarHostMcpBridge:53 creates a random per-bridge secret, exposes only run-scoped headers and redaction references, and checks it at the loopback receiver. These are local application capabilities, not a named remote resource-token contract.

src/main/services/prometheus/integrationConfig.ts:111-137 reads/writes secrets.enc through Electron safeStorage, refuses unavailable encryption and Linux basic_text, and atomically replaces the encrypted file. Its managed secret categories include uarAdminKey and uarCredentialEncryptionKey; UarSidecarService.ts:280-338 provisions those to the owned process. These source references establish existing local custody code only. No secret file, plaintext value, token or user configuration was read. Keep this application store and its configured servers unchanged.

Read-only UAR root mcp.json inventory: tavily (URL with TAVILY_API_KEY environment reference), surreal_memory (URL), kreuzberg (stdio command and arguments). These are the concrete runtime-default removal candidates under the new user decision. src/server.rs:876-923 defaults to mcp.json, loading an unconnected destination catalog in sidecar mode and connecting configured entries in standalone mode. src/mcp/registry.rs:2467 accepts explicit MCP_CONFIG_PATH/MCP_CONFIG_DIR overrides. Preserve explicit host-owned configuration and the destination/grant protocol. UAR .mcp.json contains zed-workspace-mcp developer tooling and is not the runtime catalog. No file in UAR was changed by this worker; assign mcp.json removal to its owner with exact child mapping. Do not delete Boss application settings or select a remote store in response to the defaults instruction.

## Child files, tasks and pending registration

Created only .openspec.yaml, proposal.md, design.md, tasks.md and specs/uar-exact-approval-client/spec.md beneath /Users/gqadonis/.claude/worktrees/bauar-boss/workstreams/bauar/openspec/changes/boss-bauar-approval-client. Child has six unchecked tasks; numeric backend IDs await driver registration.

| Parent backend key (phase bossfang-uar-authorization-and-execution) | Child displayed task | Exact proposed production claim |
|---|---|---|
| bauar-02-execution-authorization/1 | 1.1 | Evidence/docs only: inventory and joint checkpoint acceptance |
| bauar-02-execution-authorization/3 | 2.1 | src/main/ai/runtime/uar/UarToolApprovalController.ts |
| bauar-02-execution-authorization/3 | 2.2 | src/main/ai/runtime/uar/uarApprovalLifecycle.ts; src/shared/types/prometheusIntegration.ts |
| bauar-02-execution-authorization/3 and /4 | 2.3 | scripts/gates/bauar-approval-client.ts (new); scripts/gates/uar-exact-tool-admission.ts (concurrent/lost-response scenarios only) |
| bauar-02-execution-authorization/7 | 3.1 | V1 evidence only; deferred shared real-boundary run |
| bauar-02-execution-authorization/8 | 3.2 | V2 evidence only; deferred required checks/package validation |

Eligible: register the narrowed child, accept inventory and claims, then assign the three production files and scenario authoring at the accepted UAR dependency checkpoint. Existing neutral types, approval store and administrative adapter are read-only. Host bridge/admission production changes need a reproduced delta and explicit claim extension. Secret projection remains a serial later child: B-PROJECTION presently reserves UarRuntimeConnection.ts and UarHostMcpBridge.ts; any additional error/event sink such as UarAguiAdapter.ts or approval errors requires its explicit binding extension before writes.

Remaining prerequisites: driver acceptance of exact claims/backend IDs and the provider checkpoint; product-root apply scope (OpenSpec currently allows only the nested workstreams/bauar root); installed/external payload claims stay unverified; compatible Node for eventual package gates. No new remote receiver/custody implementation is eligible under the user's none selection. Parent scope/task amendment must record that decision rather than falsely mark a remote validator scenario passed.

## Verification and limits

OpenSpec list/context confirmed the already initialized child root. OpenSpec new change scaffolded only the assigned child. Artifact instructions and status were read for proposal/specs/design/tasks. Final command: /opt/homebrew/opt/node@24/bin/node /Users/gqadonis/.local/state/fnm_multishells/41063_1791290212251/bin/openspec validate boss-bauar-approval-client --strict, cwd child planning root, exit 0: Change 'boss-bauar-approval-client' is valid. Final status reports all planning artifacts complete; this means planning file completeness, not implementation completion.

Requested Node runtime is v24.21.0, outside The Boss package engines >=24.11.1 <24.16.0. pnpm is pinned 12.3.4. No dependency/runtime was installed or configured. No product tests, lint, typecheck, build, package check, acceptance, service launch or source commit ran. A first Node heredoc intended to write proposal.md had a syntax error before any write; it was corrected with apply_patch. No test of partial production occurred. Security work here is specification of the actual event-to-host approval trust boundary, not an implemented hardening claim.

Selected source digests are appended below so the driver can revalidate the exact claims before writing.

| Source path | SHA-256 | Matches HEAD bytes |
|---|---|---|
| src/main/ai/runtime/uar/UarToolApprovalController.ts | 01b85cb5d9be8cd6cbc91d9cedd7fa8912c6913c4c02526a42b68f11c64e6853 | true |
| src/main/ai/runtime/uar/uarApprovalLifecycle.ts | f728c57a009f965aa646c8652d3e1c99932d9eccd92998b57ca0f6ee0557058d | true |
| src/shared/types/prometheusIntegration.ts | 693742f9dae9ff861d484afcc48f92ee139db37c95c0e85add633038e2bb7a02 | true |
| src/main/ai/runtime/uar/UarHostToolAdmission.ts | ce11a11a3c6b49e50f2de4f6fb6988c8d07d1d5405bee1cd25fe8e2b8f7c0a3d | true |
| src/main/ai/runtime/uar/UarHostMcpBridge.ts | 21763be4cad1f098643de218d743e40ffc49a3e68ffeaa2b3fee4dbbeca9875b | true |
| src/main/ai/runtime/uar/UarRuntimeConnection.ts | ebdf1018cb976fdd8cce108d6781d8a1761cb4418a53f72a8a38ec58273b06f3 | true |
| src/main/ai/runtime/uar/UarAdministrationAdapter.ts | d2dcef34472494f3d2428133fc23baa3a6b1f1b6bec1dcc957d0f36c679191ae | true |
| scripts/gates/uar-exact-tool-admission.ts | 5f341b3588f4c69323030784a8efe740585af915bfe3bb2571fad3aeda81719a | true |
