# Spec Delta

## Purpose

Makes the isolated worktree's dependency prerequisites reproducible and free of executable links, with recoverability preserved and the literal no-symlinks rule verified over every descendant rather than assumed from installer flags.

## ADDED Requirements

### Requirement: Locked clean install replaces dependencies in the isolated worktree only

Dependencies SHALL be replaced using the existing, unchanged lockfile and package manifest via a clean install with executable-link creation and lifecycle scripts disabled. No dependency pin, registry, or global npm configuration SHALL change, and no other checkout's dependencies SHALL be touched.

#### Scenario: Inputs are unchanged by the install

- **WHEN** the clean install completes in the isolated worktree
- **THEN** the package manifest and lockfile hashes equal their pre-install hashes and the installed tree resolves the locked versions

### Requirement: Recoverability is preserved before replacement

Before the dependency directory is replaced, existing entries SHALL be inventoried and any non-reproducible local-only content SHALL be preserved recoverably, with its rollback disposition recorded.

#### Scenario: Pre-install inventory and rollback disposition exist

- **WHEN** the prerequisite operation begins
- **THEN** an inventory receipt of the prior dependency tree and a recorded rollback disposition are produced before any replacement occurs

### Requirement: Whole-descendant link inventory is the no-symlinks evidence

Final verification SHALL be a read-only lstat inventory of every descendant entry — including ignored dependencies and vendored directories — that follows no links, reads no file contents or targets, and excludes ancestors, the external Git common directory and other repositories. Executable-link suppression alone SHALL NOT be treated as proof.

#### Scenario: Final tree reports zero links

- **WHEN** the whole-descendant inventory runs after the clean install and payload regeneration
- **THEN** it reports zero symlinks with zero errors, and its receipt records the entry and directory counts

#### Scenario: Suppression is not conflated with proof

- **WHEN** the completion evidence is reviewed
- **THEN** the no-symlinks claim cites the lstat inventory receipt, not the installer flags
