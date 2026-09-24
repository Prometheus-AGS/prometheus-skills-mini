## Context

See proposal.md for scope. Inspected Boss worktree at afd4deefd5, with origin/main now 8bb3171a02; integrate the latest main before production edits. UAR worktree contains unrelated pnpm-lock.yaml edits to preserve. Mini contains unrelated Compass evidence and a dirty knowledge submodule.

Observed contracts:
- Boss UarSidecarService hardcodes surrealkv:// and IntegrationSnapshot declares backend: local. UAR itself already accepts remote URLs/user/password/namespace/database, but its persistence provider signs in only with Root.
- IntegrationSettings renders operation output beneath every workspace/server row; all actions share one busy flag. Both the process runner and operation snapshot truncate output to 262144 characters. Multi-step commands replace the visible output with the current subprocess tail.
- Workspace integration state has no persisted enable override or freshness status. Compass already offers check-update and update; confirm the former can target Boss's application-owned graph before reuse.
- liter-llm providers.json describes providers, not complete model choices. schemas/catalog.json supplies provider model catalogs; /v1/models supplies configured served aliases. The fork has a file-watch config provider and --watch, but no config administration HTTP route in its inspected router.
- Integration settings currently live as JSON in app.prometheus.integrations, with OS-protected secrets in secrets.enc. The source definitions and code generator own preference schemas. Do not hand-edit generated schemas.

## Goals / Non-Goals

Deliver coherent administration through existing Preference, IPC, lifecycle, MCP and settings components. Keep existing installed data usable and keep services owned by their original installer. No general settings-framework rewrite, network-wide scanning, automatic database copying, new resident service, or unit-test loop. No claim that the full-pack-specific failure is reproduced until a configured launch establishes its actual cause.

## Decisions

### 1. Feature boundaries and upstream compatibility

Add dedicated /settings/uar, /settings/compass, /settings/liter-llm and /settings/services routes, sidebar entries and search registrations. Prometheus retains skill installation and pack diagnostics. Rust Filesystem retains its distinct controls in Services/MCP. Keep the current design tokens and @cherrystudio/ui controls.

Renderer feature pages depend on typed shared contracts and a small integration hook, never on each other. Main-process modules stay under the existing integration service boundary, with the lifecycle service coordinating operation ownership. Shared route/preference/IPC registration changes are additive and kept in separate commits from feature implementation. Preserve old Prometheus links with contextual links to moved sections. Add no global navigation or preference abstraction.

### 2. Settings and discovery contract

Version the integration document. Add uar persistence, per-service ownership/connection profiles, gateway connections/mappings/roles, and canonical workspace enable overrides. Upgrade the current unversioned JSON once, retaining existing ports, endpoint choices, critic/judge mappings, secrets and embedded UAR data. Use the existing Preference store; no new SQL table is needed just to store settings. If implementation needs a real table, change its Drizzle source and append a generated migration; never rewrite shipped migrations. Regenerate preference schemas from target-key-definitions/classification source.

Typed IPC covers discover, probe, configure, apply, operation start/cancel, event subscriptions, log paging/export and versioned snapshots. Partial feature updates carry an expected configuration revision so an open page cannot overwrite another page's saved changes. Secret patches support set/clear/unchanged, remain in main-process protected storage, and return only presence flags. Configuration errors return stable translation keys plus safe parameters.

Discovery reads the app's profiles, full-pack setup/service/config markers, known loopback endpoints, and explicitly entered endpoints. Inspect actual full-pack formats before building adapters. Use Docker inspect only to identify exposed endpoints/ownership, never scrape container environments for credentials. Deduplicate by normalized endpoint, retain provenance/version/auth requirements, and let the user choose. An embedded database owned by another process is not a shareable endpoint: offer its server endpoint or separate embedded storage, never open its files. Discovery alone never changes settings or lifecycle ownership.

Each service can be managed or external independently; an existing SurrealDB plus Boss-managed memory/gateway is valid. Explicit remote endpoints accept HTTP(S)/WS(S) as supported by the actual client. Probe success has separate listening, authenticated, compatible and operational states. Support reachable compatible instances wherever configured; report incompatible versions precisely rather than pretending every historical SurrealDB version works.

### 3. UAR administration and persistence

UAR page: runtime state/version, selected/effective storage, last startup failure, connection candidates, embedded or remote selection, endpoint/namespace/database/auth scope, masked credential editing, Check connection, Apply and restart, and runtime logs. Preserve embedded as the upgrade default; never switch an existing install merely because discovery finds a server.

Remote auth supports root, namespace and database users and explicit unauthenticated development endpoints where permitted by the server. Extend UAR's existing persistence config with an additive auth-scope field, retaining root behavior for standalone existing configs. Managed provisioning creates a dedicated UAR namespace/database and scoped account; never share memory/Compass tables or credentials. Use the existing SurrealDB instance, not a new container.

Resolve the effective config centrally and pass it into the sidecar launch. Remove inherited UAR persistence overrides before applying the selected profile; inspect and clear any legacy database env/config overrides that outrank the intended profile. Keep the sidecar's existing host auth, local bind, scoped model/MCP grants and disabled internal memory rules. Explicit remote failure stays failed; do not silently launch embedded with different state. Storage changes do not migrate data: show the existing source and target and preserve both. Boss-owned conversation history remains in Boss; changing UAR stores may start with empty runtime-specific state and is disclosed before Apply.

Applying a storage profile must validate it, wait for active runs to finish (or require an explicit cancel-and-apply action), stop the old process, start the candidate, and publish the active revision only after readiness and a real persistence operation. On failure restore the previous profile/process and retain the actionable failure. Do not log credentials in env dumps, errors or connection URLs.

### 4. Operations and service feedback

Use the existing operation lifecycle with durable metadata and redacted log files in application paths. Define queued/running/succeeded/failed/cancelled/interrupted status, stage, target, timestamps, exit/error code, recovery action and cursor. IPC starts immediately and returns an operation ID; main emits ordered progress events. A snapshot plus cursor replay handles route remounts and missed events. Preserve a bounded in-memory tail and page/export the entire retained log. Do not persist raw secret-bearing chunks; streaming redaction must handle tokens split across chunks before disk or events. Keep completed logs for 30 days, disclose retention, and do not silently truncate a running log.

Place current operation and terminal result directly beside the initiating controls. Show named stages (detecting, preparing configuration, pulling, starting database, authenticating, starting services), elapsed time, live tail, cancel, and View full log/Copy/Save. Use real progress where available; otherwise a named indeterminate stage, never invented percentages. Surface success/failure after completion, and actionable retry/open-settings controls. A toast can supplement but cannot replace persistent inline results. Screen readers announce stage/terminal changes, not every log line; full logs remain selectable and keyboard accessible.

Serialize only conflicting targets: the same Compose project, the same workspace graph and the same UAR process. Unrelated configuration/read actions remain available. Cancellation terminates the child process tree on Windows as well as macOS/Linux, waits for exit and refreshes observed service state; cancellation does not imply already-started containers were undone. A crash leaves an interrupted operation receipt, never a falsely running task. Reuse Compose progress output and --wait health state, then application probes distinguish startup from actual service function. External service rows offer check/configure/log links where available, not lifecycle ownership.

### 5. Compass project administration

Compass page has global enablement/storage/PATH/version controls and a searchable project list with explicit per-project enablement, effective backend, last successful index, freshness and latest operation. Select a project for its paths, server state, Index/Update, Check drift, cancel and full logs. Persist enablement separately from the MCP connection's ephemeral state; it must survive restart and server-definition regeneration across every runtime path. Disabling does not delete graph/data or change Rust Filesystem access. Indexing an explicitly selected disabled project is allowed without enabling it for conversations.

Use Compass's semantic freshness implementation, including uncommitted/untracked/deleted included sources and configuration changes. First inspect check-update's output/location contract; if it assumes project-local output or lacks structured results, add the smallest additive --out/JSON interface in Compass using the existing freshness engine. Never infer freshness just from Git HEAD. Track unknown/checking/current/stale/not-indexed/error; run checks on selection and explicit refresh, not a new always-running daemon. Update uses the existing local extraction and remote projection path. Preserve the last complete graph on cancellation/failure, and reconnect only the affected workspace when publication succeeds. Distinguish graph updates from bundled binary updates; show version mismatch and repair from the pinned app payload, not an unpinned compass upgrade.

### 6. liter-llm administration

Fetch and merge xberg-io/liter-llm (GitHub reports this as the fork parent) into GQAdonis/liter-llm on a dedicated branch, inspect existing fork patches, preserve them, and record both upstream and merged SHAs. Pin the merged fork in mini and affected pack/build inputs under the user's explicit update authorization. Bundle providers.json AND catalog.json from that revision with their hashes; join on validated provider identities and exclude unsupported catalog-only providers. Live served models augment the bundled catalog; do not fabricate model IDs or prefix conventions.

Page sections: selected installation and ownership, connection/auth status, provider connections, configured models/aliases, critic/judge/backup roles, and diagnostics/activity. Searchable provider and dependent model selectors show friendly labels, capabilities and configured availability. Store provider/model/connection identity separately and let the verified liter-llm adapter construct provider_model. Keep existing custom IDs and allow an explicitly labeled custom-model option; users choosing known models never type compound routing strings. Support per-connection credentials, endpoint overrides, timeouts and model fallbacks. Distinguish gateway access credentials from upstream provider credentials.

Managed configuration is written atomically with a last-known-good backup, validated using liter-llm's actual parser, then applied with supported watch/restart semantics. Existing local installations use an explicitly selected config file: preserve unrelated TOML sections/comments and ${ENV} references, use revision/hash checking, show a non-secret change preview, and apply with a backup. New secrets must go into protected main storage and a private file configuration usable by the existing process; do not assume it inherits Boss's environment. Externally owned process restart remains the owner's action unless explicitly adopted in the UI. A remote endpoint without a supported config-write API remains usable; the UI provides a complete validated config export and states that deployment is required. Do not invent a remote admin API or falsely report local edits as applied remotely.

Keep mini's app-scoped gateway/role configuration in sync after successful apply. For other harnesses offer an explicit export/apply to the existing full-pack role file, with merge/backup and no native mini installation. Compare canonical resolved model identities, not aliases: choose configured judge, then backup if it equals critic or the current producer; if no distinct model is available report degraded/pending review, never claim independence. Implement this policy in mini and the full-pack resolver consumers used by exported role configuration, including artifact-refiner if it consumes those roles.

### 7. Internationalization and acceptance

All navigation, search labels, field labels/help, empty/loading/conflict/status/error/recovery strings use locale keys in the correct main/renderer catalogs. Add English source, run the existing sync, then translate every existing locale without placeholders. Raw executable output remains source-language diagnostic text; app-authored stages and errors are translated. Formatting accommodates long labels, plural forms and interpolation.

Complete production wiring before each meaningful integration boundary. Gate A: settings migration, service discovery and UAR embedded/remote launch through actual IPC/UI with scoped auth, failure and restart behavior. Gate B: Docker actions and two Compass projects through real subprocesses, drift, disable, cancel and full-log retrieval beyond 256 KiB. Gate C: provider/model selection and managed/existing gateway config apply, real configured request, alias collision fallback and secret non-disclosure. Gate D: one completed app build/installed walkthrough covering all pages, locale keys, restart persistence and two workspaces. No unit/partial-code test suites. Existing process infrastructure should power diagnostics rather than introducing a parallel test-only implementation.

## Risks / Trade-offs

- External config editing can affect other harnesses → explicit file selection/apply, visible affected installation, version conflict detection, backup and preserve unknown fields; never claim an unapplied draft is live.
- Changing storage splits runtime-specific data → no automatic migration, preserve source, label target state, restore old profile on failed launch.
- Gateway catalog differs from live capabilities → package provenance and reconcile against configured/live models; retain custom mappings.
- Multiple upstream moves during implementation → freeze baseline per coherent change, additive feature registrations, regenerate conflicting unshipped migrations instead of renumbering, keep generated outputs in their own commit.
- Full logs can grow large → disk-backed paging/retention and clear storage errors; bounded renderer memory, no silent loss of the full operation log.

## Migration Plan

1. Commit this plan and independent review receipt. Activate the child with the change/tasks using canonical KBD commands. Record the parent P3 remote-administration work pulled forward; do not mark parent Windows acceptance complete.
2. Integrate current Boss main and fork upstreams without overwriting unrelated files. Inventory the actual current schema/config/CLI contracts before edits.
3. Implement A, B and C as coherent sets with user-demonstrable boundaries. Update app-owned skill/runtime payloads and pins without shadowing a full pack.
4. Build real Windows x64 installer first, then Apple Silicon (including the requested local copy); publish each completed customer platform directly to GitHub Releases, update RELEASES.md/manifests and the live website immediately. Other platform completion cannot block these.
5. Keep the previous release available and preserve data/config backups. Keep the goal open until successful installed-Windows acceptance; fix reported failures and republish.


## 1. Freeze reviewed architecture and baselines

- [ ] 1.1 Record independent plan findings, UX evidence, cross-repo ownership and canonical child/change registration; completion evidence is the checked-in reviewed plan and current waypoint.
- [ ] 1.2 Integrate latest Boss main, inspect fork patches, merge liter-llm upstream into its fork, and freeze catalog/source revisions; verify by recorded Git ancestry and catalog provenance, preserving unrelated worktree changes.

## 2. Complete persistence, discovery and settings foundation

- [ ] 2.1 Add versioned integration preference conversion, feature-scoped revision-checked updates, protected secret set/clear contracts and generated schemas; verify through existing-config migration and persistence at Gate A.
- [ ] 2.2 Implement bounded full-pack/app/manual service discovery and independent ownership profiles in mini and Boss; verify mixed managed/external discovery and no lifecycle takeover at Gate A.
- [ ] 2.3 Add UAR scoped SurrealDB auth and deterministic sidecar configuration, active-run-aware apply/restart with rollback and effective backend status; verify embedded and external scoped-auth launches at Gate A.
- [ ] 2.4 Add dedicated UAR/Compass/liter-llm/Services route, sidebar and search entries, UAR administration and complete applicable translations; verify UI configuration and persistence at Gate A.
- [ ] 2.5 Run Gate A once after complete wiring: actual migrated Boss settings/IPC, discovery, UAR conversation using embedded then remote storage, invalid credentials, active-run apply and restart; record observed results and fix failures without unit loops.

## 3. Complete observable services and Compass administration

- [ ] 3.1 Add durable operation state, ordered progress events/cursor replay, redacted disk logs with paging/export, Windows process-tree cancellation and conflict-scoped scheduling; verify through completed service/index flows at Gate B.
- [ ] 3.2 Add Docker/service status and stage-local feedback, per-service managed/external composition and credential provisioning for UAR; verify mixed topology setup/start/stop/restart/failure at Gate B.
- [ ] 3.3 Persist Compass project enablement across MCP regeneration/runtime paths, reuse or minimally extend native freshness CLI for application-owned output, and wire project index/update/log actions; verify two-project drift/disable/update/cancel at Gate B.
- [ ] 3.4 Finish Services and Compass UI with immediate progress, terminal results/recovery, project-specific full-log viewer and all locale strings; verify long-log navigation/restart and supported window sizes at Gate B.
- [ ] 3.5 Run Gate B once after complete wiring: real Docker setup and intentional failure, external service preservation, two isolated projects, uncommitted drift, index/cancel, retained full log beyond 256 KiB; record actual outcomes.

## 4. Complete gateway administration and review roles

- [ ] 4.1 Package pinned provider and model catalogs and implement typed provider/model/connection identities, live catalog reconciliation and safe credential edits; verify selectable known/custom models at Gate C.
- [ ] 4.2 Implement parser-backed managed and selected existing-local config edits, preservation/backup/revision checks, apply status and remote deployment export; verify real gateway reload or accurately reported restart requirement at Gate C.
- [ ] 4.3 Implement critic/judge/backup assignment and canonical identity collision resolution in mini and full-pack consumers, with explicit cross-harness config export/apply; verify same-model aliases and producing-model collision at Gate C.
- [ ] 4.4 Complete liter-llm settings/provider/model/roles UI, connection diagnostics and all translations; verify complete configured gateway request flow at Gate C.
- [ ] 4.5 Run Gate C once: select existing full-pack gateway, configure a managed gateway, real inference, safe existing-file apply/conflict, remote export, fallback role dispatch and credential non-disclosure; record results.

## 5. Build, publish and installed acceptance

- [ ] 5.1 Refresh all app-owned mini/Compass skills and runtime dependency closure, pin rebuilt native payloads/images/catalogs and finish locale/schema generation; verify installed inventory matches committed source revisions during Gate D.
- [ ] 5.2 Run the completed app integration gate and one bounded Impeccable visual pass, then build actual Windows x64 installer; verify installer artifact metadata and record signed/unsigned status accurately.
- [ ] 5.3 Publish Windows x64 to GitHub Releases and immediately update RELEASES.md, release manifest and live landing-site download URLs; verify the published artifact and live link and request installed acceptance.
- [ ] 5.4 Build Apple Silicon including local pnpm build:mac:arm64 copy and publish/update repository and website immediately; verify actual DMG artifact and current link without blocking Windows delivery.
- [ ] 5.5 Fix reported installed failures, republish as needed, and reconcile parent KBD/P3 work and release evidence; completion requires operator-confirmed Windows acceptance and leaves unrelated future UAR phases intact.
