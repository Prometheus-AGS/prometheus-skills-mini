# Withdrawn F6 requirements — historical text

Withdrawn by direct operator instruction 2026-10-08T23:39:17.118Z. Not active acceptance criteria; no diagnostic result is claimed.

### Requirement: HTTP MCP transport sessions preserve principal ownership
An authenticated principal SHALL access only its own authorized HTTP MCP session operations, including continuation, observation, replay and deletion. Session identifiers MUST NOT confer authority. A rejected cross-principal operation MUST leave the original session usable.

#### Scenario: Authenticated session crossover matrix
- **WHEN** independently authenticated B uses A's valid session ID for POST continuation, GET observation or replay with A's event cursor, or DELETE
- **THEN** each operation returns 403 or non-disclosing 404, reveals no A response/event, produces no effect or A lifecycle mutation, and A's subsequent authorized control operation succeeds.

#### Scenario: Authentication is not bypassed on reuse
- **WHEN** a client reuses a valid session ID with missing or expired credentials
- **THEN** authentication rejects the request before session routing and no session data or effect is released.

### Requirement: Session remediation is evidence-gated
Session-binding remediation SHALL remain blocked until a real production-router two-principal scenario reproduces a violation. A passing matrix SHALL close the hypothesis only with the identified production enforcing layer, valid protocol requests, positive owner controls and negative effect/lifecycle assertions.

#### Scenario: Hypothesis is disproved
- **WHEN** the complete authenticated matrix passes on the existing transport
- **THEN** the receipt identifies the production module/function/code branch that compared authenticated owner with stored session owner (or equivalent tenant-bound session namespace), its 403/non-disclosing404 result and the observed valid A/B controls; JWT validity checks alone are insufficient. No speculative binding rewrite is performed; exact approval migration remains independently required.

#### Scenario: Hypothesis is reproduced
- **WHEN** the complete authenticated matrix demonstrates crossover
- **THEN** the failure is recorded before binding remediation and the same matrix must pass after the complete correction; generic 500 responses or invalid requests cannot count as a passing denial.
