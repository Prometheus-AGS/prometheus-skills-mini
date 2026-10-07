# Tasks

These are proposed backend task IDs for Plan registration, all unfinished. Spec does not authorize implementation. Every task follows specs/native-tool-admission/spec.md and design.md. A9 overrides upstream per-group early-test examples: declare each group's scenarios here, finish all coordinated production first, then author/run its executable scenarios at the complete child delivery boundary. No per-edit unit/mock gates.

## 1. Coordinated production admission

- [ ] 1.1 Implement UAR v2 source-derived executionKind, bound authority/receipt equality, consuming native host port and standalone behavior; deliver contract documentation and the cases A1/A2/A3 in verification.md, with runtime verification deferred until task 3.2 after complete production.
- [ ] 1.2 Implement Boss v2 admission, durable single-owner native consumption, strict cross-kind MCP refusal and claimed-only terminal behavior; partition wire/decoder responsibility before exceeding 500 lines; deliver contract documentation and cases A1/A2/A3, verified at task 3.2.
- [ ] 1.3 Wire actual UAR native/BuiltIn dispatch to claim-before-effect and cancellation observation, preserving required sandboxing, durable uncertainty and terminal failures; deliver lifecycle documentation and cases A2/A3, verified at task 3.2.
- [ ] 1.4 Update every enumerated owned manual protocol author together, including standalone/custom ports, inline revision fixtures, host gate and E2E diagnostic; deliver a complete caller inventory with no v1 fallback or kindless authority, verified by strict compiler and A1 at task 3.2.

## 2. Controlled desktop acceptance behavior

- [ ] 2.1 Implement a finite provider conversation based on received advertised schemas and correlated tool-call/result IDs; deliver fixed safe failure categories and cases A4, verified at task 3.2.
- [ ] 2.2 Implement actual selected-server eager/deferred fixture catalog preparation, unique discovery query, filler refusal, source-specific revision/approval/preparation/effect counters and original projection assertions; deliver cases A4/A5 without cap, visibility or approval changes, verified at task 3.2.

## 3. Complete child delivery and integration evidence

- [ ] 3.1 After all production and owned caller wiring in groups 1 and 2 is complete, restore locked isolated prerequisites without changing dependency pins and finish executable real-path acceptance scenario authoring A1–A6 in their owned gate surfaces; then compile the final affected callers, build fresh Boss main bundle and genuine production-feature UAR sidecar with serialized writers, and capture final source/artifact manifests required by A6.
- [ ] 3.2 At this complete delivery boundary, run the finished exact host protocol and actual Electron projection scenarios in verification.md once, retain all original negative controls, and deliver finite source-bound receipts; compiler or mock evidence cannot replace either boundary. If a gate fix changes caller or production sources, refresh the affected compiler/build/source binding before rerunning only the failed gate under 3.3.
- [ ] 3.3 Fix any observed failed gate within scope and rerun only that failed gate; deliver contradictory evidence, precise limitations and acceptance disposition for every case, with no replay, silent scope change or unrelated parent retest.
- [ ] 3.4 Review the completed production change and actual acceptance evidence using the active team and adversarial workflow, verify product scope and source manifests, and deliver child handoff while retaining all independent parent blockers and unverified deployment claims.

## Workflow follow-up

- Plan must assign exact writers/files, canonical child tasks, build prerequisites and approval handover before Execute; none are marked complete by Spec artifacts.
- Stop at Execute completion for human handover to Reflect. Reflection and any child exit or parent reconciliation require their prescribed approvals.
- Archive only after all implementation tasks and human lifecycle gates are actually satisfied; no parent release certification or publication is authorized by this change.
