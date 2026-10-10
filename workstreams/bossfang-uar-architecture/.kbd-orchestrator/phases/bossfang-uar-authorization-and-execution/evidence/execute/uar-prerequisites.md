# UAR prerequisite and child-contract receipt

Date: 2026-10-06. Stage: Execute P0; product implementation and D0 execution not performed by this receipt.

## Checkpoint and ownership

- Original repository: `/Users/gqadonis/Projects/prometheus/universal-agent-runtime`.
- Observed HEAD and driver-selected base: `a7cb972992d4f83db6585449ea81af0fe4a1c990` (`feat/uar-ui-foundation`). Driver provisioned `/Users/gqadonis/.claude/worktrees/bauar-uar` at this base; repository-local planning will use its nested `workstreams/bauar`, never the inherited original KBD UUID.
- Original KBD position is `runtime-harness-gap-closure`, revision 2585, with waypoint activePhase `fix-better-default-chunker-327`. It is unrelated state and was not mutated.
- `git status --short` shows unrelated frontend/static/script/knowledge edits, changed submodule pointers, and untracked `migrations/history.txt`. No currently proposed U-ID/U-HOST/U-APPROVAL/U-F6 Rust source path was dirty. Do not copy original dirty files into the child.
- C05 worktree `/Users/gqadonis/.claude/worktrees/afc-c05-uar` is `fcfce6d226b50eee502c5f272e9215112d933e29`. `git merge-base --is-ancestor fcfce6d226b50eee502c5f272e9215112d933e29 a7cb972992d4f83db6585449ea81af0fe4a1c990` returned 0. The diff between these revisions for `src/uar/api/full_harness.rs`, `src/uar/api/full_harness/handlers.rs`, `src/uar/mcp_server.rs`, and `src/uar/security` was empty. Current base already contains that provider contract; no cherry-pick is necessary.
- C05 task file records implementation complete and parent integration still owned by C05. Its worktree has dirty submodules/pnpm lock and untracked `.librefang/`/history; these are excluded. Provider authority, task receipts, admission/reconciliation and expected revisions remain preserved/read-only except an explicitly bound identity check.
- No selected project team manifest was found in the inspected `.agents`, `.agent-team`, `.agent-teams`, or KBD paths. Use the driver-assigned UAR security/trusted-host role; do not invent a pre-existing team.

## 01/1 key backend and migration closure

The concrete implementation is only `InMemoryApiKeyStorage` in `src/uar/security/api_keys.rs:132`. Production startup unconditionally constructs it in `src/server.rs:1346–1357`. Repository search for `impl ApiKeyStorage` returned no other implementation. The generic persistence providers and provider-credential storage are different systems and are not API-key backends.

Therefore no SQL/Surreal migration number or production database migration is required for this key change. Add versioned owner/issuer/tenant metadata to this record and update its one backend and all constructors together. Legacy serialized records lacking remote authority must be rejected/reissued if imported; do not invent an import adapter or migration. Keys are process-local and disappear on restart; this receipt does not claim durable API-key support.

Current defects visible in source:

| Boundary | Current source | Required child contract |
|---|---|---|
| Create/list HTTP | `src/uar/api/auth.rs:47,67` | Replace optional context and `anonymous` fallback with verified caller authority. Both `/api/uar/auth` and `/api/auth` mount this router. |
| Revoke HTTP | `src/uar/api/auth.rs:86` | Require owner/tenant or configured exact scoped-admin authority; non-disclosing denial. |
| Key delegation | `src/uar/security/api_keys.rs:231` | Require caller context, configured role allowlist, reject nondelegable roles before insert; preserve issuer/subject/tenant and no host provenance. |
| Key exchange/direct | `src/uar/security/api_keys.rs:265,320` | Both currently write `tenant_id: None`. Retain verified stored identity; TTL is min(one hour, remaining key life); reject unsupported external-JWKS exchange. |
| Direct key middleware | `src/uar/security/middleware.rs:159–201` | It currently resolves JWT first, so missing Bearer with JWT-required exits before key fallback; successful fallback also explicitly drops tenant. Make the supported direct-key lane satisfy the strict profile and typed identity contract. |
| Local launch | `src/uar/security/sidecar_guard.rs` → `middleware.rs:129–165` | Existing opaque `HostAuthenticated` extension is the launch proof. Preserve it as typed provenance; role string alone cannot create it. |
| Grant admission | `src/uar/runtime/turn/host/mcp.rs:351` | Currently trusts `host-session` role, or `uar:mcp:delegate` plus instance ID. Require typed authenticated-launch/configured-service proof while retaining destination/scope/lease checks. |
| JWT | `src/uar/security/verifier/mod.rs` | Shared secret/JWKS verification constructs typed tenant; add strict remote policy and issuer identity, maintain 60-second leeway and single crypto provider. |
| Workspace | `src/uar/api/full_harness/handlers.rs:388` | Current helper only checks nonempty header. Bind remote workspace selector to trusted mapping before admission; header is a selector, never authority. |

The reviewed existing specs are `jwt-hardening`, `tenant-isolation`, `multi-tenant-isolation`, and `auth-key-management`. Existing local optional issuer/audience and anonymous compatibility are documented behavior; the explicit remote profile is an additive policy and its strict cutover is deliberate. Do not silently recategorize local installation authority as a tenant identity.

## Exact child write contract proposals

All paths below are relative to the isolated UAR worktree. They are proposed additions to the parent claim receipt, not blanket permissions. No source mutation was performed here.

### `uar-bauar-identity-boundaries`

Parent numeric task mapping: 01/1 → child `1.1` inventory receipt; 01/2 → `1.2` profile/workspace; 01/3 → `1.3` key attenuation; 01/4 → `1.4` management/TTL; 01/5 → `2.1` provenance; 01/6 → `2.2` JWKS; 01/7 → `3.1` shared acceptance receipt.

Existing claims retained: `src/config.rs`, `src/uar/api/auth.rs`, `src/uar/security/api_keys.rs`, `src/uar/security/claims.rs`, `src/uar/security/verifier/mod.rs`; new `src/uar/security/verifier/jwks_cache.rs`; U-HOST `src/uar/runtime/turn/host/{mod,mcp,credentials}.rs`.

Required exact claim extensions:

- `src/uar/security/middleware.rs`: principal construction, direct key authentication, typed local provenance, HTTP workspace authorization. This central boundary can validate the selected header without rewriting every full-harness handler.
- `src/server.rs`: API-key service construction and security configuration propagation; serialize with 02's approval handler and 04's host wiring. No unrelated server refactor.
- `src/uar/security/sidecar_guard.rs`: existing launch marker constructor/visibility only if required to carry provenance; preserve token/Host/Origin checks.
- `src/uar/api/a2a/grpc.rs`: independent verifier caller constructs `UserContext`; must retain authority. gRPC workspace-bearing full-harness task operations need the same authorized selector contract.
- `src/uar/api/a2a/handler.rs`: JSON-RPC full-harness lookup/cancel reads workspace from params rather than HTTP header, so middleware header checks alone do not cover it.
- `src/uar/security/mod.rs`: export any newly separated feature module, only if split required by size constraints.
- New `src/uar/security/authority.rs`: typed provenance/profile/workspace policy helper, if selected as the cohesive module; avoid adding more to existing >500-line files.
- `docs/API_KEYS.md`, `example.config.yaml`: documented strict profile, allowlist/admin mapping, ephemeral storage, reissue and exchanged-JWT revocation window. Do not publish real credentials.
- `tests/test_a2a_grpc.rs`: only external direct `ApiKeyService::create_key` caller found besides auth route and module tests; migrate it with the signature.
- New `tests/bauar_authorization.rs`: integrated identity scenarios authored with production; run only at V1.

If `UserContext` gains a required field, these exact constructor consumers also need a mechanical binding extension before writes: `src/uar/api/memory_admin.rs`, `src/uar/api/a2a/handler.rs`, `src/uar/api/user_settings.rs`, `src/uar/api/presentations_tests.rs`, `src/uar/admin/memory.rs`, `src/uar/memory/scopes.rs`, `src/uar/governance/middleware.rs`, `src/uar/runtime/presentations_tests.rs`, `src/uar/runtime/presentation_history_tests.rs`, `src/uar/runtime/thread/service_tests.rs`, and tests `test_chat_completion.rs`, `skill_activation_runtime.rs`, `mcp_child_environment.rs`, `credentials_api_integration_test.rs`, `mcp_projection.rs`, `model_path_resiliency.rs`, `a2a_thread_service.rs`, `kb_embedding_space.rs`, `context_history_integrity.rs`. Production synthetic/admin contexts must explicitly lack host provenance. Test contexts cannot silently become authenticated hosts to keep tests green.

Additional workspace selectors inspected: `src/uar/mcp_server.rs:89`, `src/uar/api/collaboration.rs:380`, `src/uar/api/agent_instances.rs:355`, `src/uar/api/observers.rs:229` derive workspace from `x-uar-workspace-id`. Their HTTP path is covered only if the central verifier/middleware applies mapping before routing. No new writes to these files are implied by inventory. A route that bypasses that middleware requires an explicit claim extension and scenario.

### `uar-bauar-execution-authorization`

Parent mapping: 02/1 → child `1.1` strict cutover inventory; 02/2 → `1.2` exact pending identity; 02/3 → `1.3` UAR positive-helper migration (Boss client child owns its own portion); 02/4 remains Boss claim boundary; 02/5 → `2.1` unchanged D0; 02/6 → `2.2` conditional correction/no-change evidence; 02/7 → `3.1` shared acceptance; 02/8 → `3.2` shared build receipt.

Retain U-APPROVAL paths and U-TEST helper claims. Add `src/server.rs:2539–2590` (`api_run_approval`) explicitly: this second approval ingress independently accepts optional `approval_id` and must share the strict cutover. `src/uar/api/routes.rs:923`, manager `resolve_approval_request`, and thread broker `resolve` retain exact run/owner/invocation binding. Full-harness handler already supplies exact ID and expected revision; do not remove them. User chose coordinated strict owned-client cutover; no compatibility exception is authorized.

U-F6 target: new `tests/bauar_session_owner.rs`. `src/uar/mcp_server.rs` remains read-only until recorded D0 crossover. If reproduced, a cohesive new `src/uar/mcp_server/session_owner.rs` is the proposed module for session ownership rather than adding substantive logic to the 870-line entry file; exact design needs the reproduction receipt first.

### `uar-bauar-resource-boundary`

Keep U-HOST handoff 01 → 04 and U-PROJECTION exact existing claims. Parent 04/1,3,4 map to child immutable grants, stdio lifecycle and secret projection tasks; 04/9–10 consume shared gate receipts. Remote receiver/custodian tasks are changed by the driver's user decision: no new external receiver/IdP/custody integration. Retain the generic boundary and clearly limit acceptance.

User requested removing all runtime defaults. Exact additional claim: `mcp.json`, replacing its `mcpServers` entries with an empty map after D0. Entries are Tavily remote URL with environment key reference, Surreal memory remote URL defaulting to loopback 1906, and Kreuzberg stdio command. Production loads this file by default at `src/server.rs:878`. Preserve developer `.mcp.json`, caller-supplied application configuration, environment secret values, and optional Vault implementation. No default removal has been performed.

## Executable D0 design, not a run receipt

Use a new integration target `tests/bauar_session_owner.rs` against the unchanged production router. Existing public entry is `server::start_server_with_listeners_and_shutdowns` at `src/server.rs:2347`; `ConfigManager::load_without_watcher` exists at `src/config_manager.rs:75`. Existing live harness demonstrates these calls in `tests/integration/live/harness.rs`, including a dedicated OS thread/current-thread Tokio runtime because the server future is not Send. Reuse that architecture, not JWT-disabled settings.

1. Private temporary cwd/data/config, embedded private Surreal store, empty MCP destination file, memory/native effects disabled, explicit synthetic provider settings. Do not load repository `.env` or caller credentials. Existing startup scans user skills; inspect and constrain through supported config rather than silently changing HOME. Keep policies required for any real run/effect case. No daemon install/start or shared resource.
2. Bind production HTTP and companion A2A listeners to loopback port 0; pass caller-owned cancellation tokens and await cleanup. Configure `jwt_required: true`, deliberate synthetic secret, exact synthetic issuer/audience, nbf validation. Mint JWTs only after production startup initializes its guarded crypto provider. A/B have distinct subject/tenant, role `user`, finite expiry, no instance/host role. Missing and expired JWT requests must return 401.
3. Initialize independent valid A/B sessions at `/mcp/uar/`, explicitly using legacy protocol `2025-06-18`, correct Accept (`application/json, text/event-stream` for POST; `text/event-stream` for GET), JSON Content-Type, `MCP-Protocol-Version`, session header and initialized notification. SDK default accepts host/origin only when valid; no Origin header and actual loopback Host prevent unrelated rejection.
4. Obtain A's valid session and replay cursor from a real request SSE response. Prove same-principal POST/ping or safe tool call, GET observation, replay and DELETE controls using sacrificial same-owner sessions where needed. Also prove B's own complete protocol succeeds. A malformed-request/protocol 400, generic 500, 406 or a missing cursor cannot count as ownership denial.
5. B presents A's session for POST continuation, GET observation, GET replay with A's cursor, and DELETE. Record each status and sanitized body/event labels; expect explicit 403/non-disclosing404, no A result/effect/lifecycle mutation. Perform A control after each attempted mutation. If B deletes A successfully, retain that exact failure and recreate separate sessions for later controls; do not abort before recording all methods.
6. Receipt binds source and dependency SHAs, method/route, principal label, session-owner label, cursor label, expected/actual status, positive-control result, observed effect/state, and enforcing production branch. Never print JWT or real session capability strings; use deterministic labels/digests.

Production path is `src/server.rs:1761` MCP mount → `src/server.rs:1952` real `auth_middleware` → `src/uar/mcp_server.rs:829–854` → rmcp 3.1.2 `StreamableHttpService`/`LocalSessionManager`. Current auth middleware verifies credentials but contains no session-owner comparison; UAR tool-level `verified_owner` protects run operations, not necessarily HTTP replay/delete. rmcp local source exists under `/Users/gqadonis/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/rmcp-3.1.2`; tower `handle_get` checks session existence/resume and `handle_delete` controls lifecycle. Static inspection has not identified a principal-bound session enforcement branch. This is a hypothesis, not a reproduced failure or no-change closure.

Proposed once-only diagnostic command after driver provisions dependency closure and authorizes its complete test fixture:

`CARGO_TARGET_DIR=/Users/gqadonis/.claude/worktrees/bauar-uar/target cargo test --locked --no-default-features --features server-full --test bauar_session_owner -- --nocapture`

The test target does not yet exist. This command has not run. Use the current fixture source and unchanged product source; do not substitute an old installed executable. D0 is diagnostic evidence only, never V1 acceptance.

## Build prerequisites and limits

- Pinned toolchain `nightly-2026-07-18` is installed; Cargo/rustc shims and `/opt/homebrew/bin/protoc` exist. No install was run. Native document/ONNX linking availability remains unverified.
- `server-full` is the repository checkpoint profile. Existing cargo config uses per-worktree relative `target`. One writer only. Do not run broad/unit gates below the completed boundary; the newer repository Rust policy and parent A-9 supersede the old per-edit T0/T1 table.
- Local path dependencies are Liter, `vendor/git/surreal-memory-server/crates/surreal-memory`, `vendor/git/prometheus-parking-lot-rs`, `vendor/git/sycophancy-correction/crates/sycophancy-core`, and `vendor/crates/esaxx-rs`; manifests for the first four were observed in the original checkout (root Cargo.toml need not exist for curated subtree dependencies). Required submodule build data includes models.dev and rust-mcp-filesystem; frontend package submodule is not a D0 test-input grant.
- Critical dependency-revision mismatch: base gitlinks point at Liter `0617979022aea621dd13541dee07ad84ffcf7d21` and skill-system `e57421a86fae08ac4d1e3a625a213cf3f3eb98bc`, while authoritative versions.toml and original checked-out modules are Liter `c5c6caac617eb931cd5009146a70831422ec236c` and skill-system `ad5c82c6c16145637c589a3ddfa06e0f20d603e7`. Driver must explicitly receipt the selected authoritative pins in isolated dependency closure before D0. Do not silently build the stale gitlinks or copy unrelated dirty module files.
- Additional observed gitlinks: rust-mcp-filesystem `21f5f684c0a15a7536b947c5c02a8949e49d3062`; models.dev `f97df19af40bc322ccbffc91138f360154940a63`. Curated Surreal source must match versions.toml `432eaa1ebbef66fc02b9bb1a1e63cc2fdb2149e8` contract; no production migration or service operation authorized.
- `prometheus-rust-workspace`, `rust-router`, `rust-best-practices`, `rust-async-patterns`, and `rust-mcp-server-generator` were loaded. Source inventory required no third-party API advice or dependency change. Missing independent reflection skill `sycophancy-correction` remains as documented by parent rules.

## Completion boundary

Only this evidence file changed. Read-only source/Git/file-presence inspection ran; no Cargo/build/test, application launch, dependency update, canonical KBD mutation, key issuance, service call or migration ran. Security hardening added: none. D0, child runtime UUID/materialization, dependency closure, strict profile implementation, positive-client migration and combined V1/V2 remain unverified. The uncomfortable constraint is that source ancestry and precise fixture design do not establish either session isolation or a buildable isolated checkpoint.


## Child materialization supplement

Driver subsequently authorized child planning files. Created and strictly validated both changes in /Users/gqadonis/.claude/worktrees/bauar-uar/workstreams/bauar/openspec/changes, project UUID 06d6112e-346a-4417-8296-3b0ba3dba220. Each has proposal.md, design.md, tasks.md, .openspec.yaml and an exact copy of its parent spec delta. OpenSpec validate --strict --json returned valid:true and no issues for both; status reports planning complete. This is document validation only.

Actual registered-order proposal supersedes the earlier suggested mapping above: identity has seven tasks, parent01/1–7 in order (semantic IDs 1.1,1.2,1.3,1.4,2.1,2.2,3.1). Execution has six tasks, numeric1/semantic1.1 -> parent02/5 D0; numeric2/semantic2.1 -> parent02/2; numeric3/semantic2.2 -> parent02/3 UAR helpers; numeric4/semantic2.3 -> parent02/6; numeric5/semantic3.1 -> parent02/7; numeric6/semantic3.2 -> parent02/8. Exact titles are in child tasks.md. All boxes remain unchecked; no child canonical transitions made by this worker.

OpenSpec actionContext currently lists only the nested workstreams/bauar root as allowedEditRoots. Driver must explicitly bind the named product source paths at the enclosing isolated worktree before product apply; this report is not an implicit wildcard scope override.

### Local dependency materialization commands (not run)

The isolated worktree already contains tracked curated Cargo manifests for prometheus-parking-lot-rs, surreal-memory/crates/surreal-memory, sycophancy-core and esaxx-rs. Do not replace them by cloning whole upstream repositories. External gitlinks can be populated from local object databases without copying dirty files or contacting remotes. For each selected module use a clean local clone followed by detached checkout of the recorded pin; do not use --shared/alternates or symlinks. Example command sequence, run by the driver only after task binding:

    git clone --no-hardlinks --no-checkout /Users/gqadonis/Projects/prometheus/universal-agent-runtime/vendor/git/liter-llm /Users/gqadonis/.claude/worktrees/bauar-uar/vendor/git/liter-llm
    git -C /Users/gqadonis/.claude/worktrees/bauar-uar/vendor/git/liter-llm checkout --detach c5c6caac617eb931cd5009146a70831422ec236c

Apply the same command pair to models.dev at f97df19af40bc322ccbffc91138f360154940a63, vendor/git/rust-mcp-filesystem at 21f5f684c0a15a7536b947c5c02a8949e49d3062, and crates/prometheus-skill-system at ad5c82c6c16145637c589a3ddfa06e0f20d603e7, with the original checkout module path as source. Original module object databases exist under original .git/modules at those paths. Liter, models.dev and filesystem have no nested .gitmodules. Skill-system has multiple nested submodules; do not recursively initialize all of them for a UAR session diagnostic. It is excluded from the UAR workspace, and its exact D0 build necessity has not been established. A missing required file is an observed build prerequisite, not authorization to fetch every nested tool. After each clone verify clean status and exact HEAD, then record full dependency closure. This preserves original dirty sources and the pinned toolchain.

Initial openspec discovery used the installed CLI shim; all subsequent document commands explicitly used /opt/homebrew/opt/node@24/bin/node with /Users/gqadonis/.local/share/fnm/node-versions/v26.5.0/installation/lib/node_modules/@fission-ai/openspec/bin/openspec.js. No Cargo command, source edit, default removal or dependency mutation has run.


## D0 dependency authority correction

Initial checkout used the historical versions.toml Liter entry and Cargo --locked failed before compilation. Recorded operator override of 2026-09-30 in UAR .prometheus/decisions.md and parent mini decisions supersedes that entry for this delivery. Accepted a7cb972 includes UAR commit 49765c56a9c60d3ecdac5a3f1227eeba25b7cf2c consuming Liter 0617979022aea621dd13541dee07ad84ffcf7d21. Isolated Liter now matches that gitlink and unchanged Cargo.lock; no new dependency selection or versions edit. Initial receipts preserved as d0-initial-*.
