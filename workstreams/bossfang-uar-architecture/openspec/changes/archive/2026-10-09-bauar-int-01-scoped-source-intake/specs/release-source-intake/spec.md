# Spec Delta

## Purpose

Make a selected cross-repository release source set complete, attributable and recoverable without disturbing concurrent work or conflating source intake with release certification.

## ADDED Requirements

### Requirement: Complete scoped source checkpoints
The intake SHALL capture every approved selected path, including uncommitted additions, deletions, content and modes, into isolated repository checkpoints. Source HEAD alone MUST NOT represent working-tree deltas. Each checkpoint SHALL identify its baseline and exact transferred inventory.

#### Scenario: Uncommitted implementation and additions are carried
- **WHEN** the selected 241-path inventory is captured from the accepted sources
- **THEN** the candidate receipt identifies UAR 126, Boss 43 and Bossfang 72 paths and the resulting candidate trees contain all selected deltas, including the 94 additions, with no omitted or fabricated path.

#### Scenario: Input changed after binding
- **WHEN** a selected source or owned target path differs from its accepted binding
- **THEN** the changed input is explicitly reconciled and rebound before promotion; the old receipt is not used to overwrite concurrent work.

### Requirement: Baseline selection is explicit
The local Bossfang candidate SHALL use accepted baseline bac04cb6b2c144520e28234ad77f00d4cf0f5b23 and disclose its 279 newer commits beyond the observed old main. UAR and Boss SHALL retain the approved target baseline and target-only work. Phase deltas and inherited history MUST be separately attributable.

#### Scenario: Bossfang candidate retains established prerequisites
- **WHEN** the 72-path Bossfang delta is integrated for the local candidate
- **THEN** its receipt names bac04cb6 as the baseline and identifies the 279 inherited commits separately; it does not claim a self-contained backport onto 16beef0f.

### Requirement: Existing source checkouts remain protected
Intake SHALL write only approved isolated candidate roots and coordinating receipts. It MUST preserve original source indexes/worktrees, primary checkout refs and unrelated target work. No publication, shared release-branch merge or old-main advancement SHALL follow implicitly from checkpoint creation.

#### Scenario: Candidate construction is reversible
- **WHEN** the three local candidate checkpoints are created or superseded
- **THEN** original source and primary checkout state remains intact and the receipt names recoverable candidate refs and the responsible cleanup owner.

### Requirement: Candidate contracts move together
The candidate set SHALL preserve exact approval identities and revisions, UAR-owned delegated execution, observation without replay, application-owned MCP configuration and unsupported/unknown restart outcomes. It MUST NOT introduce implicit JWT forwarding, runtime MCP presets, a second agent loop or an approval compatibility fallback.

#### Scenario: Strict callers and authoritative harness remain paired
- **WHEN** the intake set is offered to the local payload producer
- **THEN** its linked checkpoints contain the owned approval producers/consumers and selected full-harness delegation together; retained observations are not converted into executable continuation.

### Requirement: Completion claims remain evidence scoped
The source receipt SHALL distinguish implementation intake, retained evidence, pending acceptance and publication. Operator-deferred checks MUST remain unpassed; F6 SHALL remain cancelled and excluded. Source intake MUST NOT close original shipping/C05 or remote deployment certification.

#### Scenario: Intake succeeds while acceptance is deferred
- **WHEN** all scoped checkpoints are available but broad regression or cumulative review remains deferred
- **THEN** source intake is recorded complete and those checks remain operator-deferred, with no certification or publication PASS.
