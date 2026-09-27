## ADDED Requirements

### Requirement: Phase transition help is read-only
The next-phase command SHALL print usage and exit successfully when invoked with `-h` or `--help`, without requiring initialized KBD state and without changing project state or artifacts.

#### Scenario: Help in an initialized project
- **WHEN** an operator invokes the next-phase command with `-h` or `--help` in a project containing KBD state and phase artifacts
- **THEN** the command exits 0, prints usage to stdout, and leaves all existing state and artifacts unchanged

#### Scenario: Help outside an initialized project
- **WHEN** an operator invokes the next-phase command with `-h` or `--help` where no KBD state exists
- **THEN** the command exits 0 and prints usage instead of reporting an initialization error or creating KBD state
