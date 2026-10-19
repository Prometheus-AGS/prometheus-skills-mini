# Spec Delta

## ADDED Requirements

### Requirement: Release 2.2.40 discloses its UAR qualification gap
The Boss 2.2.40 customer installers SHALL enable UAR and include platform-matched sidecar payloads from one scoped UAR 1.1.1 revision using the approved liter-llm 2.3.0 fork. Release evidence SHALL state that UAR behavioral qualification remains NOT READY under the operator's explicit distribution exception.

#### Scenario: Customer launches the release
- **WHEN** a customer launches the Mac ARM64 or Windows x64 2.2.40 installer
- **THEN** the corresponding UAR 1.1.1 sidecar and frozen mini skill pack are packaged, while runtime behavior remains unqualified

#### Scenario: UAR qualification remains incomplete
- **WHEN** the selected UAR candidate lacks mandatory release acceptance
- **THEN** the release records disclose the gap and do not describe the sidecar as qualified
