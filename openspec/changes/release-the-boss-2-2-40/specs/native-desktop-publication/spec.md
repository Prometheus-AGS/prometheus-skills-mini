# Spec Delta

## ADDED Requirements

### Requirement: Release 2.2.40 publishes two native targets
The Boss 2.2.40 UAR-enabled release SHALL publish Mac ARM64 and Windows x64 installers from one frozen application source and matching immutable dependency records. Publication SHALL preserve The Boss custom behavior after upstream integration.

#### Scenario: Native target selection
- **WHEN** the 2.2.40 UAR-enabled release is dispatched
- **THEN** only `darwin-arm64` and `win32-x64` installers are selected

#### Scenario: Mismatched source or payload
- **WHEN** a platform artifact names a different source, version, profile, or dependency revision
- **THEN** aggregation refuses it

#### Scenario: Upstream merge conflict
- **WHEN** upstream and The Boss change the same behavior
- **THEN** the merged source retains The Boss's custom product and release behavior while incorporating compatible upstream changes
