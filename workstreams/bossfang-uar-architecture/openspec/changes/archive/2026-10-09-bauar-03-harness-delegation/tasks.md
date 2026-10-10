# Tasks

This is the consumer refinement of existing Bossfang C05.1–3, not a second execution authority. Plan must map each item into a repository-owned, session-sized child task and an isolated worktree before execution. No librefang-cli or unrelated Codex/Claude edits.

## 1. Scope and product attempt storage

- [x] 1.1 Resolve C05-OWNERSHIP and RECOVERY-PROFILE-DECISION before dispatch: record accepted provider SHA/capabilities, consumer file claims, all streaming/non-streaming/scheduled retry entry points and operator-selected release recovery profile. Verify links to C05.1–3 and original parent gate; if durable recovery is selected, stop and add an approved provider recovery spec before dependent tasks.
- [x] 1.2 Define and implement additive versioned Bossfang attempt storage through existing task substrate, with owner/workspace, admission/epoch, harness, credential references, receipt/cursor and explicit outcomes. Include migration/retention docs and interrupted-write scenarios; verify admission identity commits before first network submission and secrets are excluded.
- [x] 1.3 Add explicit UAR harness selection ahead of both kernel model-loop entry paths. Reuse cand-001 and bypass the LlmDriver loop for selected jobs; include native-provider compatibility and unsupported-capability scenarios/docs. Verify both dispatch paths reach the same adapter and never silently fall back to cand-008.

## 2. Harness lifecycle adapter

- [x] 2.1 Implement explicit job input/history/agent/tool-policy/resource/required-limit mapping plus capabilities/admit/reconcile/status against the agreed C05 provider. Include effective-context, unsupported-required-field, lost-response, frozen-receipt, changed-payload 409 and credential-revision scenarios/docs; verify intended executor context, exact owner/workspace/admission/epoch identity and no second execution on uncertainty.
- [x] 2.2 Implement event observation/reconnect/deduplicated presentation and exact approval forwarding using 02's contract. Include interrupted stream, replay-gap and stale-decision scenarios/docs; verify executed tool events never enter Bossfang tool dispatch.
- [x] 2.3 Implement exact run cancellation, acknowledgement/terminal/cleanup classifications and capability-gated restart handling across generic task retry/scheduled resumption. Include restart/retention-loss/cancel-race scenarios/docs; verify unknown effects cannot trigger a fresh admission automatically.
- [x] 2.4 Preserve conversation history as product data and usage/budget attribution from the owning harness. Include restored-transcript and terminal-outcome scenarios/docs; verify history replay cannot execute tools and adapter does not invent usage metrics absent from provider evidence.

## 3. Combined execution acceptance

- [x] 3.1 After 01–04 selected production is complete, exercise Bossfang → real UAR router/executor → safe effect through both kernel entry paths and actual product attempt persistence. Verify one authoritative loop, one admitted effect, exact approvals, lost submit/retry/reconnect/cancel/restart outcomes and unchanged native mode; controlled model responses may make the fixture deterministic but must not replace production routing/execution.
- [x] 3.2 Run required repository build/integration checks once for this boundary and record accepted checkpoint/platform limitations. Verify no existing UAR C05 or shipping gate is closed without its own owner/acceptance.

## Workflow follow-up

- If recovery or C05 ownership remains unresolved, retain these tasks as blocked; a prepared specification is not a dispatch authorization.

## Task model assignment reference

Execution model/route assignments and dependency batches are in [the phase plan](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/plan.md#task-model-assignments). Use full phase path bossfang-uar-authorization-and-execution, change bauar-03-harness-delegation, and numeric backend IDs 1–9 from kbd-apply list; displayed section ordinals remain part of the unchanged titles. Repository child worktree/ownership prerequisites remain mandatory. This reference is not a completion marker.

## Plan refinement of existing task scope

Backend task 6 (displayed 2.3) includes pending-task wake reconciliation alongside explicit retry, stale sweep, cron and restart. Backend task 7 (displayed 2.4), following the exact cancellation implementation in task 6, binds both UAR-facing JSON-RPC and network A2A lookup/cancel views to the same verified owner/attempt receipt, forwards cancel to the identified UAR execution, and keeps cancellation requested distinct from remote terminal evidence. Backend task 8 (displayed 3.1) verifies both views and the pending-wake path through the LIFECYCLE matrix. These are refinements of existing C05.3/F5 scope; no checkbox title or backend ID changes.
