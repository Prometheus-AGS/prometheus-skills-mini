# Execution handoff — after reflection and approval

Requested executor: GPT-5.6-sol. This file does not start that model or authorize execution.

1. Read plan.md, effective-constraints.md, research.md, review/disposition.md and the OpenSpec change uar-delivery-replan. Use its unchecked tasks for future execution.
2. Reflect with the operator, record accepted adjustments, then create a separate P1 execution phase (suggested name uar-working-agent). Keep this planning child as the evidence record.
3. Reconcile UAR WIP before touching it; do not assume another session has stopped. Boss worktree: /Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar. UAR worktree: /Users/gqadonis/Projects/prometheus/worktrees/uar-the-boss-sidecar. Source receipts name the inspected commits.
4. Load Rust skills only for Rust work; UI skills only for relevant UI work. Preserve source pins and existing project architecture. No application code was written here.
5. Implement P1 across both repos before its integration gate. Freeze its candidate and hand it to the build/acceptance lane; continue P2 in separate worktrees. Follow the one-succeeding-unaccepted-phase limit and propagate fixes.
6. Use the existing GitHub distribution and website pipeline. Windows x64 first, Apple Silicon next. Never revive IPFS or wait for all platforms to publish customer artifacts.
7. Maintain the outcome ledger with real timestamps, commits, artifacts, installed results and escaped defects. A pending Windows acceptance is never completion.

## P1 implementation surfaces

UAR: src/uar/api/routes.rs; src/uar/security/; src/uar/runtime/turn/request.rs and existing resource/policy/session machinery; src/mcp/; src/uar/api/sse.rs; src/bin/uar-sidecar.rs; API capability contract and release packaging. Split new responsibilities into focused modules rather than expanding manager.rs.

Boss: src/main/ai/runtime/uar/ following existing driver interfaces; a lifecycle sidecar service and session MCP bridge; src/shared/ai/agentRuntimeCapabilities.ts and agent schemas; BinaryManager and integration manifest; existing AgentEditDialog/settings/IPC/preference generation; existing message parts; current Prometheus workspace resolution and mini packaging. Do not duplicate these services.

## Reconciliation obligations

The old ten UAR OpenSpec changes remain useful contracts, but their task ordering/test instructions are superseded by the approved phase plan. Mark split work as partial until all assigned parts land. Per-agent unsupported fields remain explicit: model tiers, service tier, heartbeat and sidecar env vars are not silently advertised. Import/export must disclose losses.
