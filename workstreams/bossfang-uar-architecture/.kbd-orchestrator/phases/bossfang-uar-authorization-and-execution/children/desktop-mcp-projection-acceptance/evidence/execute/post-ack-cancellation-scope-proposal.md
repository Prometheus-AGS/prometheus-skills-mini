# Proposed scope amendment — deterministic post-ack cancellation proof

Status: PROPOSED ONLY. No instrumentation or acceptance waiver is authorized or implemented. Execute remains active; Reflect has not begun.

The approved Plan explicitly requires FC-POSTACK-CANCEL to be executed or reported BLOCKED/unrun, and prohibits a production debug switch or replacement executor. A held host acknowledgment tests cancellation before acceptance of that acknowledgment. It cannot prove the later interval.

Current source accepts the exact host receipt in `src/uar/runtime/tool_admission/lifecycle.rs` and returns a claimed invocation to `src/llm/orchestrator.rs`. `ensure_tool_dispatch` then observes cancellation before entering the native body. There is no inspected deterministic external pause between those two events. An opportunistic timing race would not establish this acceptance condition.

The smallest proposed extension is an explicitly gate-only, invocation-correlated checkpoint at the beginning of `ensure_tool_dispatch`, after successful claim return and before its existing cancellation observation. The checkpoint would acknowledge arrival, allow the gate to call the real authenticated cancellation API, and release dispatch only after that API has acknowledged cancellation. It must preserve the original executor, approval, persistence and cancellation paths and use no shared service, resident daemon, credentials or authority bypass.

Acceptance must separately record the instrumented fixture's source/features/hash and the ordinary production-feature artifact. Instrumented evidence cannot be relabeled as a run of the unchanged production artifact. The gate must observe one durable host consumption, cancellation at that checkpoint, zero native body entries, no claimed-success finish, retained uncertainty, no replay and complete cleanup. A direct native-body entry oracle is also needed; host consumption alone does not measure native execution.

Before implementing this extension, a bounded design must specify the test-only checkpoint interface, body-entry oracle and build separation. This is an amendment to the approved prohibition, not routine gate maintenance. Approval would authorize that bounded test-control work; it would not waive acceptance, certify the parent or start Reflect. Without approval, preserve the required case as BLOCKED/unrun.

References: approved `plan.md`, acceptance A3 in `verification.md`, `task7-uar-fault-feasibility.md`, and current allowed lifecycle/dispatcher source. The excluded D0 source and diagnostic remain excluded.
