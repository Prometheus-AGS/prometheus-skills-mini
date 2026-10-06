# Proposal: Execution authorization

## Why

Exact host claim-before-effect exists, but legacy root approval can omit invocation identity and the HTTP MCP session crossover hypothesis remains untested. Preserve working controls while giving each uncertain boundary a falsifiable acceptance contract.

## What Changes

- Adopt existing prepared-invocation admission and full-harness approval ID/revision contract.
- **BREAKING**: migrated root clients must supply exact pending invocation identity; no run-only remote decision.
- Require the production-router two-JWT reproduction before changing session binding; retain rmcp 3.1.2.
- Preserve owner-bound run access, host one-claim-per-effect and unknown-outcome handling.

## Capabilities

### New Capabilities

- `execution-bound-authorization`: Exact approvals and conditional principal-bound HTTP MCP sessions.

### Modified Capabilities

None in this isolated specification home. Existing product specs remain authoritative in their repositories; Plan must map these coordinating requirements to repository-local deltas before any product apply. This is not a claim that all described mechanisms are new.

## Impact

UAR src/uar/api/routes.rs, full_harness/handlers.rs, runtime/thread/approvals.rs, runtime/actor/messages.rs, runtime/tool_admission/, and conditional mcp_server.rs integration. The Boss UarToolApprovalController/UarAguiAdapter/UarRuntimeConnection and approval lifecycle modules as mapped in design. F6/F7; cand-003/cand-005. Depends on bauar-01 identity contract.

Only planning artifacts are written here. This local OpenSpec root does not authorize edits in sibling product repositories. Plan must bind repository-owned child changes to isolated source worktrees and resolve overlapping active work; no `kbd-apply` from this root may reach outside its allowed edit root. All implementation tasks remain unchecked. Source baseline, cross-change ordering, prerequisites and validation boundaries are recorded in the phase specification index.

