# Design: MCP resource authority

## Context

See proposal.md and [analysis](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/analysis.md). cand-003 owner/run transport and cand-005 exact admission already exist. Grants assert finite authority but do not validate the receiver token. Bossfang [middleware](/Users/gqadonis/Projects/references/librefang/crates/librefang-api/src/middleware.rs:556) and [MCP context](/Users/gqadonis/Projects/references/librefang/crates/librefang-api/src/routes/network.rs:1425) are separate inbound boundaries that must not disappear into a UAR-only policy change.

## Goals / Non-Goals

Specify resource lifecycle ownership and independently enforce server authorization. Preserve local installation/bridge credentials and supervised stdio. No blanket JWT pass-through, generic token-exchange service, new daemon, assumed production receiver, universal DLP claim or arbitrary refresh-token storage in provider-key tables.

## Decisions

1. The authenticated host owns acquisition, refresh/revocation and storage; UAR consumes finite captured grants; the receiver validates actual credential audience/scope/tenant/action. Resource JWT, opaque access token, sidecar credential, provider key and approval capability remain separately typed/attributed. MCP HTTP authorization comparison is pinned to 2025-11-25; protocol negotiation is not inferred from an SDK date.
2. The operator selected no external receiver or IdP on 2026-10-06. Remove shipped UAR runtime presets and preserve explicit application configuration. External receiver implementation/certification is outside this selected release. A future receiver still needs its real resource URL/audience, issuer/introspection, scope/action, tenant/actor, flow, refresh/revoke, host and owner contract; a token-label fixture cannot supply it. RFC8693 is optional and only applies if actually supported. No new OAuth library is selected.
3. The application retains credential custody. No new vault, acquisition service, encrypted schema or plaintext fallback is selected. Existing UAR encryption and The Boss safeStorage remain their existing boundaries, not proof of remote deployment custody. Parent04/5–6 record this explicit selection; missing external inventory no longer blocks the selected common-boundary scope, but prohibits external deployment certification.
4. Preserve owner/run-scoped bindings, destination registration, captured headers/env and finite leases. At expiry stop new effects; renewal crosses a new run boundary after old-attempt reconciliation. No live connection credential swap across owner, run or revision. Receiver revocation is independently enforced; UAR does not invent a revocation property for an opaque token.
5. Bossfang inbound /mcp distinguishes trusted-local operator, service and ordinary verified user from delegated-user authority. No accepted tenant/actor delegation mapping exists in the selected release, so delegated-user semantics remain explicitly unsupported. Preserve agent-access checks; agent context cannot create identity. The corrected child proposes trusted-local no-credential authority only for an actual loopback-only listener, no external_auth_proxy and a loopback trusted peer; other/missing context requires authentication. Its server boot-context wiring remains a material design refinement pending acceptance, not implemented behavior.
6. Secret projection policy: ordinary logs, errors, persisted events and model messages never receive system-held credential values. Preserve wrappers and redacted Debug, sanitize transport errors, and redact exact known credential echoes in tool results before ordinary persistence/model projection. Keep that matching within the owning run, bounded by existing message limits; never emit the matching values or broaden into arbitrary document DLP. If a receiver requires intentional credential disclosure as tool output, that is unsupported until an explicitly revised contract authorizes it.
7. Stdio gets only captured allowlisted environment with existing process supervision; no automatic HTTP JWT forwarding. Reject required sandbox semantics because backend support is not established. A fixture child may use an ephemeral process/port; no shared service changes or resident daemon.

### Concrete receiver identity contract

ResourcePrincipal is a proposed canonical receiver-side acceptance/authorization record: subject, tenant_id, actor optional, scopes, issuer, resource and validation_kind (jwt or introspection). Its producing authority is the named resource authorization server; the receiver verifies signature/issuer/audience/expiry for JWT or authenticates its configured introspection endpoint and requires active=true for opaque tokens, then applies the receiver record's explicit claim mapping. No UAR grant or arbitrary header constructs this record. If the actual server cannot supply a verified tenant/actor mapping, delegated-user mode is unsupported until a reviewed supplement defines it. The initial common profile denies cross-tenant access, including claims of cross-tenant delegation; support for such delegation requires a separate explicit contract, not a permissive fallback.

Bossfang request attribution proposes mode (trusted_local_operator, service, authenticated_user, or a future supported delegated_user), authenticated_subject, verified_tenant, verified_actor, authorized_agent_id, authn_source and policy_revision in authenticated request context and non-secret acceptance output. Absent fields are explicit null only where the mode permits them; required delegated tenant cannot be null. Agent context is independently authorized and cannot overwrite identity. The selected release does not advertise delegated_user support without a real accepted mapping. These fields remain proposed, not claims about current structs.

## Scope and sequencing

After 01→02→03: UAR src/uar/runtime/turn/host/{mcp,credentials,mod}, src/mcp/{runtime,binding_cache,registry,config} and the existing model/tool-result projection boundary; The Boss src/main/ai/runtime/uar/{UarHostMcpBridge,UarRuntimeConnection,UarToolApprovalController} and src/main/services/prometheus/integrationConfig.ts; Bossfang librefang-api middleware.rs and routes/network.rs plus directly consumed identity types. Existing encryption/resolver modules are reference surfaces unless a selected storage contract explicitly reuses them. A receiver-specific adapter path remains unassigned and blocked, not a wildcard permission to write sibling repositories. Reconcile shared files with 01/02 before writes.

## Risks / Trade-offs

- No external receiver/IdP selected → no external deployment certification; common-boundary fixture success cannot substitute.
- Redaction can alter tool-result content → record only non-secret redaction indication and retain the stricter secret boundary.
- Secret deletion cannot undo already emitted effects → preserve revocation/outcome distinctions.
- OS encryption support varies → selected platform acceptance, no plaintext fallback.

## Migration Plan

Remove only root mcp.json presets in the isolated UAR worktree; applications supply configuration through existing paths. Preserve developer .mcp.json and application credentials. Common boundary implementation remains sequenced after its dependencies, except the explicitly independent configuration deletion. Disable new grant admission to roll back boundary changes; retain unknown-outcome records. No deployed configuration or production credential is changed here.

## Verification

At completed production boundary, exercise the selected host/grant and existing inbound validators for applicable audience/expiry/scope, tenant, claim, two-run isolation and renewal/revoke cases. Report unsupported receiver-specific cases explicitly; do not invent an external server or delegated identity mapping. Run synthetic canaries through header/env/provider/error and deliberate tool echoes; inspect logs, events and captured model inputs. Verify Bossfang supported/forged modes, stdio environment/termination, empty runtime defaults and isolated application catalog/grant/configuration preservation. Parent04/10 includes cumulative independent review and platform limits. Separate local desktop and remote common-boundary evidence; no external deployment certification is available from the empty receiver selection.
