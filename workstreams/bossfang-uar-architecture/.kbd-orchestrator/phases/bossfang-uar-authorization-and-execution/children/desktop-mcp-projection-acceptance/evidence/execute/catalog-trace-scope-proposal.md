# Proposed amendment — catalog trace credentials and truthful projection oracles

Status: PROPOSED, not implemented or accepted. Execute task 9 remains active. No Reflect, parent certification or release.

## Observed boundary

G2-05 captured 18 actual MCP spans through the existing registered provider, including six canary-bearing spans. The provider-facing result for every eager/deferred mode was canary-free. Success/isError contained the replacement marker; transport-error results did not. No raw canary, credential or model content is recorded here.

Inspected `/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/mcp/McpCatalogService.ts:222–244` passes the complete configured server as `[server]` into `withSpanFunc`. `src/main/ai/observability/core/traceMethod.ts:64–69` serializes that argument to span.inputs. This crosses the actual configured-credential → telemetry boundary without the run projection used for target tool calls. Span categories are being added to establish which observed spans follow this path; source inspection alone does not classify G2-05's six spans.

The original sink gate requires a replacement marker in every MCP span's input, including catalog metadata. The original aggregate model-result gate requires a marker even for a transport error whose payload UAR deliberately discards. These predicates are stronger than canary absence, and conflict with the inspected omission paths. The current implementation keeps them and the gate remains failed.

## Smallest proposed correction

Add one explicit product ownership path, `src/main/ai/mcp/McpCatalogService.ts`, to the existing Boss owner. Trace a credential-free server identity DTO; close over the untouched original server for the existing list/cache/connection function. Do not trace headers, env, endpoints, arguments or the full configuration. Preserve actual authentication, cache keys, catalog content, status and dispatch. Do not change the generic tracer, introduce a service, register a provider, or change dependency/config defaults.

Reconcile only the proven gate false positives:
- Every observed MCP span must still be canary-free, with positive counts for catalog and target calls and zero unknown-category canary spans.
- Target-call spans retain the original redacted-input and success/error output checks.
- Catalog-list spans must have exactly the allowed identity input shape and no credential-bearing fields; they need no manufactured marker.
- Every exact correlated model result must be canary-free. Success/isError retain the marker requirement. Transport-error mode must additionally match the source-defined generic failure and exact MCP/failed/trusted_host provenance; marker absence is separately recorded.
- Preserve all other original history, approval, effect, event, interruption and refusal checks. Record changed predicates and their observed false-positive evidence rather than describing every original expression as unchanged.

UAR source provenance: `uar-task9-mcp-error.md` identifies `src/mcp/runtime.rs:898–901` omission, generic ToolFailed at439–441, correlated terminal JSON in `src/llm/orchestrator.rs:1033–1064`, and conditional `[REDACTED]` replacement. Generic-message/provenance equality is not yet observed at this proposal boundary.

## Verification and approval boundary

After complete authorized changes, refresh the affected Boss compiler and main bundle, keep unchanged genuine UAR artifact/source binding, and rerun only failed G2. Passing G1 does not need repetition when its production/gate sources remain identical. Require source manifests, unchanged pins, finite per-category/per-mode diagnostics, all original independent cases and cleanup disposition. A discovered independent failure remains failed.

The approved [Plan](../../plan.md) requires “Whole original gate preserved” and “no replay, silent scope change.” Its product ownership does not list McpCatalogService. The proposal makes this scope/oracle correction reviewable before any adoption. It does not waive a canary check or the separately blocked post-ack cancellation case. The latter has its own proposed scope amendment.

Related evidence: G2-05-finite-failure.json, G2-05-source-binding.json, boss-task9-g2-04.md, uar-task9-mcp-error.md.

## Subsequent measured confirmation — G2-06

The next actual source-bound desktop run classified 12 catalog-list spans: six contained the canary, all six in inputs; no catalog output/status/event contained it. All six target-call spans were canary-free and had redacted inputs; no unknown MCP span was observed. Both transport-error model results were canary-free and matched the exact source-defined generic failure and MCP/failed/trusted_host provenance. Configured credentials remained unchanged. The retained sink predicates still fail; no product correction or oracle amendment has been applied.

G2-06 next failed at event_assertions/split. All native fault cases remain unrun. The new failure is being diagnosed independently; it does not invalidate or waive the measured catalog leak or justify acceptance.
