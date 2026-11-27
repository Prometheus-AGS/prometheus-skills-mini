# Spec Delta

## Purpose

Lets an operator see, without changing anything, which instruction and rule
files are effective in a project and which pack version is actually installed.

## ADDED Requirements

### Requirement: Audit covers every effective rule source
The rules audit SHALL report root and nested `AGENTS.md` and `CLAUDE.md` files, their imports, harness rule directories and linked worktrees, and SHALL identify which of them conflict with the outcome-first policy.

#### Scenario: Nested rule file conflicts
- **WHEN** a nested rule file instructs sessions to treat a test count as completion
- **THEN** the audit lists that file and the conflicting passage

#### Scenario: Linked worktree present
- **WHEN** the repository has a linked worktree with its own instruction files
- **THEN** the audit reports that worktree's files separately

### Requirement: Audit reports the installed version
The audit SHALL report the pack version and managed-copy state of the installed skills it can find, and SHALL report "unknown" when no receipt or version is available.

#### Scenario: Installed copy differs from the source release
- **WHEN** the installed skills carry a different version than the checked-out pack
- **THEN** the audit reports both versions

### Requirement: Audit is read-only
The audit SHALL NOT create, modify or delete any file, and SHALL NOT block other work.

#### Scenario: Audit run in a project with conflicts
- **WHEN** the audit finds conflicts
- **THEN** it exits after reporting them and the working tree is unchanged
