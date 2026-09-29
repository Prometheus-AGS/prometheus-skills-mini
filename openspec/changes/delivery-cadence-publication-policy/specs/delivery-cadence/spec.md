## ADDED Requirements

### Requirement: Explicit publication configuration applies to outstanding publication

The CLI SHALL validate publication against the current explicitly configured publication policy and record its revision. It SHALL preserve historical delivery profiles and build receipts. Configuration alone SHALL NOT clear publication debt or certify installed acceptance.

#### Scenario: Operator separates acceptance from publication scheduling

- **WHEN** the operator configures an outstanding release's publication policy to track installed acceptance separately
- **THEN** matching artifact, metadata and website receipts can reconcile publication
- **AND** unavailable installed acceptance remains pending in the release and owning phase evidence
