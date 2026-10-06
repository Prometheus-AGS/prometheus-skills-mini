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

## Native claim refinement accepted at source interface handoff

Use existing pending→in_progress CAS inside the exact-list IMMEDIATE wake transaction; returned rows are already claimed and only new winners reach the targeted model prompt. Persist a tagged native harness classification too: leaving payload empty would let stale reset/retry erase prior native execution provenance and permit later UAR selection on an unknown native effect. Native retry retains existing policy and status CAS; no new settlement token/recovery design. Selected intent always conflicts with original native classification even if status later becomes pending. Supported native payload remains eligible for existing native mutations; selected and unknown payload excluded by typed transactional classification and compare of original bytes, not unsafe JSON SQL assumptions. Private A2A and existing native status keep separate authorities.

Exact schema export addition accepted: crates/librefang-memory/src/lib.rs reexports substrate::task_dispatch so feature callers can name the typed API. No other lib.rs or backend edits.

## Targeted workflow/native wake compatibility

Accepted typed TaskPosted job IDs travel beside TriggerMatch dispatch; targeted workflow claims exact actual stored UUID/name assignee before run_workflow and supplies serialized newly ALREADY CLAIMED rows through existing workflow input plus context. Selected/unknown/no new claim does not launch workflow. An unassigned targeted workflow has no accepted claimant and reports unsupported; trigger ownership never invents an assignee. Untargeted workflows and cron/deferred contexts without actual JobAttemptRef stay native unchanged. This is source policy, not executed race evidence.
