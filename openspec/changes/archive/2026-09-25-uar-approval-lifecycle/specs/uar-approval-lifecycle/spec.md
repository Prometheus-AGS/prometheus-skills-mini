## Purpose

Make approval reconnect and interruption explicit so the integration can be delivered with observable behavior and retained evidence.

## ADDED Requirements

### Requirement: Reconnect to the same pending continuation
A live renderer reattach or SSE reconnect SHALL retrieve owner-scoped pending state and replay stable event identities without recreating the waiter or admission.

#### Scenario: Renderer reattach
- **WHEN** the renderer detaches while human approval is pending and later reattaches
- **THEN** the same pending approval returns and can be decided once

#### Scenario: SSE reconnect
- **WHEN** the Boss-to-UAR SSE stream disconnects independently of the renderer
- **THEN** cursor replay and pending snapshot reconcile the same record without duplicate execution

### Requirement: Cancellation and narrower authority
Cancellation SHALL cover root descendants and unclaimed admissions, and SHALL serialize with claim. Removed tool/catalog bindings or stricter permissions SHALL invalidate the old prepared call.

#### Scenario: Root cancellation
- **WHEN** a root is cancelled with a child awaiting approval
- **THEN** the child cannot execute using a later stale reply

#### Scenario: Claim race
- **WHEN** cancel and claim compete
- **THEN** one ordered transition determines whether dispatch was admitted; cancellation after claim does not promise rollback

#### Scenario: Revoked binding
- **WHEN** the selected tool or catalog revision is revoked before dispatch
- **THEN** the prepared invocation is refused rather than substituted

### Requirement: Durable evidence without crash replay
The system SHALL persist sanitized claim intent before dispatch and terminal result afterward using existing persistence. Restart SHALL invalidate old epochs; claimed work without terminal evidence SHALL be outcome-unknown and SHALL NOT be automatically retried.

#### Scenario: Crash before admission
- **WHEN** host or sidecar restarts while waiting for a decision
- **THEN** the action is reported interrupted and old reply IDs cannot authorize work

#### Scenario: Crash after claim
- **WHEN** host or sidecar restarts after claim intent but before a terminal receipt
- **THEN** the action is shown as outcome-unknown with no automatic write replay

#### Scenario: Storage failure
- **WHEN** claim intent cannot be persisted
- **THEN** dispatch does not occur and the operator sees an actionable error
