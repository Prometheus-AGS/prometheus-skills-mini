# Design: UAR principal authority

## Context

See proposal.md. F2/F3 are static findings at actual boundaries, not newly reproduced exploits. The local JWT-hardening spec permits optional issuer/audience; remote strictness is an explicit new profile, not an accusation that current code violates that local spec. Source baseline and disconfirming evidence remain in the [analysis](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/analysis.md).

Inspected anchors: [auth handlers](/Users/gqadonis/Projects/prometheus/universal-agent-runtime/src/uar/api/auth.rs:44), [key store/exchange](/Users/gqadonis/Projects/prometheus/universal-agent-runtime/src/uar/security/api_keys.rs:264), [verifier](/Users/gqadonis/Projects/prometheus/universal-agent-runtime/src/uar/security/verifier/mod.rs:107), [host role inference](/Users/gqadonis/Projects/prometheus/universal-agent-runtime/src/uar/runtime/turn/host/mcp.rs:353).

## Goals / Non-Goals

Reuse cand-002 and adapt cand-009. Preserve local launch controls and enforce a complete remote policy. No replacement JWT implementation, blanket SDK upgrade, new service, external IdP selection or claim of immediate revocation for already issued self-contained JWTs.

## Decisions

1. Carry a verified authority object through authentication, key issuance and run admission: subject, optional local installation identity, verified tenant for remote tenant operations, roles/scopes and typed provenance. Establish host provenance only at authenticated launch or a configured trusted host/service verifier. Reject ordinary role-based promotion, including user-issued host-session. Preserve the existing downstream destination and grant checks.
2. Change key persistence and both direct/exchange principal constructors together. Store owner/tenant and attenuated roles from verified caller context. Intersect with a configured delegation allowlist; reject a request for any nondelegable role rather than silently returning a partly elevated key. Revoke/list resolve ownership under the same tenant; only explicit scoped admin policy can cross owners. Missing remote metadata requires reissue, not inferred migration. Document the existing database trait/backends that implement the record before changing its schema.
3. Remote profile requires explicit verifier configuration and no anonymous fallback. Require an authenticated tenant/workspace authorization mapping before using workspace as a protected-resource selector. Local installation identity remains a distinct type. A locally signed exchange token is supported only if the active verifier accepts its issuer/key/audience policy; otherwise report unsupported exchange, including external-JWKS deployments.
4. Proposed operational JWKS values are 60-second refresh target, 300-second hard age, five-second fetch timeout and minimum retry interval, single-flight per issuer. These are design defaults for approval, not values mandated by MCP/RFCs. Use monotonic age from last successful complete refresh, atomically replace key set, remove absent keys and never reset age on failure. Unknown kid can request refresh subject to the same bound. Keep 60-second JWT leeway. Key removal stops new authentication within the hard age; it does not retroactively cancel admitted runs.
5. Key exchange token lifetime is min(3600 seconds, remaining key lifetime). Revoking a key prevents direct use/new exchange; an already issued JWT retains its independently documented expiry window. Stronger immediate revocation is a deployment-specific capability, not falsely inferred from key deletion.

Alternatives rejected: replacing jsonwebtoken does not define application authority; accepting stale JWKS forever breaks the selected revocation bound; forcing local sidecars through a remote IdP confuses installation and tenant identity.

### Concrete policy configuration

Add the proposed security.api_key_delegable_roles field to SecurityConfig in src/config.rs and its generated configuration schema; it does not exist at this baseline. Default [user], exact case-sensitive role matching, reject configuration containing host-session or admin. Effective delegation is the intersection of verified caller roles and that allowlist. Omitted requested roles means [user] only when in the intersection; otherwise deny. Other roles are nondelegable unless explicitly allowlisted and held by the caller. Installation/host provenance is typed and cannot be created by any role string. The key record and direct/exchange claims expose the same attenuated roles for fixture assertions. For cross-owner management, use a proposed security.api_key_admin_principals list of exact verified issuer/subject/tenant triples, default empty; admin role alone does not grant key-management authority. Configuration changes are trusted operator actions, never ordinary key-issuance inputs. Add the same explicit management rule to repository-local API documentation and negative scenarios.

## Scope and sequencing

UAR owns src/uar/security/api_keys.rs, claims.rs, verifier/, src/uar/api/auth.rs, src/config.rs, and host provenance propagation in src/uar/runtime/turn/host/{mod,mcp,credentials}. Associated persistence adapters and router wiring are included only as direct consumers of these contracts. Plan enumerates exact backend files from the agreed source checkpoint. New feature modules must respect repository size/architecture rules.

Complete this identity contract before bauar-02 modifies approvals or bauar-04 modifies host resource-grant handling. Shared host files are serialized 01 → 04; no parallel claims. UAR C05 execution authority is retained.

## Risks / Trade-offs

- Strict remote profile rejects old/incomplete credentials → explicit migration and diagnostics; local is not a bypass for remote deployment.
- Short JWKS age increases issuer load/outage sensitivity → single-flight and bounded refresh, with visible fail-closed state.
- Tenant migration can lock out legacy keys → owner-driven reissue using verified authority, never a guessed tenant.
- A compromised issuer remains an authority risk → not solved by freshness or role filtering.

## Migration Plan

After Plan approval and isolated source worktree allocation, add versioned key metadata and remote policy validation, then migrate authenticated callers and enable strict remote admission only after the combined acceptance boundary. Preserve encrypted/hashes-only credential storage. Disable new remote admission to roll back behavior; do not restore privilege escalation or transform legacy keys into trusted hosts. No product data migration runs during Spec.

## Verification

At the combined completed-production boundary, run the real router/key service/verifier with synthetic credentials: invalid/missing claims, leeway boundaries, bounded key removal/same-kid replacement/outage/concurrency, direct/exchanged tenant preservation, reserved role rejection with destination prerequisites, legitimate launch success, owner/admin revoke and cross-tenant workspace denial. Record actual source and clock-controlled fixture values. Unit-only or source-only results do not certify remote deployment.
