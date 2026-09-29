# Assessment — UAR inference model routing

## Observed failure

The operator created `UAR Test`, selected `GPT 5.6 Sol | OpenAI Codex`, and received `Provider "OpenAI Codex" has no API key configured` on the first conversation. The screenshot is the production symptom. Source inspection locates that exact error in The Boss `src/main/ai/runtime/uar/uarModelAssignments.ts:56`, before any UAR run request.

## Source trace

The shared Add Agent wizard sends an agent runtime and ordinary Boss model ID, but no `uar_model_assignment` (`ResourceCreateWizard.tsx`, `resourceCreate.ts`). The persisted schema explicitly treats a missing UAR assignment as the active Boss model (`src/shared/data/api/schemas/agents.ts:54-63,90-92`). The generic UAR model filter checks endpoint shape and admits OAuth-backed OpenAI Codex (`src/shared/ai/agentRuntimeCapabilities.ts:193-215`). `resolveBossModel` then requires `providerService.resolveApiKey`, which cannot represent the Codex-specific OAuth request path (`src/main/ai/provider/config.ts:433-485`). The failure therefore precedes UAR inference; it does not establish a broken UAR or liter-llm model driver.

The existing contracts already support explicit `boss`, `gateway`, and `uar` assignments. The gateway source discovers actual served aliases from liter-llm `/v1/models` and reports operational/credential state (`UarModelSourceAdapter.ts:59-166`). The gateway assignment sends its configured endpoint, secret, and selected alias to UAR (`uarModelAssignments.ts:109-128`). UAR accepts an exact trusted host credential/model binding and invokes its liter-llm driver (`src/uar/runtime/turn/host/credentials.rs:67-97,143-177`; `src/llm/orchestrator.rs:48-86`). No UAR source edit is indicated by the observed failure.

## Gaps and boundaries

1. Generic agent creation has no explicit UAR inference source/model selection, so its saved default can be non-executable.
2. Generic agent editing cannot repair the persisted assignment of the already-created agent.
3. The visible conversation model can differ from the actual UAR assignment; model identity needs truthful presentation.
4. Gateway availability and missing credentials must be shown at selection and run boundaries without exposing secrets.
5. Catalog-owned UAR agents execute the catalog's model route, so a Boss-side assignment edit would not control them. Existing sessions can be bound to another UAR instance than the selected default.

The fix belongs to The Boss create/edit, model projection, runtime preflight, and localization surfaces. The existing agent configuration JSON and IPC schema can carry the assignment; no database migration or new daemon is needed. Treat liter-llm's configured gateway and served alias list as the authority for gateway choices. Keep UAR's direct configured-provider route available, validated against the execution instance. An OAuth-only Boss model must not be offered as a raw UAR host credential. Keep working legacy API-key-backed routes on the read path; prompt only when their actual route is unusable. Catalog-owned agents need catalog-policy editing rather than a misleading Boss-side control.

## Completed-boundary evidence

After production wiring is complete, build the Apple Silicon installer with `pnpm build:mac:arm64`, launch the packaged app, create or edit a UAR agent with a served liter alias, and obtain one completed real response. Also confirm that the observed Codex OAuth selection is no longer silently passed as an API-key UAR credential. Build success and completed inference are separate receipts. No intermediate test suite is authorized.
