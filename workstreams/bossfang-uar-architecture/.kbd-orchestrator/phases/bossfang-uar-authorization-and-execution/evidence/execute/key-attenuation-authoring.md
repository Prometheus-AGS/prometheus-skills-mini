# Identity task3 — attenuated key authority source handoff

Parent01/3 revision105; child identity/3 revision46. Source authoring only in isolated bauar-uar. No Cargo, tests, compiler, lint, formatting gates, installs, services, commits, KBD mutations or D0/session activity.

## Authored contract

SecurityConfig.api_key_delegable_roles defaults to [user]. Reserved host-session/admin roles invalidate policy. ApiKeyService.create_key now requires UserContext and checks each requested/default role against both verified caller roles and configured allowlist before key generation or storage. Anonymous/missing remote identity is denied. The existing single InMemory backend remains. ApiKeyRecord and metadata gain authority_version=1, issuer and tenant_id; old deserialized records default to version0 and absent metadata. No database migration or inferred tenant.

Direct-key validation verifies the hash and retained policy before constructing typed TenantId through a private validated-key proof; its UserContext and exchange JWT preserve subject, tenant and attenuated roles and never set uar_instance_id. Stored issuer must agree with active configured issuer; remote records need current version/tenant/issuer or return a reissue diagnostic. Issued JWT carries retained issuer and configured audience. JWKS-mode exchange explicitly reports unsupported because local HS256 cannot satisfy it. ApiKeyService signing secret now uses existing SecretString so Debug cannot expose signing material.

HTTP middleware accepts direct keys even when JWT is required, with bearer precedence and no fallback from a presented invalid bearer into key authority. The exact POST exchange routes hand credential checking to the existing exchange handler, enabling its documented JSON-body and header paths; they do not admit runs or install context. Both direct key paths still traverse remote workspace admission for protected operations. API creation no longer manufactures an anonymous owner. Create/exchange authority errors are typed and non-secret.

## Exact files

Production: src/config.rs; src/server.rs; src/uar/security/api_keys.rs; new src/uar/security/api_keys/policy.rs; src/uar/security/claims.rs; src/uar/security/middleware.rs; src/uar/api/auth.rs. Mechanical SecurityConfig source literals: src/uar/api/a2a/grpc.rs, src/uar/api/a2a/handler.rs, tests/a2a_thread_service.rs, tests/settings_persistence.rs, tests/test_a2a_grpc.rs. Existing test_a2a_grpc create caller now passes explicit synthetic UserContext. Docs: docs/API_KEYS.md and example.config.yaml.

New src/uar/security/api_keys/tests.rs relocates existing key-service scenarios by responsibility and adds attenuation/no-insert, missing default role, real-verifier tenant preservation through direct/exchanged paths, legacy/mismatched issuer denial, reserved configuration and unsupported external-JWKS exchange scenarios. New policy.rs isolates authority decisions; entry api_keys.rs is429 lines, policy75, tests252 at handoff. No scenario executed. These focused sources are not full-route acceptance evidence.

## Deliberately pending

Task4 owns owner/tenant/admin list/revoke and bounded exchange lifetime/response TTL. Existing list/revoke methods and TTL calculations remain unchanged and are NOT certified secure by this handoff. Task5 owns typed launch/host provenance. Task6 cache integration follows this handoff. Complete production gate must exercise actual HTTP/gRPC/A2A and direct/exchange routes; current authoring is not compiled or accepted. Preserved all peer edits, especially mcp.json and JWKS module. No UserContext or UserClaims fields were added.
