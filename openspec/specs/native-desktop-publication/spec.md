# native-desktop-publication Specification

## Purpose
Defines a reproducible native publication contract for customer-ready Windows and macOS installers built from one frozen source revision.

## Requirements

### Requirement: Release has exactly four native targets
Release `2.2.1` SHALL publish Windows x64, Windows ARM64, macOS Apple Silicon, and macOS Intel installers. Linux SHALL NOT be part of this release or delay its publication.

#### Scenario: Release target matrix is resolved
- **WHEN** the UAR-disabled release profile selects native targets
- **THEN** it selects exactly `win32-x64`, `win32-arm64`, `darwin-arm64`, and `darwin-x64`

### Requirement: All artifacts bind to one frozen source
Every installer and aggregate manifest SHALL identify the same release version, tag, source commit, workflow source, and disabled-UAR profile. An artifact from another commit, version, or profile SHALL be rejected from aggregation.

#### Scenario: Prior-run artifact is considered
- **WHEN** release aggregation sees an installer manifest from a different source commit or feature profile
- **THEN** aggregation rejects that installer rather than combining it with the release

### Requirement: Native installers carry auditable metadata
Each published installer SHALL record its platform, architecture, byte size, SHA-256 checksum, source commit, download URL, and actual signing and notarization state. Missing signing credentials SHALL be reported truthfully and SHALL NOT be represented as signed.

#### Scenario: Customer inspects release metadata
- **WHEN** a published installer is listed in release metadata
- **THEN** the metadata is sufficient to verify downloaded bytes against the installer built by the native job

### Requirement: Apple Silicon is built and inspected locally
Before publication completes, the release SHALL run `pnpm build:mac:arm64` in the clean release worktree and inspect the resulting mounted or unpacked application image using the same disabled-profile package contract.

#### Scenario: Local Apple Silicon package is valid
- **WHEN** the local Apple Silicon build completes
- **THEN** the packaged application launches or passes the installed-image probe, contains the required non-UAR payload, and contains no declared UAR file

#### Scenario: Local Apple Silicon package is corrupt
- **WHEN** mounting, unpacking, or probing the local Apple Silicon package fails
- **THEN** publication does not claim Apple Silicon success and the observed build failure is fixed before that artifact is published

### Requirement: Native build failures are repaired at the release gate
Production code SHALL be completed before the native release gate. If a native build or package validator fails, only the observed failure SHALL be corrected and the failed platform gate SHALL be rerun.

#### Scenario: One target fails packaging
- **WHEN** three native targets succeed and one target fails
- **THEN** successful immutable artifacts are retained and only the failed target is rebuilt after its observed blocker is fixed

### Requirement: GitHub Releases is the distribution authority
Installers SHALL be uploaded directly to the `Prometheus-AGS/the-boss` GitHub Release. IPFS URLs SHALL NOT appear in the current release manifest or download catalog.

#### Scenario: Release is published
- **WHEN** all four platform artifacts satisfy the release contract
- **THEN** the GitHub Release exposes four resolving asset URLs whose bytes match the recorded sizes and checksums
