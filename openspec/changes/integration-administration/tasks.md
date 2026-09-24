# Revision 2 — execution held for operator review

Dependency order: 1 → 2 → 6 → 7 → 8 → 3 → 4 → 5. All 37 tasks are pending. Runtime catalog and issue #296 precede full administration. Existing task IDs are retained.
## 1. Freeze reviewed architecture and baselines

- [x] 1.1 Record independent plan findings, UX evidence, cross-repo ownership and completed assess/analyze/plan handoffs and canonical child/change registration; completion evidence is the checked-in reviewed plan and current waypoint.
- [ ] 1.2 Integrate latest Boss main, inspect fork patches, merge liter-llm upstream into its fork, and freeze catalog/source revisions; verify by recorded Git ancestry and catalog provenance, preserving unrelated worktree changes.

## 2. Complete persistence, discovery and settings foundation

- [ ] 2.1 Add versioned integration preference conversion, feature-scoped revision-checked updates, protected secret set/clear contracts and generated schemas; verify through existing-config migration and persistence at Gate A.
- [ ] 2.2 Implement bounded full-pack/app/manual service discovery and independent ownership profiles in mini and Boss; verify mixed managed/external discovery and no lifecycle takeover at Gate A.
- [ ] 2.3 Add UAR scoped SurrealDB auth and deterministic sidecar configuration, active-run-aware apply/restart with rollback and effective backend status; verify embedded and external scoped-auth launches at Gate A.
- [ ] 2.4 Add dedicated UAR/Compass/liter-llm/Services route, sidebar and search entries, UAR administration and complete applicable translations; verify UI configuration and persistence at Gate A.
- [ ] 2.5 Run Gate A once after complete wiring: actual migrated Boss settings/IPC, discovery, UAR conversation using embedded then remote storage, invalid credentials, active-run apply and restart; record observed results and fix failures without unit loops.

## 6. Correct registered-agent execution and remote MCP identity (after 2)

- [ ] 6.1 Unify catalog write/resolution and typed registered-agent admission across REST/chat/MCP/actor paths, preserving explicit inline compatibility and rejecting unknown explicit IDs/backend failure; demonstrate at Gate R.
- [ ] 6.2 Add artifact revision/source snapshots and continuation compatibility, and replace Boss per-turn artifact synthesis with catalog links plus conflict-aware migration; preserve policy/model/UI/skill semantics at Gate R.
- [ ] 6.3 Add RemoteHttp static header/secret-reference support and trusted-host remote destination/grant admission using existing verifier and run-owned connector; preserve sidecar incoming guards and owner isolation; demonstrate at Gate R.
- [ ] 6.4 Complete #296 credential expiry/renewal/revocation, frozen reconnect, child narrowing, cleanup and secret-free observability; document the BFF caller contract and keep returned runtime URLs accurate; demonstrate at Gate R.
- [ ] 6.5 Run Gate R once on complete Boss/UAR wiring and real remote MCP transport with two concurrent identities, catalog edit/resume, expiry/renewal/reconnect and rejected unauthorized requests; record sanitized outcomes and fix observed failures.

## 7. Complete UAR settings authority and model administration (after 6)

- [ ] 7.1 Finalize method-level API coverage and versioned admin capabilities; implement main-only typed adapters and dedicated UAR internal navigation with explicit admin and owner scopes.
- [ ] 7.2 Wire saved/effective/apply-lifecycle settings, partial errors and revision checks; provision admin/encryption authority and migrate provider secrets to protected references without overwriting API-authoritative configuration.
- [ ] 7.3 Implement Boss-linked, gateway-linked and UAR-owned provider/model assignments for inference and every enabled model-bearing consumer, with policy-bound overrides, safe credential brokerage and effective identity display.
- [ ] 7.4 Complete schema-driven runtime/security/provider/model controls, source management links, secret set/clear semantics, all locale strings and actual supported capability states; preserve existing app settings migrations.
- [ ] 7.5 Run Gate U once through actual admin IPC/REST and runtime consumers: Boss-linked, UAR-owned and existing-gateway-linked models, nonconversation model operation, restart, secret changes, live/deferred settings, conflicts/partial saves and admin/owner isolation; Gate C adds editor-to-UAR propagation after new gateway editing exists.

## 8. Complete catalog and runtime experience administration (after 7)

- [ ] 8.1 Complete agent catalog/definitions/compiler/skills UI, native format import/export, validated registration, revisions/origin/policy/model bindings and federation configuration using shared UAR services.
- [ ] 8.2 Complete persistent custom A2UI/schema/component lifecycle and presentation assignments/sharing, builtin protections and approved shared renderer packaging; expose preview and safe reference handling.
- [ ] 8.3 Complete owned runs/AG-UI/approvals/checkpoints and contextual policies, knowledge/memory/tools/protocol administration and missing list/detail APIs; reconcile actual methods/feature gates against the API coverage ledger.
- [ ] 8.4 Wire configure-agent→save→run through the real Boss runtime, stage-local recovery, retained editing context, effective agent/model/presentation display, keyboard/compact navigation and all locales.
- [ ] 8.5 Run Gate V once for the complete catalog-to-conversation workflow, actual presentation/AG-UI/knowledge operations, capability-specific administration and route coverage; record the bounded Impeccable/accessibility outcomes without per-component test loops.

## 3. Complete observable services and Compass administration

- [ ] 3.1 Add durable operation state, ordered progress events/cursor replay, redacted disk logs with paging/export, Windows process-tree cancellation and conflict-scoped scheduling; verify through completed service/index flows at Gate B.
- [ ] 3.2 Add Docker/service status and stage-local feedback, per-service managed/external composition and credential provisioning for UAR; verify mixed topology setup/start/stop/restart/failure at Gate B.
- [ ] 3.3 Persist Compass project enablement across MCP regeneration/runtime paths, adapt native Manifest/detect/BuildGuard freshness with content/config identity and explicit application-owned output, and wire project index/update/log actions; verify two-project drift/disable/update/cancel at Gate B.
- [ ] 3.4 Finish Services and Compass UI with immediate progress, terminal results/recovery, project-specific full-log viewer and all locale strings; verify long-log navigation/restart and supported window sizes at Gate B.
- [ ] 3.5 Run Gate B once after complete wiring: real Docker setup and intentional failure, external service preservation, two isolated projects, uncommitted drift, index/cancel, retained full log beyond 256 KiB; record actual outcomes.

## 4. Complete gateway administration and review roles

- [ ] 4.1 Package pinned provider and model catalogs and implement typed provider/model/connection identities, live catalog reconciliation and safe credential edits; verify selectable known/custom models at Gate C.
- [ ] 4.2 Add actual-parser nonstarting liter-llm config-check and package its native customer-platform binaries; implement WASM comment-preserving managed and selected existing-local config edits, preservation/backup/revision checks, apply status and remote deployment export; verify real gateway reload or accurately reported restart requirement at Gate C.
- [ ] 4.3 Implement critic/judge/backup assignment and canonical identity collision resolution in mini and full-pack consumers, with explicit cross-harness config export/apply; verify same-model aliases and producing-model collision at Gate C.
- [ ] 4.4 Complete liter-llm settings/provider/model/roles UI, connection diagnostics and all translations; verify complete configured gateway request flow at Gate C.
- [ ] 4.5 Run Gate C once: select existing full-pack gateway, configure a managed gateway, real inference, safe existing-file apply/conflict, remote export, fallback role dispatch, gateway-editor changes reflected in the linked UAR model and credential non-disclosure; record results.

## 5. Build, publish and installed acceptance (after 3, 4, 6, 7 and 8)

- [ ] 5.1 Refresh all app-owned mini/Compass skills and runtime dependency closure, pin rebuilt native payloads/images/catalogs and finish locale/schema generation; verify installed inventory matches committed source revisions during Gate D.
- [ ] 5.2 Reconcile completed source integration evidence, finish one bounded Impeccable visual pass, freeze shared release inputs, and prepare native jobs with disk/memory/payload preflights plus the single serialized publication coordinator. This shared preparation unblocks independent branches 5.3 and 5.4; it neither builds installers nor claims Gate D installed acceptance.
- [ ] 5.3 After 5.2, build the Windows x64 installer independently on its native runner, record checksum/size/source/signing status and upload to GitHub Releases. Immediately submit its manifest to the serialized publication coordinator to merge/commit/push RELEASES.md and release manifest, sync/deploy the site and verify bytes/live links. Then obtain operator-confirmed installed Gate D-Windows acceptance; do not wait for Mac build or acceptance.
- [ ] 5.4 After 5.2, independently build Apple Silicon DMG on its native runner and requested local pnpm build:mac:arm64 copy; record checksum/size/source/signing and upload to GitHub Releases. Immediately submit its manifest to the same serialized coordinator for repository/site merge, deployment and byte/link verification. Then run installed Gate D-Mac on the local Mac or obtain operator-confirmed equivalent. Builds do not wait for one another or lower-priority platforms; only shared metadata/site publication serializes.
- [ ] 5.5 After both platform branches, fix installed failures and republish affected artifacts/site links; reconcile parent KBD/P3 scope and release evidence. Require operator-confirmed Windows acceptance AND recorded installed Apple Silicon acceptance. Completing these implementation/delivery tasks does not close the phase: execute the separate mandatory phase-closeout checklist in plan.md. Leave unrelated future UAR phases intact.
