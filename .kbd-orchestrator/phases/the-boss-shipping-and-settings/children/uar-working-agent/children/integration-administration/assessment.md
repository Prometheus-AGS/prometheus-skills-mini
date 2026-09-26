# Assessment — integration-administration

Stage: assess. Implementation: unstarted. Both Windows x64 and Mac Apple Silicon are essential release targets. The earlier plan is provisional; no lifecycle stage is inferred complete from it.

## Inputs and confidence

Operator reports and two installed-app screenshots from 2026-09-24; source inspection at commits in sources-receipt.json; parent uar-phased-delivery spec; current integration contracts. Confidence high means direct source or screenshot evidence, not installed acceptance. Missing skill: superpowers was searched in installed roots and not found; it was not used. Impeccable context and independent A/B assessments ran. No application build or test suite ran.

## Gap matrix

| ID | Required outcome | Observed gap and location | Confidence |
|---|---|---|---|
| G1 | UAR can select embedded or existing SurrealDB | Boss UarSidecarService.ts sets UAR_PERSISTENCE__DATABASE_URL to surrealkv unconditionally. Shared IntegrationSnapshot backend type is local only. | High |
| G2 | Existing scoped database accounts work | UAR src/uar/persistence/providers/surreal.rs signs remote connections in with Root only; config.rs already accepts remote URL/user/pass/ns/db. | High |
| G3 | Discover full-pack or manually configured instances | Boss fullPackDetection.ts identifies install markers for skill copying only; UI external mode is hand-entered endpoints, no selectable service candidates. | High for inspected path; inspect pack formats in analyze |
| G4 | Visible progress and full logs | IntegrationSettings puts operations after workspace/server list; six Docker controls share busy/dirty locks. IntegrationOperations output is collapsed. Process runner and operation store cap output at 262144 characters. Multi-command callbacks replace current output. | High |
| G5 | Durable project administration | WorkspaceIntegration has indexed/backend/path/serverIds but no enable override/freshness. registerWorkspaceServers regenerates activation from global config/error. | High |
| G6 | Real graph drift and update | Compass has check-update and update; Boss currently only exposes index/refresh without a freshness state. Custom output-path semantics require analysis. | High for gap, medium for reusable command fit |
| G7 | Full gateway provider/model and role administration | Boss stores only judge/critic model name/baseUrl and secrets; provider_model is a text field; no backup or provider inventory. liter-llm supplies providers.json and catalog.json and served /v1/models. | High |
| G8 | Existing gateway config applied accurately | Fork has watched TOML provider and no configuration admin HTTP route in inspected router. Boss rewrites managed TOML for two roles; external-mode lifecycle is refused. | High |
| G9 | Separate UAR/Compass/liter-llm/Services navigation, schema/i18n | One Prometheus integration page owns all these controls, including Docker/services. Services needs its own route/sidebar/search registration; existing single managed/external preference cannot express per-service ownership. Generated schema, persistent ownership profiles and all locale keys must accompany the new destination. | High |
| G10 | Complete customer releases | User requires both Windows x64 and Apple Silicon; only existing Windows 2.2.0 publication evidence is available. New repairs need fresh payloads/installers and acceptance. | High for requirement; new artifacts unbuilt |

## Separate schema, localization and upstream assessment

- G11 (high): src/shared/types/prometheusIntegration.ts has no UAR connection config, per-service ownership, backup role, per-project enabled/freshness, config revision or durable operation/log cursor. src/shared/ipc/schemas/prometheus.ts provides snapshot/configure/start/cancel only; configure replaces the whole config without an expected revision. New commands/events and migration from current JSON are required. scripts/data-classify/data/target-key-definitions.json owns app.prometheus.integrations; generate from source, not preferenceSchemas.ts. Existing preferences can carry the versioned document without a new SQL table; if a new table becomes necessary its migration must append.
- G12 (high): renderer and main catalogs are flat-key JSON under src/renderer/i18n/locales and src/main/i18n/locales. Existing keys are settings.prometheus.integration.* and prometheus.error.*. New dedicated navigation titles, discovery/probe states, storage/auth-scope choices, operation stages/recovery, freshness states, provider/model/backup and revision conflicts require source keys plus translations in all existing locale files. Renderer has 13 locales. Existing translated strings are reusable, not missing merely because controls move.
- G13 (high for locations, medium for merge conflict prediction): src/renderer/components/settingsMenu.ts registers one Prometheus route; src/renderer/routes/settings/prometheus.tsx and PrometheusSettings/prometheus.search.ts are the current navigation/search seams. Shared IPC registry and preference generator inputs are additional upstream-touched seams. Keep feature logic in dedicated modules and narrow additive registrations; regenerate route/preference outputs. Boss origin/main already advanced beyond the inspected feature checkout, so freeze the updated baseline before edits and record any source differences. Conflict likelihood itself is not measured or a reproduced bug.

## UX evidence

Impeccable A independently reviewed screenshots, source and DESIGN.md: 18/40 heuristic score, key weaknesses visibility, recognition, efficiency and recovery. Preserve existing shared controls/tokens. B independently ran detector on the two components: exit 0 and zero findings; screenshots show dense repeated server rows and no nearby operation result. Static detector result does not certify usability. No live Electron/browser interaction was performed. No questions were needed because target outcomes were explicit.

## Real boundaries

Service endpoints/authentication, main-renderer secret IPC, externally owned config files, subprocess logs, per-workspace tool roots and UAR persistence are real security/data boundaries. Discovery must not imply authority to change external lifecycle or credentials. Existing app settings and store files must survive upgrade.

Operation recovery detail for G4: PrometheusIntegrationService.ts:40 holds operation records in an in-memory Map; snapshot exposes the last twenty, and lines301–308 record failed/cancelled status and an error. This is no durable restart recovery record. Add interrupted-on-restart state, actual post-cancellation service/graph status, and contextual Retry/Open settings/View log actions. Retry starts a new tracked operation after checking current state; it does not assume previous side effects were rolled back or automatically replay a failed mutating tool call.

## Questions for analyze

1. Confirm Compass check-update supports Boss-owned graph location and machine-readable result.
2. Determine actual full-pack service metadata and safe config discovery paths; do not read secrets into evidence.
3. Check liter-llm upstream/fork current contracts, catalog joining and parser/watch semantics, especially actual applied versus saved settings.
4. Reuse existing Preference/IPC/lifecycle/UI primitives; assess TOML preservation support before adding a parser/editor.
5. Determine mixed managed/external Compose hostname behavior on Windows and Mac.

The user-reported full-pack-specific unusability is accepted as an observed problem, but its exact runtime cause has not been reproduced. Forced embedded selection is independently confirmed; do not conflate the two. Reproduce configured launch at the completed integration boundary.

## Process discrepancy and recovery

The Node child wrapper created authored files at a flat path while canonical runtime registered the nested child. Authored files were moved to the runtime's canonical directory, preserving progress/tasks; hook invocation is not repeated. Use explicit phaseDir with stage gates/handoffs. Earlier plan review remains provisional evidence. No skipped-stage handoff is permitted.

## Constraint precedence

Older constraints mention per-module unit tests and a reference-only full pack. Current operator instruction requires integration-boundary testing and authorizes connected-repository changes needed for gateway roles. Follow that scope without blanket staging or unrelated edits. The latest operator instruction supersedes the earlier execution authorization: revise assessment, analysis and plan, show the plan, and wait for review before execution.

## Revision 2 — full UAR administration and runtime correctness

Source baseline: UAR c29af47be3439c69e1a3c124fdcf09ce4cbb5cba and Boss afd4deefd5aa802dc681d9860f9469359e9646ca. This is static source evidence, not a reproduced installed result. See uar-admin-surface.md for route coverage and source locations.

| ID | Required outcome | Observed gap | Confidence |
|---|---|---|---|
| G14 | Complete UAR admin with internal navigation | Initial plan covers storage/status only. server.rs mounts providers, settings, agents, compiler, skills, presentations, A2UI, knowledge, actors, credentials, auth, MCP and protocol APIs. Existing standalone admin cannot simply be framed: sidecar does not serve its SPA. | High |
| G15 | Catalog is authoritative for execution | Boss UarRuntimeConnection.buildArtifact synthesizes an inline artifact every turn; create_run requires it. Registered schemas, policies, UI flags, memory and fallbacks can be bypassed. Strict resolve_registered_agent exists for actors; other paths use default fallback or separate enumeration. | High |
| G16 | Reliable catalog writes and continuation | agent_store has patch CAS but create/replace are upserts; compiler writes directly to persistence. attach_host_resources always marks artifact_inline=true; continuation reattaches by ID or reloads persisted artifact. Revision/source identity must survive catalog edits and continuation. | High |
| G17 | Safe administrator authority and ownership | Settings mutation needs X-UAR-Admin-Key; launcher has launch authentication but no corresponding admin-key configuration. Boss session principals differ per conversation; presentations/knowledge are owner-scoped. A single global principal would break session isolation. | High |
| G18 | Settings saved versus effective | Generic settings manager persists/caches values; not all running consumers reload them. Bulk operations can return HTTP 200 with partial errors. Governance has special application semantics; feature-gated engines and sidecar-locked settings must be distinguished. | High |
| G19 | UAR-specific providers/models | UAR has its own provider registry, model lists and configs for inference, embeddings, vision and other consumers. Boss selected-model synthesis and gateway critic/judge fields are not complete UAR model administration. | High |
| G20 | A2UI and standards administration | Presentation CRUD exists with owner and revision checks. A2UI schemas are in-memory and read-only over REST; components expose list/promote, not complete persistent CRUD. Native AgentArtifact, UAR-AGENT-MD and A2A cards have different roles; AGENTS.md is project instructions. | High |
| G21 | AG-UI and run administration | Current profile is uar.agui/1 with agui_spec SSE replay. Run create/stream/control exists but no generic run-list route in that router. Some standalone frontend links differ from mounted server paths. | High |
| G22 | Issue #296 static outbound headers | McpServerEntry::RemoteHttp has url/env only; configured connector passes no headers. URL expansion is not HTTP-header support. | High |
| G23 | Issue #296 trusted remote run identity | Contrary to the issue's broad claim, run-scoped headers already exist in RunMcpServerInput → RunMcpConnector → connect_http_binding_with_headers, introduced by 3444c1fc. That admission accepts loopback HTTP only; general remote BFF deployment and credential refresh are not covered. | High |
| G24 | Enforceable API coverage | Capabilities are a small host vocabulary, not a full administration manifest. OpenAPI is partial and feature-gated. Renderer controls need supported/locked/unavailable and apply-lifecycle information, derived from actual server routes/consumers. | High |

Issue #296 was read in full at https://github.com/Prometheus-AGS/universal-agent-runtime/issues/296 (open, no comments at inspection). Its downstream tenant-isolation requirement is accepted; its proposed implementation is research input, not an instruction to weaken sidecar guards or copy all incoming headers. UAR pins rmcp =3.1.2, not Compass's =3.4.0. The installed 3.1.2 source supports transport auth/custom headers; no SDK upgrade is required solely for that facility.

Additional actual boundaries: trusted host/BFF authentication into run admission; catalog administration versus run execution; run owner and tenant; outbound destination and credential audience; frozen child bindings; persisted credentials; schema-driven forms and catalog-controlled presentation rendering. The revised plan must preserve Cedar/tool approval and remote-peer root authority.

Remaining assessment work is contractual, not a claim of runtime verification: define shared strict catalog resolution, exact admin coverage/apply semantics, trusted remote MCP admission and credential lifecycle. Reproduce the reported failures only at completed integration boundaries. No test suite or build has run in this revision.

## Unresolved review findings — revision 2 round cap

The independent gpt-5.5 assessment review ran twice. Round 1's Services navigation and recovery coverage omissions were corrected above. Round 2 requests a fuller release-publication baseline; this is carried to analysis/plan, not represented as a passing review. G10 explicitly includes producing new GitHub Release assets, RELEASES.md and release-manifest.json in The Boss, and updating Know-Me-Tools/boss-landing-spot plus its connected Lovable deployment after EACH customer-platform publication. This revision has not inspected the live site's current download data or signed artifact inventory; current-site correctness is unknown. Baseline/freeze task 1.2 and delivery tasks 5.3–5.5 must record repository/source/version/architecture/checksum/size/signing and exact GitHub URLs, then confirm each live link. A completed installer without this publication chain does not meet G10. No IPFS publication is permitted. No third assessment review is run beyond the two-round cap.
