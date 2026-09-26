# Task 7.4 evidence — runtime and provider controls

Completed 2026-09-24.

## Production commits

- The Boss `f285c6ac3b` — `feat(uar-admin): add runtime and provider controls`
- Universal Agent Runtime `5dde09bd` — `fix(admin): protect provider administration`

## Delivered boundary

- The UAR settings destination now renders a namespace-driven runtime settings editor that carries saved and effective values, source, drift, revision, apply mode, application status, partial errors, reload, discard and revision-checked bulk save through typed IPC.
- Protected values remain masked and are never resubmitted by the generic editor.
- Providers and Models shows the connected The Boss, gateway and UAR sources, their real operational state, effective model identities and every implemented model-bearing consumer state.
- The Boss and gateway records link to their owning settings destinations. UAR-owned records support create, update, delete, default selection and a user-invoked live provider check.
- Provider credentials use explicit `unchanged`, `set` and `clear` mutations. Secret values cross the renderer boundary only for an explicit set, enter UAR's protected credential storage, and are reduced to presence flags on reads.
- The complete nonsecret UAR provider and model configuration is projected and round-tripped, including disabled records and model capability metadata, so an edit does not replace hidden values with defaults.
- Provider REST reads and writes now require the same protected admin authority advertised by the UAR capability manifest.
- UAR-specific labels and statuses were added with real translations to all 13 locale catalogs. Technical provider names, model IDs, URLs and raw runtime errors remain source-authored.
- Search aliases cover provider credentials, default models, source selection, saved/effective settings and drift.

## Compatibility and persistence

The Boss integration preference document remains schema version 4. Provider configuration and encrypted credentials are owned by UAR; model assignments remain in the existing agent configuration document. No application preference shape changed, so adding a migration would create an unused state transition rather than preserve data.

## Boundary verification

Executed after the complete task was wired into the production call graph:

- `pnpm typecheck:node` — passed.
- `pnpm typecheck:web` — passed.
- targeted `pnpm exec oxlint --deny-warnings ...` over every changed TypeScript/TSX surface — passed.
- `pnpm i18n:check` — passed across 80,717 locale entries.
- `cargo check --bin uar-sidecar` — passed.
- `git diff --check` in The Boss and UAR — passed before commit.

No unit suite or per-edit test loop ran. Gate U is the next task and is the production integration boundary for admin IPC/REST, model consumers, restart behavior, secret mutations, setting application, conflict/partial-save behavior and scope isolation.

## Security boundary

The renderer receives no arbitrary UAR URL fetch surface and no admin key. All operations use closed typed IPC routes in the main process. Provider REST is protected by launch-provisioned admin authority. Ordinary reads disclose credential presence only; secret material is accepted only by the explicit set operation and is never returned or logged.
