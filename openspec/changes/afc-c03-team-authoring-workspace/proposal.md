## Why

The merged agent-team creator can compile and deploy canonical UAR packages, but authors must supply the entire definition graph inline and its partial graph checks do not establish a top-level team or kind-correct nested references. Initiative `afc-c03-lossless-definitions-and-collaboration-document-profile` requires this repository to preserve required semantics, diagnose required loss, and consume the provider-owned UAR collaboration `0.1.0-draft.2` contract without creating a competing runtime schema.

## What Changes

- Add a file-backed, incrementally editable authoring workspace for one top-level team, multiple agents, permitted child agents, nested subteams, and workflows while preserving the existing inline authoring request.
- Guide authors through bounded missing-field and graph questions, returning concise status and diagnostics rather than repeating the complete definition graph.
- Consume an immutable UAR `0.1.0-draft.2` schema checkpoint and enforce top-level entrypoint, reference-kind, acyclic dependency, workflow-role, exact-version, and exact-digest semantics.
- Add lossless legacy migration diagnostics that distinguish preserved, translated, optional-unsupported, and required-unsupported fields; required loss blocks package export or deployment preflight.
- Extend immutable maintenance to initialize a new package version and compare file-backed versions without rewriting an installed version.
- Keep deployment bindings, credential references, and representation-grant references separate from portable packages; packages contain neither grants, secrets, nor installed authority.
- Regenerate TypeScript 7 compiled `.mjs` files and both packaged distributions, update skill and site documentation, and prove the complete path with one final live UAR integration gate.
- Preserve Windows-native Node.js >=22 execution and add no shell, Python, symlink, executable-bit, daemon, or port dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-team-management`: Add bounded file-backed canonical team authoring, lossless migration diagnostics, nested graph validation, immutable maintenance, and UAR draft.2 deployment behavior while retaining inline authoring compatibility.

## Impact

The change affects `skills/agent-team-creator` authoring assets, local schemas, TypeScript runtime sources, compiled scripts, integration fixtures, creator/manage/handoff guidance, generated Claude and Codex distributions, and agent-team documentation. UAR remains the collaboration schema and runtime authority; this change consumes its reviewed draft.2 checkpoint through the existing collaboration preflight/install/binding API and does not add a service or activation engine. Full-pack parity is a separately owned repository change and is not written from this worktree.
