# approval-integration-baseline Specification

## Purpose
Establish a traceable Boss/UAR baseline so the integration can be delivered with observable behavior and retained evidence.

## Requirements

### Requirement: Preserve work before consolidation
The integration process SHALL preserve committed refs, staged and unstaged edits, required untracked inputs and dirty nested repositories before modifying selected worktrees, and SHALL retain a disposition for every inventoried worktree.

#### Scenario: Independent and historical work
- **WHEN** a worktree belongs to the convergence initiative or contains historical presentation changes
- **THEN** its ownership and recoverable source remain intact; it is not wholesale merged or deleted to establish the approval baseline

### Requirement: Select immutable production inputs
The baseline SHALL identify accepted Boss, UAR and required Liter commits, recursive pins, build features, configuration profile and actual binary checksums; excluded WIP SHALL have a recorded recovery location and reason.

#### Scenario: Mixed source and executable
- **WHEN** an executable is selected through THE_BOSS_UAR_SIDECAR_PATH
- **THEN** its source and checksum are recorded and a mismatch with the selected baseline prevents claiming that baseline was exercised

#### Scenario: Semantic dependency merge
- **WHEN** the Liter host-credential patch conflicts with the upstream merge
- **THEN** credential isolation and selected streaming behavior are reconciled explicitly before updating consumer pins

### Requirement: Retain truthful baseline behavior
The Gate V driver SHALL use the selected tool descriptor's valid file_path argument and inspect actual tool-result success or error before narrating completion. A failed baseline SHALL remain recorded without being marked accepted functionality.

#### Scenario: Tool failure
- **WHEN** the filesystem returns an error
- **THEN** the retained evidence contains the sanitized error and the driver does not report a successful approved write

#### Scenario: Completion disagreement
- **WHEN** KBD and OpenSpec task counts disagree
- **THEN** completion is reconciled by task ID and existing evidence, without blanket-checking or erasing records
