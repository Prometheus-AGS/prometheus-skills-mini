# Spec Delta

## Purpose

Delegate an identified Bossfang job attempt to one UAR execution harness while preserving approvals, cancellation, observation and side-effect uncertainty across transport failures.

## ADDED Requirements

### Requirement: One authoritative execution loop
A UAR-delegated job attempt SHALL use UAR as its sole model/tool/approval/continuation executor. Bossfang SHALL own scheduling, dependencies, harness selection and attempt outcome. Model-only providers MUST remain a distinct interface that returns proposals without executing tools.

#### Scenario: Delegated tool execution
- **WHEN** a Bossfang job selects the UAR harness and a tool is selected and approved
- **THEN** UAR executes the invocation, Bossfang observes the result, and Bossfang neither replays the observed tool event nor runs a second model/tool loop for that attempt.

#### Scenario: Missing required capability
- **WHEN** UAR does not advertise a job's required execution, approval, interruption or recovery capability
- **THEN** submission is rejected before execution with the missing capability identified and no fallback to the completion-shaped UAR driver.

### Requirement: Execution inputs and policy are not silently dropped
Delegation SHALL preserve the selected job input, authorized history, agent/configuration revision, tool policy, resource grants and required limits through the supported harness contract. Unsupported required fields or semantics MUST be rejected before admission. Effective execution policy SHALL remain attributable to the owning harness.

#### Scenario: Context and tool policy reach the executor
- **WHEN** a job supplies authorized history, a selected agent configuration, permitted tools/resources and required limits
- **THEN** the adapter maps each supported value explicitly and the integrated trace confirms UAR uses the intended context and effective policy; tool execution remains owned by UAR.

#### Scenario: Required semantics lack a mapping
- **WHEN** a required tool catalog, history form, budget or execution option cannot be represented by the agreed provider profile
- **THEN** the job is rejected before submission with the unsupported requirement identified; the adapter does not drop it or run a compensating Bossfang loop.

### Requirement: Durable product attempt identity
Bossfang SHALL persist a product job/attempt identity, selected harness, owner/workspace, admission identity and expected runtime epoch before submitting an attempt. It SHALL then retain the returned task/run receipt, observation cursor and outcome. Stored attempt data MUST contain credential references and revisions rather than plaintext secrets.

#### Scenario: Submission acknowledgement is lost
- **WHEN** submission may have succeeded but no receipt reaches Bossfang
- **THEN** Bossfang reconciles with the original verified owner (subject/tenant), workspace, admission ID and expected runtime epoch before any further action; it does not change identity, create a fresh admission or claim that no effect occurred.

### Requirement: Exact retry respects provider retention
Within the advertised epoch and retention window, repeating the same owner/workspace/admission and exact request SHALL identify the same execution. Reusing the identity with changed payload MUST conflict. Credential renewal MUST NOT be treated as an exact retry.

#### Scenario: Frozen receipt
- **WHEN** the exact original request is submitted again
- **THEN** the provider returns the frozen receipt with the original task/run identity and creates no second run or effect.

#### Scenario: Changed payload
- **WHEN** the same owner/workspace/admission and runtime epoch are reused with a semantic field changed
- **THEN** admission returns HTTP 409 and admission_digest_conflict, with no new run or effect.

#### Scenario: Original request cannot be safely reconstructed
- **WHEN** credential material or other payload state has changed after an uncertain submission
- **THEN** Bossfang reconciles the original admission; it does not submit a changed body as an exact retry or persist plaintext credentials to enable retry.

### Requirement: Observation cannot create work
Interrupted stream observation SHALL reconnect to the same task/run and supported cursor. Events SHALL be interpreted as observations of the owning harness. Observer disconnect or detach MUST NOT imply cancellation, completion or resubmission.

#### Scenario: Stream interrupted after an effect
- **WHEN** an event connection fails after UAR performs an invocation
- **THEN** reconnection observes the same execution, deduplicates presentation by stable identity/cursor and creates no new model request, run or invocation.

#### Scenario: Replay retention is exhausted
- **WHEN** the requested cursor is outside advertised retention
- **THEN** the adapter reconciles authoritative status and explicitly reports any transcript gap; it does not infer missing effects or replay the job.

### Requirement: Observation deduplication has an execution-scoped key
Presentation SHALL deduplicate by runtime epoch, task ID, run ID and numeric SSE event ID. The attempt record SHALL persist its last applied cursor atomically with the corresponding product event/outcome update. Reconnect SHALL request events after that cursor. A cursor MUST NOT be reused across epochs or executions.

#### Scenario: Repeated or missing event identity
- **WHEN** the same execution replays an event whose numeric ID is at or below its persisted cursor
- **THEN** it is not applied to presentation again; a forward gap or malformed/missing ID is surfaced for status reconciliation rather than assigned a fabricated ID or converted into executable work.

### Requirement: Cancellation preserves real outcomes
Cancellation SHALL target the exact authorized task/run. The product MUST distinguish request, acknowledgement, terminal state and uncertain cleanup. Cancellation MUST NOT guarantee that an already in-flight external effect was undone.

#### Scenario: Cancel races with completion
- **WHEN** cancellation arrives while an external effect or terminal result is in flight
- **THEN** Bossfang records the authoritative result or unknown outcome without restarting the attempt or claiming the effect was rolled back.

#### Scenario: Cross-owner cancellation
- **WHEN** a principal targets another owner's execution without authority
- **THEN** cancellation is denied and the target execution is not changed.

### Requirement: Recovery capabilities constrain scheduling
The product SHALL compare required recovery semantics with provider capabilities before admission. Lost epoch, unavailable retained admission, or uncertain external effects MUST NOT trigger automatic re-execution. A release requiring durable recovery MUST remain blocked until that capability is separately specified, implemented and verified.

#### Scenario: Restart with process-ephemeral provider
- **WHEN** UAR restarts and reports a new epoch while a previous attempt is unresolved
- **THEN** the previous attempt becomes recovery-unsupported or outcome-unknown, pending explicit reconciliation; it is never silently resubmitted.

#### Scenario: Durable recovery is required
- **WHEN** a scheduled job requires recovery across process restart but the provider advertises none
- **THEN** the job is rejected before admission rather than accepted with weakened semantics.

### Requirement: Approval and history retain their authorities
Bossfang SHALL route exact approval requests and decisions to the owning UAR execution. Product transcripts MUST remain distinct from executable checkpoints. Human-visible status MUST retain unsupported and unknown outcomes.

#### Scenario: Delegated approval
- **WHEN** UAR requests a decision for an identified pending invocation
- **THEN** Bossfang returns that exact approval identity and task revision under the same owner; an old UI decision cannot approve a newer invocation.

#### Scenario: Transcript import
- **WHEN** product conversation history is restored or displayed
- **THEN** historical tool events remain observations and cannot execute as recovery commands.
