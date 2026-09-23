## Context

See proposal.md for motivation. The cross-repository implementation contract is [the KBD delivery plan](../../../.kbd-orchestrator/phases/the-boss-shipping-and-settings/children/uar-delivery-replan/plan.md); source observations are in [research.md](../../../.kbd-orchestrator/phases/the-boss-shipping-and-settings/children/uar-delivery-replan/research.md) and [sources-receipt.json](../../../.kbd-orchestrator/phases/the-boss-shipping-and-settings/children/uar-delivery-replan/sources-receipt.json). This change is planning-only; future implementation occurs in the two existing integration worktrees after reflection and approval.

## Goals / Non-Goals

**Goals:** working installed experiences in short complete phases, complete approved feature coverage, explicit ownership/security contracts, and overlap between frozen-candidate acceptance and next-phase development.

**Non-Goals:** application code in this phase; a new runtime framework; duplicate settings/provider/chat stores; new managed services; unit-test/review loops; claims that unbuilt or uninstalled behavior works.

## Decisions

1. Use complete cross-repository phases P1–P4, with remaining-platform lane P5. Backend-by-backend delivery postpones learning from the actual user path. Preserve all old changes via the mapping in plan.md §6.
2. Keep The Boss as host and UAR as runtime. Reuse existing runtime and verified-resource abstractions; extend trusted HTTP ingress instead of reimplementing runtime internals.
3. Complete principal isolation, run-scoped credentials/MCP, correlated approvals, core streaming/restart and offline startup before the P1 preview. A UI-only or chat-only prototype would not demonstrate the promised integration.
4. Reuse the official A2UI renderer with Boss-owned catalog components. Publishing private UAR React packages creates avoidable dependency work.
5. Preserve principal-owned KBs; reuse agent document selections by explicit ingestion per conversation principal. This avoids an unplanned shared-ACL subsystem while retaining reusable agent knowledge.
6. Freeze immutable candidates, record evidence against exact commits, and start the succeeding phase on separate worktrees. Repair the candidate and propagate fixes before the next freeze. One succeeding unaccepted phase is the maximum.
7. Use GPT-5.6-sol for execution as requested. Record model provenance and real outcomes; no claim of superiority from this plan alone.

## Risks / Trade-offs

- Native feature/dependency weight → package the actual Windows x64 and Apple Silicon P1 deliverable before optional algorithms; inventory native/data/model assets.
- Shared process isolation → one trusted principal envelope and ownership enforcement at every ingress and executable-resource boundary.
- Lost tool response after a side effect → record indeterminate outcome; no automatic replay.
- Per-principal knowledge duplication → reuse within the principal, show ingestion, retain host document selections; do not silently share data.
- Parallel lanes diverge → frozen manifests, one writer per target, fix propagation before next freeze.
- Documentation drift → this plan's supersession register is authoritative when approved; preserve old records as history.

## Migration Plan

This planning change migrates no application data. After approval, create the P1 execution phase, reconcile existing WIP, map the ten UAR changes to the phase tasks, and freeze each completed candidate. Preserve prior advertised releases until the replacement passes its gate. Use new immutable release versions and safe data migrations with recoverable source copies as specified in plan.md.
