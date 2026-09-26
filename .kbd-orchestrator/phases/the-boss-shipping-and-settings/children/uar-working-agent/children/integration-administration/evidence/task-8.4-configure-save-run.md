# Task 8.4 — configure, save, and run a catalog agent

## Delivered behavior

- The Boss can adopt a native UAR catalog definition into its normal Agent runtime without replacing the catalog artifact with the reduced Boss definition.
- The UAR administration page saves the catalog definition and skill bindings together, selects the UAR provider/model, Boss fallback model, presentation policy, and target conversation workspace, then creates or reuses a normal Boss Agent session.
- The operator sees the effective catalog revision, model identity, and presentation before admission. Validation, save, admission, and execution failures remain attached to their stage.
- Unsaved drafts survive failed saves and navigation prompts offer save, discard, or continue editing. The selected agent is retained in the route; import and duplicate clear stale route identity, and duplicate retains skill bindings.
- All 13 shipped locale catalogs contain the new workflow strings with matching interpolation placeholders.

## Production boundary verification

- Repository: `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar`
- Commit: `2fa0b4b87f`
- Command: `pnpm build`
- Result: PASS. Node, web, AI core, E2E TypeScript, Electron main/preload/renderer, and utility-process production builds completed.
- Static locale comparison: PASS before the production build; 13 locales, 69 catalog keys, interpolation placeholders matched.
- No unit or per-edit test suites were run. Gate V covers the connected production workflow once Task 8.4 is complete.

## Security boundary

Catalog adoption crosses the renderer-to-main IPC boundary. The renderer supplies only schema-validated catalog, model, presentation, skill, and workspace selections. The main process re-reads the registered catalog revision, resolves the executable definition, creates or updates the Boss-owned Agent, and writes the trusted catalog-authoritative link. The renderer cannot provide a principal, executable path, or sidecar URL.
