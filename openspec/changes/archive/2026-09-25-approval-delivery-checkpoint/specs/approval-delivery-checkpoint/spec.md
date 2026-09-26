## Purpose

Publish corrected native inputs and return to parent delivery so the integration can be delivered with observable behavior and retained evidence.

## ADDED Requirements

### Requirement: Publish actual corrected payload provenance
The delivery checkpoint SHALL identify accepted source commits and produced native payload checksums for Windows x64 and Apple Silicon. Each source and binary selector SHALL reference the matching produced artifact rather than relabeling an older payload.

#### Scenario: Independent native jobs
- **WHEN** one required platform completes before the other
- **THEN** its immutable payload can be published without waiting for lower-priority platforms; shared manifest updates remain serialized

#### Scenario: Artifact not produced
- **WHEN** a required payload build fails
- **THEN** the previous valid artifact stays available and the new correction is not claimed shipped for that platform

### Requirement: Preserve parent scope and acceptance
The child SHALL map its evidence to parent task IDs without marking broader administration or installed acceptance complete. Parent delivery SHALL retain mini/full-pack reconciliation, complete skill dependencies, both customer installers and current site publication.

#### Scenario: Child integration passes
- **WHEN** the exact-call and lifecycle gates succeed
- **THEN** the child records that bounded evidence and leaves broader parent Gate V and installed gates pending until their own criteria pass

#### Scenario: Closeout
- **WHEN** all child implementation evidence is recorded
- **THEN** OpenSpec closeout and kbd-reflect run before returning to the parent; unrelated historical work stays recoverable
