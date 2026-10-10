# Release intake comparison

Read-only comparison of 241 explicit phase-owned paths; not a mergeability or current build result. Candidate target refs remain unapproved as release refs.

| Repository | Paths | Source uncommitted | Target at accepted base | Divergent candidates | Target uncommitted |
| --- | ---: | ---: | ---: | ---: | ---: |
| uar | 126 | 126 | 126 | 0 | 0 |
| boss | 43 | 43 | 43 | 0 | 0 |
| bossfang | 72 | 72 | 33 | 39 | 0 |

All 241 match the preceding file bindings. All are unstaged and differ from source HEAD. All observed heads and per-file reads were stable; other paths and later changes are outside this inventory.

Bossfang has 18 baseline files absent at target and 21 present with different bytes. Its target is 279 commits behind the source baseline. These are baseline/transfer candidates, not observed textual merge conflicts.

## Exact divergent Bossfang paths

- crates/librefang-api/Cargo.toml — present bytes differ from baseline
- crates/librefang-api/src/channel_observers/control.rs — baseline file absent at target
- crates/librefang-api/src/lib.rs — present bytes differ from baseline
- crates/librefang-api/src/middleware.rs — present bytes differ from baseline
- crates/librefang-api/src/routes/channels.rs — present bytes differ from baseline
- crates/librefang-api/src/routes/network.rs — present bytes differ from baseline
- crates/librefang-api/src/routes/sidecar_toml.rs — present bytes differ from baseline
- crates/librefang-api/src/routes/task_queue.rs — present bytes differ from baseline
- crates/librefang-api/src/routes/uar.rs — present bytes differ from baseline
- crates/librefang-api/src/routes/uar/delegated_tasks.rs — baseline file absent at target
- crates/librefang-api/src/routes/uar_delegation.rs — baseline file absent at target
- crates/librefang-api/src/routes/uar_delegation/connections.rs — baseline file absent at target
- crates/librefang-api/src/routes/uar_delegation/diagnostic.rs — baseline file absent at target
- crates/librefang-api/src/routes/uar_delegation/observation.rs — baseline file absent at target
- crates/librefang-api/src/routes/uar_delegation/storage.rs — baseline file absent at target
- crates/librefang-api/src/server.rs — present bytes differ from baseline
- crates/librefang-channels/src/bridge.rs — present bytes differ from baseline
- crates/librefang-kernel/src/kernel/ephemeral_spawn.rs — present bytes differ from baseline
- crates/librefang-kernel/src/kernel/handles/task_queue.rs — present bytes differ from baseline
- crates/librefang-kernel/src/kernel/messaging.rs — present bytes differ from baseline
- crates/librefang-kernel/src/kernel/mod.rs — present bytes differ from baseline
- crates/librefang-kernel/src/kernel/triggers_and_workflow.rs — present bytes differ from baseline
- crates/librefang-kernel/src/kernel_api.rs — present bytes differ from baseline
- crates/librefang-llm-drivers/src/drivers/uar_run/canonical.rs — baseline file absent at target
- crates/librefang-llm-drivers/src/drivers/uar_run/mod.rs — baseline file absent at target
- crates/librefang-llm-drivers/src/drivers/uar_run/observation.rs — baseline file absent at target
- crates/librefang-llm-drivers/src/drivers/uar_run/retained.rs — baseline file absent at target
- crates/librefang-llm-drivers/src/drivers/uar_run/wire.rs — baseline file absent at target
- crates/librefang-memory/src/lib.rs — present bytes differ from baseline
- crates/librefang-memory/src/substrate.rs — present bytes differ from baseline
- crates/librefang-runtime/src/a2a.rs — present bytes differ from baseline
- crates/librefang-storage/src/channel_actions.rs — baseline file absent at target
- crates/librefang-storage/src/channel_actions/surreal_impl/observers.rs — baseline file absent at target
- crates/librefang-storage/src/channel_routes.rs — baseline file absent at target
- crates/librefang-testing/src/test_app.rs — present bytes differ from baseline
- crates/librefang-types/src/uar_run.rs — baseline file absent at target
- scripts/integration/afc-c05-gate.mjs — baseline file absent at target
- crates/librefang-llm-drivers/src/drivers/uar.rs — present bytes differ from baseline
- crates/librefang-llm-drivers/src/drivers/uar_run/http.rs — baseline file absent at target

## Inputs and limits

The JSON contains accepted-base, source HEAD/index/worktree and target HEAD/index/worktree hashes for every path. Base hashes derive from the prior accepted-base binding; no broad repository content read was performed. No excluded F6 path was accessed. The separate payload JSON retains p1.19/ba723 bundled metadata and the external current-UAR acceptance boundary. No test, build, review dispatch, dependency operation, merge or product write occurred.
