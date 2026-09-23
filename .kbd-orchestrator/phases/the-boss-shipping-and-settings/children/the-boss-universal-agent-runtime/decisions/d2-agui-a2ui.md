# D2 — How the-boss handles AG-UI, A2UI and the rest of UAR's features (revision 3)

Revision 3, 2026-09-23. Revised after two adversarial reviews (round 1: 2 CRITICAL; round 2: 2 CRITICAL),
read-only spikes, a local check of the official A2UI renderer, deep research, and operator decisions.

## Decision

**UAR changes are part of this effort.** The operator authorized UAR repository changes for this work
(own worktree `uar-the-boss-sidecar`). Dependency gate: the-boss's UAR driver requires a minimum UAR
release that exposes the stream fixes, lag signal, run-scoped credentials and MCP servers, history
reload, and working-directory / reasoning-effort fields. At sidecar start the driver reads UAR's version
and capabilities; against an older sidecar, UAR agents are refused with a clear message instead of
degrading silently.

**What "support ALL the features" means (operator decision: configure + see).** Every UAR feature the
operator named is configurable from the-boss and its activity is visible in the conversation; dedicated
management screens (a memory browser, sub-agent inspector, guardrail history) are out of scope this phase.

| Feature | Configure (where) | See (how) |
|---|---|---|
| AG-UI protocol | n/a (transport) | all runs stream through the adapter |
| A2UI surfaces and actions | per-run presentation mode (agent editor) | rendered surfaces; actions round-trip |
| Agent definitions (`.agent.md`) | agent editor + import/export (D1) | n/a |
| Context compaction | per agent (D3) | context-usage and compaction trace |
| Chunking | per knowledge base (D3) | ingestion status |
| Skill selection | app-wide algorithm + per-agent prefer/max (D3) | skill-activated trace |
| Memory | per agent on/off + knowledge bases | memory recall/mutation trace |
| Guardrails, sycophancy | app-wide (D3) | flag notices in the conversation |
| Budgets | per agent (D3, once enforcement is verified) | budget alerts |
| Sub-agents | via tool and approval policy | sub-agent trace (start, finish, result) |
| Citations | n/a | sources on the message |

**Translation.** The main process consumes UAR's AG-UI stream (`stream_mode=agui_spec`, profile
`uar.agui/1`) and translates it into AI SDK v6 `UIMessageChunk` parts, like `dsh/dshStreamAdapter.ts`: text,
reasoning and tools to native parts; approvals to `tool-approval-request`; denials to `tool-output-denied`;
steps to `start-step`/`finish-step`; citations to source parts; run end to `message-metadata` + `finish`;
errors and cancellation to `error`/`abort`; UAR telemetry to persisted `data-uar-*` trace parts. The AG-UI
profile version is pinned; an unknown event type is logged and shown as a trace notice.

**UAR stream fixes:** `TEXT_MESSAGE_START/END` and `REASONING_START/END` on the runs stream; a message id
per step for text and reasoning; error flag and tool name on `TOOL_CALL_RESULT`; an explicit lag signal
instead of silently dropping events when a subscriber falls behind, so the-boss resyncs from history.

**A2UI.** Official `@a2ui/react` 0.10.2 with the-boss's own 9 components registered under UAR's catalog id
and the standard basic-catalog URL; surfaces persisted as `data-a2ui-surface` parts (id = surface id), the
main process applying JSON-Patches and emitting full snapshots and stripping the envelope `profile`;
bounded surface size; validation failures reported back to UAR. Actions: `MessageProcessor` action handler
→ sender-validated IPC → main process → `POST /api/uar/runs/{id}/a2ui/actions` → continuation run as a new
turn; the main process keeps a surface → run/session owner map and never shares one agent's surface data
with another.

**History.** the-boss stays canonical for what the user sees and appends the raw AG-UI event log per session
and run. On sidecar restart the driver re-sends history (UAR change: accept host-supplied history on the
runs API) and finalizes in-flight runs as aborted.

## Assumptions

- `UIMessageChunk` plus persisted `data-*` parts carry everything users need to see.
- Event order within a run is preserved (verified in UAR code).
- The official `@a2ui/react` renders UAR's catalog with the-boss's components (verified in source, not run).

## Falsifier

Named tests and fixtures in step 2; any failure reopens this decision.

1. **Version gate:** against a sidecar build without the required capabilities, creating a UAR agent run
   shows the stated message and starts nothing.
2. **Feature coverage:** for every row of the feature table, one test shows the configure path reaches UAR
   (recorded run policy or settings) and one fixture shows the see path renders. A row without both fails.
3. **Ordering and attribution:** a recorded trace with interleaved text, reasoning, two tool calls and a step
   boundary translates in exactly the recorded order with per-step attribution.
4. **No silent loss:** every event type UAR emits (enumerated from `adapters.rs` and `sse.rs`) yields a
   mapped part or a visible notice; a forced slow consumer produces a resync, not a gap.
5. **A2UI snapshots:** a surface updated 200 times re-renders each update within 50 ms on the development
   machine, and persisted size stays within the final surface size + 10% per surface.
6. **Renderer and round trip:** all 9 components render under both catalog ids with one React instance and
   no overrides of the-boss theme tokens; a Button action continues the run as a new turn; an undeclared
   action is rejected and shown as an error.
7. **Restart:** after killing the sidecar mid-conversation, a follow-up question that needs earlier turns is
   answered correctly in the same session.

## Unresolved review findings (round 3, accepted by operator decision; carried into step 2 as open risks)

Review: judge `gpt-5.5`, `verified-distinct`, verdict BLOCK (2 CRITICAL, 5 WARNING); findings in
`../review/d2-agui-a2ui.r3.findings.json`.

1. **Host ownership of credentials, MCP and approvals is not re-tested here.** Those tests live in D1
   (falsifiers 3–6); step 2 treats them as prerequisites for D2's adapter work.
2. **Restart falsifier needs a deterministic fixture.** Step 2 replaces falsifier 7 with fixed prior turns,
   a fixed question, the required facts in the answer, a timeout, and explicit failure on missing or
   cross-session history.
