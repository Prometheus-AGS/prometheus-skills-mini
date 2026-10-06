# Goals

- Resolve every finding F1–F7 and every acceptance scenario in the 2026-10-06 Bossfang–UAR architecture review, preserving its distinction between static evidence, reproduced behavior and untested hypotheses.
- Define and implement one authoritative agent execution loop per Bossfang job attempt, distinguishing job orchestrator, execution harness and model provider; reuse UAR full-run delegation where appropriate.
- Correct API-key role attenuation, trusted-host provenance, tenant preservation and key ownership boundaries; verify wrong issuer/audience, expiry, insufficient scope and cross-tenant rejection.
- Make resource-specific MCP credential resolution, grants, storage, refresh/revocation, connection reuse and receiving-server enforcement explicit for HTTP and stdio; do not blindly forward the original JWT.
- Bind approvals and side effects to exact invocation and execution identity; evaluate and resolve legacy root approval and MCP transport-session ownership gaps with real-path evidence.
- Define cancellation, interrupted-stream reconnect, retry, duplicate admission, unknown side-effect outcome and restart recovery contracts; advertise only supported capabilities and prevent duplicate execution.
- Preserve working local desktop controls and define separately testable remote multi-user deployment requirements, including service-versus-user identity and logging/model-context limits.
- Reconcile existing Bossfang/UAR C04/C05 work, The Boss adapters and active delivery plans before adding changes; isolate later source implementation in repository worktrees after plan approval.
- Perform the full assess, analyze, specification, plan, execute and reflection workflow with no stage skipped. Stop after every stage for explicit user approval of the handover; today complete assessment only.
- Produce self-contained stage evidence and independent reviews; keep original KBD shipping state untouched; do not publish, merge, deploy or mark unrelated delivery gates complete.
