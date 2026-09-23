# D4 — How UAR ships, runs securely and stores data inside the-boss (revision 3)

Revision 3, 2026-09-23. Revised after two adversarial reviews (round 1: 3 CRITICAL; round 2: 2 CRITICAL), a
transport spike, deep research (package `how-should-a-desktop-electron-20260923-2b0f`) and operator
decisions.

## Decision

**Binary.** `uar-sidecar` built with `minimal,local-models,document-intelligence,wasm-runtime` plus a
`[profile.release]` copied from compass (`lto="thin"`, `codegen-units=1`, `panic="abort"`,
`strip="symbols"`). No hard installer-size limit (operator decision); the measured size per platform is
reported with each release.

**Release pipeline (operator decision, revised in step 2).** UAR's `AGENTS.md` makes GitHub Actions
deployment-only (no development verification, test-disabled builds, `pnpm github-actions-policy:validate`
before and after editing workflows). So a UAR workflow modeled on compass's `compass-release.yml` runs
**only when a release tag is pushed**: it builds all six targets on native GitHub-hosted runners with a
test-disabled build command and publishes archives with per-archive `.sha256` to GitHub Releases.
Breakage is caught by local builds before tagging. the-boss pins release version + checksum in its
integration-binaries manifest. (Supersedes the earlier "build on every push to `main`" answer.)

**Transport.** Loopback TCP on `127.0.0.1`, ephemeral port reported on stdout (`READY:{port}`). A Unix
socket / named pipe was considered and not chosen: the MCP specification and the research treat loopback
plus the controls below as adequate, and UAR has several TCP-address dependencies. The sidecar runs with its
`[::1]` twin listener, A2A gRPC listener and operator UI turned off. A failed security test (falsifier 2)
moves the transport to UDS / named pipes.

**Token handoff — no environment variables.** Two independent 256-bit tokens per launch:
- *host → UAR:* the-boss writes it as the first line on the sidecar's stdin, which the sidecar already keeps
  open to detect shutdown; the sidecar reads it before binding and holds it only in memory.
- *UAR → the-boss MCP endpoints:* a per-launch token sent inside each run-scoped MCP server definition
  (request header), over the already authenticated host→UAR channel (D1).
Neither token goes on the command line, in environment variables, URLs, files, logs, traces or
renderer-reachable IPC; the sidecar spawns its own child processes (stdio MCP servers) with a sanitized
environment and closes its stdin handle for them. Tokens rotate on every sidecar restart.

**Request controls (UAR sidecar port and the-boss MCP endpoints):** `Authorization: Bearer` on every
request including SSE, constant-time comparison; reject any `Host` other than
`127.0.0.1:<port>`/`localhost:<port>`; reject any request carrying `Origin`; no CORS headers; the renderer
never talks to the sidecar (main process proxies over sender-validated IPC); MCP TypeScript SDK ≥ 1.24.0 with
host validation.

**Secret storage (operator decisions).** UAR stops persisting provider API keys (`POST/PUT
/api/uar/providers`) and MCP server `env` secrets (`PUT /api/uar/mcp/servers/{name}`) in plaintext — they go
through UAR's encrypted credential store or are not persisted. A migration at UAR startup encrypts or strips
existing plaintext rows, marks stripped entries visibly as needing re-entry, and logs counts without values.

**Storage.** Shared Docker SurrealDB 3.2.4, namespace `uar`, a namespace-scoped system user (role
`EDITOR`), never root. UAR changes: scoped sign-in (today root-only), a `ws://` remote URL, and a startup
fallback to embedded SurrealKV instead of a hard failure. Features needing SurrealDB ≥ 3.3.0 are not used.

**Fallback data (operator decision).** Data written on the embedded fallback stays local, is marked
local-only in the-boss's UI, and is never merged automatically; an explicit user action moves it later.

**Ordering.** Start now, in parallel with the compass work, in dedicated worktrees.

## Assumptions

- Native GitHub-hosted runners exist for all six targets.
- The full feature set builds on all six targets (risks: `aws-lc-sys`, `onig_sys`, `esaxx-rs`, Tesseract,
  ONNX Runtime on windows-arm64).
- SurrealDB 3.2.4 namespace-scoped users cannot read other namespaces.
- SurrealKV works as a single-process embedded store on Windows despite its documented limits there.

## Falsifier

Named tests in step 2; any failure reopens the named part.

1. **Build:** the tag-triggered release workflow produces a working `uar-sidecar` for all six targets within 4 recorded
   working days of fixes per failing target; a target still failing is dropped from the first release and
   reported, and a failing Windows target reopens this decision.
2. **Transport security:** against a running sidecar and a the-boss MCP endpoint, requests with no token, a
   wrong token, a previous launch's token, `Host: attacker.example`, or any `Origin` are rejected on every
   route including SSE; the tokens appear in none of: the sidecar's or its children's argv and environment
   (`ps eww` / `/proc/*/environ` / Windows process inspection), stdout/stderr logs, traces, crash reports,
   or any file under UAR's data directory and the-boss's userData.
3. **Secrets at rest — new writes:** after registering a provider key and an MCP server with an `env` secret
   through UAR's API, a byte search of all UAR settings, database, backup and log files finds neither value,
   and both still work.
4. **Secrets at rest — migration:** starting UAR on a fixture database containing pre-existing plaintext
   provider keys and MCP `env` secrets leaves none of those values findable by byte search in any UAR file;
   migrated entries either still work (encrypted) or are shown as needing re-entry (stripped).
5. **Isolation:** with the `uar` namespace user, `SELECT` and `INFO` on the `memory` and `compass`
   namespaces fail.
6. **Fallback:** with Docker stopped, the sidecar starts on SurrealKV within 10 s on macOS and Windows; a
   session created there is marked local-only, survives a sidecar restart, and is not merged when Docker
   returns until the user moves it.

## Unresolved review findings (round 3, accepted by operator decision; carried into step 2 as open risks)

Review: judge `gpt-5.5`, `verified-distinct`, verdict BLOCK (2 CRITICAL, 5 WARNING); findings in
`../review/d4-shipping.r3.findings.json`.

1. **Runner availability — resolved with evidence after the review.** compass's `compass-release.yml`
   builds all six targets on native runners `macos-15-intel`, `macos-15`, `ubuntu-24.04`,
   `ubuntu-24.04-arm`, `windows-2025`, `windows-11-arm`; its last three runs succeeded (latest
   2026-09-20, `compass-v0.3.28`). Open part: UAR's heavier native dependencies on those runners.
2. **Key management for encrypted secrets is unspecified.** Step 2's UAR security change must name the
   credential-store backend and key source per OS (OS keychain / DPAPI, not a key file beside the
   ciphertext) and add a test that secrets cannot be recovered from UAR's data directory alone.
