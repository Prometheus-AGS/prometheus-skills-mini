## Purpose

Defines a safe desktop release profile that makes an unavailable Universal Agent Runtime unreachable while preserving all non-UAR product behavior and stored-data compatibility.

## ADDED Requirements

### Requirement: UAR capability is immutable per build
The application SHALL resolve UAR availability from one immutable build capability shared by every application process and packaging script. The `2.2.1` customer release SHALL set that capability to disabled.

#### Scenario: Disabled release starts normally
- **WHEN** a customer launches a `2.2.1` installer build
- **THEN** the application starts without attempting to locate, extract, probe, or launch a UAR sidecar

### Requirement: Disabled UAR has no reachable product entry point
When UAR is disabled, the application SHALL omit UAR from runtime choices, agent creation, settings navigation, search results, administration, integration actions, credential provisioning, and operation history. A direct UAR settings route or programmatic UAR action SHALL produce a stable disabled response without starting a process.

#### Scenario: Customer browses settings
- **WHEN** UAR is disabled and the customer opens or searches settings
- **THEN** no UAR navigation item, administration surface, or UAR action is offered

#### Scenario: Stale direct link is opened
- **WHEN** UAR is disabled and a stored or external link opens the UAR settings route
- **THEN** the application redirects to an available settings surface and does not launch the sidecar

#### Scenario: Programmatic UAR action is attempted
- **WHEN** UAR is disabled and an IPC or service caller requests a UAR start, restart, configuration, administration, or agent-creation action
- **THEN** the application returns an explicit feature-disabled result and starts no UAR process

### Requirement: Existing UAR records remain readable
The disabled release SHALL preserve UAR enum and persistence compatibility so existing UAR agent records can be loaded without corrupting or deleting them. Those records SHALL remain unavailable for new execution until a later UAR-enabled release.

#### Scenario: Existing profile contains UAR agents
- **WHEN** the disabled release loads a database containing UAR agent records
- **THEN** loading succeeds, records remain intact, and the application does not offer those agents for execution

### Requirement: Non-UAR application behavior remains available
Disabling UAR SHALL NOT disable Compass, Rust Filesystem MCP, Prometheus CLI, `pk`, packaged skills, Docker service administration, SurrealDB, surreal-memory-server, or liter-llm service configuration.

#### Scenario: Customer uses supported integrations
- **WHEN** the customer installs the disabled release
- **THEN** every packaged non-UAR integration remains available through its existing product surface

### Requirement: UAR payload is absent
Every disabled-profile installer SHALL omit the complete platform-specific UAR artifact inventory, including the executable, version marker, models, dynamic libraries, license, and payload manifest. Package validation SHALL fail if any declared UAR file is present.

#### Scenario: Stale UAR files exist in the build cache
- **WHEN** packaging runs with stale downloaded UAR files present
- **THEN** the produced application excludes every file declared by the pinned UAR artifact inventory

#### Scenario: Installer image is inspected
- **WHEN** the final package validator inspects a disabled-profile application image
- **THEN** it confirms the core application payload is present and every declared UAR file is absent

### Requirement: liter-llm remains a service integration
The disabled profile SHALL retain liter-llm managed and external service administration without requiring a nonexistent native desktop executable.

#### Scenario: Packaging validates native tools
- **WHEN** packaging selects required native desktop tools
- **THEN** it requires Compass, Rust Filesystem MCP, Prometheus CLI, `pk`, and Node while treating liter-llm through its existing service and catalog integration

### Requirement: First-run provider setup has one clear action
The first-run provider screen SHALL omit the CherryIN-specific connection action and SHALL present one provider setup action labeled **Set up LLM Providers**, translated through every supported locale.

#### Scenario: New customer reaches provider setup
- **WHEN** the first-run provider screen is displayed
- **THEN** it shows no **Connect CherryIN** button and the remaining setup button reads **Set up LLM Providers** in the active locale
