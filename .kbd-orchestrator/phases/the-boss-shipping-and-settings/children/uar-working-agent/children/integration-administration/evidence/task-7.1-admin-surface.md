# Task 7.1 — versioned UAR administration surface

Date: 2026-09-24

## Production changes

- UAR commit `654bdfa7` publishes administration schema revision 1 through
  `GET /api/uar/capabilities`.
- The manifest contains 14 administration destinations and 226 canonical
  method contracts. Each contract records the HTTP verb, canonical path,
  public/admin/owner/host authority and read/live/next-turn/restart/host-controlled
  apply lifecycle.
- Live Axum route inspection corrected ACP streaming to `POST /acp/stream` and
  expanded exact settings namespaces, compiler sessions, skill lifecycle,
  A2UI, run/session policy, memory administration and protocol routes. The
  former generic namespace allowlist entry was removed.
- The Boss commit `a1aabec9e1` parses the versioned manifest in main, projects it
  through an independent 226-entry method/path/scope/apply allowlist and sends
  metadata only through typed IPC. Renderer code receives no arbitrary URL
  execution surface and no UAR credentials.
- `/settings/uar?panel=<surface>` now owns responsive internal administration
  navigation, deep links, search targets, loading/retry states, method coverage,
  access/apply badges and adapter mismatch reporting. Overview retains the
  existing storage and runtime controls.
- Forty-two app strings were translated in all 13 renderer locales with no
  placeholders.

## Boundary verification

This was a complete static compatibility boundary, not a partial behavior test.
No unit suite or standalone Cargo build ran; Rust compilation remains part of
Gate U after tasks 7.2–7.4 complete.

- `pnpm typecheck`: passed for node, web, ai-core and e2e projects.
- Targeted `oxlint --deny-warnings`: passed.
- Targeted ESLint: passed after using the approved IPC barrel and stabilizing
  React hook dependencies.
- `pnpm i18n:sync` followed by `pnpm i18n:check`: passed; 80,002 translations
  checked.
- `git diff --check`: passed for the scoped Boss and UAR changes.
- Impeccable mechanical detector, run once on the completed UAR settings UI:
  zero findings.

## Security boundary

UAR is a loopback sidecar with public, owner, administrator and host-controlled
operations. The renderer is intentionally limited to typed metadata. Later
mutation adapters must select from the main-owned allowlist and attach authority
in main; they must not accept renderer-supplied methods or paths. Secret values
remain outside this snapshot and IPC response.
