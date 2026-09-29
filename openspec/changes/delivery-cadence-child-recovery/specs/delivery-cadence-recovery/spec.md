# Delivery Cadence recovery
## ADDED Requirements
### Requirement: Canonical child continuity
The cadence SHALL attach nested child work to one parent delivery without resetting time, changing KBD authority, or counting child exit as delivery.
#### Scenario: Nested recovery
- **WHEN** a parent enters a child and nested child and later returns with canonical completion and criteria evidence
- **THEN** parent scope and clock are preserved, completions deduplicate, and changed release inputs require fresh build/run receipts.
#### Scenario: Unresolved child
- **WHEN** a child fails, exits without evidence, or an architecture approval remains unknown
- **THEN** successful parent readiness/delivery remains blocked and resume exposes recovery instructions.
### Requirement: Trustworthy measurements
The cadence SHALL distinguish elapsed, observed, unattributed, child and wait time, gross/reopened/net completion, and separate tasks/changes/phases.
#### Scenario: Incomplete evidence
- **WHEN** timestamps or comparable sample coverage are missing
- **THEN** missing values remain unknown and automatic tuning does not consume that sample.
### Requirement: Complete delivery evidence
The cadence SHALL require frozen-source build, launch and feature-specific operation evidence for new deliveries and preserve publication obligations across corrective work.
#### Scenario: Baseline only
- **WHEN** onboarding succeeds but the selected new feature has not been operated
- **THEN** the iteration cannot successfully finalize.
### Requirement: Compatible distribution and learning
The cadence SHALL migrate without rewriting historical events, provide identical portable shared payloads and emit a finalized learning report through optional configured recording.
#### Scenario: Optional recorder absent
- **WHEN** learning delivery is unavailable
- **THEN** the local report remains durable and recorder status is degraded without blocking implementation delivery.
