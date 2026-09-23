# Research — evidence and decisions

Read-only research, 2026-09-23. Baselines and dirty paths are in sources-receipt.json. Prior D1–D4 source investigations are reused where not contradicted by the current tree; their reported tests are inherited evidence, not rerun here.

## Questions answered

| Question | Observed evidence | Planning consequence |
|---|---|---|
| Is a new runtime abstraction necessary? | Boss already has DshRuntimeDriver, DshRuntimeConnection, dshStreamAdapter and agentRuntimeCapabilities. | Add a UAR adapter in the existing architecture. No generic runtime framework rewrite. |
| Is host tool wiring reusable? | Boss agentMcpServers.ts:48 creates session-bound MCP instances; DshCherryToolBridge.ts:84 adapts them through linked in-memory clients; workspaceMcp.ts resolves Compass/filesystem. | Expose the resolved catalog over a session-bound HTTP bridge; retain existing tool/approval services. |
| Are the needed UAR APIs already present? | UAR routes.rs:39–47 accepts artifact/input/session/skills/presentation only. RunExecutionRequest already carries verified_owner, mcp_resources, seed_history and working_directory. | Complete the trusted HTTP boundary into existing execution machinery; do not duplicate the loop or history engine. |
| Can stream recovery silently lose data today? | routes.rs:135–137 uses filter_map(Result::ok), dropping receiver lag errors. | P1 includes explicit resync/failure behavior and per-step attribution. These are core chat requirements. |
| Is launch security complete for fallback paths? | mcp_admin.rs:99 reads the lock from an optional settings manager; cd739e82 records the limitation. | Before P1 startup fallback can ship, use an explicit sidecar-mode boundary independent of settings availability. This is an observed obligation, not speculative hardening. |
| Must we publish UAR React packages? | Official React renderer documentation supplies MessageProcessor and v0_9 rendering; the operator already selected it in D2 revision 3. | Use the official compatible renderer and nine Boss-styled catalog components. No UAR renderer publication or theme repair project. |
| What owns approval call identity? | Dsh bridge callTool accepts name/args; generic MCP request IDs do not establish the model toolCallId. | Define the trusted call-correlation extension explicitly in P1; do not assume the SDK supplies it. |
| Where is native build exposure? | Cargo.toml:218,224,256 enable fastembed/document intelligence/wasmtime; no release profile follows the existing dev profile. | Finish the actual customer-platform packaging path inside P1 and record resource usage; do not put release work after all algorithms. |

## Primary documentation checked

1. AG-UI events: https://github.com/ag-ui-protocol/ag-ui/blob/main/docs/concepts/events.mdx — text/tool lifecycle and snapshots/deltas. This supports explicit event adaptation and resynchronization. UAR's custom approval REST flow still requires an adapter; protocol support does not imply durable recovery.
2. Official A2UI React example: https://github.com/a2ui-project/a2ui/blob/main/renderers/react/README.md — reuse the processor and renderer. Pin the compatible v0.9 family at implementation; do not adopt v1.0 features from current docs by accident.
3. A2UI catalogs/actions: https://a2ui.org/concepts/actions/ and https://a2ui.org/renderers/ — declare supported catalogs and handle user actions. Catalog validation does not grant tool permission; host ownership checks remain required.
4. MCP SDK v1 server guidance: https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/server.md — localhost DNS-rebinding support exists. Reuse it alongside the existing bearer/Origin policy. Context7 returned mixed v1/main snippets, so only v1 claims are used; no upgrade to SDK v2 is proposed.

## Reuse / reject

Reuse BinaryManager, BaseService, preference schema generation, existing approvals and MCP lifecycle, Docker configuration, mini payload, official protocol libraries and existing UAR runtime bindings. Reject a replacement chat model, duplicated provider registry, global host-secret registration, custom A2UI renderer package, dead classifier implementation, new daemon, and a separate memory UI.

## What remains unknown

Exact native sizes/build durations and installed Windows behavior require actual builds/installation after implementation. Local-model weights and OCR assets must be inventoried as dependencies, not assumed present because Cargo compiled. No completion or superiority claim follows from a planning review.
