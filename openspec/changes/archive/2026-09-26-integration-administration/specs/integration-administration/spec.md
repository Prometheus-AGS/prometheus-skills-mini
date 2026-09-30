## Purpose

Let operators administer The Boss runtime, code intelligence and supporting services with explicit ownership, persistent configuration and visible operation outcomes.

## ADDED Requirements

### Requirement: Dedicated administration navigation
The application SHALL provide dedicated UAR, Compass, liter-llm and Services settings destinations, integrated with navigation and search, and SHALL translate all application-authored controls and states in every supported locale.

#### Scenario: Navigate directly to runtime administration
- **WHEN** an operator selects UAR in settings navigation
- **THEN** runtime state, storage configuration, connection actions and runtime logs are available without scrolling through unrelated Compass or Docker settings.

### Requirement: Preserve settings across upgrades and pages
The application SHALL migrate existing integration preferences without discarding user data or secrets, prevent stale cross-page saves, and retain settings after restart.

#### Scenario: Upgrade an existing configuration
- **WHEN** an existing installation opens the new settings
- **THEN** its embedded UAR data, ports, endpoints, credentials and model mappings remain selected and usable, and subsequent saves preserve unrelated settings.

### Requirement: Discover and select external services
The application SHALL discover known full-pack and application service endpoints, accept manually configured endpoints, show ownership and compatibility, and keep external lifecycle ownership unchanged on selection.

#### Scenario: Full pack already installed
- **WHEN** the operator selects the full pack's compatible SurrealDB and liter-llm endpoints
- **THEN** The Boss connects to those instances without starting conflicting containers, opening another process's embedded database files, or overwriting the full pack's skills.

### Requirement: Configurable UAR persistence
UAR SHALL support retained embedded storage and selected remote SurrealDB with explicit authentication scope, namespace and database. Remote failure SHALL remain visible without silently changing stores. Applying changes SHALL preserve the prior profile and data and report active-run constraints.

#### Scenario: Namespace user on existing server
- **WHEN** a namespace-scoped account with access to the selected database is configured and applied
- **THEN** UAR starts using that database and reports the effective backend after a successful persistence operation.

#### Scenario: Remote credentials fail
- **WHEN** the selected remote connection cannot authenticate
- **THEN** the application shows a recoverable authentication error, does not claim operational status, and preserves the previous configuration and database.

### Requirement: Observable durable operations
Every service and indexing action SHALL expose immediate local progress, cancellation when applicable, a durable terminal outcome, actionable failure guidance, and the full retained redacted log. Navigation SHALL not lose the operation.

#### Scenario: Long pull with failure
- **WHEN** pulling service images emits more than 256 KiB of output and fails
- **THEN** the initiating service view shows failure and retry guidance and the complete log is available for paging/export after navigation and restart, without credentials.

#### Scenario: Cancel in progress
- **WHEN** the operator cancels a running index or service operation
- **THEN** the child process tree stops, the operation reports cancellation, and the UI reports the actual remaining service/graph state rather than claiming rollback.

### Requirement: Independent service ownership
The application SHALL allow each supporting service to use a managed or external instance independently and SHALL manage only application-owned processes or Compose services.

#### Scenario: Mixed stack
- **WHEN** SurrealDB is external and the gateway and memory service are managed
- **THEN** start and stop affect only managed services and they connect to the selected database using the configured credentials.

### Requirement: Compass project control and freshness
Compass administration SHALL persist project enablement, distinguish graph freshness from MCP connectivity, expose indexing/update actions, and retain the last complete graph after unsuccessful updates.

#### Scenario: Two workspaces and a disabled project
- **WHEN** two workspaces are configured, one project is disabled, and an included source in the other is changed without a commit
- **THEN** the disabled project's Compass remains unavailable to conversations after restart, Rust Filesystem policy remains independent, and the changed project reports stale and can be updated with streaming and complete final logs.

### Requirement: Gateway provider and model administration
liter-llm settings SHALL offer searchable providers and matching models from the packaged fork catalogs and selected gateway, preserve custom models, configure connections and aliases, and distinguish drafted, saved and applied configuration.

#### Scenario: Configure a known model
- **WHEN** the operator chooses a known provider and one of its models
- **THEN** valid routing identifiers and relevant endpoint defaults are generated without requiring compound strings, credentials stay protected, and a real request can establish operational status.

#### Scenario: Existing local gateway configuration
- **WHEN** the operator explicitly applies edits to a discovered local configuration
- **THEN** unrelated configuration and environment references are preserved, concurrent changes are detected, a backup exists, and the UI reports whether the existing gateway has loaded the change or needs an owner restart.

#### Scenario: Remote gateway without configuration administration
- **WHEN** the chosen endpoint supports inference but no configuration write API
- **THEN** it remains usable, the complete edited configuration can be exported for deployment, and the UI does not falsely report that the remote service has applied it.

### Requirement: Independent review roles
The application SHALL configure critic, judge and one backup model, propagate them to the selected app or explicitly selected full-pack context, and resolve collisions by canonical model identity.

#### Scenario: Aliases identify the same model
- **WHEN** judge and critic aliases resolve to the same model, or judge matches the producing harness model
- **THEN** the distinct configured backup is used; if none is distinct and available, the review reports degraded or pending rather than claiming independence.

### Requirement: Release complete integration behavior
Delivery SHALL use meaningful completed integration boundaries and actual native installer builds, retain previous installers, and publish completed Windows x64 and Apple Silicon releases directly through GitHub and the website. Both platforms SHALL be essential completion targets, built on independent native jobs and published as each becomes available.

#### Scenario: Windows installed acceptance pending
- **WHEN** installers are published but the operator has not confirmed installed Windows behavior
- **THEN** the delivery goal remains open and the release record distinguishes build/publication evidence from installed acceptance.

#### Scenario: Apple Silicon installed acceptance pending
- **WHEN** both installers are published but no successful installed Apple Silicon walkthrough or operator confirmation is recorded
- **THEN** the delivery goal remains open even if Windows acceptance has passed.

### Requirement: Complete phase lifecycle
The phase SHALL complete assess, analyze, plan, execute and reflect in order without skips. Implementation completion SHALL remain distinct from certification, archive, publication, installed acceptance and phase closure.

#### Scenario: Implementation complete but reflection pending
- **WHEN** implementation and both installed platform acceptances are complete
- **THEN** final certification and OpenSpec verification/archive precede reflection, and phase/goal closure remains pending until reflection, parent handoff and canonical closeout are recorded.

### Requirement: Registered agents control actual execution
The Boss and UAR SHALL execute the explicitly selected registered agent with its full effective policies, skills, schemas, model fallbacks, retrieval and presentation configuration. Explicit unknown IDs or failed catalog reads SHALL produce actionable failures without silently running a different agent. Native inline definitions SHALL remain an explicit compatibility mode.

#### Scenario: Select a nondefault catalog agent
- **WHEN** the operator configures a catalog agent and selects it for a Boss conversation
- **THEN** the runtime reports and executes that definition's resolved revision and policies, with only authorized host overrides, instead of a simplified replacement artifact.

#### Scenario: Existing Boss agent conflicts with catalog edits
- **WHEN** a previously linked Boss agent and its catalog entry have both changed
- **THEN** the application exposes the conflict and offers an explicit resolution without overwriting either definition silently.

### Requirement: Agent revisions survive continuation
Runs and checkpoints SHALL retain non-secret definition provenance and a resolved artifact snapshot. Resume SHALL retain that definition and reauthorize ephemeral resources; new runs SHALL use the selected current revision. Catalog updates/deletion SHALL not erase prior run provenance.

#### Scenario: Catalog edited during a run
- **WHEN** the registered agent changes while a run is awaiting input
- **THEN** resume uses the original snapshot, a new run uses the new selected revision, and both identities are inspectable.

#### Scenario: Legacy run lacks a provable snapshot
- **WHEN** identical continuation cannot be established from an older record
- **THEN** the application reports the limitation and requires an explicit new run rather than silently substituting current catalog contents.

### Requirement: Remote MCP receives verified run identity
UAR SHALL support static remote HTTP header configuration and authenticated host-supplied run grants for administrator-authorized remote MCP destinations. Every outbound request in a run's MCP session SHALL carry its approved downstream identity, including discovery and reconnect. User/tenant identity SHALL derive from verified authority, not model arguments. Ordinary callers SHALL not choose arbitrary outbound destinations or impersonate another tenant. UAR API/launch credentials SHALL not be forwarded as downstream credentials.

#### Scenario: Concurrent tenants use the same agent and MCP server
- **WHEN** two authenticated principals concurrently execute one registered agent against the same remote MCP endpoint
- **THEN** downstream authorization sees their distinct authorized identities on every request and neither run can reuse the other's credentials or session.

#### Scenario: Model supplies another tenant
- **WHEN** a tool argument names a tenant beyond the run's verified authority
- **THEN** the argument cannot change the downstream identity or widen permitted data access.

### Requirement: Remote MCP credential lifecycle preserves authority
Credential expiration, renewal, revocation, reconnect, cancellation and continuation SHALL retain run ownership and permitted scope. Renewal SHALL establish a fresh binding at a safe boundary; uncertain mutating calls SHALL not replay automatically. Secret material SHALL not appear in ordinary preferences, logs, events, artifacts or checkpoints. Existing configured servers without headers SHALL remain compatible.

#### Scenario: Credential expires and is renewed
- **WHEN** a downstream credential expires and the authenticated authorized host supplies a renewed same-owner grant
- **THEN** new calls stop until the grant is accepted, the old binding is invalidated, the new session retains the same tenant and no uncertain mutation is replayed.

#### Scenario: Missing or unauthorized renewal
- **WHEN** no valid renewal exists or it changes the owner/destination beyond the original grant
- **THEN** the runtime reports authentication required without falling back to another user's or a global credential.

### Requirement: UAR has a complete internal administration workspace
The Boss SHALL provide UAR-specific navigation and functional administration for every available REST route family, with typed actions and explicit supported, host-controlled, unavailable or retired status. Transport endpoints SHALL support their workflows instead of requiring one settings page per path. Missing APIs essential to requested catalog/run administration SHALL be implemented. Admin authority SHALL remain separate from session identity.

#### Scenario: Navigate available administration
- **WHEN** the operator opens UAR administration
- **THEN** runtime/models/settings, agents/compiler/skills, presentations/runs/knowledge, and tools/security/protocols/diagnostics are discoverable, searchable and linked to actual supported operations.

#### Scenario: Feature unavailable in sidecar
- **WHEN** a setting belongs to a disabled feature or host-owned subsystem
- **THEN** its availability and reason are visible with the supported host action where applicable, and no inert successful save is offered.

### Requirement: UAR models support explicit ownership and all consumers
Operators SHALL select Boss-linked, gateway-linked or UAR-owned provider/model configurations per assignment, including implemented nonconversation consumers. UI SHALL provide provider/model choices and effective source identity, retain independent configurations, and keep overrides bounded by agent policy.

#### Scenario: Mixed model sources
- **WHEN** an agent uses a Boss-linked inference model while a knowledge base uses a UAR-owned embedding model and another assignment uses a gateway alias
- **THEN** each consumer uses its selected source and authorized credential, persists across restart and remains independently configurable.

### Requirement: Saved settings accurately report application
Mutable UAR settings SHALL report validation, source and saved/effective state with live, next-turn, restart or host-controlled application semantics. Partial failures SHALL remain field-specific. Existing API configuration SHALL not be overwritten by initial seed data on restart. Persistent secrets SHALL use protected references and explicit set/clear/unchanged semantics.

#### Scenario: Partial save and pending restart
- **WHEN** some fields save while another fails and a saved field requires restart
- **THEN** the UI retains the rejected draft, identifies failures, shows which values are effective, and offers the needed restart without claiming all fields applied.

### Requirement: Agent formats and presentation catalogs remain distinct
Administration SHALL support native agent JSON, UAR-AGENT-MD compilation and supported signed artifacts through one catalog policy; A2A cards and project instructions SHALL retain their distinct roles. Custom A2UI/presentation catalogs SHALL persist with revision and reference integrity, approved renderable components and explicit sharing scope. Builtin entries SHALL expose supported edits or duplication without false mutability.

#### Scenario: Compile and register then assign a presentation
- **WHEN** an operator validates and registers a native agent definition and assigns an authorized custom presentation
- **THEN** validation and registration outcomes are distinct, the stored agent is selectable, and its permitted presentation renders through approved components in a real conversation.

### Requirement: Configure and run is one recoverable administration flow
Operators SHALL configure a catalog agent's model, skills and presentation, save it and run it in a selected conversation/workspace while retaining editing context. Resolved identity SHALL be visible before admission. Runs SHALL expose effective configuration, AG-UI replay/reconnect, approvals, cancellation and authorized continuation. Compact layouts, keyboard focus, dirty-form recovery and application-authored translations SHALL cover the entire flow.

#### Scenario: Stream interrupted after a successful save
- **WHEN** the operator starts the configured agent and its stream disconnects
- **THEN** the UI distinguishes the successful save from the connection failure, reconnects to the same run, preserves pinned definition/approval state, and does not start a duplicate run silently.

### Requirement: Publish completed customer platforms without metadata races
Windows x64 and Apple Silicon builds SHALL proceed independently after shared preparation. Completed platform manifests SHALL pass through serialized repository/site publication that preserves other platform records and their true versions. Installed acceptance SHALL occur after the corresponding installer exists. Downloads SHALL use verified GitHub Release URLs without IPFS fallback.

#### Scenario: Both builds complete together
- **WHEN** both native customer installers become available at nearly the same time
- **THEN** each publication merges against current release/site state, both exact artifacts remain advertised, and byte checksums and per-platform installed acceptances are recorded separately.

### Requirement: Operator reviews the expanded plan before execution
This revision SHALL complete assessment, analysis and plan review and present the revised plan to the operator before production implementation or execution-model handoff.

#### Scenario: Revised plan written but approval pending
- **WHEN** planning and independent review are complete but operator execution approval has not arrived
- **THEN** the phase retains its execution hold and no implementation task is reported complete.
