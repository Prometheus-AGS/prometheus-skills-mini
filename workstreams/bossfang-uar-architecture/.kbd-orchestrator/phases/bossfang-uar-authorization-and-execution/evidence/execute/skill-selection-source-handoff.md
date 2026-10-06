# Skill selection metadata correction — source handoff

Status: source authoring complete, released to coordinator. No compile, test, build, runtime acceptance or release claim. Runtime06 confirmed HTTP408 on the real agent selection PUT before catalog refresh. Existing passing gates are not evidence for this new source.

## Contract and ordering

PersistenceLayer::update_skill_selection(skill_id, enabled, scoped_config) -> Result<bool> changes existing records only. Memory mutates two members. PostgreSQL patches the two nested JSONB members with jsonb_set and requires one matched row. SurrealDB uses the pinned 3.3.0 update(record).merge(two fields) API with an Option result: SDK method/update.rs sets upsert=false; method/merge.rs emits UPDATE MERGE and uses the optional-record return. Neither backend replaces a document, changes an embedding, creates a missing record, touches pins/schema, or invokes the embedder. Official Context7 SurrealDB UPDATE documentation supports the distinction; exact query syntax was bound to installed SDK3.3.0 source.

SkillService checked mutations preflight existing governance before registry write acquisition. Under the registry write guard: reconcile durable selection fields; clone selected registered skill; patch storage; publish in-memory state only after confirmed success; perform the existing API-origin filesystem follow-on. Batch selection remains sequential and may commit a prefix. Cache desired IDs are published only after all updates succeed. Registry-to-cache lock ordering is retained. A loaded explicit Agent false overrides an old cache ID; future/unloaded IDs remain compatibility inputs. No new hidden authority, retry, recovery token, transaction or rollback claim is introduced.

Reconciliation reads existing persistence.list_skills and overlays only enabled/scoped_config for registered skills. It neither re-registers documents nor imports unloaded IDs. Missing durable rows are explicit conflicts. It runs at actual list/get/provenance, agent binding GET, checked mutations, matching API, and fresh RunSkillBindings capture. Matching snapshots and capture now return Result; manager's one fresh capture call at the accepted slice propagates with .await?. Inherited run snapshots remain unchanged. Legacy bool/Vec/void wrappers retain signatures; actual REST callers use checked methods. Direct compatibility reads alone do not promise durable reconciliation.

## Error mapping

Fixed non-secret errors: governance denied403/rejected; registered single ID absent404/partial_possible; durable row missing409/partial_possible; store failure503/unknown, read to reconcile without automatic replay; filesystem follow-on failure503/partial. Filesystem error text says registry metadata published, which remains truthful when the service has no database configured. With a database the patch precedes publication. A later successful metadata read cannot certify filesystem state, rollback a prefix or prove a previously timed-out request never applied. No backend error text is disclosed by this seam.

## Source scenarios and limits

New tests/bauar_skill_selection.rs uses actual production skills HTTP routers, SkillService, private loopback listener and pinned real SurrealKV in sequential private child processes. It seeds nonempty vectors and an unknown field through the real SDK; after PUT/GET/global toggle, raw stored records are compared with only the two intended selection fields removed. It checks explicit false, deferred IDs, read-through following a confirmed durable metadata change, missing-row PUT/GET409, and no upsert of a never-existing ID. Source only: not executed. This compares exact stored field values including the serialized prompt string and vector; it does not claim engine page-byte identity.

The coordinator added the Boss current desktop source assertion on returned agents[].skillIds immediately after actual save_agent_skills IPC. This handoff makes no desktop pass claim. API-origin filesystem partial failure and uncertain transport/write outcomes have defined behavior but no fabricated failure fixture. PostgreSQL and memory implementations are authored; no local Postgres service was provisioned or exercised. The available pinned SurrealDB dependency enables kv-surrealkv, and the new fixture requires that current server-full profile. Existing full-document edit/startup enrichment paths remain unchanged. A fresh genuine UAR sidecar/main build is needed before subsequent desktop/harness evidence can cover this source.

## Scope and provenance

The JSON sibling records complete current file hashes and current whole-working-diff hashes; those include preserved earlier phase changes where applicable and must not be mistaken for only this correction. New responsibility files are below500 lines. Only the two new files were formatted with skip_children=true as an authorized source mutation. Incumbent modifications are narrow; manager changes only capture error propagation, retaining prior boxed execution, auth, approvals, grants and projection. D0/session files untouched. No dependencies, services, canonical state, tests or builds changed/executed.

Updated design/ownership is in skill-selection-metadata-correction-design.md and the existing child execution-authorization/design.md, owned by the coordinated documentation worker. All listed product files are now released.
