# Gate A1 — exact tool admission

Gate A1 passed on 2026-09-24 against the active `feat/uar-agent-runtime` Boss worktree and `feat/the-boss-sidecar` UAR worktree.

## Production boundaries

- UAR production binary build passed with `minimal,local-models,document-intelligence,wasm-runtime`.
- The Boss production build passed, including TypeScript checking and Electron main, preload, renderer and utility bundles.
- `git diff --check` passed in both worktrees.

## Integration evidence

- The Boss exact-admission matrix passed all nine host/local policy combinations.
- The matrix rejected replay, mismatched calls, identity-free calls, batch calls and incompatible protocol versions.
- The matrix verified distinct identities for identical calls and verified renderer-safe action projection.
- UAR standalone integration target `tool_admission_integration` passed: one test, zero failures. It demonstrated the same port in standalone mode, an exact authorization receipt, denial without dispatch and no Boss-specific MCP metadata.
- The structured Boss matrix is recorded in `boss-matrix.json` beside this file.

## Corrections made during the boundary build

The first UAR production build exposed a malformed nested match, a non-serializable remote spawn request in an admission path, an invalid digest formatting assumption and a trait-object `Debug` derivation. The implementation was corrected as one batch and the production build passed. The first Boss production build exposed an unused parser import and an untyped admission return value; both were corrected and the production build passed.

The security boundary added in this change is the authenticated loopback admission bridge: authority is held in Boss main, keyed by opaque exact identities, matched against connection-derived owner/workspace/mount state, and never derived from renderer events or display data.
