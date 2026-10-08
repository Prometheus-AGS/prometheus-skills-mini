# Spec Delta

## Purpose

Defines which delivery-cadence capabilities the mini pack supports — the Node CLI and its state machine, with installed/service refresh retired and truthfully documented — and how the mini's divergence from the shared source payload is provenanced.

## ADDED Requirements

### Requirement: Node cadence CLI remains the supported interface

The mini profile SHALL retain the Node cadence CLI and its documented behavior: init, configure, start, child enter, ready, candidate freeze, checkpoint, work-ahead admit, finish, failure resolve, review, tick, publication attempt/reconcile, migrate, history, hook management, schema versions, the bounded event journal and reports.

#### Scenario: CLI lifecycle operates after the repair

- **WHEN** the cadence CLI is invoked for `init`, `start`, `checkpoint` and `finish` against an isolated state directory in the repaired pack
- **THEN** each command succeeds with its documented JSON output and state transitions, unchanged from pre-repair behavior

### Requirement: Installed skill-pack refresh is retired from the mini payload

The skill source SHALL NOT contain `scripts/refresh-skill-pack.sh` or `examples/refresh-skill-pack-shim.sh`, and no documentation SHALL promise upstream installer, updater, launchd or service-refresh procedures. Documentation SHALL declare the capability unavailable in this profile using the exact marker the carried-payload contract recognizes and SHALL name where the follow-up is tracked.

#### Scenario: Carried-payload reference contract passes

- **WHEN** the carried-payload reference test scans the corrected skill documentation
- **THEN** every remaining referenced asset resolves, the unavailable declaration is honored, and the test passes

#### Scenario: No shell payload remains

- **WHEN** the tracked file inventory of the skill source and both regenerated harness distributions is inspected
- **THEN** no `.sh` (or other forbidden interpreter) file exists in any of the six previously failing paths

### Requirement: Adaptation provenance is recorded without rewriting history

The historical `.prometheus/delivery-cadence-source.json` manifest SHALL remain byte-identical. A dated mini adaptation record SHALL be added naming the shared-source baseline digest, the approved removals, the changed documentation and the final actual payload hashes, and SHALL NOT claim byte identity with the shared source after adaptation.

#### Scenario: Adaptation record is auditable

- **WHEN** a reviewer reads the adaptation record
- **THEN** they can distinguish the shared-source baseline from the adapted mini payload and verify each approved removal and final hash

### Requirement: Shared-payload sync refusal is preserved

The existing `sync-mini.mjs` ownership refusals (locally changed file, locally removed owned file, mid-copy race) SHALL remain in force and unmodified. The adaptation record SHALL document that future shared-payload synchronization refuses this adapted tree pending explicit reconciliation. Synchronization SHALL NOT be invoked or weakened by this change.

#### Scenario: Refusal is documented, not bypassed

- **WHEN** the adaptation record and the delivery are inspected
- **THEN** the refusal and its required reconciliation are documented and no sync invocation or sync-code edit appears in the change
