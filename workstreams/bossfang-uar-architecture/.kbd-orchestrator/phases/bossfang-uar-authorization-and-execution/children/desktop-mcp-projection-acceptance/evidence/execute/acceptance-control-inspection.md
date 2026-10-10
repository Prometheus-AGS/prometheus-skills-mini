# Acceptance-control feasibility inspection

Read-only prerequisite investigation during implementation; no scenario authored or run.

FC-UAR-PERSISTENCE remains unresolved. Boss UarSidecarService.ts281–345 constructs genuine sidecar with an isolated embedded SurrealKV runtime.db beneath application.getPath(feature.agents.uar.data); it filters inherited UAR overrides and restarts when changing storage. UAR lifecycle.save_evidence calls production PersistenceLayer; SurrealDbProvider::save_tool_admission_evidence at1505–1548 performs actual CREATE then exact record reconciliation. Inspected settings namespace routes expose configuration, not a named per-write failure control. This inspection did not establish a safe deterministic fault of claim-intent or local-terminal write. Permission or filesystem disturbance is an untested hypothesis, not proof of a failed specific write; mocks or host-terminal callback failures cover other boundaries. Integration author must continue feasibility at task7 and block those precise cases if no actual control is available within scope.

FC-POSTACK-CANCEL remains unresolved. Host-response hold/drop can control before acknowledgment, but it does not establish an interval after UAR has accepted the receipt and before its native body. The real cancellation API and zero-dispatch oracle need a deterministic interval in the actual execution path. Static cancellation checks are required implementation, not executed timing proof. No debugger instrumentation or production switch was added.

These are acceptance prerequisites, not a reason to stop independent production. No shared services, storage files, original profile, process or dependency installation was changed. D0 remains excluded.
