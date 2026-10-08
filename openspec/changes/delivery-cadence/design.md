# Design

The approved conversation plan governs, with the operator's later build-and-run correction taking precedence. Cadence is an execution profile; the host owns agent continuation. The full pack is authoritative for portable modules, copied with digests to mini. JavaScript modules run on Node 22+, without dependencies, shell scripts, Python, symlinks or a daemon.

The sole controller performs start -> ready -> checkpoint -> finish. Ready records code completion; build and run receipts establish distinct observed outcomes. Finish records immutable work outcome, dispatches iteration:after, and finalizes hook-inclusive elapsed time. Publication emits its own later event. A failed required action prevents new work admission until repaired. Human review counts finalized attempts; publication counts successful deliveries. Timers stop scope admission, never authorize testing or early success. Hard budgets win over overruns.

An exclusive owner lock, durable sequenced JSONL and atomic snapshot protect local state. Effects are claimed before execution. Resume reports unknown external outcomes rather than blindly replaying. KBD task/change/phase counts remain references to supported canonical transitions. Cadence metadata is not a second KBD ledger.

Hooks are explicitly trusted local .mjs modules executed in child processes with JSON IPC. They receive declared environment references and a child-local AbortSignal. They run with user privileges, not in a sandbox. Warn is the default; required hook failures block next admission. Durable event/handler/revision receipts prevent known-success replays; uncertain external effects require reconciliation. No promise of exactly-once email.

Report overlapping durations using interval unions; unknown information stays unknown. Tune one approved parameter after three comparable deliveries, never weaken required build/run procedures. The project profile fixes duration at 120 minutes and publication every two successful deliveries unless the operator later changes it.

Build and launch the finished skill through its public CLI only after all modules and adapters are implemented. No intermediate verification or test suites. Native Windows/Linux execution must be reported unverified if no local host is available; never infer it from macOS success.
