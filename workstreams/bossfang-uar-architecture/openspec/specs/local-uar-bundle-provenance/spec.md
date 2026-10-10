# local-uar-bundle-provenance Specification

## Purpose
Provide a local Apple Silicon Boss bundle with an actual current-source UAR payload and inspectable provenance while preserving the established public release boundary.

## Requirements

### Requirement: Bundle identity is bound to the integrated source
The local bundled UAR SHALL identify the clean integrated UAR checkpoint, target platform, explicit feature profile, actual build invocation, binary digest, archive digest and file inventory. The Boss local source pin SHALL identify that same checkpoint. An existing archive MUST NOT be relabeled as rebuilt from a newer source.

#### Scenario: Current-source bundle is produced
- **WHEN** the complete approved source set and local pin are frozen and the UAR payload is built and packaged
- **THEN** the delivery receipt links that exact source and build to the generated archive and the UAR files in the resulting Boss bundle.

### Requirement: Existing local packaging validation remains effective
The local candidate SHALL use the existing source, archive and per-file integrity checks and packaging hooks. It MUST NOT bypass them, reuse an external binary as proof of bundled identity or weaken checks to accept stale payloads.

#### Scenario: Mismatched archive or source is refused
- **WHEN** a real local payload carries a stale source record or an archive digest different from its record
- **THEN** the local production packaging entry point rejects it and emits no candidate success receipt.

#### Scenario: Bundle uses its payload without an external override
- **WHEN** the generated local Boss application starts with no external UAR path configured
- **THEN** its managed sidecar path and digest identify the UAR inside that bundle; startup/effect behavior is reported only if actually exercised.

### Requirement: Local and public delivery modes remain distinct
The first candidate SHALL be native darwin-arm64 local mode. Existing release CI/public-mode rejection of local payloads SHALL remain. Canonical published artifacts, their source identities and multi-platform requirements MUST remain unchanged until separately authorized replacement production.

#### Scenario: Local payload is offered as a public artifact
- **WHEN** public mode or release CI encounters a local payload selection
- **THEN** it refuses that selection rather than promoting the local marker or an unpublished archive to a public release.

### Requirement: Required features and dependency authority are explicit
The local candidate SHALL use the selected server-full UAR product profile without test-only features, retaining existing authoritative dependency pins and version 1.0.0 unless separately authorized. Its packaging feature record MUST match its actual build rather than an unrelated retained public profile.

#### Scenario: Build profile differs from declared payload
- **WHEN** the build or packaging record describes a feature profile different from the approved invocation
- **THEN** the delivery remains unresolved until the record and actual artifact are reconciled; no current-source success claim is issued.

### Requirement: Delivery and later acceptance remain separately inspectable
The delivery receipt SHALL record actual production/build/package outcomes and separately identify pending or deferred runtime, signing, installed and platform acceptance. No unsigned local bundle SHALL establish Windows, Intel macOS, installed release or remote multi-user certification.

#### Scenario: Local bundle exists without release certification
- **WHEN** the current local bundle is produced while later acceptance remains deferred
- **THEN** bundle production is reported at its actual boundary and public release, installed operation and deferred checks remain unclaimed.
