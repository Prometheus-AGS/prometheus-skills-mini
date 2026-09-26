# Task 7.2 — settings authority and protected provider credentials

## Production contract completed

- The Boss now provisions a stable UAR settings-administration key and provider-credential encryption key in its existing OS-protected secret file. Neither key is part of the renderer IPC secret schema or any status response.
- The supervised sidecar receives explicit settings-mutation and credential-encryption authority. The Boss main process adds the administration key only for typed, allowlisted settings namespace operations.
- UAR settings responses expose saved and effective values, optimistic revision tokens, source/drift metadata, and live/next-turn/restart application state. Namespace writes require per-field revisions and return structured partial errors without discarding successful fields.
- UAR settings reads now enforce the administration authority advertised by the capability manifest. Server, security, and persistence changes report restart application; governance reports live application.
- Provider API keys are removed from ordinary `provider.*` settings. Existing plaintext rows migrate only after encrypted system-scope storage succeeds; an existing protected record wins, and all non-secret API-authoritative provider fields remain unchanged. New provider writes use the same protected store, and provider status/testing resolves protected credentials without returning them.

## Boundary evidence

- `cargo check --bin uar-sidecar` — passed in the UAR worktree after the final Rust changes.
- `pnpm typecheck:node` — passed in The Boss worktree.
- `pnpm typecheck:web` — passed in The Boss worktree.
- Targeted `oxlint --deny-warnings` over the changed Boss main/shared files — passed.
- `git diff --check` — passed in both repositories.

No unit suite or partial-behavior test loop ran. Gate U remains deferred until tasks 7.3 and 7.4 complete the model consumers and schema-driven UI.

## Security boundaries

- Renderer input remains constrained by the typed IPC namespace and field schemas; it cannot supply an arbitrary UAR path or read either protected authority value.
- Provider plaintext is accepted only at the administration write boundary, encrypted before durable storage, excluded from settings serialization, and never returned by provider or settings responses.
