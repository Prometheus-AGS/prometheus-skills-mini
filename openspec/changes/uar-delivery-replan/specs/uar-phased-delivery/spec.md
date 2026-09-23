## Purpose

Define observable delivery, isolation and acceptance requirements for successive complete UAR experiences inside The Boss while preserving the full approved feature scope.

## ADDED Requirements

### Requirement: Planning and execution are separately authorized
The delivery process SHALL produce research, a complete phase plan and an independent adversarial review before presenting the plan. This planning phase MUST NOT modify production code, execute builds/tests, or start implementation. Execution SHALL wait for operator reflection and approval.

#### Scenario: Planning is delivered
- **WHEN** the reviewed plan is presented
- **THEN** implementation remains unstarted and the next action is operator reflection and approval

### Requirement: First release is a complete useful agent
The first UAR preview SHALL let a user install The Boss, select UAR, complete a real-provider conversation, use workspace-scoped Compass/filesystem/skills through the existing approval policy, cancel a run and continue the conversation after restarting the sidecar without requiring Docker or a developer toolchain. Later capabilities MUST be visibly unavailable until implemented.

#### Scenario: First installed workflow
- **WHEN** a user installs the first UAR preview and requests a workspace task
- **THEN** the runtime performs the authorized task, displays the result, and preserves the conversation across restart

### Requirement: Host authority and isolation are preserved
Runs SHALL use host-authenticated identity, correctly scoped provider credentials and only authorized workspace tools. Tool approval MUST match the exact run, call, tool and arguments. Another principal, a stale token or an altered call SHALL NOT grant execution or access. Credential material MUST NOT be exposed to the renderer, ordinary preferences, persisted run records or diagnostics.

#### Scenario: Concurrent workspace isolation
- **WHEN** two conversations use different workspaces and credentials concurrently
- **THEN** each can access only its authorized resources and uses only its bound credentials

#### Scenario: Approval mismatch
- **WHEN** an approved tool call is replayed with different arguments or identity
- **THEN** the operation does not execute

### Requirement: Recovery does not repeat side effects silently
Interrupted runs SHALL retain visible completed work and show an interrupted or indeterminate outcome. A reconnect or restart MUST NOT silently replay an edit or command. Missing stream history SHALL cause explicit resynchronization or a visible failure.

#### Scenario: Response lost after an edit
- **WHEN** the transport fails after a tool may have changed a file
- **THEN** the application reports the known or indeterminate result without automatically executing that edit again

### Requirement: Interactive workflows preserve ownership
A2UI surfaces SHALL use approved component catalogs, persist as conversation content, and accept only declared actions bound to their owner and current revision. One user action SHALL create at most one continuation request despite duplicate submission.

#### Scenario: Form continuation
- **WHEN** a user submits an owned current surface
- **THEN** the agent continues the workflow once in a new turn

#### Scenario: Foreign surface action
- **WHEN** a conversation submits another conversation's surface action
- **THEN** the action is rejected without exposing that surface's data

### Requirement: Knowledge and storage choices are truthful
Users SHALL see the effective storage backend and local-only state. Explicit remote mode SHALL report failure when remote storage is unavailable. Local data MUST NOT merge automatically into remote storage. Agent-selected documents SHALL be reusable through explicit ingestion into each conversation's authorized knowledge store.

#### Scenario: Docker is unavailable
- **WHEN** automatic storage starts without an operational configured remote store
- **THEN** the application uses its declared local store and labels the resulting state local-only

#### Scenario: Knowledge reuse across conversations
- **WHEN** a new conversation uses an agent with selected documents
- **THEN** it ingests those authorized selections for its own principal and cannot directly read another principal's knowledge store

### Requirement: Every approved capability has a delivery owner
The plan SHALL assign the approved settings, algorithms, retrieval, memory, budgets, guardrails, skills, telemetry, agent definitions and all platform targets to explicit phases. Settings MUST change actual behavior and have complete UI/localization/diagnostics when exposed.

#### Scenario: Algorithm is not yet implemented
- **WHEN** a preview ships before a later-phase algorithm is complete
- **THEN** the option is visibly unavailable, remains assigned to its delivery phase, and is not represented by a silent substitute

### Requirement: Integration evidence belongs to immutable candidates
Each phase SHALL finish coherent production wiring before its full integration gate. Evidence MUST name the exact app/runtime/payload commits and artifacts. Next-phase development MAY continue in isolated worktrees while the previous candidate is built and exercised. It MUST NOT mutate the candidate or inherit its acceptance claim.

#### Scenario: Candidate failure during next-phase work
- **WHEN** a frozen candidate fails while succeeding development is underway
- **THEN** its correction is applied to the candidate and propagated before the succeeding phase freezes, with affected integration scenarios rerun

### Requirement: Customer platforms receive completed releases promptly
Windows x64 and Apple Silicon SHALL receive each completed supported phase without waiting for less urgent platforms. Publication SHALL use immutable GitHub Release URLs, accurate checksums/source/signing information and matching website data. Installed acceptance MUST remain pending until observed.

#### Scenario: Linux packaging is delayed
- **WHEN** a customer-platform candidate passes its gate while a Linux job is unresolved
- **THEN** the ready customer platform can publish and its website link is updated without claiming Linux completion
