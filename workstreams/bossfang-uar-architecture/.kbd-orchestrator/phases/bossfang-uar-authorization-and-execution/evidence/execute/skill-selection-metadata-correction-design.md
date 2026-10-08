# Skill-selection metadata correction

Status: active accepted source correction, 2026-10-06T21:09:16.070Z, within the existing approved Execute phase. Authority: skill-metadata-correction-scope-acceptance.json. Source owner: uar_execution in the isolated bauar-uar worktree. Runtime certification remains pending; this documentation update executes no gate or canonical mutation.

## Observed blocker and activation evidence

Historical draft assumption (preserved): Desktop runtime05 reached actual save_agent_skills IPC305 and failed with UAR HTTP408. Whether the failing operation was the skill-binding PUT or its subsequent catalog GET remains unconfirmed. The frozen diagnostic is desktop-skill-update-stage-diagnostic/receipt.json (Boss source SHA256 c2dbf92de831d3ec9571370ab93b4fa82049636e936fd457add2fddb01a15e40). It preserves original awaits, deadline and failure behavior, adding fixed stage labels only.

Activation condition satisfied: final-gates/boss-approval-client-runtime-06.json records a failed real desktop run from 20:58:49.930Z to 21:00:51.728Z on 2026-10-06. Its log contains the exact fixed proof `uar_http_408; stage=skill_binding_update; method=PUT; path_class=agent_skills`. The awaited PUT failed; the following catalog GET was not reached. The coordinator accepted the bounded correction at 21:09:16.070Z in skill-metadata-correction-scope-acceptance.json, retaining the existing layers and no topology/schema/pin/dependency/service/recovery-profile changes. This confirms the failing request stage, not measured re-embedding cost or a verified fix.

## Existing source evidence

Source root: /Users/gqadonis/.claude/worktrees/bauar-uar. References below are the source investigator's inspected locations, with scope/type/cache details read directly for this draft; they are not runtime measurements.

| Source | Existing behavior |
| --- | --- |
| src/uar/api/skills.rs:660 | Set-agent-skills handler awaits service mutation. |
| src/uar/server.rs:2031 | Request deadline maps to HTTP408 with fixed timeout text. |
| src/uar/runtime/skills/service.rs:790 | set_agent_skills first writes the requested list to agent_skills, snapshots every registry ID, then serially calls set_scoped_enabled for every skill; returned bool is ignored. |
| src/uar/runtime/skills/service.rs:473 | Governance check precedes registry write lock. Current skill is cloned, scoped override changed, then register awaited while holding that lock. API-origin filesystem persistence follows lock release. |
| src/uar/runtime/skills/registry.rs:73 | register invokes embedding_for, calls save_skill, logs rather than propagates persistence errors, then inserts in memory. |
| src/uar/runtime/skills/registry.rs:120 | embedding_for derives text from unchanged title/description and invokes embed_batch. |
| src/uar/runtime/skills/registry.rs:99 | register_checked_batch_without_embeddings calls save_skill with an empty embedding. This is not an acceptable selection-update shortcut. |
| src/uar/persistence/mod.rs:240 | Existing trait exposes save_skill(skill, embedding) and list_skills; the latter does not preserve vectors for a rewrite. |
| src/uar/persistence/providers/surreal.rs:1713 | save_skill flattens Skill plus embedding into a record, then upsert.content replaces the document; list_skills:1772 discards embedding. |
| src/uar/persistence/providers/postgres.rs:644 | save_skill upserts the complete definition and embedding. Empty embedding becomes NULL; conflict also replaces the vector. |
| src/uar/persistence/providers/memory.rs:441 | save_skill replaces the stored Skill clone; this backend stores no vector. |
| src/uar/domain/skills.rs:45 | SkillScope is Global, Agent(String), or Conversation(String); scoped_config is Vec<ScopedSkillConfig>, each containing scope and enabled. |
| src/uar/domain/skills.rs:193 | set_enabled_for changes the matching scoped entry, appending if absent; Global also updates the legacy enabled field. |
| src/uar/runtime/skills/service.rs:759 | get_agent_skill_ids unions cached agent_skills with confirmed registry scopes; an optimistic/stale cached list can therefore misrepresent a partial mutation. |
| src/uar/runtime/skills/service.rs:815 | add/remove helpers also write the cache before calling set_scoped_enabled. Their cache guard is released before entering registry mutation. |

Boss source root: /Users/gqadonis/.claude/worktrees/bauar-boss. UarCatalogAdministrationAdapter.ts saveUarAgentSkills sends PUT /api/uar/agents/{id}/skills then calls readUarCatalog; that refresh performs discovery, skills/provenance and per-agent skill reads. The frozen diagnostic distinguishes skill_binding_update from catalog_refresh without disclosing request content.

## Accepted narrow persistence contract

Add one object-safe PersistenceLayer operation, conceptually:

    update_skill_selection(
        &self,
        skill_id: &str,
        enabled: bool,
        scoped_config: &[ScopedSkillConfig],
    ) -> Result<bool>

The bool means an existing row was matched, not whether values changed: true for a matched unchanged row, false for absence. Errors propagate. Exact Rust imports/error alias follow the existing trait. No default implementation may call save_skill, invent an empty vector, or silently succeed for an unsupported backend.

Only enabled and scoped_config may change. Preserve every other stored document field, including unknown fields not represented by the current Rust Skill, and preserve existing embedding values exactly, including NULL/missing versus populated representation. Preserve identity, timestamps, content hashes, provenance, title, description, execution settings and all other columns. The operation neither inserts a missing row nor repairs one by re-registration. Scope semantics remain those of set_enabled_for: an Agent override must not alter global enabled or another scope.

| Backend | Required implementation boundary |
| --- | --- |
| SurrealDB | Existing-record targeted update of the two flattened fields, using bound typed values and the existing record-ID mapping. No UPSERT, CONTENT replacement, whole-record serialization, or embedding assignment. Confirm record match from the update result; inspect SDK semantics before implementation. |
| PostgreSQL | UPDATE the existing skills row by skill_id, using nested JSONB field updates on definition for enabled and scoped_config only. Do not replace definition from a deserialized Skill and do not assign embedding, name, description, created_at or updated_at. Use affected-row count to distinguish absence. |
| Memory | Under its existing skills map write guard, mutate only those two fields on the existing stored Skill; absence returns false. There is no vector to fabricate or preserve separately. |

Each existing-record metadata write is atomic at its own backend operation. No claim of a cross-backend, multi-skill, filesystem-plus-database, or database-plus-cache transaction is made. No schema migration or new daemon is needed by this proposal.

## Registry, service and cache ordering

1. Snapshot the actual current IDs and perform existing governance preflight before taking the registry write guard. Use the same registry write lock to serialize the batch. Derive selection fields from the current registered Skill using set_enabled_for; no register/embedding call occurs on this path.
2. With persistence configured, reconcile_selection reads durable records and overlays only enabled/scoped_config onto existing registered IDs before checked API reads, mutations and fresh run capture. It neither registers absent IDs nor replaces documents/vectors. Missing durable rows conflict; read failure is unavailable/unknown. Without persistence, preserve the existing memory-only behavior.
3. Await each existing-row field patch while the registry guard remains held; publish its in-memory fields only after matched success. Errors and missing rows propagate, and the outer checked batch stops ignoring failures. Do not erase explicit false scope overrides merely because current inherited state equals false.
4. Preserve agent_skills compatibility for future/unloaded skill IDs. For registered skills, explicit Agent scope (including false) takes precedence over the legacy cached list in both GET and matching. Publish the desired compatibility list only after the entire batch succeeds. Partial/uncertain writes are resolved by durable read-through before the next checked observation or fresh run capture, rather than by trusting the old desired cache.
5. Use consistent registry-then-cache ordering for publication. Existing helpers release cache guards before entering registry mutation; do not hold a cache guard while awaiting the registry. The same serialized boundary prevents stale cache publication from overtaking a newer batch. No new dirty flags, hidden authority, queue or persistent operation token is introduced.
6. API-origin filesystem persistence remains a separate postcommit effect; a failure returns explicit partial/unavailable status. No filesystem/database atomicity or filesystem re-import recovery is claimed. Keep normal artifact content and governance semantics.
7. Add checked service methods for real API paths while preserving compatibility wrapper signatures. Fresh RunSkillBindings capture and matching_snapshot return Result; manager propagates failure before execution rather than capturing stale selection state. Actual API routes map missing-row conflict to HTTP409, store/reconciliation error to HTTP503, and filesystem postcommit partial failure to HTTP503 with fixed categories, without dumping request contents.

A small registry method owning the field-only patch is preferable to exposing its database field. The normal registration/discovery/content-change path keeps its existing embedding behavior. No blanket embedding disablement, timeout increase, request replay, governance relaxation, or deletion of catalog entries is included.

## Partial completion and unknown outcomes

The current operation visits many skills. A later failure may leave an already confirmed prefix persisted; an HTTP408 or connection failure may leave the active write's result unknown. Neither case means nothing changed, and neither permits reporting whole-selection success or manufactured rollback. Missing storage rows are explicit failure, not successful configuration.

For a known failure, surface the failure and expose only confirmed current state; do not retain an optimistic requested list. For an uncertain commit, the caller must treat the operation outcome as unknown until actual durable records are re-read/reconciled. A registry cache is not evidence that an ambiguous database write did not commit. Reconciliation may use the existing persisted Skill read path because it reads metadata only; it must not read and rewrite vectors. Do not automatically resubmit the PUT to recover a timeout. Explicit later operator selection may set the same metadata idempotently but must not be reported as the original operation's proven outcome.

The accepted reconciliation and 409/503 mapping above use the existing service/API seam. No new public all-or-nothing API is introduced. Do not invent rollback, durable operation tokens, exactly-once behavior, or backend-wide recovery guarantees merely to remove the timeout.

## Accepted source scope

- src/uar/persistence/mod.rs — additive typed operation.
- src/uar/persistence/providers/memory.rs — existing-record field mutation.
- src/uar/persistence/providers/surreal.rs — existing-record targeted update.
- src/uar/persistence/providers/postgres.rs — two JSONB field updates.
- src/uar/runtime/skills/registry.rs — metadata-only persisted mutation; preserve normal register path.
- src/uar/runtime/skills/service.rs — selected call chain, confirmed cache publication/failure propagation, same lock ordering.
- src/uar/runtime/skills/service/selection.rs — new cohesive checked selection/reconciliation responsibility, below 500 lines.
- src/uar/api/skills.rs — checked selection reads/mutation and fixed failure mapping.
- src/uar/runtime/turn/bindings.rs — fallible fresh selection capture.
- src/uar/runtime/manager.rs:3899–3906 only — propagate fresh capture failure.

Existing oversized modules permit surgical wiring only; any new responsibility module needs an exact accepted path and must remain below 500 lines. Any other trait implementers or callers exposed by signature migration must be named before extending source ownership. No authoritative version, pin, config, lockfile, original checkout, shared service or D0 path is in scope.

## Acceptance at the existing real boundary

After completion of the accepted coherent source correction, the coordinator alone runs the failed desktop private gate against the genuine rebuilt production-feature UAR payload. Keep actual The Boss IPC, request deadlines, private real sidecar/persistence and real catalog refresh; no fake success, unit/mock acceptance, new daemon, shared-service mutation or broader rerun of passing cases.

The existing gate must demonstrate successful skill selection and subsequent real catalog observation with the requested allowlist semantics. Record request stage, status and outcome using fixed metadata, without logging skill bodies or credentials. Preserve the strong subsequent approval/secret assertions. Where an actual backend is exercised, compare persisted non-selection fields and exact stored vectors before/after through a bounded real-storage observation; report unexercised backend behavior honestly. Static source/compile inspection of all three implementations does not certify runtime equivalence across all backends. Required build/package acceptance remains coordinator-owned and separate.

The accepted real private storage scenario and existing real desktop gate remain pending coordinator execution after coherent source completion. No performance result, implementation completion, vector-preservation runtime result, or desktop acceptance is asserted by this design.
