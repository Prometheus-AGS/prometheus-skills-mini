## ADDED Requirements

### Requirement: Maintenance mode is explicit and non-initializing
Existing project maintenance SHALL require one explicit existing Git root and one exclusive mode. Audit and preview SHALL NOT modify the project. Apply SHALL require an exact preview digest bound to that root, both entrypoint identities and bytes, and proposed bytes.

#### Scenario: Review updates without writing
- **GIVEN** a Git root with dirty hand-maintained root instructions
- **WHEN** the operator audits and previews
- **THEN** audit identifies status, preview shows the exact change and digest, and all project bytes remain unchanged

#### Scenario: Apply and repeat
- **GIVEN** an unmodified approved preview for an exact root
- **WHEN** the operator applies its digest
- **THEN** only selected named instruction target bytes change, existing dirty bytes outside proposed edits survive, and the next preview is a no-op

### Requirement: Preserve canonical topology and refuse ambiguity
Maintenance SHALL preserve existing recognized managed regions, relative entrypoint references and same-root links. It SHALL reject unsupported or unsafe ownership, ignore status and stale or mismatched preview decisions without guessing.

#### Scenario: Managed and linked instructions
- **GIVEN** a safe single canonical target including symlink orientations AGENTS to CLAUDE or CLAUDE to AGENTS
- **WHEN** the operator applies an approved update
- **THEN** root link topology and managed bytes are preserved, and both harnesses have an effective policy

#### Scenario: Block ambiguity and stale lease
- **GIVEN** broken, external, ambiguous, ignored, partially covered or conflicting entrypoints, or a change after preview
- **WHEN** mode selection or apply evaluates them
- **THEN** it reports the specific blocker and does not overwrite either file
