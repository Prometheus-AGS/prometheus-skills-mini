# Spec Delta

## Purpose

Keep resource credentials, delegated identities and effect authorization within their intended HTTP or process trust boundaries without leaking credentials into agent-visible output.

## ADDED Requirements

### Requirement: Named receiver authorization contract
Each supported remote MCP receiver SHALL have a recorded issuer or opaque-token validator, audience/resource identifier, scope/action policy, tenant and actor model, acquisition/refresh/revocation flow, credential custodian and deployment owner. Remote certification MUST remain blocked for unnamed receivers.

#### Scenario: Receiver is unspecified
- **WHEN** a deployment requests certification without a receiver and identity-provider contract
- **THEN** its status remains blocked on REMOTE-RECEIVER-INVENTORY; passing a label-token fixture cannot certify it.

### Requirement: Host resolves resource credentials
An authenticated host SHALL own resource credential acquisition and lifecycle. UAR SHALL consume an immutable finite grant scoped to the verified owner, run, registered destination and permitted actions. Inbound UAR login credentials MUST NOT be forwarded to arbitrary MCP destinations.

#### Scenario: Wrong destination or insufficient grant
- **WHEN** a grant targets an unregistered destination, another owner/run, an unpermitted action or an expired lease
- **THEN** UAR denies invocation before the outgoing request and no effect occurs.

#### Scenario: Resource-specific acquisition
- **WHEN** the receiver supports a documented authorization flow
- **THEN** the host obtains credentials for that resource, with explicit service or delegated-user identity; token exchange is used only if its authorization server supports the required delegation contract.

### Requirement: Receiver enforces its own token authority
An HTTP MCP receiver SHALL validate its actual credential independently of UAR grant assertions and enforce tenant/action authorization. JWT and opaque access-token validation MUST follow their declared receiver contract. Approval capabilities, sidecar credentials and provider API keys MUST NOT be treated as interchangeable resource tokens.

#### Scenario: Wrong audience or expired resource token
- **WHEN** a valid UAR caller and otherwise admitted grant carry a token for another audience, an expired token beyond receiver tolerance, or insufficient resource scope
- **THEN** the receiving server denies the request with no resource effect, independently of UAR's login-token validity.

#### Scenario: Forged tenant argument
- **WHEN** tool arguments or headers name a tenant other than the receiver's verified principal tenant
- **THEN** the receiver denies cross-tenant access and emits no foreign data or effect.

### Requirement: Receiver principal is derived from verified resource authority
The receiver SHALL derive ResourcePrincipal fields subject, tenant_id, actor (optional), scopes, issuer, resource and validation_kind from a validated resource JWT or authenticated active-token introspection using its named claim mapping. Request/model fields MUST NOT populate those fields. This initial profile MUST deny cross-tenant access rather than assume cross-tenant delegation.

#### Scenario: Canonical verified principal
- **WHEN** a named receiver validates an issuer-signed resource JWT or an active introspection response and maps its tenant/subject/actor/scopes
- **THEN** its isolated acceptance trace exposes the canonical ResourcePrincipal without raw token data; a forged tenant header cannot replace the verified tenant, and an operation targeting another tenant is denied even if UAR supplied a permissive grant.

### Requirement: Credentials remain isolated across runs
Connection reuse SHALL retain owner/run and credential-revision isolation. Expired grants MUST stop new effects. Refresh MUST NOT replace an active run's captured credential implicitly. Renewal requiring a new run MUST first reconcile the old attempt.

#### Scenario: Two owners and credential reuse
- **WHEN** runs A and B use the same server configuration with different owners or credentials
- **THEN** their connections and credential snapshots do not cross over, and renewal for B cannot change A's authority.

#### Scenario: Expiry during a run
- **WHEN** the lease expires before the next invocation
- **THEN** no new effect is admitted; an already in-flight effect keeps its actual or unknown outcome and is not automatically replayed.

### Requirement: Secret storage has explicit custody
Resource credential persistence SHALL require an approved owner/tenant-scoped encrypted storage adapter, key custody, rotation, deletion and access policy. Missing secure storage MUST fail closed. Existing provider-key schemas MUST NOT silently become generic resource-token vaults.

#### Scenario: Storage choice is unresolved
- **WHEN** remote resource refresh credentials require persistence but their custodian or adapter is unselected
- **THEN** persistence and receiver-specific implementation remain blocked on REMOTE-RESOURCE-SECRET-STORE; no plaintext fallback or new daemon is introduced.

#### Scenario: Rotation and deletion
- **WHEN** the selected custodian rotates or revokes a resource credential
- **THEN** the old reference cannot authorize a new lease, owner/tenant isolation is preserved, and the recorded deletion/retention policy is enforced without exposing plaintext.

### Requirement: Bossfang inbound identity is classified
Bossfang MCP requests SHALL preserve an authenticated subject and any verified delegated actor/tenant separately from agent context. Attribution SHALL identify trusted-local operator, service, or delegated-user mode without secrets. An agent identifier MUST NOT create user authority.

#### Scenario: Legitimate modes and forged context
- **WHEN** configured local operator/service and delegated-user requests exercise their authorized agent context
- **THEN** their non-secret attribution identifies the correct mode and authority; forged actor/tenant or unauthorized agent context is denied with no effect.

#### Scenario: Remote unauthenticated mode
- **WHEN** Bossfang is configured as a remote multi-user receiver
- **THEN** no-auth root behavior is unavailable; missing authentication cannot become an operator or delegated user.

### Requirement: Bossfang attribution is inspectable
Bossfang SHALL retain a non-secret request attribution record with mode, authenticated_subject, verified_tenant (when applicable), verified_actor (when delegated), authorized_agent_id, authn_source and policy_revision. Request headers MUST NOT overwrite verified fields. Delegated remote mode MUST fail closed if required verification is unavailable.

#### Scenario: Attribution assertions
- **WHEN** local, service and delegated-user acceptance fixtures pass authentication and agent authorization
- **THEN** their request-context records have the declared mode and verified identifiers; forged input either is rejected or leaves those fields unchanged, with no unauthorized effect and no credential in the record.

### Requirement: Stdio uses process isolation semantics
Stdio execution SHALL use an allowlisted captured environment and supervised child process under the declared local or tenant OS authority. HTTP JWT forwarding MUST NOT be assumed. Required sandbox or tenant isolation capabilities MUST be rejected when unavailable.

#### Scenario: Environment and termination
- **WHEN** a safe stdio fixture starts while unrelated provider credentials exist in the parent environment
- **THEN** only declared variables reach the child, and cancellation/shutdown produces a recorded termination or cleanup-uncertain outcome without silent rerun.

#### Scenario: Required sandbox unavailable
- **WHEN** a job requires an OS sandbox that the runtime cannot provide
- **THEN** admission rejects that capability before spawning rather than labeling an unsandboxed child isolated.

### Requirement: Credential data is excluded from ordinary projections
System-held credential values SHALL be excluded from ordinary logs, persisted events, error diagnostics and model-bound messages. Tool results SHALL be treated as untrusted output; known credential echoes MUST be redacted before ordinary persistence or model projection. This MUST NOT be represented as general sensitive-data detection.

#### Scenario: Controlled credential canary
- **WHEN** distinct synthetic canaries are supplied through login, provider, resource-header, environment and error paths
- **THEN** each ordinary log, persisted event and model input contains no system-held canary, while authorized transport and the selected secret store retain only their permitted values.

#### Scenario: Tool deliberately echoes a credential
- **WHEN** a fixture returns a known active credential canary in tool output
- **THEN** the projection boundary removes it from logs, ordinary persistence and model messages and records only a non-secret redaction indication; this result is distinguished from automatic header leakage.

### Requirement: Deployment claims match executed evidence
Local desktop and remote multi-user acceptance SHALL be recorded separately with source revision, configuration class, receiver identity and observed results. Static inspection and fixture evidence MUST NOT be relabeled as installed or production certification.

#### Scenario: Local passes but remote is blocked
- **WHEN** local effect-boundary scenarios pass while a remote receiver or custody contract is missing
- **THEN** local evidence is recorded within scope and remote certification remains blocked; the full phase is not declared delivered.
