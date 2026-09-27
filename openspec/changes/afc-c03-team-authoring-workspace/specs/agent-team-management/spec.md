## ADDED Requirements

### Requirement: File-backed canonical team authoring
The creator SHALL support an explicit file-backed authoring workspace containing one package manifest source and separate AgentDefinition, TeamDefinition, and WorkflowDefinition source documents. It SHALL retain the existing inline authoring request as a compatible input form and SHALL not require authors to submit the complete graph in each edit.

#### Scenario: Incremental team construction
- **WHEN** an author adds or changes one agent, subteam, workflow, or manifest source document
- **THEN** the creator reads the workspace graph, applies that document-level change, and reports the affected identity without echoing unrelated definition bodies

#### Scenario: Existing inline request
- **WHEN** an author submits a previously supported inline authoring envelope
- **THEN** the creator accepts the envelope, applies the applicable profile migration and validation, and produces the same canonical package result or an explicit incompatibility diagnostic

### Requirement: Bounded guided graph questions
The creator SHALL derive guidance from persisted workspace state and ask one concrete missing graph question at a time. Status output SHALL report fixed-size summary counts, the next missing field or relationship, and paged field-level diagnostics without embedding the complete definition graph.

#### Scenario: Partially authored nested team
- **WHEN** the workspace has a top-level team and members but lacks a coordinator, child permission, workflow relationship, skill lock, model requirement, context selection, limit, or budget
- **THEN** the next guidance response asks one question about the earliest missing required value and identifies its source document and field path

#### Scenario: Large definition graph
- **WHEN** the workspace contains many agents, child agents, subteams, and workflows
- **THEN** status output remains bounded, reports totals and truncation or continuation information, and does not serialize every canonical document into the response

### Requirement: Top-level and nested graph integrity
Each package SHALL have exactly one top-level TeamDefinition entrypoint. The creator SHALL enforce kind-correct immutable references, unique member roles, an agent coordinator, permitted-child agent references, workflow references and roles valid for each accepting team, acyclic agent and team dependencies, schema limits, and exact version-and-digest resolution before writing a package.

#### Scenario: Valid nested topology
- **WHEN** a top-level team contains several agent members, an agent permits a child agent, and a member references a nested subteam with an allowed workflow
- **THEN** the creator resolves every reference to the matching definition kind and emits exact versions and digests in the package lock

#### Scenario: Incorrect member kind
- **WHEN** a team member declares kind `agent` but references a TeamDefinition
- **THEN** package validation fails with the member field path, expected kind, and observed kind

#### Scenario: Recursive subteam
- **WHEN** team or permitted-child references form a dependency cycle
- **THEN** package validation fails with the cycle path and writes no compiled package

### Requirement: UAR draft.2 schema authority
The creator SHALL consume byte-identical schemas from an immutable, reviewed UAR collaboration `0.1.0-draft.2` checkpoint and SHALL record that source revision with the packaged schema snapshot. It SHALL validate canonical documents against that profile and SHALL not locally reinterpret, extend, or advertise draft.2 before the provider checkpoint is available.

#### Scenario: Provider checkpoint available
- **WHEN** the accepted UAR draft.2 schema checkpoint is imported
- **THEN** the mini snapshot records the exact source revision and byte identity and generated validation accepts only documents conforming to that profile

#### Scenario: Provider checkpoint absent or mismatched
- **WHEN** the accepted draft.2 revision is unavailable or a copied schema differs from it
- **THEN** generation and package certification fail without falling back to an invented local draft.2 contract

### Requirement: Lossless migration diagnostics
Migration from the flat portable team format, legacy UAR AgentArtifact export, or the prior collaboration profile SHALL preserve source material and classify every mapped field as exact, translated, optional-unsupported, or required-unsupported. Skill identity, version, digest, required flag and configuration and supported collaboration fields SHALL survive migration; any required-unsupported field SHALL prohibit package export and deployment preflight.

#### Scenario: Lossless legacy migration
- **WHEN** a legacy definition contains supported skill configuration and collaboration fields
- **THEN** the migrated draft.2 source retains those values and diagnostics identify their exact target fields

#### Scenario: Required unsupported field
- **WHEN** a legacy or draft.2 definition declares a mandatory capability or extension that the creator or target UAR cannot support
- **THEN** diagnostics identify the source and target field paths and package export or deployment preflight refuses to continue

#### Scenario: Optional unsupported field
- **WHEN** migration encounters an optional field that has no executable draft.2 mapping
- **THEN** the creator preserves the source value as non-executable migration material and reports that it is not effective runtime behavior

### Requirement: Immutable workspace maintenance
Maintenance SHALL create a distinct semantic package version, SHALL never overwrite an existing source or compiled version, and SHALL compare file-backed versions using document identities and field paths. Deployment SHALL install the new immutable package before a binding revision is changed, and rollback SHALL select an already installed earlier package without rewriting it.

#### Scenario: New package version
- **WHEN** an author begins maintenance from an existing package version
- **THEN** the creator initializes a separate version workspace, retains the prior source and compiled package unchanged, and reports added, removed, and changed document fields

#### Scenario: Same-version content change
- **WHEN** revised content is submitted under an existing package semantic version
- **THEN** maintenance refuses the change and leaves the existing version unchanged

### Requirement: Private authority separation
Portable packages and migration artifacts SHALL contain no credential value, installed representation grant, consent evidence, or other installed authority. Deployment bindings SHALL use opaque host credential and representation-grant references, and UAR SHALL independently resolve their current validity during binding or execution.

#### Scenario: Package includes private authority
- **WHEN** source content attempts to place a secret, RepresentationGrant, or consent evidence inside an exported package
- **THEN** export fails with a field-level diagnostic and writes no portable package

#### Scenario: Binding uses private references
- **WHEN** a package is deployed with model credentials or representation authority
- **THEN** the binding carries only opaque references and successful package installation alone confers no authority

### Requirement: Portable generated delivery
The implementation SHALL be authored in TypeScript 7, run on Node.js >=22, and ship generated `.mjs` sources, tests, Claude and Codex distribution copies, and documentation without shell, Python, symlink, executable-bit, extra daemon, or extra port dependencies.

#### Scenario: Packaged Windows execution
- **WHEN** the generated creator is copied from a distribution into a temporary Windows project
- **THEN** file-backed authoring, migration, validation, maintenance, and deployment preflight run through Node without a repository-root import or non-Node script runtime

### Requirement: Final live UAR acceptance
After the complete implementation phase, one integration gate SHALL drive the packaged creator through draft.2 workspace authoring, migration diagnostics, package build, UAR preflight and installation, binding preflight and compare-and-swap update, and exact installed-status inspection. The gate SHALL also observe required-unsupported refusal and private-authority exclusion; it SHALL not claim activation or runtime execution that the connected UAR capability response does not support.

#### Scenario: Complete live boundary
- **WHEN** the final gate runs against the accepted UAR draft.2 endpoint and exact packaged mini artifacts
- **THEN** its receipt records source revisions, schema revision, package and binding digests, observed capability response, refusal outcomes, and any unsupported activation boundary
