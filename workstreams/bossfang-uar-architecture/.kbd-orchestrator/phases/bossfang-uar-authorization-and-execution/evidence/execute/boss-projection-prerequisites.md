# Boss projection prerequisite evidence

Discovery and documentation only, 2026-10-06. Product root: /Users/gqadonis/.claude/worktrees/bauar-boss, accepted e2ae2ce21245030293c0bea96ed02ae853b820a7; nested child UUID 1778473f-37c3-4dff-af17-e967c84499e2. Original checkout and application configuration were not changed. No credential stores were read, secrets printed, tests/builds/services started or dependencies installed by this agent.

## Scope and actual source graph

| Boundary | Observed source | Consequence |
| --- | --- | --- |
| Run-held provider credential | uarModelAssignments.ts:38–71, 98–127 resolves Boss or liter key; UAR assignment has no host key | Match values actually supplied for this run; cannot discover UAR-held credentials |
| Bridge private transport | UarHostMcpBridge.ts:53–103 generates bearer and mounts SDK transports; redactions include token and private URLs | Project outbound SDK content before UAR model consumes it; keep bearer/correlation intact |
| Explicit application MCP snapshots | UarRuntimeConnection.ts:281–313 obtains snapshots; agentMcpServers.ts:48–78 builds bridges | Can capture selected static header/env values; do not change configured servers |
| HTTP run and event paths | UarRuntimeConnection.ts:170–277 creates bridge before assignment, computes secrets only after POST; :663 truncates response before replacement | Build projection before first ordinary output; redact before truncating |
| MCP real call before return | createMcpBridgeServer.ts:172–210 forwards progress, calls service, returns raw result and logs error | Must pass a per-call projection option; late event-only filtering is insufficient |
| Earlier trace/log sink | McpRuntimeService.ts:1061–1182 logs arguments/errors, returns tool content through withSpanFunc; traceMethod.ts:69–85 serializes inputs/output/error | Project logging/trace copies and result before trace; retain real execution arguments |
| Runtime event conversion | UarAguiAdapter.ts:78–111 parses frames; :164–230 text/reasoning/tool results; :250/:271/:299 errors | Content, split deltas and diagnostics need projection before emit; opaque authority fields must stay exact |
| Approval diagnostic path | UarToolApprovalController.ts emits/logs response failures before outer connection boundary | Add projection seam serially after strict approval child; no fallback ID |
| Persistence | AgentSessionRuntimeService.ts:1816–1843 and :2629–2642 consumes events; :3266 constructs PersistenceListener; AgentSessionMessageBackend.ts:44 persists | Pre-event projection covers this downstream flow; no persistence file change needed |
| Rehydrated model history | UarRuntimeConnection.ts:581–594 loads messages; uarHostHistory.ts preserves tool-call/result relationships | Project outbound ordinary history content without mutating stored rows or IDs |

Line references describe the inspected accepted source; later feature wiring may move them. The new design enumerates exact extensions rather than claiming a whole directory.

## Credential sources outside the finite run snapshot

| Source | Observed boundary | Status |
| --- | --- | --- |
| OAuth and dynamic transport headers | mcpTransport.ts:56–64 combines headers; auth provider can obtain later values | Not present in captured snapshot; existing application transport custody remains owner |
| Materialized process environment | mcpTransport.ts:145–199 resolves launch env and merges process env; selected managed secret keys are redacted from stderr | Run matcher does not inherit or certify all process secrets |
| Shared MCP notifications/logging | McpRuntimeService.ts:739–753 logs notification data and broadcasts server log through shared cached client | No safe run attribution; never replace a shared callback with one run's matcher |
| Sidecar launch/admin/encryption secrets | UarSidecarService.ts:73–76, :247–257, :280–347 owns bearer/admin/encryption values; :389–394 startup regex redaction | Keep custody private to service; not claimed by the run-owned child |
| Arbitrary built-in tool internal logs | agentMcpServers constructs several built-ins | Outer transport protects outgoing content; does not prove each internal logging path |

These are concrete coverage limits, not claims that a leak was reproduced. The parent security requirement names the real output boundary and authorizes hardening there. Run-owned exact matching does not satisfy universal DLP or every application-secret canary. A broader acceptance claim would need separate source ownership and scenarios. No remote receiver/IdP/custodian has been selected. The only approved default removal is UAR root mcp.json; Boss app configuration and developer .mcp.json remain untouched.

## Library and discovery evidence

Compass search for UarRuntimeConnection returned no match on the partial graph; response digest 7422d47324b8d463eabbf800272b58543f99e333b73b1886e508872aec32a510. The local verification file is absent and graph omissions were already recorded in boss-prerequisites.md. Source inspection supplies the graph above; this is not runtime acceptance.

Context7 resolved the official TypeScript SDK v1 branch, then retrieved tool handler/transport documentation. Mixed main/v2 examples were not adopted. Installed SDK is 1.27.1; its shared/transport.d.ts explicitly exposes send(message, options), lifecycle callbacks, sessionId and setProtocolVersion. The design delegates that public contract, without a package change or private patch. Existing shared/utils/redaction.ts supplies redactLiteral and structural/regex helpers; structural/regex redaction alone is not evidence of arbitrary exact canary removal.

## Existing compatible Node alternatives

Read-only executable checks returned v24.14.1 from /Users/gqadonis/.local/share/fnm/node-versions/v24.14.1/installation/bin/node and v24.11.1 from /Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node. Both satisfy package.json >=24.11.1 <24.16.0. /opt/homebrew/opt/node@24/bin/node is v24.21.0 and does not. pnpm remains pinned 12.3.4. Nothing was installed or repinned.

Driver separately reported that the checkout hook's initial pnpm install passed without tracked changes. A later docs commit hook tried installation using Node26 and failed for a missing Rolldown native binding; that is not build acceptance, and this agent did not bypass hooks or repair dependencies. V2 must resolve that prerequisite through the driver.

## Proposed child and claims

Child: workstreams/bauar/openspec/changes/boss-bauar-secret-projection. Proposal/design/tasks/spec delta are prepared. Exact proposed product paths are listed in child design.md; they comprise two small UAR helpers, connection/bridge/adapter/controller wiring, agentMcpServers, createMcpBridgeServer, McpRuntimeService, main-process mcp/types, and one new gate. No production edits are authorized by these documents alone. In particular, shared transport and sidecar service paths are reference-only.

Parent04/4 maps child numeric1–3 (context/history, tool outputs, events); parent04/9 maps numeric4 V1; parent04/10 maps numeric5 V2. All tasks need driver registration/claim acceptance and begin before effects. Controller edits serialize after approval-client/2. V1/V2 stay deferred to completed delivery boundaries. No tests or acceptance were performed during this prerequisite pass.
