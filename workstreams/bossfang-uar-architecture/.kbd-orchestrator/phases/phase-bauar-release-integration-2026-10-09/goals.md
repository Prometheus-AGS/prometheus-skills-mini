# Goals: phase-bauar-release-integration-2026-10-09

Project: bossfang-uar-architecture
Date: 2026-10-09
Authority: operator “Proceed to the next step”, following implementation closure and “implement first and test later” waiver.

## Goals

1. Establish the release-intake boundary for the completed UAR, Bossfang and The Boss changes: explicit source worktrees, phase-owned file inventory, target branch/working-copy state and concurrent ownership.
2. Determine the smallest integration sequence that preserves exact approvals, one authoritative UAR execution loop, application-owned MCP configuration and unsupported/unknown restart behavior, without importing unrelated upstream history or overwriting concurrent changes.
3. Identify source-versus-packaged-payload wiring that must change for release intake. Distinguish a published bundled UAR from the separately exercised current external UAR; preserve authoritative version/pin decisions until an explicit change is approved.
4. Prepare reviewable Analyze/Plan inputs and then implement only approved integration changes. Carry the deferred broad tests, cumulative review, formatting debt and platform acceptance into later acceptance without reopening them as implementation blockers or reporting them as passed.

## Boundary

Assess → Analyze → Spec → Plan → Execute → Reflect remains the staged process. Stop after Assess for operator review under the original phase handover instruction. No product code, merges, commits, publication, services or shipping gate changes during Assess. Reuse the isolated coordinating worktree and separate project UUID; original shipping state remains protected. Existing product worktrees and caches remain intact.

F6 remains cancelled. Do not read, search, hash, diff or execute UAR tests/bauar_session_owner.rs or src/uar/mcp_server.rs. An unselected remote MCP receiver/IdP remains outside scope.

## Prior input

The original reflection proposed phase-bauar-release-acceptance, including deferred checks. That is retained in goals.seeded.md as history. This successor instead prioritizes release integration to honor the operator's latest implementation-first direction; it does not erase the deferred acceptance work.
