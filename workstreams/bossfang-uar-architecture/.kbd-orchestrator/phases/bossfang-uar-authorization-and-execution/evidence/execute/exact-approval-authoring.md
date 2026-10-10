# Exact approval production and UAR helper source handoff

Boundary: parent02/2 revision125; child execution-authorization numeric2 revision67 and numeric3 revision69. Source authored only in /Users/gqadonis/.claude/worktrees/bauar-uar. Acceptance, compilation and build remain pending.

## Production behavior authored

- Both root HTTP ingresses require a nonempty originating approval_id. Missing/null/empty IDs return actionable 400 approval_id_required; typed extraction can reject malformed JSON independently. Existing owner lookup is retained. The legacy JSON ingress now requires an explicit boolean approved rather than consuming a pending decision as a default rejection on malformed input.
- ApprovalBroker rejects absent, blank, stale, foreign-run or consumed identities before removing the live pending sender. All roots and descendants share this same contract; legacy_root_request branching is removed.
- Pending entries retain the caller cancellation token. Root or caller cancellation rejects immediate late resolution even before the request future polls cancellation; pending snapshots hide cancelled/closed waiters. Existing matching-ID PendingGuard cleanup remains.
- RunManager's run-only resolve_approval method is removed. resolve_approval_request retains Option for minimal impact on already-exact callers but None fails closed in the broker. Existing mock-only run-ID map helper/test was replaced by actual broker source scenarios.
- Actor/messages.rs has no approval message to migrate. Actors inherit the request-only root thread channel; no new actor approval variant was invented.
- Existing tool_admission/mod.rs and lifecycle.rs require no edits for this contract. Immutable prepared invocation, host receipt revalidation, cancellation checks and single claim-before-effect remain. Full-harness handlers.rs is read-only: its existing expected_revision plus approval_id flow is preserved.

## Helper migration and scenarios

A shared source helper reads only complete agui.tool_call.approval_required SSE frames, extracting request_id and exact approval_id, deduplicating replayed IDs. Positive helpers accept/carry originating identity and never fetch/select a newer pending request. Embedded, protocol and actor delegation callers obtain IDs from their actual runtime event history. Existing already-exact test_chat_completion, skill_activation_runtime and integration/live/agent_instance_cases callers remain unchanged.

Foreign-owner scenarios now submit valid captured IDs so 404 cannot be caused merely by missing identity. The retention-only nonexistent-pending probe carries an explicit nonempty unavailable ID, preserving its eviction assertion. tests/run_retention/sessions.rs only migrates two helper calls using captured text; no session behavior, session manager or diagnostic was changed.

New broker scenario source covers root/child missing and stale IDs, owner-scoped snapshot refusal, foreign run, duplicate consumption, an old ID against a new waiter, cancellation before future polling, dropped waiter and concurrent decisions. The prior child scenario's stale register/request arguments are corrected by the cohesive module replacement. Existing HTTP ownership scenario source also covers missing/stale owner decisions on both ingresses, unchanged legitimate pending snapshot, no effect, valid owner decision, duplicate rejection and one effect. Shared frame scenario covers incomplete/replayed/foreign-run frames. None has run.

## Exact task changes

Production: src/server.rs (approval ingress only for this task); src/uar/api/routes.rs; src/uar/runtime/manager.rs; src/uar/runtime/thread/approvals.rs.

Scenario/helper: new src/uar/runtime/thread/approval_tests.rs; new tests/support/approval_events.rs; tests/support/principal_host.rs; tests/support/sidecar_process.rs; tests/remote_mcp_run_grants.rs; tests/sidecar_session_principal/isolation.rs; tests/run_retention/runs.rs; tests/run_retention/sessions.rs (mechanical calls only); src/embedded.rs (test slice only); tests/a2a_thread_service.rs; tests/tool_call_protocol.rs.

Operations: new docs/operations/execution-authorization.md.

Unmodified preservation surfaces: src/uar/runtime/actor/messages.rs; runtime/tool_admission/{mod.rs,lifecycle.rs}; tests/tool_admission_integration.rs; src/uar/api/full_harness/handlers.rs; already-exact callers listed above.

## Observed actions and limits

Only Node24 source read/write and rg/git read-only source inspection ran. Two rg patterns were initially malformed by JavaScript escaping and one search included an absent src/agui directory; corrected read-only searches then showed no resolve_approval( or legacy_root_request occurrences in src/tests. This is static authoring inspection, not a runtime gate. Approval broker entry is265lines, its cohesive scenario module102lines and shared frame parser36lines. Existing oversized wiring/helper files received surgical changes only.

No Cargo, compiler, tests, lint, formatter, services, dependency mutations, commits or canonical operations. No D0 source/fixture/run/reroute or session-manager correction. No resource production work. Every new guard traces to actual root decision input, exact pending consumption or cancellation authority. Uncomfortable limitation: actual HTTP effects, combined Boss cutover and package/build behavior are still unverified; this receipt cannot close final acceptance or the separately blocked session hypothesis.

Files released to driver after handoff.
