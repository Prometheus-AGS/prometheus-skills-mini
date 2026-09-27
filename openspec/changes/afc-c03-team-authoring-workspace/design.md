## Context

See `proposal.md` for motivation and `specs/agent-team-management/spec.md` for observable behavior. The current creator accepts a complete inline package graph, compiles immutable draft.1 documents, writes definition files plus a manifest, diffs two complete inline packages, and deploys through UAR collaboration package and binding endpoints. Its compiler is already 434 lines and performs selected manual checks; the feature must be partitioned before adding workspace I/O, draft.2 validation, migration, and graph diagnostics.

This repository is the Windows-native consumer. UAR owns the collaboration profile and runtime support. Initiative `afc-c03-lossless-definitions-and-collaboration-document-profile` owns the cross-product requirements; this change is the mini repository child for C03.1-C03.3. A reviewed, immutable UAR `0.1.0-draft.2` schema checkpoint is a provider dependency, not content this repository may invent. Full-pack parity has a separate repository writer.

## Goals / Non-Goals

**Goals:**

- Make large canonical team graphs authorable and maintainable through small file-level operations and bounded guidance.
- Preserve the current inline request and legacy export paths while migrating their supported semantics into draft.2 with field-level diagnostics.
- Enforce complete provider-schema and cross-document graph correctness before package writes or deployment.
- Reuse the existing explicit UAR package/binding transport and immutable deployment sequence.
- Ship self-contained Node.js artifacts and generated distribution copies that run on Windows without a runtime package install.

**Non-Goals:**

- Defining or modifying the UAR draft.2 profile, UAR persistence, activation, scheduler, or RepresentationGrant store.
- Turning the local task ledger into UAR team authority or changing its flat active-role task model.
- Removing draft.1 readers, the inline package carrier, or legacy `export --target uar` in this change.
- Implementing the full-pack mirror from the mini worktree.
- Adding a service, port, shell, Python, symlink, executable-bit contract, or browser UI.

## Decisions

### 1. Consume a versioned provider checkpoint

Add the accepted UAR draft.2 schema family as byte-identical versioned data beneath the creator schema directory and record its UAR commit in the schema README and final receipt. Keep the existing draft.1 snapshot available to read and migrate old inputs. Draft.2 package generation remains blocked until the provider checkpoint exists and its copied bytes match.

This avoids silently relabeling draft.1 as draft.2. Locally extending the copied schemas was rejected because it would create a second schema authority and could let mini advertise semantics UAR does not accept.

### 2. Use an explicit indexed workspace with one document per file

An author selects a workspace directory explicitly. Its `workspace.json` index names the package identity, target profile, manifest source, and relative definition paths. Source documents live separately under `agents/`, `teams/`, and `workflows/`; deployment bindings remain outside the portable package workspace. Paths are normalized and checked for containment and case-insensitive collisions. Writes use a same-directory temporary file followed by rename and never overwrite an existing package version.

The workspace is inspectable business state rather than implicit CLI or model context. A database was rejected because files already match package granularity, remain portable, and do not add a resident service. A single large source JSON document was rejected because every edit and response would again require the complete graph.

### 3. Preserve inline input through an adapter

The current inline authoring envelope remains a supported carrier. The adapter normalizes it into the same in-memory workspace graph used by file-backed commands. Draft.1 canonical documents and legacy AgentArtifact/flat team inputs pass through migration before draft.2 compilation; existing compiled draft.1 packages remain readable and are never rewritten in place.

Maintaining two compilers was rejected because their validation and digest behavior would drift. The workspace graph is the sole draft.2 compilation input after normalization.

### 4. Partition the package capability before adding behavior

Keep `runtime/src/uar-package.mts` as a thin public entry point and partition implementation under `runtime/src/uar-package/` by responsibility:

- workspace loading, containment, and atomic source writes;
- profile validation and provider-schema identity;
- graph indexing and semantic reference validation;
- migration and field diagnostics;
- canonical package compilation and immutable file output;
- version maintenance and field-path diffing.

`guidance.mts`, `types.mts`, and `cli.mts` retain only their existing responsibilities and delegate to this capability. This follows the 500-line rule and prevents workspace I/O, schema validation, transport, and guidance from becoming one module. A generic utilities folder was rejected by the feature architecture rule.

### 5. Validate schema first, graph second, support last

Build the accepted provider schemas into self-contained validation artifacts that ship with the compiled `.mjs` files, so packaged execution has no external runtime dependency. Validation occurs in three ordered passes:

1. draft.2 document and workspace schema validation with JSON Pointer diagnostics;
2. graph validation for one TeamDefinition entrypoint, kind-correct immutable references, coordinator and role relationships, workflow roles, cycles, limits, exact versions, and digests;
3. support validation against mini's declared conversion support and the target UAR capability/preflight response.

Required capabilities or extensions unsupported by either consumer or provider become `required-unsupported` and block export/preflight. Optional unsupported content remains in preserved source material and is never described as effective. Hand-written selective top-level checks were rejected because they already leave nested profile fields unvalidated.

### 6. Make guidance a projection of workspace diagnostics

Creation questions follow the graph in dependency order: package and top-level team, members and their kinds/cardinality/responsibility, coordinator and communication, each agent's child permissions/skills/models/context/limits, nested team membership, workflows and steps, then aggregate policy and deployment binding intent. Each guidance call asks one question and names a source path plus field path.

Status returns counts, completeness, one next question, and a bounded diagnostic page with deterministic continuation information. It does not return full documents. This keeps authoring context proportional to unresolved work rather than graph size and leaves every automated suggestion inspectable and editable in files.

### 7. Emit lossless migration receipts

Migration produces a durable receipt whose entries include source path, source field pointer, disposition (`exact`, `translated`, `optional-unsupported`, or `required-unsupported`), target document/pointer when present, and reason. The original descriptor is preserved only as non-executable migration material after applying the same secret/private-authority exclusion used for packages.

Skill identity, version, digest, required flag, and configuration are compared field by field. Draft.2 collaboration fields receive the same treatment. A summarized warning string was rejected because it cannot prove which mandatory semantics survived.

### 8. Keep maintenance immutable and deployment explicit

Starting a revision creates a new semantic-version workspace from an existing source or compiled version and refuses an existing destination. Directory-to-directory diff reports document identities and JSON Pointer changes without embedding whole documents. Package installation completes before a deployment binding compare-and-swap update; rollback selects an already installed prior package and writes a new binding revision.

The existing UAR client remains the transport seam unless the accepted draft.2 checkpoint changes the versioned routes. A combined hidden deploy transaction was rejected because package installation and private binding authority have different review and rollback boundaries.

### 9. Generate once from canonical TypeScript sources

Production source changes remain under `skills/agent-team-creator/runtime/src` and compile through the existing TypeScript 7 build into `scripts/*.mjs`; test sources compile into `tests/*.mjs`. The repository distribution generator refreshes both Claude and Codex plugin copies. Generated scripts, tests, or distributions are never edited independently. The skill procedure, UAR references, intake examples, `docs/agent-teams.md`, and the Docusaurus agent-team page describe the same file-backed and inline flows.

### 10. Use one final real-boundary acceptance gate

After all production code, generated artifacts, fixtures, distributions, and docs are complete, one final gate uses the packaged creator to:

- migrate a legacy fixture and inspect field-level dispositions;
- author a root team with multiple agents, a permitted child, nested subteam, and workflow from separate files;
- build and reload an exact draft.2 package;
- reject wrong-kind, cyclic, required-unsupported, secret, and private-grant package inputs;
- initialize and diff a new immutable version;
- call live UAR capabilities, package preflight/install/status, and binding preflight/create-or-update/status;
- compare exact package, file, schema, and binding digests and record the connected UAR's activation support truthfully.

The gate records the host/platform and exact revisions. A Windows claim requires the packaged path to run on Windows; a passing non-Windows live gate cannot certify Windows by inference. Unit tests and documentation builds remain compatibility checks inside the final boundary, not separate completion claims.

The immutable schema input is UAR commit `41375cf6cd137a8a825be102c49516211c3fa2e5`; it is not the runtime under test. Commit `a64bafbb3d4cc54a22a5eecef2362300a959de62` is the first draft.2 runtime ancestor and is likewise not final execution evidence. At execution time the runner resolves the supplied executable-checkpoint ref against the supplied UAR root, requires it to equal frozen final C03 production head `fba2b34a6449c501b0ad9de29936eb63f5726843`, and records all three identities plus the executable byte digest. It installs and exports the creator-authored top-level team package, then uses a separate single-Agent provider-schema fixture for the ordinary binding/run path because the current UAR binding executor requires exactly one `AgentDefinition` entrypoint. One canonical receipt is serialized byte-identically to the mini, full-pack, and UAR evidence destinations.

## Risks / Trade-offs

- **Draft.2 is not yet present in the inspected repositories** → keep schema-import and implementation tasks blocked on an immutable reviewed UAR checkpoint; never synthesize the profile locally.
- **Legacy fields may have no effective draft.2 mapping** → preserve non-secret source material, emit a field-level disposition, and refuse required loss.
- **Generated validation can drift from provider schemas** → bind generator input and output hashes to the provider revision and verify packaged copies against canonical generated output.
- **Large graphs can still produce many diagnostics** → page diagnostics deterministically and keep ordinary guidance to one next question.
- **Cross-pack copies can diverge** → mini owns the strict portable implementation; the full-pack owner mirrors frozen canonical bytes and runs its own repository gate.
- **UAR can accept a package but lack activation** → report capability and installed-catalog evidence separately and make no execution claim.

## Migration Plan

1. Record the initiative C03 link, accepted UAR draft.2 source revision, schema byte hashes, and mini baseline before production work begins.
2. Add versioned schemas, workspace and migration contracts, then implement the partitioned canonical pipeline while retaining draft.1 readers and inline normalization.
3. Add immutable maintenance and wire existing deployment commands to draft.2 capability/preflight diagnostics.
4. Update canonical skill guidance, examples, documentation, compiled `.mjs` files, tests, and both generated distributions.
5. Run the single final gate and retain its exact receipts. Do not advertise draft.2 support while any mandatory gate row is unproven.

Rollback removes the new draft.2 authoring entry points and restores the prior generated payload, while leaving every previously written draft.1 package and every separately installed UAR package untouched. A binding changed during acceptance is rolled back through a new compare-and-swap revision selecting its prior installed package; issued external effects are not reversed by source rollback.
