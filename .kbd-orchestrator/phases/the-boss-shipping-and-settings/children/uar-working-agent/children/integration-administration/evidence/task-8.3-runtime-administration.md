# Task 8.3 — runtime operations administration

Completed 2026-09-24 at the phase change boundary.

## Production behavior

- UAR now exposes owner-scoped run inventory and curated run inspection without returning run input, prompt text, full context, or credentials.
- The Boss now provides functional Runs, Knowledge, Tools, Security, and Protocols administration surfaces through typed main-process IPC.
- Run administration includes state, cancellation, checkpoints, effective runtime context, prompt-cache statistics, and contextual conversation-policy editing/reset.
- Knowledge administration includes knowledge-base create/delete, native-dialog document upload, document inspection/delete, and search.
- Memory administration includes owner-scoped create/list/delete when the sidecar capability is enabled, with an explicit unavailable state otherwise.
- Tool and protocol administration reports the host-controlled MCP/tool catalog, governance metadata, credential-presence metadata, A2A/ACP availability, and federated agents/skills.
- All 13 existing renderer locale catalogs contain the 54 new application-authored strings with matching interpolation placeholders.

## Security boundaries

- The trusted main process derives the UAR owner from an existing runtime session; the renderer cannot supply or inspect the UAR principal.
- The UAR admin key stays in the main process. Renderer IPC is an exact allowlist and cannot issue arbitrary paths or methods.
- Credential administration exposes provider identifiers and presence metadata only. Secrets are neither returned nor logged.
- Document upload stays behind the native Electron file dialog and the fixed UAR multipart route.

## Change-boundary verification

- UAR: `cargo build --bin uar-sidecar` — PASS, dev binary completed in 7m03s.
- The Boss: `pnpm build` — PASS after correcting the settings panel to use the repository's `Textarea.Input` component contract. TypeScript, main, preload, renderer, and utility-process production builds completed.
- `git diff --check` — PASS in both implementation repositories before commit.
- No unit or per-edit test suite was run. Gate V remains the single integration boundary for the complete catalog-to-conversation workflow after Task 8.4.

## Commits

- universal-agent-runtime: `19e2ad15` — `feat(run-admin): add owner-scoped inspection`
- The Boss: `767fc34762` — `feat(uar-admin): add runtime operations workspace`
