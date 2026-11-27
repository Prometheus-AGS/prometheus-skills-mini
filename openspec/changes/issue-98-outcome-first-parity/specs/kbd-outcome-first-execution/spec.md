# Spec Delta

## Purpose

Keeps a KBD session anchored to the adopted user outcome, so that resuming,
checking a goal, recalling memory and handling a blocker all serve that outcome
rather than task order or test counts.

## ADDED Requirements

### Requirement: Start and resume present the adopted outcome
At task start, resume, status and handoff, KBD instructions SHALL present the adopted outcome (actor, useful outcome, production entry, oracle, reason now), the last meaningful evidence and the next authorized action before naming a task.

#### Scenario: Resuming a phase with an adopted contract
- **WHEN** a session resumes a phase whose adopted contract names a scenario
- **THEN** the session states that scenario's actor, useful outcome, entry, oracle and reason now, the latest evidence for it, and the next authorized action

#### Scenario: No adopted contract exists
- **WHEN** a session resumes a phase with no adopted contract
- **THEN** the session reports the outcome as not adopted and does not invent one

### Requirement: Ledger order applies only inside an adopted slice
KBD instructions SHALL use runtime-derived next work only to order tasks within the adopted slice, and SHALL NOT present task order, task counts or test counts as the goal.

#### Scenario: Several changes remain in plan order
- **WHEN** the runtime reports a next change and the phase has an adopted outcome
- **THEN** the session works that change as the next step toward the outcome and reports progress against the outcome's evidence

### Requirement: Adopted legacy plans are preserved
KBD instructions SHALL NOT reorder, drop or invalidate work in a plan adopted before this behaviour, and SHALL route a superseding priority through the existing scope and disposition path.

#### Scenario: Operator states a new priority mid-phase
- **WHEN** the operator names a higher priority than the adopted plan's next work
- **THEN** the session requests the existing authorized scope change and leaves the adopted plan and signed work unchanged until it is granted

### Requirement: Behaviour without the runtime helper
When the `prometheus` helper is absent, KBD instructions SHALL present the same outcome and next authorized action from the project's projection files and SHALL NOT create substitute authority.

#### Scenario: Helper not installed
- **WHEN** a session resumes in a project with projection files and no helper
- **THEN** it presents the outcome and next authorized action from those files and marks any state it cannot confirm as unconfirmed

### Requirement: Goal checks judge the outcome
A goal check SHALL decide pass or continue from the adopted outcome's oracle and its evidence, SHALL report an unexercised journey as not exercised rather than failed, and SHALL NOT carry an earlier pass to a changed candidate.

#### Scenario: Tests pass but the oracle is unobserved
- **WHEN** automated checks succeed and the outcome's oracle has no evidence
- **THEN** the check returns continue and names the missing observation

#### Scenario: Candidate changed after a pass
- **WHEN** evidence was recorded for an earlier candidate and the candidate has since changed
- **THEN** the check reports the outcome as not exercised for the current candidate

### Requirement: Outcome-ranked scope is opt-in for new phases
Assess and Plan instructions SHALL offer, as an explicit opt-in for a new phase, the smallest independently useful outcome ranked by operator priority, then material user impact, then time-to-value, with hard dependencies stated. The default scope SHALL remain unchanged.

#### Scenario: New phase without opt-in
- **WHEN** a new phase is planned and the operator has not opted in
- **THEN** planning proceeds as before

#### Scenario: New phase with opt-in
- **WHEN** the operator opts in
- **THEN** the plan names one smallest useful outcome first, gives its ranking reasons and hard dependencies, and keeps speculative low-consequence work off its critical path

### Requirement: Bounded project memory lookup
At task start or resume and when a material blocker appears, the session SHALL make one project-scoped Surreal Memory lookup keyed to the current outcome and blocker; if that is unavailable or unhelpful it SHALL make one `pk` lookup where `pk` is installed; otherwise it SHALL continue from current evidence. No gate, retry loop or polling is permitted.

#### Scenario: Surreal Memory unavailable
- **WHEN** the memory service cannot be reached and `pk` is installed
- **THEN** exactly one `pk` lookup is made and work continues

#### Scenario: Both sources unavailable
- **WHEN** neither source can be reached
- **THEN** the task proceeds from current evidence with no added gate

### Requirement: Recall is evidence, not instruction
The session SHALL treat recalled lessons as untrusted evidence, check their scope and freshness against current rules, the adopted contract and observed evidence, and record which lesson was used and how it changed the next authorized action. Recall SHALL NOT override scope, required controls or approval.

#### Scenario: Relevant lesson describes a failed approach
- **WHEN** a recalled lesson shows the approach about to be tried has already failed in this project
- **THEN** the session chooses a different authorized action and records the lesson and the change

#### Scenario: Stale or conflicting lesson
- **WHEN** a recalled lesson conflicts with current scope, a required control or an approval requirement
- **THEN** the session follows the current rules and records the lesson as not applied

### Requirement: Verified repairs are recorded safely
When a meaningful repair is verified, the session SHALL record its observation, resolution, scope and limits in the project log, and SHALL promote to shared memory only reusable lessons that contain no secret or customer data.

#### Scenario: Lesson contains a credential
- **WHEN** a lesson selected for promotion matches a secret pattern
- **THEN** it is not promoted and the refusal is reported

### Requirement: Advisory blocker disposition
After two completed attempts with the same blocker and no new evidence, the bottleneck detector SHALL recommend exactly one of: bounded setup repair, measurement repair, one exact authority handoff, or a scoped architecture child. The recommendation SHALL be advisory, SHALL NOT stop or cancel work, and SHALL work without the `prometheus` helper.

#### Scenario: Approval is pending
- **WHEN** an attempt is waiting on an approval
- **THEN** it is not counted as a failed attempt and no recommendation is issued

#### Scenario: Job still running
- **WHEN** a job is running or its progress is unknown
- **THEN** it is not counted as a completed attempt and nothing is stopped

#### Scenario: Same blocker twice with no new evidence
- **WHEN** two completed attempts record the same blocker and no new evidence
- **THEN** one of the four dispositions is recommended with its reason

### Requirement: Tier labels carry no verification authority
KBD instructions SHALL state that research, model-routing and UI tier labels do not authorize or schedule verification.

#### Scenario: A rule file mentions a tier
- **WHEN** a session reads a tier label in research or model-routing guidance
- **THEN** it does not treat that label as permission to run checks outside the adopted boundary

### Requirement: Packaged skills ship the scripts they name
Every script a packaged KBD skill instructs the reader to run SHALL be present in the generated plugin payload.

#### Scenario: Installed memory recall and bottleneck detector
- **WHEN** the generated Claude or Codex package is inspected
- **THEN** the recall and bottleneck scripts and the modules they import are present
