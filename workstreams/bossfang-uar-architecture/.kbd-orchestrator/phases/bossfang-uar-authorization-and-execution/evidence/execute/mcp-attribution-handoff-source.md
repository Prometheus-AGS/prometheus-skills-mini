# MCP attribution source handoff

Exact six source files/hashes: mcp-attribution-handoff-source.json. Source authored only; no compiler, test, lint, formatter, build, service, dependency or gate run. Non-MCP network.rs bytes match frozen Task7 checkpoint: true. No test-file writes or application/developer config changes. Claims released for coordinator snapshot.

## Public inspection contract

librefang_api::mcp_attribution exports Serialize-only McpAttribution, McpMode and McpAuthnSource plus POLICY_REVISION and RESULT_META_KEY. Fields: mode, authenticated_subject, verified_tenant, verified_actor, authorized_agent_id, authn_source, policy_revision. Modes trusted_local/service/authenticated_user; source strings local_transport/master_api_key/user_api_key/dashboard_session/oidc. policy_revision is fixed bossfang.mcp-inbound-policy/1, a source policy identifier, not a configuration or credential digest.

The opaque AuthenticatedMcpAttribution handler extractor has no public constructor/deserializer; its field is crate-private. McpDeploymentContext is crate-private, initialized by server::build_router from its actual listen_addr and existing external_auth_proxy. Local no-credential MCP requires loopback-only listener, no proxy and loopback ConnectInfo peer. Missing context, nonloopback listener or proxy uses authenticated policy even under allow_no_auth. Other routes preserve that flag's existing policy.

## Authentication source producer

- Local success: trusted_local/local_transport, subject null.
- Actual master plaintext or hash verification: service/master_api_key, subject service:master-api-key.
- Actual composite-derived legacy dashboard match distinct from actual master: service/dashboard_session, subject dashboard:legacy-session. This is a credential class, not a registered person; existing Owner permissions remain.
- Successful per-user API key or attributed random dashboard session: authenticated_user with source user_api_key/dashboard_session, subject user:{actual UserId}.
- Existing actual JWT verifier plus role grant: authenticated_user/oidc, subject oidc:{configured provider.id}:{claims.sub}. Private VerifiedOidcAuthentication captures subject/provider only at that successful branch. Existing issuer binding is absent from validate_jwt_cached/ResolvedProvider; no issuer verification, tenant, actor or delegated certification is claimed or added.

RBAC stays User/Viewer denied and Admin/Owner admitted for POST /mcp. Requested agent ID is authorized by existing can_access_agent; only its resolved existing entry becomes authorized_agent_id. Existing broad Admin/Owner agent access is retained. Peer-jid/channel/chat/account headers remain non-authoritative routing context; tool arguments and tool execution ownership are unchanged.

## Inspectability and explicit refusals

Actual successful MCP results merge result._meta["ai.bossfang/mcp-attribution"] without changing existing other metadata/content. Errors remain errors. Existing AuditAction::AuthAttempt records detail=mcp, outcome=JSON serialized attribution, channel=mcp, existing local user_id; reserved-selector refusal audit outcome is a fixed code. No credential/header value is serialized into the record.

x-bossfang-mcp-mode:delegated_user returns -32001 mcp_delegated_user_mapping_unsupported before tool execution. Reserved x-bossfang-mcp-subject/tenant/actor/authn-source headers return -32001 mcp_authority_override_invalid. Other requested modes are unsupported selectors, never assertions of authority. No request header establishes local deployment, identity, tenant or actor.

## Remaining evidence

Independent fixture owner uar_resource_continue has exact public field strings, subjects, audit outcome layout and metadata key, and owns only the new real-router MCP test file. Full local/service/user/OIDC source-provenance, RBAC, proxy/missing-context, forged selector, safe effect, canary exclusion and isolated configuration preservation gates remain unexecuted until completed delivery. No new remote receiver/IdP/custodian configured, no defaults or connection/grant stores deleted. Historical Task7 source remains frozen.
