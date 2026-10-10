# native-tool-admission Specification

## Purpose
Bind UAR-owned native execution to the desktop host's exact admission record and prove that discovery reaches an authorized MCP effect through one authoritative agent loop.

## Requirements

### Requirement: Versioned execution authority
The admission interface SHALL require protocol version 2 and a source-derived executionKind of runtime_native or host_mcp, bound to the immutable invocation and receipt. Missing, unknown, mismatched or version-1 authority MUST fail before execution without compatibility fallback.

#### Scenario: Coordinated strict cutover
- **WHEN** a caller supplies version 1, omits executionKind, or disagrees with the prepared source or receipt
- **THEN** admission refuses with a fixed nonsecret protocol error and neither executor dispatches an effect

#### Scenario: Source determines execution ownership
- **WHEN** the resolved tool is owned by UAR's native executor or by a mounted MCP receiver
- **THEN** preparation assigns runtime_native or host_mcp respectively and a caller cannot change that assignment

### Requirement: Consuming native claim
UAR-owned native execution SHALL require acknowledgment of one consuming host claim for its exact authorized runtime_native invocation. Nonconsuming revalidation MUST NOT permit native execution; native claims MUST NOT authorize MCP transport effects.

#### Scenario: Native discovery consumes its admission
- **WHEN** an approved native discovery invocation has valid current authority and the host durably acknowledges its consuming claim
- **THEN** UAR executes it once and its terminal result refers to that claimed admission

#### Scenario: Wrong executor cannot consume authority
- **WHEN** a native claim is attempted for host_mcp or an MCP call carries runtime_native authority
- **THEN** the host refuses before either tool body or MCP transport executes

### Requirement: Preserve exact approvals and live authority
Both claim kinds SHALL preserve owner, run, invocation, arguments, source, policy revision, lease and budget checks and exact human approval requirements. Discovery MUST NOT grant approval or resource credentials to the later target invocation.

#### Scenario: Discovery and target have distinct approvals
- **WHEN** the deferred desktop profile discovers and subsequently proposes its target under the existing Ask policy
- **THEN** each invocation requires its own exact approval ID, with two admissions and two approvals but one target effect

#### Scenario: Changed or revoked authority
- **WHEN** identity, arguments, source, policy revision, approval ID, lease or budget differs at claim time
- **THEN** execution is refused before an effect and no earlier approval is substituted

### Requirement: Durable single consumption
Claim intent and host claim state SHALL be persisted before native dispatch. Concurrent or repeated claims MUST NOT dispatch the same invocation twice; terminal completion MUST require a previously claimed record for either execution kind.

#### Scenario: Repeated native claim
- **WHEN** the same authorized native invocation is submitted concurrently or retried after consumption
- **THEN** only one claim can authorize execution and subsequent attempts cannot create another effect

#### Scenario: Unclaimed finish
- **WHEN** a prepared or authorized admission is presented directly for finish
- **THEN** the terminal operation refuses without treating it as an executed tool

#### Scenario: Persistence fails before execution
- **WHEN** UAR claim-intent persistence or host consuming-claim persistence fails
- **THEN** no native effect is dispatched and the failure does not become an executable admission

### Requirement: Uncertain outcomes require reconciliation
Lost claim acknowledgments, cancellation races and failed terminal persistence SHALL retain inspectable uncertainty without automatic effect replay. Confirmed preclaim cancellation MUST prevent dispatch; consuming a claim MUST NOT be reported as rolling back an effect.

#### Scenario: Consumed claim acknowledgment is lost
- **WHEN** the host consumes a native claim but UAR cannot confirm its acknowledgment or cancellation
- **THEN** UAR does not execute or retry the effect and retains unknown outcome requiring reconciliation

#### Scenario: Cancellation and dispatch race
- **WHEN** cancellation becomes observable before native dispatch, including after claim acknowledgment
- **THEN** dispatch is prevented and any consumed claim retains its truthful claimed or unknown disposition

#### Scenario: Terminal persistence failure
- **WHEN** native execution completes but its terminal result cannot be persisted
- **THEN** the execution remains visibly unresolved with terminal-persistence failure evidence and no automatic replay

### Requirement: Restart does not revive authority
After a restart, prior live admissions SHALL remain unsupported or unknown pending reconciliation. Version-1 or kindless persisted history MUST NOT become executable version-2 authority; completed history SHALL remain inspectable without granting a new execution capability.

#### Scenario: Interrupted admission after restart
- **WHEN** the host or UAR restarts with a previously live or uncertain admission
- **THEN** it reports unsupported or unknown reconciliation status and refuses to replay its effect

### Requirement: Correlated discovery stays inside one loop
The controlled acceptance provider SHALL request only advertised tools and correlate discovery and target results to their received tool-call IDs. Missing advertisement, history or correlation MUST produce a finite acceptance failure rather than ordinary success or an additional execution loop.

#### Scenario: Deferred advertisement
- **WHEN** the target is absent initially and discovery is advertised
- **THEN** the provider requests discovery once, consumes its matching result, and proposes the target only when it appears in a subsequent advertised catalog

#### Scenario: Unrelated tool result
- **WHEN** history contains a result for another call or lacks the expected discovery or target result
- **THEN** the provider does not count the target as completed and records only a fixed failure category

### Requirement: Deterministic desktop acceptance
Acceptance SHALL exercise eager and deferred selected-server catalogs through actual desktop preparation, UAR execution, exact approvals and the mounted MCP receiver. Positive preparation, approval and effect counts MUST be source-specific; filler dispatch MUST fail before target effect accounting.

#### Scenario: Eager target
- **WHEN** the normal selected-server catalog contains the target initially
- **THEN** acceptance observes no discovery call, one target admission, one exact target approval and one target effect

#### Scenario: Deferred target
- **WHEN** 32 eligible selected-server fillers precede the target and its unique discovery query selects only that target
- **THEN** acceptance observes one discovery, one later target proposal, two total admissions and exact approvals, and one target effect

### Requirement: Retain projection and evidence constraints
Acceptance SHALL retain existing success, error, split-event, partial-stream, reconnect, cancellation, persistence and approval projection assertions. Evidence MUST use finite secret-free categories, booleans and counts, bind fresh development artifacts to exact sources, and distinguish unrun branches from passing ones.

#### Scenario: Original negative controls remain effective
- **WHEN** the existing projection gate exercises any retained negative control
- **THEN** its original leakage and refusal assertions remain mandatory and no raw credential, model body or sensitive error is written into evidence

#### Scenario: Stale artifact
- **WHEN** a sidecar or desktop bundle does not match the completed source manifest
- **THEN** it cannot certify this change and acceptance remains pending until fresh matching artifacts are used
