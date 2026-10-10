# Local acceptance evidence

## Purpose

Coordinate source-bound local application and harness acceptance with truthful outcomes that remain distinct from public release certification.

## ADDED Requirements

### Requirement: Completed production precedes acceptance

The coordinator SHALL require a frozen complete parent production manifest and matching packaged artifacts before authoring or running acceptance scenarios or reviewing product implementation. A changed source MUST invalidate dependent receipts without relabeling historical evidence.

#### Scenario: Incomplete parent production
- **WHEN** any parent production task or required package identity remains incomplete
- **THEN** acceptance is BLOCKED, no scenario launches, and historical passes retain their original source boundary.

### Requirement: Fixed source-bound scenario inventory

Each required scenario SHALL retain a stable identity, source/artifact/profile binding, real production entry point, observable result and negative-control result. Missing, malformed or unbound records MUST NOT establish readiness.

#### Scenario: Supporting profile differs
- **WHEN** a test-probes binary passes eligible regression while the package contains server-full
- **THEN** regression is recorded only as supporting evidence and packaged operation still requires its own actual launch/effect results.

### Requirement: Real effects and authority remain observable

Local acceptance SHALL use actual packaged desktop IPC, authenticated UAR, configured MCP receivers and Bossfang API/kernel hosts. Controlled model responses MUST NOT replace the executor, approval checks, persistence or effect boundary.

#### Scenario: Approved and denied effects
- **WHEN** a controlled provider selects a real tool through the owning runtime
- **THEN** an exact valid approval produces one target effect, while the paired rejected authority produces none; events alone cannot substitute for observing the receiver effect.

### Requirement: Finite outcome contract

The coordinator SHALL return 0 only when every selected mandatory gate and negative control passed; 1 for an observed acceptance failure; 2 for invalid inputs, incomplete evidence, missing tools/services/isolation or pending required review. Out-of-scope and cancelled work MUST remain distinguishable from passed work.

#### Scenario: Child exits without required observation
- **WHEN** a child exits 0 but its required scenario receipt or effect observation is missing
- **THEN** the coordinator returns 2 and records incomplete evidence, not success.

### Requirement: Private resources and retained rollback inputs

Each execution SHALL use private configuration/data/temp/queue roots and dynamically allocated loopback peers. Cleanup SHALL affect only owned child processes; source candidates, old packages, caches and rollback inputs MUST remain retained. The coordinator MUST NOT modify shared services or ordinary profiles.

#### Scenario: Interrupted gate
- **WHEN** acceptance terminates during an invocation
- **THEN** owned process cleanup is recorded, unresolved effects remain unknown, and no automatic effect replay or deletion of retained candidate inputs occurs.

### Requirement: Local provenance controls retain public boundaries

Acceptance SHALL exercise existing stale-source, archive-integrity and local/public-mode checks on disposable copies without weakening production validators. Public-mode refusal is verification of a boundary, not authority to publish.

#### Scenario: Mutated payload metadata
- **WHEN** a retained candidate copy has stale source metadata, corrupt archive contents or local selection in public mode
- **THEN** its real packaging validator refuses, no success receipt is issued and the original artifact remains unchanged.

### Requirement: Review and release dispositions remain explicit

The final report SHALL name local acceptance coordination and operator release authority; enumerate unsigned macOS ARM64, signing, installation, Intel macOS, Windows, remote certification and publication separately; retain cumulative review findings and formatting debt. No local pass SHALL authorize wider certification or advance shipping/C05.

#### Scenario: Local acceptance completes
- **WHEN** selected local gates and required completed-product review finish
- **THEN** readiness is stated only for the observed local artifact, with unselected platforms/signing/installation/remote/publication deferred or excluded and no invented release owner approval.
