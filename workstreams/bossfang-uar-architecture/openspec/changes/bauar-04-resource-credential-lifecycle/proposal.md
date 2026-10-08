# Proposal: MCP resource identity and credential lifecycle

## Why

Run-scoped grants already exist, but a grant is not receiver-side token validation and no named production receiver contract certifies the remote deployment. The host, resource server and Bossfang inbound MCP boundaries need explicit responsibilities and evidence.

## What Changes

- Retain owner/run caches and captured finite grants; use resource-specific credentials rather than forwarding the UAR JWT.
- Assign Bossfang inbound MCP service-versus-delegated classification explicitly.
- Constrain storage, refresh, revocation, renewal and receiver validation by named deployment contracts.
- Specify HTTP and stdio separately and synthetic-canary checks for logs, persistence and model inputs.
- Keep oauth2-rs and storage adapters conditional on receiver/custody selection; add no service or dependency now.

## Capabilities

### New Capabilities

- `mcp-resource-authority`: Resource-correct grants, receiver identity, secret custody and transport isolation.

### Modified Capabilities

None in this isolated specification home. Existing product specs remain authoritative in their repositories; Plan must map these coordinating requirements to repository-local deltas before any product apply. This is not a claim that all described mechanisms are new.

## Impact

UAR host MCP/credential boundary, src/mcp transport/projection; The Boss existing host bridge and integration secret store; Bossfang librefang-api middleware.rs/routes/network.rs; future named receiver adapter only after owner selection. F4/G7-A/G7-B; cand-003/004/005/010. Depends on bauar-01–03 shared authority contracts.

Only planning artifacts are written here. This local OpenSpec root does not authorize edits in sibling product repositories. Plan must bind repository-owned child changes to isolated source worktrees and resolve overlapping active work; no `kbd-apply` from this root may reach outside its allowed edit root. All implementation tasks remain unchecked. Source baseline, cross-change ordering, prerequisites and validation boundaries are recorded in the phase specification index.

