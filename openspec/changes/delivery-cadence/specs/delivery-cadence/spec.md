## ADDED Requirements

### Requirement: Build and run delivery boundaries
The skill SHALL configure independent iteration, human-review and publication schedules. Every successful delivery SHALL have completed production scope and matching required build and functional-run receipts. A failed action SHALL prevent the next iteration until repaired.
#### Scenario: Clock expires before code completion
- **WHEN** the target time expires with unfinished scope
- **THEN** stop adding scope and report overrun, without running a suite or declaring success
#### Scenario: Two-hour project delivery
- **WHEN** this initiative reaches an increment boundary
- **THEN** build Mac ARM64 and run its completed function; every second successful delivery additionally requires all Mac/Windows installers and website pointers

### Requirement: Durable JavaScript notifications
The skill SHALL support explicit hook registration, filtering, timeout, disabling, removal and deliberate retry, with iteration and publication events and inspectable results.
#### Scenario: Resume after email uncertainty
- **WHEN** a hook was running when its owner exited without an effect receipt
- **THEN** record an unknown outcome and do not automatically send it again without an idempotency contract
#### Scenario: Required hook failure
- **WHEN** a required handler fails
- **THEN** preserve build outcome but block next admission until repair

### Requirement: Honest progress and optimization
The skill SHALL report distinct tasks, changes, phases, delivered outcomes and evidence states, without double-counting overlapping time or replacing canonical KBD state.
#### Scenario: Incomplete timing
- **WHEN** a receipt lacks timing
- **THEN** report unknown and exclude it from automatic optimization

### Requirement: Portable pack and harness integration
The skill SHALL run from copied full and mini installations using Node .mjs modules and retain the host as execution owner.
#### Scenario: Harness has no native goal tool
- **WHEN** goal continuation is unavailable
- **THEN** provide resumable state and an explicit continuation instruction without claiming background execution
