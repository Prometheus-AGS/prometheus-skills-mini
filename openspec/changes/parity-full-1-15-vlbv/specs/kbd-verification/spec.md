## ADDED Requirements

### Requirement: VLBV is the single verification method
A KBD project SHALL use VLBV unless a phase records a signed `KBD-METHOD` decision naming the method, its execution cadence and its reason, and that deviation SHALL be disclosed in the phase's closure packet.

#### Scenario: Project without a method decision
- **WHEN** method context is resolved for a project with no `KBD-METHOD` decision
- **THEN** the selected method is VLBV with source `pack-default`, or `project-pin` when `verificationMethod` is set

#### Scenario: Signed deviation
- **WHEN** a phase carries a signed `KBD-METHOD` decision for another method
- **THEN** method context reports the deviation and the closure packet discloses it

### Requirement: Generated code executes only at B4 or B5
Generated code SHALL execute only as entries of the adopted boundary packet at B4 (once) or at B5 (an owner-authorized repair rerunning only affected checks), and the owner's authorization SHALL be recorded before the first attempt.

#### Scenario: Authorization precedes the boundary
- **WHEN** `kbd-boundary-authorize` records B4 for a bound phase
- **THEN** the event is written before any boundary attempt, and a B5 authorization is refused unless a B4 attempt exists

#### Scenario: Runner output older than authorization
- **WHEN** the closure packet is written and files matching `boundaryPacket.runnerOutputGlobs` predate the B4 authorization
- **THEN** they are listed as pre-authorization artifacts without changing the closure verdict

### Requirement: Adopted contract v2 is linted and stays fresh
Contract adoption SHALL lint v2 contracts before any canonical write, SHALL refuse adoption while a CRITICAL acceptance finding lacks an owner decision, and readiness SHALL return REJECT-STALE when the bound OpenSpec delta digest changes. v1 contracts SHALL remain valid until their phase closes.

#### Scenario: Lint only
- **WHEN** `kbd-contract-adopt --lint-only` runs on a contract
- **THEN** lint findings are reported and nothing canonical is written

#### Scenario: Spec delta changed after adoption
- **WHEN** a v2 contract's `method.specDeltaDigest` differs from the recomputed digest
- **THEN** readiness returns REJECT-STALE

### Requirement: OpenSpec is pinned exactly and verified read-only at session start
The pack SHALL pin OpenSpec 2.0.0 exactly, SHALL report newer releases without adopting them, SHALL run only the read-only `verify` operation at session start, and SHALL run the mutating `refresh` only at phase entry, materializing generated skills as real directory copies.

#### Scenario: Session start
- **WHEN** the SessionStart hook runs
- **THEN** it calls `verify`, which installs and writes no project files and exits 0

#### Scenario: Newer OpenSpec major published
- **WHEN** the registry reports a newer major release
- **THEN** the runner reports `migrationRequired` and keeps using 2.0.0
