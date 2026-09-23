# Execution tasks — gated on reflection and approval

These boxes describe future implementation; none is complete merely because this plan exists. Source inspection/diff completion establishes that a code task is wired; behavior is accepted only at the named phase gate. See the KBD plan for contracts, named scenarios and overrides.

## 1. P1 — Working installed UAR agent

- [x] 1.1 After operator approval, create the P1 execution phase, reconcile existing UAR WIP with its owner, record dependency/contract baselines and isolated build directories; verify by the committed execution manifest and worktree inventory.
- [ ] 1.2 Complete trusted principal ownership and bounded session/run retention, preserving committed launch security; inspect that every run/approval/resume/child entry routes through verified identity and the settings-independent MCP lock. Behavioral acceptance: P1-IsolationRecovery.
- [ ] 1.3 Complete run-scoped provider credentials, MCP resources and host-context ingress using the existing execution request; inspect that routing/child/resume paths preserve the envelope and do not write secrets to global settings. Acceptance: P1-WorkspaceTask and P1-IsolationRecovery.
- [ ] 1.4 Add the Boss supervised sidecar service and UAR runtime driver/connection; inspect runtime registration, lifecycle, capability checks, cwd/history transfer and local startup are wired into the actual conversation path. Acceptance: P1 installed workflows.
- [ ] 1.5 Add the authenticated host MCP bridge, call correlation and approval enforcement; inspect that the workspace-resolved catalog and policy reach the execution boundary and bypass-capable native tools are disabled/disclosed for preview. Acceptance: approve, deny, plan-mode and isolation cases in P1.
- [ ] 1.6 Complete the core AG-UI adapter and recovery, including explicit gap behavior and interrupted-turn persistence; inspect step/tool IDs, cancellation, retry/indeterminate outcomes and host history restoration. Acceptance: P1-IsolationRecovery.
- [ ] 1.7 Complete P1 settings, diagnostics, existing-locale translations and skill mounting; inspect all exposed controls have live handlers and report capability/backend state. Acceptance: installed create-agent, diagnostics and restart workflow.
- [ ] 1.8 Finish tag-only sidecar payload and actual Boss installer packaging with full required runtime assets, pinned mini closure and immutable GitHub manifest; inspect native job inputs, architecture mapping, checksums, version and signing metadata before freezing.
- [ ] 1.9 Freeze P1 commits; build the actual Windows x64 and Apple Silicon candidates and run the complete P1 phase integration gate against installed artifacts, recording named outcomes and failures. Start P2 development separately while this acceptance runs.
- [ ] 1.10 Fix observed P1 failures, rebuild affected artifacts and publish each accepted customer platform through GitHub and the website; verify the advertised artifact matches the frozen manifest and preserve pending installed acceptance explicitly. Propagate candidate fixes into P2.

## 2. P2 — Interactive workflows

- [ ] 2.1 Freeze the exact nine-component catalog/API mapping from pinned UAR sources; implement official-renderer adapters using Boss UI primitives, persisted surface snapshots and conversation ownership. Completion artifact: mapped catalog inventory and wired message renderer.
- [ ] 2.2 Implement sender/owner/revision-validated actions, duplicate-action handling and credentialed inline-artifact continuation; inspect the renderer-to-IPC-to-sidecar call path. Acceptance: P2-FormAction.
- [ ] 2.3 Add supported execution traces and agent definition import/export with explicit unsupported-field disclosure; inspect serialization and renderer wiring. Acceptance: P2-DefinitionRoundTrip and a real interactive run.
- [ ] 2.4 Finish phase settings/locales/diagnostics, freeze commits and build/install the P2 candidate; run the full P2 gate plus the completed core P1 workflow, publish ready customer platforms, and start P3 in isolated worktrees.

## 3. P3 — Knowledge and resilient storage

- [ ] 3.1 Implement encrypted settings/legacy-secret migration with OS-protected key storage and no silent standalone-data import; inspect new writes/migration/rollback handling. Acceptance: P3 candidate credential containment through real persistence and exported diagnostics.
- [ ] 3.2 Connect scoped remote SurrealDB to the existing service configuration and finish explicit/automatic/local-only behavior; inspect startup choices and ensure the MCP sidecar lock is independent of fallback state. Acceptance: P3-KnowledgeStorage backend scenarios.
- [ ] 3.3 Implement agent document selection, principal-owned KB ingestion with request-scoped credentials, progress/cancel and citations; inspect the UI-to-UAR ingestion and selection path. Acceptance: P3-KnowledgeStorage isolation/restart/retrieval.
- [ ] 3.4 Implement explicit recoverable local-to-remote copy, phase settings/locales and operational diagnostics; inspect source preservation and completion records. Acceptance: successful copy and interrupted-copy scenario.
- [ ] 3.5 Freeze, build/install and run the complete P3 gate with existing chat/actions still usable; fix affected paths, publish accepted customer artifacts and start P4 separately.

## 4. P4 — Adaptive intelligence and complete configuration

- [ ] 4.1 Record the labeled skill-task corpus and bind real LLM skill matching to the run provider; inspect the active production matcher and fallback disclosure. Acceptance: P4-SelectionAndControls.
- [ ] 4.2 Implement distinct local embedding matching with versioned asset installation, offline state and cancellation; inspect that matching does not call a remote backend. Acceptance: network-disabled P4 selection scenario after assets are installed.
- [ ] 4.3 Complete agentic chunking and parser corrections without changing unmarked KB defaults; inspect reconstruction validation and visible fallback handling. Acceptance: P4-ContextAndChunking with real ingestion/retrieval.
- [ ] 4.4 Complete compaction strategies, budgets, guardrail/sycophancy settings and execution/sub-agent controls under the host policy contract; inspect every exposed setting reaches behavior and traces. Acceptance: the P4 control scenarios, including child scope and cumulative budgets.
- [ ] 4.5 Reconcile the full approved feature matrix, finish locales/diagnostics, freeze and build/install the P4 candidate; run the complete phase integration gate, resolve failures and publish. No feature becomes complete through a silent substitute.

## 5. P5 — Remaining platform lane

- [ ] 5.1 After customer P1 artifacts publish, build and release the available completed experience for Mac Intel using the same frozen-source contract; record actual native/installed evidence and update the site immediately.
- [ ] 5.2 Build Windows ARM64 and Linux x64/ARM64 from the latest completed candidate, fixing observed native/installer failures; record launch/workflow evidence and any unavailable hardware as pending.
- [ ] 5.3 Publish immutable artifacts and matching release/site metadata for each resolved platform; final completion requires full feature coverage and recorded installed acceptance, not just successful compilation.
