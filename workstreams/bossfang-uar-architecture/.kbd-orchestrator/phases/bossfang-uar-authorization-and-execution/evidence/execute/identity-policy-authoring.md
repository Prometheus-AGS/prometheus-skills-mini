# Identity task 2 — source authoring handoff

Parent 01/2 revision97; child identity/2 revision40. Worktree /Users/gqadonis/.claude/worktrees/bauar-uar. Source checkpoint a7cb972; planning-only HEAD 8bff32deb870f6363e94687a2e22492f91a34dfd. Continued-development amendment revision5 authorizes this corrective identity task independently of blocked D0. No D0 execution, retry, result inference, Cargo, test, build, format gate, dependency mutation or canonical completion was performed in this identity task.

## Authored behavior

SecurityConfig gains deployment_profile (trusted_local default or remote), explicit jwt_algorithm (HS256 shared-secret or RS256 JWKS) and exact workspace_authorities records (issuer, subject, tenant_id, workspace_id). Derived schemars configuration includes these types. Remote policy requires JWT, issuer/audience, configured algorithm matching verifier, nbf validation enabled, deliberate shared-secret material when applicable, and nonempty complete mapping records. Startup plus request boundaries validate policy with non-secret diagnostics. Tokens require expiry and preserve 60-second leeway; nbf remains optional but validated when present. Remote subject and tenant must be verified and nonempty. No external IdP or service selected.

New authority.rs applies exact operator mappings only to verified UserContext. HTTP selectors are checked before routing; gRPC independently checks metadata after its verifier; A2A body selectors are checked before task lookup/cancel. Missing mapping denies even when no workspace selector is supplied. Local launch assertion cannot replace remote credential identity. Existing service owner checks remain. No UserContext/claims constructor field change; issuer mapping uses the configured exact issuer after verifier enforcement. Task3 must preserve stored issuer authority when direct-key construction is changed; that work is not silently implemented here.

## Files

- src/config.rs
- src/uar/security/authority.rs
- src/uar/security/mod.rs
- src/uar/security/verifier/mod.rs
- src/uar/security/middleware.rs
- src/server.rs
- src/uar/api/a2a/grpc.rs
- src/uar/api/a2a/handler.rs
- tests/settings_persistence.rs
- tests/a2a_thread_service.rs
- tests/test_a2a_grpc.rs
- docs/API_KEYS.md
- example.config.yaml

The three external tests only receive mechanical SecurityConfig fields; two additional exact files (settings_persistence.rs and a2a_thread_service.rs) were explicitly accepted by driver before writes. New authority.rs contains source scenarios using actual JWT verifier and admission helper: matching/mismatched workspace, unmapped identity, incomplete policy variants, missing/wrong claims, expired/future-nbf tokens, wrong signature/algorithm, 60-second leeway and omitted-nbf compatibility. These are focused authoring scenarios, not a substitute for full HTTP/gRPC/A2A integration acceptance. tests/bauar_authorization.rs was not created because the complete gate fixture belongs to the combined delivery boundary. Existing D0 test and all session-manager files were untouched by identity work.

## Remaining acceptance

No runtime behavior is certified. Required full-delivery evidence still includes real HTTP/gRPC/A2A rejection before data/effects and same-owner positive controls, local authenticated launch controls, strict API key paths and metadata from later tasks, JWKS lifecycle from task6, and V2 compilation/build. Existing key attenuation/issuer retention and host provenance remain later bound tasks. Session isolation remains blocked with no conclusion. The uncomfortable constraint is that this source is not yet compiler- or runtime-verified.

## Scope check

Every new rejection traces to explicit remote identity/workspace trust boundaries. No key issuance or storage semantics changed. No dependency/pin or original-worktree writes. Preserved peer mcp.json defaults removal; JWKS worker owns its new cache file. Git diff inspection only was used to inspect authored wiring, not as product acceptance.
