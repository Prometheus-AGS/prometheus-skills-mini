# Design

## Context

See proposal.md. Source baseline is bac04cb6b2c144520e28234ad77f00d4cf0f5b23 accepted by driver for isolated residual work. Parent backend 04/2 owns this requirement; 04/9–10 own combined gate/build evidence. User selected no new remote receiver, IdP or custody integration and preservation of application-owned configuration.

AuthenticatedApiUser currently carries name/role/user_id; OidcRoleGrant also lacks the proposed full subject/tenant/actor attribution. Existing oauth.rs produces cryptographically verified OIDC context. MCP route independently checks requested agent access. Do not substitute an agent/channel/account header for verified identity.

## Goals / Non-Goals

Goal: inspectable non-secret authentication attribution with separate authorized agent context.
Non-goals: new login/IdP/token-exchange flow, remote deployment certification, credential custody, connection presets, authentication configuration rewrites or UI.

## Decisions

Produce a separate request attribution extension at the actual successful authentication branch; do not infer authentication source from the synthetic root user sentinel, which currently conflates a master key and trusted local access. Fields: mode, authenticated_subject, verified_tenant, verified_actor, authorized_agent_id, authn_source, policy_revision. Allow null only where mode permits. Add the authorized agent only after existing can_access_agent succeeds. No raw credentials enter the record.

Trusted-local mode is based on the existing verified local connection/auth policy, service mode on the actual service credential path. Delegated mode requires existing authenticated authority to supply verified subject and required tenant plus any actor under an explicit application mapping. If unavailable, reject requested delegated semantics; do not invent a tenant from headers, user display name, local group, workspace or service bearer. No new IdP is installed/configured. Ordinary configured OIDC access can retain its current authorization without falsely being labeled a verified cross-tenant delegation.

Preserve existing inbound agent checks. Driver resolved the MCP boundary policy: remote multi-user /mcp rejects unauthenticated requests even when the existing broad allow_no_auth flag would otherwise admit them. Preserve that flag and its unrelated endpoints/local behavior. This is an intentional MCP behavior change, not a configuration deletion. Determine local authority only from trusted server deployment/transport context, never a caller header or forwarded address supplied by the caller.

The inspected KernelConfig MCP server default is an empty Vec. No source remote preset was found in config/boot; hence no deletion claim. UAR shipped presets are a separate driver-owned parent04/7 task at /Users/gqadonis/.claude/worktrees/bauar-uar/mcp.json, bound by phase evidence/execute/default-removal-binding.md. No Bossfang claim or dependency blocks that ordinary configuration-only task. Keep application-created server entries, UAR connections, auth provider configuration and secret stores.

### Concrete deployment and attribution profile

Observed anchors at bac04cb6: server.rs:2085 reads LIBREFANG_ALLOW_NO_AUTH into AuthState.allow_no_auth (:2150); actual listener locality is listen_addr.ip().is_loopback() (:2097), and existing external_auth_proxy records proxy deployment intent (:2130). middleware.rs:2037–2059 currently grants synthetic root/TrustedNoAuthCaller when ConnectInfo<SocketAddr> is loopback OR allow_no_auth. The root sentinel therefore does not prove a credential or a local-only deployment (AuthenticatedApiUser::owner_principal, :218–225).

The server.rs claim below is a proposed refinement requiring driver design acceptance, not implemented behavior. Proposed typed McpDeploymentContext is initialized at server boot from the actual listen_addr and existing external_auth_proxy; it is server-owned data passed to the request policy, not a new user configuration key. A trusted-local no-credential request requires loopback-only listener, external_auth_proxy=false and a loopback peer from Axum ConnectInfo. A non-loopback listener, configured external proxy or missing trusted context uses the remote MCP boundary and requires accepted authentication, even for a loopback proxy peer. Forwarded/X-Forwarded-For/actor/tenant/agent headers cannot change this classification. These criteria intentionally prevent broad allow_no_auth from turning a remote MCP deployment into trusted-local authority. Other endpoints retain their current policy; ordinary direct loopback-only local usage remains supported.

| Attribution mode | Established authority and nullable fields |
|---|---|
| trusted_local | Successful existing no-auth branch plus the server/peer criteria above. Source is local transport; no invented person or tenant. |
| service | Actual successful master API-key verification branch. Subject labels the verified service credential class, never the synthetic root sentinel alone; tenant/actor absent. |
| authenticated_user | Existing verified per-user API key, dashboard session, or configured OIDC role-grant authorization. Preserve actual subject/provenance and existing permissions; do not label it cross-tenant delegation. |
| delegated_user | Unsupported in this selected release: no application mapping of verified subject + required tenant + actor has been selected. Requested delegated semantics refuse before effect. |

OidcRoleGrant currently exposes name/role/user_id only (middleware.rs:236–243); IdTokenClaims contains mandatory sub (oauth.rs:85–97) and configured role/group mapping, but that alone is not a tenant/actor delegation contract. The user selected no new IdP. Do not invent acr, tenant_id, act, token-introspection endpoints or configuration. Retain verified subject provenance from the successful OIDC branch when needed for ordinary user attribution. A later positive delegated profile requires a separately accepted application mapping and source/issuer/audience/tenant/actor contract plus actual verifier evidence; this delivery cannot silently activate it. The conditional parent scenario remains a requirement for such a future accepted profile, while this release records explicit unsupported coverage.

### Completed-gate preservation evidence

MCP child2.1 / parent04/9 owns the real-router local/service/user and unsupported-delegated scenarios in crates/librefang-api/tests/bauar_mcp_identity.rs, including a credential canary absent from captured logs, errors and stored attribution. Configuration preservation uses an isolated application instance with pre-created connection/catalog/grant state, reads it through the actual application APIs before/after the completed delivery scenario and compares controlled config snapshots. Never read or change live developer credentials/config to prove preservation. This is a real application-path scenario, not a mock verifier or a separate partial gate. UAR mcp.json default removal has its own parent04/7 structural evidence; runtime application entries and developer .mcp.json remain outside that write claim.

## Exact ownership

Sole F-MCP writer is bossfang-feature-steward after F-RETRY releases network.rs at the immutable child03/2.4 / parent03/7 A2A checkpoint. Default role ownership needs these exact extensions:
- crates/librefang-api/src/middleware.rs — authentication-source attribution only.
- crates/librefang-api/src/routes/network.rs — mcp_http and mcp_identity_error slices only, preserving A2A work.
- crates/librefang-api/src/mcp_attribution.rs — new focused record/helper module.
- crates/librefang-api/src/lib.rs — export wiring only.
- crates/librefang-api/src/server.rs — immutable MCP deployment-context wiring from actual listen_addr and existing external_auth_proxy only; no configuration rewrite.
- crates/librefang-api/src/oauth.rs — only retain existing verified claim provenance needed by attribution; no auth flow/config expansion.
- crates/librefang-api/tests/bauar_mcp_identity.rs — new real-router attribution scenarios.

No auth config, secret-store, remote receiver, schema, dependency or migration writes. If verified delegated claims require an application contract not present, fail unsupported and report that boundary rather than claiming delegated acceptance.

## Risks / Trade-offs

Root identity currently loses authentication-source distinction -> capture at authentication branch. OIDC role grant is not a resource token principal -> preserve provenance and require required claims. Shared network.rs -> serial checkpoint transfer. Existing allow_no_auth -> intentional remote multi-user /mcp refusal only; preserve local and unrelated endpoint behavior. Nested planning root -> driver explicit product execution binding required.

## Migration Plan

Record accepted source/03 release, add attribution without changing configured credentials, and retain existing successful native local/service authorization. Unsupported delegated semantics fail before effects. Rollback may remove the new attribution output but must not promote agent headers into identity.

## Verification

Author legitimate local/service and supported delegated cases using existing real authentication path, forged actor/tenant/agent negatives, unavailable delegated verification, remote-no-auth distinction and non-secret canaries. Run only after completed selected production with real API router/auth and a safe effect counter. The selected release has no accepted delegated mapping: exercise unsupported refusal, not fake positive principal injection. A later accepted mapping must add positive and forged-context regression coverage through its actual verifier before being advertised. This child contributes to parent 04/9–10 and cannot alone certify remote deployments.
