# evidence-secret-scan Specification

## Purpose
Enforces the repository's evidence-publication security boundary with a Node checker that preserves the original scan scope, inspects both keys and values, admits only finite hash-bound non-credential dispositions, and proves it still detects real credentials.

## Requirements

### Requirement: Original scan boundary is preserved

The checker SHALL scan the same effective path scope as the replaced git-grep content check — pathspecs `docker/*`, `*.mjs`, `*.json`, `*.toml`, `*.yaml`, `*.yml` with standard exclusions. The replaced command's `docker/*` wildcard already matched `docker/` Markdown (the original failure record includes a `docker/AGENTS.md` match); its note claiming Markdown exclusion contradicts the command. The checker preserves the command's effective scope and the replacement commit corrects the stale note.

#### Scenario: Docker Markdown stays in scope

- **WHEN** a credential-shaped value is introduced into a `docker/` Markdown file outside any accepted disposition
- **THEN** the checker fails and reports the location without printing the value

### Requirement: Keys and values are both inspected

The checker SHALL inspect JSON property names and string values, plus non-JSON text lines. A credential placed in either a key or a value SHALL be detected.

#### Scenario: Key-side detection

- **WHEN** a JSON document contains a credential-shaped property name or value not covered by a disposition
- **THEN** the checker fails and reports the location without printing the key or value

### Requirement: Dispositions are finite and hash-bound

The checker SHALL admit a non-credential occurrence only through an explicit disposition bound to its exact file, location (JSON field or line number), exact content digest and disposition class. The disposition set SHALL be finite and enumerated from the child's named adjudication receipts. Changed or new unmatched hits SHALL fail safely without printing values, identifiers or matched content.

#### Scenario: Disposition store derives from the named receipts

- **WHEN** the disposition store is audited against the child's `evidence/analyze/secret-syntax-adjudication.json`, `secret-context-dispositions.json`, `secret-key-dispositions.json`, `secret-key-structure.json`, `evidence/assess/secret-count-reconciliation-v3.json` and `evidence/spec/identifier-key-context.json`
- **THEN** every disposition traces to a receipted occurrence (file, field-or-line, sha256, class) and no disposition lacks a receipt source

#### Scenario: Accepted history passes unchanged

- **WHEN** the checker runs over the repository with all historical packets and evidence files byte-identical to their adjudicated hashes
- **THEN** every disposition-bound occurrence is accepted and the check passes

#### Scenario: Mutation of accepted content fails

- **WHEN** any byte of a disposition-bound file changes so its digest no longer matches
- **THEN** the affected occurrence is no longer accepted and the check fails safely

### Requirement: No broad exemptions

The checker SHALL NOT exempt whole directories, whole packets, all JSON keys, or arbitrary strings merely because they contain prohibition text. Acceptance exists only through the finite enumerated dispositions.

#### Scenario: New credential inside an accepted packet is caught

- **WHEN** a synthetic credential is inserted into an otherwise accepted historical packet at a location with no disposition
- **THEN** the checker fails and reports that location without printing the value

### Requirement: Positive detection evidence ships with the checker

The checker SHALL include controls proving detection of: a synthetic inline credential command option, a standalone provider-shaped token, and a newly inserted credential inside an otherwise accepted historical packet. These controls SHALL run as part of the checker's own verification.

#### Scenario: Controls all detect

- **WHEN** the checker's positive controls execute
- **THEN** each synthetic credential is detected and reported, and each negative control (unmodified accepted content) passes

### Requirement: Replacement is a separate reviewed commit with history preserved

The checker implementation, its controls and the single corrected `no-hardcoded-secrets` check expression SHALL land as their own separate reviewed commit under the operator's approved narrow exception. Canonical identifiers, journals, archives and original failed evidence receipts SHALL remain unchanged. If any genuinely sensitive occurrence is found, it SHALL receive reversible evidence minimization with before/after hashes and retained failure status — never relabeled as a benign collision.

#### Scenario: Commit boundary is respected

- **WHEN** the delivery's commits are inspected
- **THEN** the checker change is its own commit touching only the checker, its controls, the disposition data and the one check expression, with no historical evidence rewritten
