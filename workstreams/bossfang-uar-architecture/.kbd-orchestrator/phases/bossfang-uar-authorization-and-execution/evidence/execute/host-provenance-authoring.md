# Identity task 5 source handoff

Status: source authored only. Parent01/5 revision117; child identity/5 revision63. No runtime acceptance claim. Authoritative workspace: /Users/gqadonis/.claude/worktrees/bauar-uar.

## Actual boundaries and changes

- SidecarGuard is the sole launch-marker factory. Its marker now has private construction; authenticated local assertion receives HostAuthority before JWT resolution, after the guard consumed the launch bearer. Remote assertions remain refused. Installation proof does not create VerifiedIdentity or tenant identity.
- Host grant admission in runtime/turn/host/mcp.rs consumes a context-bound HostAuthority, replacing host-session/uar:mcp:delegate role inference. Destination, lease, scope, owner and renewal checks are retained. Existing host/mod.rs and host/credentials.rs needed no identity edit: neither creates host authority. They remain available for the next resource task after driver handoff.
- Empty-by-default trusted_host_principals config (derived schema + example) maps exact enforced issuer/subject/tenant to operator host_id. Signed issuer provenance plus the mapping is required; grant policy must still trust that host_id. No external IdP, server or custody defaults introduced.
- A private verified JWT envelope reads the signed credential kind without changing UserClaims literals. Direct keys and new exchanges carry api_key kind. Missing/unknown kind is unclassified. Only issuer kind activates service-host or configured cross-owner admin policy. All kinds retain ordinary verified identity/owner management where otherwise authorized.
- Privileged credentials require deliberate issuer-controlled reissue. Legacy marker omission is never accepted as non-key proof. This is documented as a cutover, not backwards-compatible privileged behavior.
- Exact previously accepted constructor paths receive host_authority=None; verified HTTP/gRPC paths propagate verifier proof. No public proof factory or untrusted deserialization was introduced.

## Authored scenarios (not executed)

New host/mcp_tests.rs supplies a private loopback receiver accepting a synthetic credential, positively calls it, and uses a registered catalog destination and valid grant for both negative and positive admission. Cases: ordinary forged-role/instance ID; missing, unknown and api_key kind; wrong subject/tenant; exact service mapping; proof/context mismatch; default-empty mapping; direct and exchanged keys; retained scope/expiry denial; actual SidecarGuard no-token rejection and valid-token launch proof without user identity. Receiver call count is unchanged across admission denials. This is focused host admission source, not a full real MCP execution acceptance receipt.

API-key scenario source adds configured-admin identity carried by direct/exchanged/legacy/unknown-kind credentials: own metadata remains visible, foreign key listing/revocation denied without mutation, exact issuer-kind administrator succeeds. Existing source fixtures now explicitly mark their independently issued synthetic issuer tokens.

## What ran and limitations

Only Node24 source reading/writing and rg/git read-only inspection. One initial Node authoring command had a syntax error before any write and was corrected. No Cargo, compiler, lint, formatter, tests, services, dependency changes, commits or canonical mutations. No D0/session activity. The dedicated host scenario file has 166 lines; key scenario module has 370; key entry has 465. Compilation, actual route propagation and runtime acceptance remain unverified until the complete authorized delivery gate.

No unsolicited scope added. Every added authority guard traces to actual credential verification, key management or host-grant admission. Source host files are released to driver sequencing after this handoff; no resource grant/projector changes were made.

## Exact files changed in task 5

- src/config.rs
- src/uar/security/claims.rs
- src/uar/security/verifier/mod.rs
- src/uar/security/sidecar_guard.rs
- src/uar/security/middleware.rs
- src/uar/security/api_keys.rs
- src/uar/security/api_keys/policy.rs
- src/uar/security/api_keys/tests.rs
- src/uar/security/authority.rs
- src/uar/runtime/turn/host/mcp.rs
- src/uar/runtime/turn/host/mcp_tests.rs
- src/uar/api/a2a/grpc.rs
- src/uar/api/a2a/handler.rs
- src/uar/api/memory_admin.rs
- src/uar/api/user_settings.rs
- src/uar/api/presentations_tests.rs
- src/uar/admin/memory.rs
- src/uar/memory/scopes.rs
- src/uar/governance/middleware.rs
- src/uar/runtime/presentations_tests.rs
- src/uar/runtime/presentation_history_tests.rs
- src/uar/runtime/thread/service_tests.rs
- tests/test_chat_completion.rs
- tests/skill_activation_runtime.rs
- tests/mcp_child_environment.rs
- tests/credentials_api_integration_test.rs
- tests/mcp_projection.rs
- tests/model_path_resiliency.rs
- tests/a2a_thread_service.rs
- tests/kb_embedding_space.rs
- tests/context_history_integrity.rs
- tests/settings_persistence.rs
- tests/test_a2a_grpc.rs
- docs/API_KEYS.md
- example.config.yaml
- workstreams/bauar/openspec/changes/uar-bauar-identity-boundaries/design.md
- workstreams/bauar/openspec/changes/uar-bauar-identity-boundaries/specs/uar-principal-authority/spec.md
