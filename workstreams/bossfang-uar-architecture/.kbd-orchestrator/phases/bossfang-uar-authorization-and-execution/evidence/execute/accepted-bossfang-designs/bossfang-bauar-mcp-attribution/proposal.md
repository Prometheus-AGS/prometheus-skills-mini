# Proposal

## Why

Bossfang currently separates authenticated API users from authorized agent headers, but lacks the requested explicit non-secret MCP attribution record. Service credentials and agent context must not silently become a delegated user or tenant.

## What Changes

- Attribute inbound MCP requests as trusted-local operator, service or verified delegated user using existing application authentication.
- Retain subject, verified tenant/actor, authorized agent, authentication source and policy revision separately.
- Reject forged context and unavailable delegated verification without effects.
- **BREAKING**: remote multi-user /mcp rejects unauthenticated requests even when broad allow_no_auth is enabled; preserve that configuration for unrelated endpoints and local behavior.
- Preserve application-owned configuration. No selected remote receiver/IdP/custody integration or added defaults; inspected MCP server defaults are already empty.

## Capabilities

### New Capabilities

- `mcp-request-attribution`: Bossfang inbound request attribution and separation of verified authority from agent context.

### Modified Capabilities

None in the nested execution-child root. Parent `mcp-resource-authority` supplies the common requirement; receiver-specific tasks are excluded by the operator's current release selection.

## Impact

Existing API middleware, MCP route, narrow attribution type/export and integration scenario. No new auth provider, secret store, connection default, dependencies, daemon, CLI or UI change. Execution waits for03 to release network.rs and for driver acceptance of exact ownership.
