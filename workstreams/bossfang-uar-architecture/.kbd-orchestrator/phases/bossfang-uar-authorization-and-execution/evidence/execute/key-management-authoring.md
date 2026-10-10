# Identity task4 — owner management and bounded lifetime authoring

Parent01/4 revision111; child identity/4 revision50. Source-only handoff in isolated bauar-uar. No test/build/compiler/lint/format gate, dependency/install/service/commit/canonical operation or D0/session activity. Full accepted design/spec reread before edits.

## Authored behavior

VerifiedIdentity in claims.rs has private fields and security-module-only construction; it cannot be deserialized from user/model data. Optional UserContext.authority remains None for anonymous/synthetic/installation contexts. JWT proof is attached only by verify_token after its configured-issuer policy succeeds; direct key proof follows hash and retained authority validation. Proof matching covers issuer through service policy plus subject/tenant/roles against context. Missing or mismatched proof denies issuance and management, even for named contexts. Remote workspace policy also now requires proof. No host trust is manufactured.

New security.api_key_admin_principals is an empty-by-default exact issuer/subject/tenant list; entries require complete configured-issuer triples. Key management checks record issuer and tenant against the caller and then owner subject or exact configured administrator. Admin role alone has no effect. Administrators cross owners only inside their own configured issuer+tenant scope. Unauthorized listing excludes all foreign metadata. Unauthorized revoke returns the same false/not-found result as missing ID before storage mutation. One in-memory backend gains all-record enumeration for filtered management, including revoked metadata; no durable store or migration.

Exchange lifetime is the minimum of configured service TTL,3600 seconds and remaining key life. Expiry equality is invalid for direct/exchange. Exchange HTTP response reports actual expires_in. Revoking blocks direct use/new exchange; issued JWT expiry is not retroactively revoked (existing60-second verification leeway remains explicit in docs). Nonpositive/overflowing requested key durations reject with non-secret input error.

## Exact source scope

Core: src/config.rs, src/uar/security/claims.rs, src/uar/security/verifier/mod.rs, src/uar/security/authority.rs, src/uar/security/api_keys.rs, api_keys/policy.rs, api_keys/tests.rs, src/uar/security/middleware.rs, src/uar/api/auth.rs, src/uar/api/a2a/grpc.rs. Docs: docs/API_KEYS.md, example.config.yaml.

Exact accepted mechanical UserContext authority:None additions: src/uar/api/memory_admin.rs; src/uar/api/a2a/handler.rs; src/uar/api/user_settings.rs; src/uar/api/presentations_tests.rs; src/uar/admin/memory.rs; src/uar/memory/scopes.rs; src/uar/governance/middleware.rs; src/uar/runtime/presentations_tests.rs; src/uar/runtime/presentation_history_tests.rs; src/uar/runtime/thread/service_tests.rs; tests/test_chat_completion.rs; tests/skill_activation_runtime.rs; tests/mcp_child_environment.rs; tests/credentials_api_integration_test.rs; tests/mcp_projection.rs; tests/model_path_resiliency.rs; tests/a2a_thread_service.rs; tests/kb_embedding_space.rs; tests/context_history_integrity.rs. Existing SecurityConfig constructor additions also touch tests/settings_persistence.rs and tests/test_a2a_grpc.rs, plus owned middleware/handler/grpc/config. memory/mod.rs is documentation-only and was not edited.

Key source scenarios now get actual credential-verifier proofs; the key test module is server-gated to use the production verifier. External test_a2a_grpc bootstraps an isolated synthetic hashed fixture key in its existing in-memory store, validates it through the real key service, then issues its existing integration key; it does not forge proof or initialize JWT crypto independently. Added scenarios cover owner and tenant denial/no mutation, role-only admin denial, exact scoped admin success, absent/tampered proof, remaining lifetime/one-hour cap, expiry equality and post-revocation JWT validity. None executed. Entry api_keys.rs remains under500 lines.

## Remaining boundary

No source is compiler-verified or runtime-accepted. Full delivery must exercise real HTTP key routes and both credential lanes, key-management metadata non-disclosure and no mutation, configured scoped-admin positive controls, local authenticated launch plus remote mappings, emitted TTL and subsequent expiry/revocation. Task5 typed host provenance remains separate. Resource-boundary production is not begun. Preserved peer changes and all D0 files.
