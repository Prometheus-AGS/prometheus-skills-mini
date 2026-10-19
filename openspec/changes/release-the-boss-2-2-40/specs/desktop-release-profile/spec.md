# Spec Delta

## ADDED Requirements

### Requirement: Release 2.2.40 uses qualified UAR
The Boss 2.2.40 customer installers SHALL enable UAR and include platform-matched sidecar payloads from one qualified UAR 1.1.1 revision using the approved liter-llm 2.3.0 fork.

#### Scenario: Customer launches the release
- **WHEN** a customer launches the Mac ARM64 or Windows x64 2.2.40 installer
- **THEN** UAR starts with the corresponding qualified sidecar and the packaged mini skill pack is the frozen current revision

#### Scenario: UAR qualification fails
- **WHEN** the selected UAR candidate does not pass its mandatory release acceptance
- **THEN** no 2.2.40 UAR-enabled installer is published
