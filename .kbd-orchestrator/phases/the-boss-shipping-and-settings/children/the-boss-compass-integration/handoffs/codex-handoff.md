# Handoff to Codex — `the-boss-compass-integration` (child of `the-boss-shipping-and-settings`)

**From:** Claude, this session. **Reason for handoff:** I was thrashing on one test failure in
the compass MCP transport suite — stashing/unstashing, losing track of which fix was applied
where. The operator stopped me. Nothing is broken; the work just needs a clear head to finish
the last mile.

## What this phase is

Approved plan lives at `/Users/gqadonis/.claude/plans/agile-exploring-oasis.md` — read it in
full before touching anything; it has the context, the SurrealDB cross-cutting section, and
Phase B (Universal Agent Runtime) which is **not** in scope for this handoff. This handoff
covers **Phase A, step A1 only**: the compass MCP protocol fix.

KBD state: the live waypoint is still on `karpathy-logs-node → the-boss-integration-prep`. The
directory `the-boss-shipping-and-settings/children/the-boss-compass-integration/` exists (I
created it to hold this handoff) but has no `goals.md` or `progress.json` yet. **Run
`/kbd-new-child the-boss-compass-integration` (or the project's equivalent) yourself** to
formalize the phase before starting A1 — I did not fabricate that state and you shouldn't
either.

## Repo and branch

`/Users/gqadonis/Projects/references/compass` (this is `GQAdonis/compass`, a fork). Origin
`main` is at `33ecb365`. I did my work in a disposable worktree at `/tmp/compass-fix` on branch
`fix/mcp-protocol-negotiation` (tracking `origin/main`) — **that worktree may still exist; check
`git worktree list` in the compass repo before creating a new one.** If it's there and clean, you
can reuse it. If you'd rather start fresh: `git worktree add /tmp/compass-fix -b
fix/mcp-protocol-negotiation origin/main` (delete the old one first if it conflicts).

## The problem (reproduced, not theoretical)

The-boss cannot connect to compass's MCP server at all. Reproduced on the **shipped v0.3.28
binary** (`compass` on PATH) via stdio:

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
  | compass serve --transport stdio
# {"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"initialize is not available in MCP 2026-07-28; use server/discover"}}
```

This fails for **every** version tested: `2025-03-26`, `2025-06-18`, and even `2026-07-28`
itself. Root cause: compass's `CompassMcp` hard-refuses `initialize` unconditionally and
advertises `supported_protocol_versions() = [V_2026_07_28]` only. The TypeScript MCP SDK (used by
the-boss) tops out at `2025-11-25` and has no `server/discover` — verified by unpacking the
`@modelcontextprotocol/sdk@1.30.0` tarball, the latest published version. **So the-boss cannot be
upgraded to fix this; compass must widen.** Confirmed with the operator — this is not up for
debate, it's a decided direction.

## What I already fixed, and verified clean

Run `git -C /tmp/compass-fix diff --stat` to see the actual diff, or read
`handoffs/a1-in-progress.diff` next to this file (captured from that worktree at the point I
stopped — it may already be stale if the worktree still exists and has since been touched, so
prefer the live worktree if it's there). Four files:

1. **`crates/compass-mcp/src/lib.rs`**
   - `SUPPORTED_PROTOCOL_VERSIONS: &[&str] = &["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26"]`
     (was a single `SUPPORTED_PROTOCOL_VERSION` constant only).
   - `supported_protocol_versions()` (the `ServerHandler` trait method) returns all four
     `ProtocolVersion` constants, not just `V_2026_07_28`.
   - `initialize` is a real override again (I first deleted it entirely, relying on rmcp's
     default — **wrong**, because rmcp's default would then accept `2026-07-28` too, which
     contradicts the whole point of that revision using `server/discover` instead). The
     restored version: refuse only when the client named `2026-07-28`
     (`protocol_uses_discovery(...)`); for every other known version, call
     `context.peer.set_peer_info(...)` and echo back the version the client asked for.
   - New helper `protocol_uses_discovery(version: &str) -> bool` — true only for `2026-07-28`.
     Used by both `lib.rs` and `transport.rs` so the stdio and HTTP paths agree on which
     revision triggers the SEP-2243 discovery behavior.

2. **`crates/compass-mcp/src/transport.rs`** (HTTP transport)
   - The `Mcp-Protocol-Version` unsupported-version error now lists the full
     `SUPPORTED_PROTOCOL_VERSIONS` array, not one hardcoded string.
   - The `Mcp-Method` header requirement and the "`initialize` not available" refusal are now
     gated behind `protocol_uses_discovery(version)` — they fire **only** for `2026-07-28`
     requests. Older clients skip both checks entirely.
   - **`with_legacy_session_mode(true)`** — this was the load-bearing fix. It was `false` in
     compass, which (per rmcp's own doc comment on that field) meant every request negotiating
     below `2026-07-28` got routed through the strict stateless path and rejected for missing
     per-request protocol metadata that only `2026-07-28` clients send. `true` is rmcp's own
     default and is required for pre-`2026-07-28` clients to get a session at all.
   - A missing `MCP-Protocol-Version` header on an HTTP request is now treated as `2025-03-26`
     (added constant `LEGACY_DEFAULT_PROTOCOL_VERSION`), matching rmcp's own fallback — the old
     code treated an absent header as automatically unsupported, which breaks a bare
     `initialize` POST (no header is sent on it; the version lives in the body until
     negotiation completes).

3. **`crates/compass-mcp/tests/protocol_conformance.rs`**
   - Replaced `stdio_rejects_a_legacy_initialize_lifecycle` (asserted the OLD, wrong behavior —
     that `2025-11-25` was refused) with
     `stdio_accepts_initialize_for_every_pre_discovery_revision` — loops over `2025-11-25`,
     `2025-06-18`, `2025-03-26`, asserts each `initialize`s successfully, echoes the requested
     version, and that a real `list_tools()` call works afterward on that negotiated session.
   - Added `stdio_refuses_initialize_for_the_discovery_revision` — asserts `2026-07-28` is
     *still* refused via `initialize` (pins the behavior the override in `lib.rs` exists to
     preserve, so deleting the override again can't pass silently).

4. **`crates/compass-core/src/build_state.rs`** — unrelated pre-existing break on `main` I fixed
   along the way: two test-module `BuildProfile` initializers were missing the `surreal_engine`
   and `surreal_path` fields (both `Option<String>`, added as `None`). This is E0063, blocks
   `cargo check --workspace --all-targets`, and has nothing to do with the protocol fix — it's a
   drive-by fix because it was in the way. Also fixed: `crates/compass-mcp/src/transport.rs`'s
   test module called a bare `to_bytes(...)` (E0425) where production code always qualifies it
   as `axum::body::to_bytes(...)`; the three test-module call sites now match.

**Verified, as of the last clean run before I got confused:**
- `cargo fmt --all -- --check` — passes.
- `cargo clippy --workspace --lib --bins --locked -- -D warnings` — passes (this is CI's exact
  gate, read from `.github/workflows/compass-ci.yml:127`).
- The stdio reproducer above, run against the locally built fixed binary
  (`/tmp/compass-fix/target/debug/compass`), for `2025-11-25`, `2025-06-18`, `2025-03-26`, and
  `2026-07-28` — all four now negotiate correctly (the first three ACCEPTED with the version
  echoed back; `2026-07-28` still refused as intended).
- `cargo test -p compass-mcp --locked` — **1 failure remained** at the point I stopped:
  `transport::tests::stateful_json_transport_enforces_auth_and_lists_tools`.

## The one thing NOT finished — read this carefully, it's subtle

That failing test does an `initialize` HTTP POST with `options.json_response = true` set and
asserts the response has `content-type: application/json`. **This assertion is wrong given the
fix**, not a sign the fix is broken. Here's why, verified by reading rmcp's own source
(`~/.cargo/registry/src/*/rmcp-3.1.4/src/transport/streamable_http_server/tower.rs`):

- `with_legacy_session_mode(true)` (which A1 requires — see above) means a **first-ever**
  `initialize` on a connection with no existing `Mcp-Session-Id` header always goes through
  rmcp's session-creation branch (`handle_post`, the `use_session=true, session_id=None` arm),
  which is **hardcoded to `sse_stream_response(...)`** — always SSE, regardless of
  `json_response`. That config flag only affects the *stateless* path
  (`serve_negotiated_request_directly`), which `2026-07-28`/per-request-metadata clients use, not
  the legacy session-bootstrap path.
- So the test's premise — "a fresh `initialize` on this config returns
  `application/json`" — is incompatible with `legacy_session_mode(true)`, which is required. The
  test needs to change, not the code.

**What I had partially written** (verify it's actually in the file — I lost track of whether
this landed before or after a stash round-trip, so re-check it against the file, don't trust my
memory of it):
- Change the assertion to expect `content-type: text/event-stream` instead of
  `application/json` for that first `initialize` response.
- The response body on the SSE path is framed as `data: {...json...}\n\n`, not raw JSON, so
  `response_body(&initialized)` (existing helper, splits on `\r\n\r\n`) needs a follow-up parse
  step. I added a `sse_data_json(body: &str) -> Result<Value, ...>` helper that finds the first
  `data:` line and deserializes it, and the test then does
  `sse_data_json(response_body(&initialized))?` instead of
  `serde_json::from_str(response_body(&initialized))?`.
- **Confirm this against the actual file before trusting it** — grep for `sse_data_json` in
  `crates/compass-mcp/src/transport.rs`; if it's there, run the test and see if it passes now. If
  it's not there or doesn't compile, you have the reasoning above to redo it.

## Two other test failures — confirmed NOT your problem

I checked both by stashing my diff and running against unmodified `origin/main`:

- `code_query_tools.rs`: `code_query_tools_share_the_bounded_versioned_contract` and
  `envelope_preserves_parallel_edge_occurrences_against_pre_envelope_golden` — **fail identically
  on unmodified main.** Pre-existing, unrelated, out of scope.
- `discovery_compat.rs`: `local_discovery_matches_rmcp_2_2_golden` and
  `server_discover_matches_rmcp_2_2_golden` — **also fail identically on unmodified main.** The
  diff is purely `inputSchemaSha256` value mismatches (stale golden hashes vs. current schema
  output) — nothing about routing, sessions, or protocol negotiation. Pre-existing, unrelated,
  out of scope.

Do not spend time on these two files. If you want them fixed, that's a separate piece of work —
flag it to the operator, don't fold it into this PR.

## What "done" looks like

1. `cargo fmt --all -- --check` passes.
2. `cargo clippy --workspace --lib --bins --locked -- -D warnings` passes (CI's exact gate).
3. `cargo test -p compass-mcp -p compass-core --locked --no-fail-fast` — every failure is either
   fixed, or is one of the two pre-existing files above (confirm by stashing and re-running
   against `origin/main` if you're unsure whether something is pre-existing).
4. `cargo build -p compass-cli --locked` succeeds.
5. The stdio reproducer at the top of this doc, run against the fresh build, for all four
   versions — matches the behavior described above.
6. Push the branch, open a PR against `GQAdonis/compass` `main` with the reproducer's
   before/after output pasted into the body. **Do not merge it yourself unless CI is green AND
   you were told merging on green CI is pre-authorized** — check the plan doc
   (`agile-exploring-oasis.md`, under "A1 delivery") for the operator's actual decision on that;
   I recorded one there. If in doubt, open the PR and stop, same as the `surreal-memory-server`
   PR handoff pattern already used in this session (PR #24, merged by the operator directly).
7. Update `versions.toml` in `/Users/gqadonis/Projects/prometheus/prometheus-skills-mini` if the
   compass PR lands and gets tagged — but that's a separate step gated on the operator, not part
   of this PR.

## What I will NOT ask you to also do in this handoff

Phase A steps A2–A5 (compass release pipeline + bundling, skill reuse, per-directory MCP
instances, settings UI) and all of Phase B (Universal Agent Runtime) are **out of scope** for
this handoff. Finish A1 cleanly, hand back, and the operator will decide what's next.
