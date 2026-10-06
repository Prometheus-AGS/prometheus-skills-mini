# Root approval caller inventory — Spec evidence

Observed 2026-10-06. Static source inventory, not execution proof or a complete installed-client inventory. No files below were changed.

| Surface | Observed behavior | Required migration disposition |
|---|---|---|
| [The Boss controller](/Users/gqadonis/Projects/prometheus/the-boss/src/main/ai/runtime/uar/UarToolApprovalController.ts:133) | Sends approval_id only when raw event supplied it | Require exact ID on migrated events; reject unsupported legacy event |
| [The Boss administrative capability table](/Users/gqadonis/Projects/prometheus/the-boss/src/main/ai/runtime/uar/UarAdministrationAdapter.ts:163) | Exposes runs.approve and approvals.resolve on root route | Verify generic administrative request schema/forwarding preserves exact identity; inventory its consumers before cutover |
| [UAR root handler](/Users/gqadonis/Projects/prometheus/universal-agent-runtime/src/uar/api/routes.rs:922) | Optional approval_id forwarded to manager | Strict root contract must reject absent ID and preserve run ownership |
| [Remote grant integration scenario](/Users/gqadonis/Projects/prometheus/universal-agent-runtime/tests/remote_mcp_run_grants.rs:347) | Approves by counting events and sending approved=true without ID | Consume the specific event's identity before strict enforcement |
| [Principal-host fixture](/Users/gqadonis/Projects/prometheus/universal-agent-runtime/tests/support/principal_host.rs:263) | Run-only approval helper | Require pending identity in helper and its callers; do not fetch whichever pending request exists at response time |
| [Sidecar-process fixture](/Users/gqadonis/Projects/prometheus/universal-agent-runtime/tests/support/sidecar_process.rs:743) | Event-count loop posts run-only approvals | Bind each decision to its parsed event identity |
| UAR tests/integration/live/agent_instance_cases.rs | Root approval call sites found at 1166 and 1251 | Read each request shape before assigning migration; search hit alone does not establish missing identity |
| UAR tests/sidecar_session_principal/isolation.rs and tests/run_retention/runs.rs | Negative/retention call sites found | Preserve intended denial/retention meaning; missing identity must not mask owner/retention assertion |

Search within Bossfang's inspected driver/kernel/runtime sources found no corresponding root approval HTTP client. This does not prove no external client exists.

The source inventory adds concrete callers to bauar-02 scope. Installed versions, external API consumers and the operator's compatibility window remain unestablished. ROOT-APPROVAL-COMPATIBILITY is therefore still open. A strict cutover cannot be called compatible merely because the interactive controller is updated.

