# Spec Delta

## Purpose

Keep backend task completion and canonical KBD progress inspectably consistent
without causing new lifecycle effects during ordinary inspection.

## ADDED Requirements

### Requirement: Read-only complete scan
The driver SHALL implement `reconcile [<phase>] [--repair] [--json]` with exits
0 for complete clean, 1 for drift, and 2 for invalid input or incomplete scans.
It SHALL support explicit and nested active phases and all three backends,
including unique archived artifacts, without migrations, hooks or live writes.

#### Scenario: Missing task artifact
- **WHEN** a selected phase's change has no readable task artifact
- **THEN** the report contains an error, clean is false, and exit is 2

#### Scenario: Archived completed change
- **WHEN** uniquely archived backend tasks match canonical tasks and progress counts
- **THEN** the read-only scan returns clean with exit 0 without reopening tasks

### Requirement: Safe explicit repair
Repair SHALL operate only on the selected active phase, reuse canonical identity
and task boundaries, stop dependent operations on failure, and rescan actual state.
It SHALL preserve cancellations, archives and ledger-ahead tasks. Legacy counts
may be repaired but runtime-owned projections SHALL NOT be directly written.

#### Scenario: Inactive target
- **WHEN** repair names a phase other than the active phase
- **THEN** the driver refuses before any mutation with exit 2

#### Scenario: Idempotent repair
- **WHEN** an unambiguous backend-complete task is repaired twice
- **THEN** the first operation records required boundaries and the second adds no duplicate completion

### Requirement: Machine-readable evidence
JSON output SHALL preserve phase, clean, drifted and drift fields and expose scan
errors separately. Diagnostics SHALL stay off JSON stdout.

#### Scenario: Drift differs from unavailable evidence
- **WHEN** the scanner detects a task mismatch and an unreadable artifact
- **THEN** both are reported and the incomplete scan returns exit 2
