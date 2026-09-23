# P1 execution plan — uar-working-agent

Date: 2026-09-23. Planner: Codex / GPT-6 Astra. Executor: **Codex / GPT-5.6-sol**, as requested; this document does not switch the session model or start implementation.
Status: planning complete when its independent review and canonical handoff are recorded. Production tasks remain pending.

## Deliverable and authority

Ship a UAR preview inside The Boss that runs a real-provider conversation, uses workspace Compass/filesystem/mini skills through host approvals, cancels correctly and preserves usable history after sidecar restart, with no Docker or developer toolchain required. Windows x64 first, Apple Silicon second. Publish each accepted customer artifact immediately to GitHub Releases and the existing website. Keep customer Windows installed acceptance pending until observed.

The researched contract remains sibling `uar-delivery-replan/plan.md`, especially §§2–5 and named P1 scenarios. This plan supplies execution order, ownership and evidence boundaries; it does not reopen architecture. Source grounding: `assessment.md`, its review disposition/supplement, and `plan-sources-receipt.json`.

**OpenSpec backend:** reuse `openspec/changes/uar-delivery-replan/`, tasks **1.1–1.10 only**. Six execution slices below map to those ten existing tasks. Register one canonical change with ten tasks in this child; do not create duplicate proposals or mark planning artifacts as implementation. The existing proposal/design's “planning-only” text describes their originating child, now reflected and closed. This child executes their explicit future P1 tasks after execution is invoked. P2–P5 tasks stay pending under their future owners; do not archive the whole OpenSpec change at P1 completion.

No production code, test suites, compiler checks or builds in this planning turn. During implementation, complete all P1 wiring before any build or behavioral gate. Source inspection is not acceptance. The operator's integration-first policy overrides historical test-first, per-edit/per-change suites, automatic review loops and all-platform release gates.

## Ownership and readiness

| Owner role | Exclusive write scope during execution | Read/reuse boundaries |
| --- | --- | --- |
| P1 lead (GPT-5.6-sol) | Phase artifacts, execution manifest and cross-repository contract decisions | Owns source reconciliation, task status and candidate freeze; settles contract changes before consumers change |
| UAR implementation owner (GPT-5.6-sol) | `/Users/gqadonis/Projects/prometheus/worktrees/uar-the-boss-sidecar`: `src/bin/uar-sidecar.rs`, security/API/runtime/session/storage adapters, Cargo and native release workflow | Reuse verified owner, RunExecutionRequest, existing execution engine and persistence; preserve current Cargo/test WIP |
| Boss implementation owner (GPT-5.6-sol) | `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar`: UAR runtime feature, service registry/lifecycle, agent schemas, host bridge, UI/settings/locales, binary/skill packaging | Reuse runtime-neutral tool catalog, existing approval/message history and binary manager; avoid changes to other runtimes beyond registration/shared contract needs |
| Release owner (same lead unless explicitly delegated) | Frozen-candidate release branches, immutable manifests, RELEASES.md and existing `Know-Me-Tools/boss-landing-spot` release/download data | Resolve and record the website checkout and connected Lovable project before modifying/deploying it; preserve other work |

These are assignments of responsibility, not claims that workers are running. Before writing, the lead establishes whether a prior writer still owns either worktree using available task/process context. Coordinate any active writer, and record the transfer. Preserve WIP hashes and deliberately incorporate or retain the scaffolding; never discard it to get a clean status. If ownership cannot be established safely, use an isolated checkout with a recorded copy of necessary WIP rather than competing in the existing checkout.

Default to one executor; independent Boss/UAR work may be delegated after the contract is recorded and ownership transferred, under the previously authorized parallel execution plan. Never assign two writers to one file. UAR runtime changes serialize with UAR packaging/Cargo edits; Boss driver changes serialize with Boss manifest/schema edits. Model and agent IDs must be written to the manifest when actually assigned.

Use a dedicated per-worktree Rust target directory at execution time (`uar-the-boss-sidecar/.target/p1`, or corresponding isolated worktree path); do not inherit the global shared target. One local Rust build writer total because of observed host memory pressure. Boss output stays under its worktree; frozen release jobs use separate native runner outputs. No dependency mutation may race with another writer.

## Ordered slices

All slices recommend **Codex / GPT-5.6-sol**. Complexity labels describe scope, not delivery-time promises. Model class is frontier for high complexity, medium for medium; the explicit executor preference overrides automatic cheaper-model routing. Every slice has high customer value because it closes a requirement of the installed P1 experience.

### S1 — Reconcile and establish the working contract

- Tasks: **1.1**. Dependencies: none. Size S; complexity Medium; model class medium.
- Scope: worktrees, contract artifacts, source and writer manifest.
- Recheck local and remote source tips without rebasing or overwriting WIP. Record whether upstream changes must be incorporated before coding; divergent upstream work is reconciled intentionally, not by automatic pull. Freeze actual source baselines and file ownership in `execution-manifest.json`.
- Record the versioned host/UAR request, response/capability, tool-correlation and event contracts. Map proposed fields to existing source definitions before editing consumers. Host owns profile/workspace/conversation principal, canonical history, provider secrets and approvals. UAR owns the execution loop. No second provider registry, chat store, runtime framework or mini service.
- Define launch-token admission separately from conversation identity; protocol version/capability mismatches must be actionable. Specify the immutable envelope (request/principal/conversation, agent, matched provider/endpoint/model/credential, cwd/allowed roots, resolved catalog, host policy/reasoning, sanitized history).
- Finish when ownership, baselines, build directories, contract version/fields and P1 task mapping are committed. This proves implementation readiness only. Do not run the preserved scaffolding.

### S2 — A real conversation through the supervised runtime

- Tasks: **1.2, 1.3, 1.4**. Depends on S1. Size L; complexity High; model class frontier. Three independently assignable implementation tasks under one demonstrable outcome.
- UAR: admit host-authenticated principals and construct existing verified run resources; enforce ownership on create/stream/cancel/approval/resume/children. Make managed MCP mutation locks and credential-persistence prohibitions independent of optional settings initialization.
- UAR: bind ephemeral provider credentials to the selected provider/endpoint after routing. Child/resume paths inherit or explicitly reacquire matching credentials; missing fallback/restart credentials fail visibly. Redact secret-bearing types and exclude credentials from checkpoints, ordinary settings, logs and outputs.
- Complete bounded retention using existing owner-keyed storage. Record concrete limits and eviction rules in the contract: active runs and pending approvals are not evicted; terminal buffers/sessions have documented count/age bounds; exhausted capacity produces an actionable refusal. Preserve host history as the recovery source.
- Boss: implement the UAR driver/connection, registration and supervised service through existing runtime/BaseService interfaces. One app-owned sidecar multiplexes principals; bind loopback launch credentials, readiness/version capability checks, restart generations and shutdown cleanup to the existing lifecycle.
- Configure a separate app-data embedded SurrealDB store with one writer, consistent with pinned 3.2.4. Start without Docker or embedding downloads. Do not import standalone UAR state or keys. Report local-only effective storage.
- Finish with the real conversation call graph wired end-to-end, including streamed text, cancellation and explicit errors. Until S3 completes, tool capabilities stay unavailable; never expose native effectful tools as a shortcut. This slice is not built or published by itself.

### S3 — Workspace work through exact host approvals

- Task: **1.5**, skill-mounting portion of **1.7**. Depends on S2 (catalog adaptation can be written after S1 using the frozen contract). Size L; complexity High; model class frontier.
- Bridge the complete existing runtime-neutral session catalog: built-ins, managed Compass/filesystem, skills, selected external MCP and memory when enabled. Reuse workspace IDs, cwd/graph paths, configured roots and existing project skill installers.
- Correlate trusted executor metadata with principal, run, call ID, namespaced tool and host-computed canonical argument hash. A run bridge token grants only its own catalog. The host approval decision record, including automatically allowed actions, must exist before actual tool execution.
- Reuse current approval cards/policy: allow, deny, acceptEdits and plan mode affect real execution. Cancel pending approvals at termination. Never store run bridge tokens in messages.
- Ensure each sidecar tool call executes at most once. Known recorded results may be returned for duplicate requests; an effect with a lost response is indeterminate and is never automatically retried. Disable UAR native file/shell/browser/network paths that bypass host policy in preview; disclose terminal permissions as code execution, not filesystem confinement.
- Missing required Compass/filesystem connections must produce actionable status rather than a silently incomplete catalog. Use stable names distinct from built-in tools; include workspace/config/generation in connection signatures and revoke connections/tokens on lifecycle changes.
- Finish when a production UAR tool call reaches the existing approved Boss execution path, with all grant/denial/result states connected to messages. Defer behavioral proof to S6.

### S4 — Recoverable conversations and complete P1 controls

- Tasks: **1.6** and remaining **1.7**. Depends on S2/S3. Size L; complexity High; model class frontier.
- Complete the main-process AG-UI adapter: stable run/step text and reasoning IDs, ordered deduplicated events, tool lifecycle, approvals, usage, cancellation and supported custom traces. Keep SSE consumption active while approval UI is open; do not reveal hidden internal reasoning.
- Replace silent broadcast lag dropping with an explicit gap outcome. Resync only from sufficient authoritative state; otherwise interrupt visibly. Sidecar death persists partial output/completed tools and cancels pending approvals. A user-requested next turn rehydrates sanitized host history with valid tool-result pairing; it does not replay effects. Explicit checkpoint resume rechecks ownership/policy/credentials.
- Finish enablement/model/workspace/approval controls, binary/version/service/backend status, restart behavior and user-invoked operational diagnostics using existing source schemas, generated types and sender-validated IPC. Disable/disclose P2–P4 options. Translate every exposed label/error/action in all existing locales.
- Use the requested impeccable/teach, UI/UX Pro Max and Vercel React guidance situationally when touching these UI files; preserve Boss components and established patterns. Rust implementation loads the Rust workspace, best-practices, async and MCP guidance as appropriate, without copying whole skills into resident context.
- Finish when every exposed P1 action has a live handler and truthful status; no placeholder buttons or translations. This is the final behavior-writing slice, not a testing checkpoint.

### S5 — Complete installable payload and freeze

- Task: **1.8**. Depends on S2–S4; native dependency inventory and release-script authoring may proceed after S1 in nonoverlapping files, without running builds. Size L; complexity High; model class frontier.
- Add a tag-triggered UAR release workflow and Boss binary-manager entry. Preserve `minimal,local-models,document-intelligence,wasm-runtime`, `panic=unwind` and existing pins. Record DLL/dylib/framework, OCR/data/model and license closure. Bundle required assets; optional model installation must be versioned/checksummed with progress, cancel and offline status. Basic chat must start without those downloads.
- Package Compass, Rust filesystem, UAR and required mini CLI/runtime closure. Advance mini to its latest committed revision at freeze, synchronize gitlink/source metadata/artifact manifests, then hold that exact revision. Copy every skill plus scripts, libraries, references, agents, templates, rules, config and **docker/** through the existing packager; preserve user/full-pack installations.
- Preserve existing Compass PATH/install behavior; include it in installed acceptance. Skills must invoke packaged tools successfully, not merely appear in an inventory.
- Finish all workflow/manifest/installer configuration before building. Preserve Windows NSIS-only packaging, exact include preflight, 10 GiB free-space minimum, 8 GiB Node heap and actual memory/disk/payload/timing reporting. Measure required Rust/native resources rather than assuming the Electron memory setting covers them.
- Freeze app/UAR/mini source commits and contract/features first. Native payload builds produce immutable URLs/checksums. Commit those exact payload manifest entries in Boss, then freeze the final installer-source commit before its packaging build. Record this two-step dependency explicitly; do not invent checksums before artifacts exist.
- Finish source work with a complete release recipe and candidate source manifest. Task 1.8 is only marked complete when its native payload/immutable manifest actually exist during S6; source-ready is a separate manifest state.

### S6 — Build once per candidate, exercise, publish immediately

- Tasks: **1.9, 1.10**, artifact finalization of **1.8**. Depends on complete S2–S5 production wiring. Size L; complexity High; model class frontier.
- Build the actual Windows x64 UAR payload and NSIS installer first, with only required packaging/compiler preflights. No standalone verification build, unit suite or CI product test workflow. Fix observed compilation/packaging failures and rebuild affected artifacts. Then produce Apple Silicon payload/DMG.
- Use the built installer as the integration and release candidate, not a throwaway build followed by an identical release rebuild. Record commits, version, architecture, sizes, checksums, signatures and timings.
- Run the complete installed P1 gate below on each customer platform. A Windows operator run is required for final Windows acceptance; unavailable hardware or feedback stays pending. Provide the installer through a draft/restricted acceptance release to the operator; public preview distribution and replacement of advertised downloads wait for the release gate.
- On each accepted customer platform, immediately update GitHub release metadata, RELEASES.md, immutable release manifest, website generated data and connected Lovable deployment. Validate live links against the exact artifact/version/checksum; preserve other platforms' previous complete releases. No IPFS. Windows publication does not wait for Apple Silicon.
- Fix observed failures on the frozen candidate lane, rerun the affected scenarios, update version/artifacts/site. Never silently replace immutable bytes. P1 remains incomplete until required installed results are recorded.
- After P1 source freeze, P2 code may proceed in separate worktrees while P1 acceptance runs, as already authorized. At most one unaccepted successor; no P2 source enters P1 fixes. Propagate P1 corrections before P2 freeze. P5 other-platform work cannot delay either customer platform.

## One complete P1 integration gate

Create disposable acceptance workspaces during implementation and run them only against the complete installed candidate. Reuse the named parent-plan scenarios; record pass/fail/pending with actual evidence, not counts of unit tests.

| Scenario | Required observation |
| --- | --- |
| Clean install/local startup | App launches UAR without Docker/developer toolchain; effective local backend shown; packaged binaries resolved; Compass works in a new terminal |
| P1-WorkspaceTask | Real provider locates the fixture function using Compass, reads/edits with filesystem after approval; host records both MCP servers; workspace B unchanged; a packaged mini skill successfully invokes its bundled dependency |
| Approval/plan policy | Denial leaves files unchanged; plan mode cannot edit/execute; missing/wrong/revoked bridge token, principal, call identity or altered arguments cannot cause an effect; native bypass paths unavailable |
| Concurrent identity | A/B use distinct provider credentials/files/history; wrong-principal run, stream, cancellation and approval access refused; redacted instrumentation proves provider binding without recording credentials |
| P1-IsolationRecovery | Cancellation terminates run/approvals; sidecar death yields interruption; reopening/next turn retains A history and completed tool results without B data or replaying edits |
| Stream/effect recovery | Actual transport interruption and replay gap produce explicit resync/interruption; loss after an effect produces known result or indeterminate state, never automatic repeated execution |
| Persistence and diagnostics | Restart preserves agent/settings/history/local store; diagnostics distinguish process readiness from a successful provider/tool operation; exported logs/preferences/checkpoints contain no credential material |
| Existing app/upgrade | Existing runtime conversation still works; Compass/filesystem settings remain usable; upgrade preserves user-owned skills/config/data, app-owned payload refreshes, rollback does not overwrite newer data |

Rare-error deterministic fixtures may drive the real installed process/protocol/bridge; they do not replace the real-provider task. Observed credential disclosure, cross-workspace access, approval bypass, destructive replay, launch failure or primary workflow failure blocks external preview distribution. A later-phase capability explicitly disabled in P1 is not a P1 failure.

## Execution order, scope and completion

S1 → S2 → S3 → S4 → S5 freeze → S6 Windows → publish Windows → S6 Apple Silicon → publish Apple Silicon. After S1, independent Boss/UAR code can overlap with explicit file ownership; dependency inventory/release-script writing can overlap, but builds start only after complete P1 production wiring. No separate per-slice acceptance/review loops.

This plan explicitly includes the existing website repository/Lovable release-data deployment in release scope. Resolve its actual checkout/project identity in the execution manifest before edits; no guessed local path or new site. Other repositories remain read-only unless a concrete integration failure requires an authorized scoped fix.

Track implementation-source state separately from built, installed, accepted and published states. Canonical tasks mirror existing OpenSpec IDs; code tasks complete on committed production wiring, evidence tasks only on their observed outcomes. Never set the run-global completion dimension to a phase count or archive the multi-phase change when only P1 ships.

Start/commit/freeze/build/first installed-success timestamps, actual assigned models, human interventions and failure/recovery time belong in this child's outcome ledger. No fabricated schedule or model-superiority claim. Required native feature weight and shared-process isolation are material costs; P2 A2UI, P3 remote/KB/encryption migration and P4 algorithms remain deliberately deferred, not removed.

Next command: **`/kbd-execute uar-working-agent`**, using GPT-5.6-sol. First action is task 1.1 worktree/ownership reconciliation and contract record; do not reopen assessment or ask again for already granted routine release permissions. If pins/architecture must change or data preservation cannot be met, present the concrete issue. No silent scope cuts.
