## REMOVED Requirements

### Requirement: Testing conventions
**Reason**: Test-first and RED-history requirements conflict with the governing constitution A-9.
**Migration**: Existing tests remain; new acceptance follows completed-behavior integration below.

## ADDED Requirements

### Requirement: Completed-behavior integration conventions
New acceptance tests SHALL use node:test with node:assert/strict and SHALL exercise completed production entry points across real collaborating boundaries. Production implementation SHALL be coherent before tests are authored or run. Unit, module-local, mocked-only and per-edit tests SHALL NOT count as completion evidence. Existing legacy tests MAY remain; their presence does not authorize test-first implementation. Arrange, Act and Assert order SHALL remain reviewable.
#### Scenario: Completed production behavior
- **WHEN** a change adds behavior
- **THEN** its production path is implemented before its integration acceptance scenario is authored and run
#### Scenario: Evidence records the actual boundary
- **WHEN** a completed change is reported
- **THEN** tasks.md records the real integration command and result without requiring fabricated RED history
#### Scenario: Structure is reviewable
- **WHEN** an integration test is reviewed
- **THEN** arrangement, action and assertions appear in that order and exercise actual collaborators
#### Scenario: No test framework is installed
- **WHEN** package.json is read
- **THEN** it lists no additional test runner or assertion library
