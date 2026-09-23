## Context

The operator approved A1 in agile-exploring-oasis.md and supplied codex-handoff.md. The inherited four-file diff exists at /private/tmp/compass-fix on fix/mcp-protocol-negotiation, based on 33ecb365. The installed Compass reproduces every reported initialize refusal. The Boss pins SDK 1.27.1, whose installed client requests 2025-11-25. This is a runtime integration blocker, not evidence of a Windows compiler failure.

## Goals / Non-Goals

Complete A1 with three legacy initialization revisions and retained discovery compatibility. A2 release/bundling, A3 skills, A4 directory instances, A5 settings and Phase B remain deferred. No database, persistence, UI or tool-schema changes. The operator additionally requested rmcp 3.4.0 and Rust skill instructions across integration repositories and their active worktrees.

## Decisions

- Upgrade rmcp from 3.1.4 to exactly 3.4.0 at the operator's request. Its upstream changelog confirms the 3.2.0 legacy-only initialize negotiation fix and 3.3.0 negotiate_initialize helper. Delegate legacy negotiation to that helper while retaining Compass's explicit modern initialize refusal. Preserve existing HTTP framing/session routing. A TypeScript SDK upgrade does not implement Compass's discovery lifecycle.
- Accept 2025-11-25, 2025-06-18 and 2025-03-26 initialize, returning the negotiated revision. Preserve 2026-07-28 discovery and refusal of initialize for that revision.
- Preserve HTTP authentication, host checks and discovery metadata validation. Enable rmcp legacy sessions and allow headerless initialization.
- Correct the handoff's incomplete SSE diagnosis: tower.rs returns SSE both for initialize and subsequent legacy requests. Compass's conversion flag is false. Parse both responses as SSE in the inherited regression test, and exercise transport behavior independently through public integration boundaries.
- Use rust-best-practices, rust-async-patterns and rust-mcp-server-generator as requested; the generator's rmcp 0.8.1 template does not supersede Cargo.lock. superpowers and prometheus-rust-workspace are absent; no invented substitutes.
- Preserve the four-file inherited work without stashing. Keep unrelated code_query_tools and discovery_compat golden failures outside the fix; compare against baseline if observed. User's explicit handoff verification commands authorize the inherited unit-test check despite Compass's general integration-only rule; new coverage uses public boundaries.

## Risks / Trade-offs

- The 3.1.4 test run was stopped during linking when the operator requested 3.4.0; it supplies no completed test evidence. Restart verification after completing the dependency migration. Update deprecated ServerInfo/ClientInfo aliases where the new SDK requires it for warning-free compilation.
- Saved evidence may be stale: reproduce with installed and freshly built binaries, plus The Boss's real SDK.
- Windows remains unverified locally: inspect native CI after PR creation, and do not claim a Windows artifact exists until A2 delivers it.
- Existing golden failures can block CI: report baseline evidence without rewriting unrelated fixtures.

## Migration Plan

Push the scoped Compass branch and open a PR with before/after results. Merge only on green CI, as explicitly pre-authorized in A1 delivery. No tag, release workflow or versions.toml edit is authorized by this task.
