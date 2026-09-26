## Purpose

Defines the durable evidence needed to close the release child and resume the parent UAR integration work without losing release provenance.

## ADDED Requirements

### Requirement: Release completion produces one structured receipt
The release child SHALL write one receipt binding the frozen source commit and tag to the disabled-UAR profile, four installer assets, native workflow run, local Apple Silicon result, release metadata commits, landing-site commit, deployment URL, and live-link checks.

#### Scenario: Child phase prepares to exit
- **WHEN** all release and site publication work is complete
- **THEN** the receipt contains every required identity and evidence field and points only to published artifacts from the frozen source commit

### Requirement: Parent restoration is explicit
After the receipt exists, KBD SHALL restore `integration-administration` at task `4.5` through typed phase transitions and a child handoff. Generated waypoint files SHALL NOT be edited directly.

#### Scenario: Release child completes
- **WHEN** the child handoff cites the valid release receipt
- **THEN** canonical KBD state returns to `integration-administration` task `4.5`

### Requirement: UAR repair follows the customer release
The dedicated UAR sidecar investigation and repair SHALL begin only after the non-UAR customer release receipt is complete and the parent position is restored.

#### Scenario: Release evidence is incomplete
- **WHEN** any required artifact, website link, or receipt field is missing
- **THEN** the release child remains active and UAR repair is not reported as the next canonical work
