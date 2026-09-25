## Purpose

Bind approval to one prepared tool invocation so the integration can be delivered with observable behavior and retained evidence.

## ADDED Requirements

### Requirement: Restrictive policy composition
UAR SHALL own the execution continuation and compose UAR and Boss decisions so deny dominates ask and ask dominates auto. Every managed-host call, including Auto, SHALL use admission.

#### Scenario: UAR Ask and host Auto
- **WHEN** UAR requires Ask while Boss permits Auto
- **THEN** execution waits for one authenticated human decision

#### Scenario: Either denial
- **WHEN** either authority denies a call
- **THEN** no host effect is dispatched, even if the other authority or UI permits it

#### Scenario: Both automatic
- **WHEN** both authorities select Auto
- **THEN** one exact invocation executes without fabricating a human approval

### Requirement: Exact prepared execution identity
A prepared invocation SHALL bind trusted owner, root/child run, workspace, epochs, catalog revision, native tool and mount identity, frozen validated arguments and policy revisions. The host SHALL compare the arriving call with its stored binding and atomically consume one admission.

#### Scenario: Identical concurrent calls
- **WHEN** two invocations have identical tool names and arguments
- **THEN** their distinct invocation IDs cannot consume each other's admission

#### Scenario: Tampered or missing binding
- **WHEN** a call changes arguments, tool, owner, workspace, epoch or admission identity
- **THEN** the host rejects dispatch and records a sanitized reason

#### Scenario: Duplicate execution request
- **WHEN** a claimed admission is presented again
- **THEN** the call is not executed again

### Requirement: Authenticated paired transport
The private existing bridge listener SHALL provide versioned admission operations authenticated by its existing scoped connection and carry opaque identity in managed tools/call metadata. Standalone UAR and independent MCP servers SHALL not depend on this Boss transport.

#### Scenario: Incompatible pair
- **WHEN** Boss or UAR lacks admission protocol v1
- **THEN** pairing fails with an actionable incompatibility result, without FIFO fallback

#### Scenario: External MCP
- **WHEN** standalone UAR invokes an independent MCP server
- **THEN** UAR enforces its policy through the standalone adapter without requiring Boss-only metadata

### Requirement: Safe consent and idempotent acknowledgment
The renderer SHALL receive only an explicit safe action projection and opaque correlation IDs; inbound responses SHALL contain decision and opaque ID only. Authoritative inputs and credentials SHALL remain protected. Human-required admission SHALL wait for both the recorded host human decision and matching UAR acknowledgment.

#### Scenario: Lost acknowledgment
- **WHEN** an approval acknowledgment is lost
- **THEN** the same pending decision is inspected or retried idempotently and does not create another execution grant

#### Scenario: Edited or stale reply
- **WHEN** the renderer sends replacement arguments or a conflicting decision for a resolved request
- **THEN** the reply is rejected or reported stale without changing the prepared call

#### Scenario: Useful protected display
- **WHEN** a tool includes credential-bearing or arbitrary body arguments
- **THEN** approval, replay and run-detail UI display safe operation/target context without those raw values, and changed text is translated
