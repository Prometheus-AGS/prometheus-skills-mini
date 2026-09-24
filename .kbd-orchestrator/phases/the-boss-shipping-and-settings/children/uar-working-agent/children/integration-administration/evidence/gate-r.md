# Gate R — registered agent and remote MCP integration

## Boundary command

Executed once for the completed Gate R boundary, then repeated only after that same gate exposed production defects:

```text
cargo test --locked --no-default-features --features minimal,test-probes --test remote_mcp_run_grants -- --nocapture
```

Final authoritative result:

```text
test result: ok. 7 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 19.97s
```

The command spent 9 minutes 45 seconds compiling and linking through the configured external Cargo target on `/Volumes/my-passport/cargo-build`. The observed delay was external-target I/O/link latency; the run showed no memory or free-space pressure.

## Production behavior exercised

The integration target drives a real sidecar process, its launch-token boundary, the persisted agent catalog, and a real streamable-HTTP MCP peer. It demonstrates:

- two concurrent authenticated principals use distinct downstream identities and distinct MCP sessions;
- model-supplied `tenant_id` values cannot replace the host-assigned downstream identity;
- both owners pass through the normal tool-approval policy before their remote calls execute;
- an expired credential cannot resume a run and returns `401` with `run_mcp_grant_authentication_required`;
- resume renewal requires a new credential revision, the same registered destination and trusted host, and scopes no broader than the admitted grant;
- the renewed credential creates a fresh authenticated downstream session;
- a catalog edit from agent v1 to v2 does not mutate the admitted v1 snapshot used when the source run resumes;
- an unregistered destination returns `422` with `run_mcp_destination_unregistered`;
- an unauthenticated request returns `401`;
- an authenticated run without an MCP grant completes without connecting to or invoking the administrator catalog;
- a transport failure is not replayed, while the next call reconnects under the same identity with a fresh MCP session.

The target contains the six existing tests compiled with its shared deterministic LLM stub plus the cohesive Gate R scenario; all seven passed in the single integration command above.

## Observed failures fixed during the gate

1. Sidecar startup discarded `mcp.json`, so no remote destination could be administrator-registered. Sidecars now load validated definitions as a catalog without opening shared transports.
2. Remote tool descriptors arrived after the policy universe was frozen, so an admitted tool failed as `UNKNOWN_TOOL_STATE_UNRECOVERED`. The run now performs authenticated discovery, adds the exact names to the policy universe, resolves the complete Global → Agent → Conversation → Turn policy, and reuses that authenticated binding for the final filtered preflight.
3. Loading an administrator catalog could otherwise give an ordinary authenticated run ambient execution authority. Catalog-only registries explicitly disable shared transports; a verified run grant can still build a request-owned binding from the registered definition.
4. The shared LLM fixture treated results from earlier turns as results for the current turn and reused one tool-call id. The fixture now scopes tool results to messages after the latest user message and derives a deterministic call id from the tool name and arguments.

## Security boundary

Administrator catalog entries are registration metadata, not shared execution authority. The sidecar launch bearer is never forwarded to the MCP peer. Downstream identity and credentials come only from the authenticated trusted-host grant overlay, and each binding is keyed by owner and credential revision. The test uses obvious dummy credential strings; this receipt and the runtime logs contain no real token or secret material.
