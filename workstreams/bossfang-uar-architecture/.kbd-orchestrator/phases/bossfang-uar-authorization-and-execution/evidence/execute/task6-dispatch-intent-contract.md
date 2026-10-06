# Task 6 persistent dispatch-intent contract — accepted source allocation

Date: 2026-10-06. Approved Execute requirement: one authoritative selected execution; no fresh admission or native fallthrough on unknown/restart. This is implementation architecture, not runtime certification.

## Authority and storage

Accept tagged version-one execution intent in the existing SQLite collaboration task_queue.payload BLOB. Inspected actual INSERT sets it empty; actual task claim/get do not expose or overwrite it. Scope only collaboration jobs in the concrete SQLite TaskQueue route; empty legacy payload remains eligible, nonempty unknown/version-unsupported payload must not be overwritten. The separate unwired SurrealTaskBackend is not silently certified or migrated.

Persist no credentials, input, history or remote diagnostics. Typed fields: exact job, attempt/local correlation, selected versus native harness, initiating local owner/workspace, expected assignee. Claim transaction validates actual row/status/assignee before any selected preflight or job-targeted native model wake. In-progress/native-reserved conflicts reject selection. Selected intent survives preflight failure, process restart and absent A2A row as reconciliation-required unknown; never invent an attempt or release it to native.

## Schema APIs before feature wiring

Schema owner owns ONLY surgical crates/librefang-memory/src/substrate.rs and new substrate/task_dispatch.rs and substrate/task_dispatch_tests.rs, all new modules <500 lines. Source scenarios only. Provide typed selected claim, exact-list native wake claim, read and idempotent selected outcome reconciliation, plus authoritative task_claim/reset/retry/PATCH/expiry/retention exclusions for selected intent. Validate original selected relation before terminal status projection. Unknown intent cannot be modified through generic executable operations.

Native wake returns only the exact durably claimed eligible job IDs/rows for its prompt. A filtered list followed by generic unrestricted model dispatch does not satisfy the contract. Preserve existing native completion and retry policy; do not use retry_count as selected admission identity. Existing native reservation is not blanket authorization for a second simultaneous targeted model wake. If safe native settlement/retry cannot be expressed using inspected existing authority, return a precise interface proposal before authoring speculative recovery. No process-only lock or cross-database atomicity claim. Atomic native task-claim behavior remains its original execution authority, with selected exclusion in authoritative predicates.

After an immutable source/schema handoff, root allocates feature wiring: original job admission claims intent before preflight; native targeted wake inputs contain only exact claimed rows and tools cannot consume selected rows; generic approval/event/cron/pending wake and task PATCH/retry/stale sweep consult original intent. A2A outcome-to-taskboard reconciliation is idempotent across separate stores and interrupted writes; missing original row/epoch means unknown.

## Acceptance source and pending gates

Author paused-preflight/native-wake and reverse-winner races, restart intent-before-A2A/admission, outcome-before-taskboard crash reconciliation, stale/reset/retry/PATCH/retention races and native legacy control. No runtime gate before the complete phase production/scenario delivery. Do not touch D0 diagnostics/session manager, original main checkouts, dependencies or shared services. Source handoff does not close release/shipping/C05 gates.
