# Spec Delta

## Purpose

Keeps repository code comments, CLI usage text and skill documentation aligned with the canonical decision that OpenSpec is the only spec backend, while preserving the existing canonical guard delegation and command behavior.

## ADDED Requirements

### Requirement: Obsolete spec-backend text is removed

The bottleneck guard module comment, the bottleneck detector CLI usage and runtime usage text, and the bottleneck detector skill text SHALL NOT reference the retired spec backend. No other occurrence of the retired backend name SHALL remain in scanned source, library, hook, script, template or skill content.

#### Scenario: Backend-text constraint is clean

- **WHEN** the `no-zeespec` constraint is evaluated after the repair
- **THEN** zero matches are reported across all scanned pathspecs

### Requirement: Canonical guard delegation is preserved

Guard evaluation SHALL continue to delegate boundary values opaquely to the canonical `prometheus kbd guard` command with unchanged exit-code semantics, including the guard-unavailable exit path. The detector CLI SHALL retain its evaluate/repair behavior for the supported task, change and phase boundaries.

#### Scenario: Supported boundaries still evaluate

- **WHEN** the detector CLI is invoked for supported task and phase boundaries after the text correction
- **THEN** evaluation and repair behavior match pre-repair outcomes and the corrected usage text names only supported boundaries
