# Change: Author, maintain, and deploy agent teams to UAR

## Why

The current creator stages several legacy agent registrations but cannot represent the approved UAR team definition, maintain immutable versions, or install a team package safely.

## What changes

- Ask for missing team topology, workflow, limit, model/skill, deployment, and maintenance facts.
- Author the approved AgentDefinition, TeamDefinition, WorkflowDefinition, PackageManifest, and binding template.
- Maintain teams by creating a new immutable version and migration preview.
- Preflight/install packages and create/read deployment bindings against a selected UAR instance.
- Keep activation unavailable until the runtime advertises durable team execution.

## Impact

The TypeScript source and compiled Node `.mjs` payload change together. Windows-native and full-pack parity are required. Secret values are never stored in portable inputs or receipts.
