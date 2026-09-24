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
