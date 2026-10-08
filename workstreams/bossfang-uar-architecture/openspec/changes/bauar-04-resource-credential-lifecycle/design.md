# Design: MCP resource authority

## Context

See proposal.md and [analysis](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/analysis.md). cand-003 owner/run transport and cand-005 exact admission already exist. Grants assert finite authority but do not validate the receiver token. Bossfang [middleware](/Users/gqadonis/Projects/references/librefang/crates/librefang-api/src/middleware.rs:556) and [MCP context](/Users/gqadonis/Projects/references/librefang/crates/librefang-api/src/routes/network.rs:1425) are separate inbound boundaries that must not disappear into a UAR-only policy change.

## Goals / Non-Goals

Specify resource lifecycle ownership and independently enforce server authorization. Preserve local installation/bridge credentials and supervised stdio. No blanket JWT pass-through, generic token-exchange service, new daemon, assumed production receiver, universal DLP claim or arbitrary refresh-token storage in provider-key tables.

## Decisions

1. The authenticated host owns acquisition, refresh/revocation and storage; UAR consumes finite captured grants; the receiver validates actual credential audience/scope/tenant/action. Resource JWT, opaque access token, sidecar credential, provider key and approval capability remain separately typed/attributed. MCP HTTP authorization comparison is pinned to 2025-11-25; protocol negotiation is not inferred from an SDK date.
2. A receiver record must name resource URL/audience, issuer/introspection policy, scope/action and tenant/actor contract, acquisition flow, refresh/revocation semantics, allowed host, secret custodian and owner. REMOTE-RECEIVER-INVENTORY blocks its implementation/certification until supplied. No token-label fixture fills that record. An existing receiver's supported OAuth flow is preferred; RFC8693 is optional and only if supported. cand-004 oauth2-rs remains reference-only; a later Rust adoption uses existing application reqwest 0.12, distinct from reqwest_mcp 0.13.4.
3. REMOTE-RESOURCE-SECRET-STORE blocks remote persistence selection. Categories are explicit: desktop OS-backed integration store is local-only reuse; an existing backend encrypted owner/tenant store requires a selected custody/schema/rotation/deletion contract; an existing vault/KMS adapter requires operator-named infrastructure. No new service is selected. Existing UAR provider encryption and The Boss safeStorage code are building blocks, not proof of a remote vault. The common contract is complete; receiver-specific supplements cannot become dispatchable without the operator input and a design/spec revision.
4. Preserve owner/run-scoped bindings, destination registration, captured headers/env and finite leases. At expiry stop new effects; renewal crosses a new run boundary after old-attempt reconciliation. No live connection credential swap across owner, run or revision. Receiver revocation is independently enforced; UAR does not invent a revocation property for an opaque token.
5. Bossfang inbound /mcp classifies trusted-local operator, service or delegated user. Keep authenticated subject, actor, tenant and agent context separate. Preserve current agent-access checks; reject forged context. No-auth root remains explicitly trusted-local only. Add a non-secret attribution record at authentication/request context, not prompt instructions.
6. Secret projection policy: ordinary logs, errors, persisted events and model messages never receive system-held credential values. Preserve wrappers and redacted Debug, sanitize transport errors, and redact exact known credential echoes in tool results before ordinary persistence/model projection. Keep that matching within the owning run, bounded by existing message limits; never emit the matching values or broaden into arbitrary document DLP. If a receiver requires intentional credential disclosure as tool output, that is unsupported until an explicitly revised contract authorizes it.
7. Stdio gets only captured allowlisted environment with existing process supervision; no automatic HTTP JWT forwarding. Reject required sandbox semantics because backend support is not established. A fixture child may use an ephemeral process/port; no shared service changes or resident daemon.

### Concrete receiver identity contract

ResourcePrincipal is a proposed canonical receiver-side acceptance/authorization record: subject, tenant_id, actor optional, scopes, issuer, resource and validation_kind (jwt or introspection). Its producing authority is the named resource authorization server; the receiver verifies signature/issuer/audience/expiry for JWT or authenticates its configured introspection endpoint and requires active=true for opaque tokens, then applies the receiver record's explicit claim mapping. No UAR grant or arbitrary header constructs this record. If the actual server cannot supply a verified tenant/actor mapping, delegated-user mode is unsupported until a reviewed supplement defines it. The initial common profile denies cross-tenant access, including claims of cross-tenant delegation; support for such delegation requires a separate explicit contract, not a permissive fallback.

Bossfang request attribution records mode (trusted_local_operator, service, delegated_user), authenticated_subject, verified_tenant, verified_actor, authorized_agent_id, authn_source and policy_revision in authenticated request context and non-secret acceptance output. Absent fields are explicit null only where the mode permits them; remote delegated tenant cannot be null. Agent context is independently authorized and cannot overwrite subject/tenant/actor. This is a proposed observable contract, not a claim these fields exist in today's structs.

## Scope and sequencing

After 01→02→03: UAR src/uar/runtime/turn/host/{mcp,credentials,mod}, src/mcp/{runtime,binding_cache,registry,config} and the existing model/tool-result projection boundary; The Boss src/main/ai/runtime/uar/{UarHostMcpBridge,UarRuntimeConnection,UarToolApprovalController} and src/main/services/prometheus/integrationConfig.ts; Bossfang librefang-api middleware.rs and routes/network.rs plus directly consumed identity types. Existing encryption/resolver modules are reference surfaces unless a selected storage contract explicitly reuses them. A receiver-specific adapter path remains unassigned and blocked, not a wildcard permission to write sibling repositories. Reconcile shared files with 01/02 before writes.

## Risks / Trade-offs

- Production receiver/IdP/custody unknown → explicit blocking records; common fixture success is not remote certification.
- Redaction can alter tool-result content → record only non-secret redaction indication and retain the stricter secret boundary.
- Secret deletion cannot undo already emitted effects → preserve revocation/outcome distinctions.
- OS encryption support varies → selected platform acceptance, no plaintext fallback.

## Migration Plan

Record named receiver contracts and custody decisions before corresponding implementation. Retain local bridge behavior while adding explicit remote profile. Migrate owner-scoped references and token lifecycle only at an approved source/data checkpoint. Revoke/disable new grant admission to roll back; retain unknown-outcome records and do not restore insecure credentials. No production credentials or configuration are changed during this stage.

## Verification

At completed production boundary, combine host grant denial with actual receiver validator scenarios: wrong audience/expiry/scope, forged tenant, opaque-token rejection, valid service versus delegated identity, key rotation/revoke, two-run connection isolation and expiry/renewal. The remote receiver may run as an isolated existing production router with test issuer/credentials; its deployment claims remain limited to that fixture until actual deployment acceptance. Run synthetic canaries separately through header/env/provider/error and deliberate tool echo paths; inspect logs, persisted events and captured model inputs. Verify Bossfang inbound legitimate and forged modes plus stdio environment/termination. Final phase delivery requires separate local/remote evidence and cannot proceed while receiver/custody blockers remain.
