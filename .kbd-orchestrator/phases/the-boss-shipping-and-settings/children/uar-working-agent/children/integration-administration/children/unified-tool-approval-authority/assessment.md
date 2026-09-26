# Assessment: unified-tool-approval-authority
Project: prometheus-skills-mini / The Boss / Universal Agent Runtime
Date: 2026-09-24
Stage: assessment only; architecture recommendation, not execution approval.
Verification: source inspection and existing failed integration artifacts. No new tests, builds, or production edits.

## Decision in brief

Keep UAR as the run and approval coordinator and The Boss as the independently authoritative host of its capabilities and user interface. Replace the approval-event-fed bridge credit ledger with an explicit, identity-bound execution admission contract. Do not replace UAR with Codex, embed another harness, or introduce a durable workflow engine to solve this boundary.

However, **the observed Gate V failure is not proof of an approval bypass**. The gate itself sends the wrong filesystem argument. Fixing that fixture and preserving the actual failed tool result is a separate, necessary prerequisite to interpreting its next result. Architecture changes must be justified by the inspected production gaps below, not by treating this malformed invocation as proof of them.

There is no universally perfect architecture or exhaustive list of all harnesses. The recommendation is bounded by this project's split Rust-runtime/Electron-host trust boundary, delivery priorities, and the inspected versions.

## Baseline and cross-tool position

The active worktrees are:
- Boss: /Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar, branch feat/uar-agent-runtime, HEAD 2fa0b4b87f0e8991a97873590d093991b91b395f.
- UAR: /Users/gqadonis/Projects/prometheus/worktrees/uar-the-boss-sidecar, branch feat/the-boss-sidecar, HEAD 19e2ad1575621fcd76d01d16a8ef96aa5751a843.
- Codex reference: /Users/gqadonis/Projects/references/codex, HEAD 986ff1cc7ced0081ec5014b700a376333d87f869.

Both integration worktrees contain uncommitted work. HEAD alone is therefore insufficient provenance; research/local-evidence.json records inspected file hashes, while review/packet.json retains selected excerpts. All research paths in this assessment are relative to this child directory; research/index.md is the entry point and review/evidence-index.json lists the artifacts. The primary UAR checkout and Boss .worktrees/update-agent-team-skills-mini are not this gate's source. In particular, the active Boss connection uses the agent catalog; an older inline-artifact connection must not be described as the current implementation.

At canonical revision 667 this assessment child has 0/0 implementation changes. Its parent integration-administration remains 21/37 tasks, one unfinished registered change; the project roll-up 17/36 is a different counter. No parent task was completed by this assessment. No running native Codex goal was found in the preceding status check. KBD state remains the authoritative process position, not evidence of a native goal.

## What is actually established about the blocker

Existing Gate V error-context.md records: run done, no stream error, approvalCount 0, reattached false, toolOutput false. The second provider request contains a tool-role message. It does not record that message's content or prove a side effect.

Source chain:
1. tests/e2e/gates/uarExperienceGate.test.ts:252 creates the built-in @cherry/filesystem server.
2. Its provider stub selects the first __write tool and sends {path, content} at lines 106–120.
3. src/main/ai/mcp/servers/filesystem/tools/write.ts:8 requires {file_path, content}; line 24 exports that schema.
4. UAR src/llm/orchestrator.rs:2309 validates against the descriptor before the approval gate at 2371. Validation failure emits a failed ToolResult and continues at 2314–2354.
5. The stub treats *any* tool-role message as success and emits “completed after the approved filesystem operation” at lines 105 and 126, irrespective of error content.

The fixture/schema mismatch is confirmed by static inspection. It is a strong causal explanation of zero prompts and a model follow-up without successful tool output. It has NOT been rerun here, and the saved failure lacks the actual tool-error payload; historical causal attribution remains an inference, not a newly reproduced result. Do not claim an unauthorized write occurred. The gate's assertion about the marker file is after the failing assertion and was never reached.

The gate's detach/attach at lines 340–341 detaches the renderer from Boss. It does not disconnect the Boss-to-UAR SSE transport or restart the sidecar. It cannot certify those separate recovery claims. Another saved trace failed during window startup and must not be conflated with this approval failure.

Why the counter stayed at 21: the next task is a broad end-to-end acceptance boundary, so preceding code edits do not advance it. The diagnostic strategy compounded the delay: a malformed fixture, success narration after error results, inadequate retained failure content, confusion between worktrees, and conflation of renderer reconnect with runtime recovery. The evidence does not quantify how much time each contributed or establish that every earlier attempt had the same cause.

## Current authority and data flow

Catalog definition and policy → UAR effective run policy → descriptor validation → governance/approval gate → root-lane pending waiter → custom AG-UI approval event → Boss approval controller → Boss registry/UI → bridge credit plus approval POST → UAR MCP invocation → Boss MCP bridge → actual server.

Sources, relative to the active worktrees:
- UAR runtime/manager.rs:4819–4930 resolves Deny/Ask/Auto and governance. The dirty implementation limits local bypass to Auto. A Cedar denial precedes prompting; Ask is not permission to bypass governance.
- UAR runtime/thread/approvals.rs:23–159 has a root lane, serialized requests, exact approval IDs, oneshot decisions, cancellation and timeout. Child channels share the root lane. Pending continuation state is in memory.
- Boss UarToolApprovalController.ts:139–158 independently recomputes prompt/approve/deny. Built-in auto and permissive Boss modes can approve an incoming UAR Ask event without a person.
- Boss controller:78–85 and 130–135 credits the host ledger before posting the decision, revoking on a request error. There is no atomic shared admission receipt across that HTTP boundary.
- Boss UarHostMcpBridge.ts:133–173 stores call IDs in a queue keyed by tool and argument hash, but consume accepts only tool and arguments and shifts the first ID. Incoming execution does not establish which invocation it consumes.
- UAR mcp/registry.rs:2300–2304 constructs the actual MCP call with name and arguments, without the originating tool-call or approval identity.
- Boss UarRuntimeConnection.ts:233–254 retries the live stream with an existing adapter and replay cursor. UarAguiAdapter.ts retains event deduplication and routes custom approval events. These are useful existing components, not durable restart recovery.

Trust boundaries already present: provider-produced arguments, renderer-to-main decisions, principal/owner-bound UAR APIs, per-run authenticated loopback bridge, mounted-server/workspace authorization, and independent MCP servers. These boundaries justify admission, identity and revocation requirements. They do not justify unrelated platform hardening.

## Gap assessment

| Area | State | Concrete gap / retained strength |
|---|---|---|
| Catalog authority and run ownership | PARTIAL | Active code selects catalog ID/revision and owned run endpoints; preserve this. Do not regress to inline synthetic agents. |
| Effective policy composition | PARTIAL | UAR computes policy, Boss may silently weaken Ask. Conversely UAR Auto may never emit the event that funds the host ledger. |
| Exact invocation admission | PARTIAL | Run-scoped bearer exists; tool+args FIFO cannot distinguish identical calls or root versus child execution identity. |
| Approval UX and registry | PARTIAL | Existing prompt and opaque ID response path is reusable; UI events currently participate in execution authorization and controller errors are not a durable decision state. |
| Renderer payload boundary | PARTIAL / literal goal NONCOMPLIANT | UarToolApprovalController.ts:102,114–115 copies raw tool input into registry/presentation events, alongside IDs and tool name. Thus messages are not opaque IDs only. No actual credential leak was established; arbitrary tool input can contain sensitive data. This inspection does not certify redaction of all run-detail/log fields. |
| Validation | DONE for inspected path | Parse/schema validation precedes gate. Current validator returns parsed arguments unchanged, so argument normalization drift is not an observed defect here. |
| Live disconnect/cancellation | PARTIAL | Existing cursor, generation and cancellation machinery; renderer reattachment proves less than SSE reconnect. |
| Process restart | PARTIAL | Pending waiters/bridge grants are memory-only; no inspected contract for reconciliation of a possibly dispatched external effect. |
| Observable failures | PARTIAL | Terminal tool receipts exist; Gate V only retains provider metadata and broad run detail, hiding the decisive tool error. |
| Acceptance evidence | PARTIAL | Existing gate is useful but malformed and overclaims recovery coverage. No numerical coverage percentage is supportable. |

Spec gaps map to the child goals: monotonic policy, exact invocation identity, child lineage, decision lifecycle, reconnect/restart outcomes. The parent administration scope remains unchanged. Build health UNKNOWN for the dirty baseline; existing Gate V FAIL. No compiler or test command was run because this stage is assessment-only.

## Reference architecture lessons

Codex's local Rust source centralizes request_approval (core/src/tools/approvals.rs:495), while orchestrator.rs:125 and mcp_tool_call.rs:205 preserve independent pre-execution restrictions. Approval does not override tool disablement or host constraints. It carries a prepared invocation/catalog binding through execution (codex-mcp/src/binding.rs:169,305), rejects a stale catalog lease, and registers pending identities before emitting.

Codex stores live pending callbacks in memory (core/src/state/turn.rs:88; app-server/src/outgoing_message.rs:104). It removes them once and replays still-live requests on resume (outgoing_message.rs:362,457; request_processors/thread_lifecycle.rs:791). That proves live callback correlation, not durable approval continuation or exactly-once external writes. Remembered permission is a policy rule, not an outstanding execution receipt. Codex can transform hosted-file arguments after approval; therefore blindly copying it does not establish exact wire-argument binding.

The external harness evidence and pinned sources are in research/landscape/harness-landscape.md:
- Claude Agent SDK: host callbacks and permission modes are useful integration seams, but earlier automatic rules can skip callbacks. It is not a guarantee that every upstream Ask reaches the host.
- OpenCode: rule-based allow/ask/deny with pending deferred decisions and persisted permission rules. Persisted rules must not be mistaken for persisted pending calls.
- Gemini CLI: scheduler-owned call identity and correlation ID; explicit approval/edit/policy-update handling and cancellation. Its integrated scheduler is a pattern, not a replacement for UAR.
- Official DeepSeek Harness: distinguish approval/audit identity from gateway message identity and replay only still-live pending requests. Do not infer crash durability.
- OpenAI Agents SDK and LangGraph: serialized interruption/checkpoint continuation is an alternative for long-running workflows, with explicit resume and side-effect constraints. LangGraph may rerun code before the interrupt, so checkpointing does not imply exactly-once effects.
- AG-UI's current interrupt documentation describes ending a wire run with an interrupt outcome and starting another with a resume response. It is a protocol option, not a reason to replace UAR's logical run immediately. Current concept/draft terminology differs; pin a supported profile before adopting it.

## Candidate architectures

| Option | Fit and cost | Decision |
|---|---|---|
| Repair fixture only and keep FIFO ledger | Fastest gate correction; leaves independently observed authority/identity defects | Necessary diagnostic repair, insufficient target |
| Boss owns every decision, UAR calls back | Simple desktop policy, but weakens UAR standalone and child/governance ownership | Reject as global architecture |
| UAR alone authorizes, host trusts its boolean | Fewer checks, loses Boss authority over capabilities it owns | Reject |
| UAR coordinator + explicit Boss admission | Reuses both runtimes; fixes bounded adapter/contract seams | Recommended for analyze |
| Persistent workflow/checkpoint replacement | Supports long waits but broad runtime/storage migration, does not itself solve host authorization | Defer unless a concrete product requirement needs crash continuation |
| Signed capability service / new daemon | Can serve independently deployed adversarial components, adds keys and lifecycle cost | Not justified for the current authenticated local bridge |

## Recommended contract to take into analyze

One coordinator is not one omnipotent authority. UAR owns the lifecycle and effective run policy. Boss supplies host restrictions and records decisions through an authenticated main-process adapter. Neither side can relax the other's denial or explicit human requirement. Model this as restrictive policy composition, not two unrelated prompt heuristics.

Prepare one immutable execution envelope after validation: protocol version, owner, root run, executing child run, generation/epoch, invocation ID, execution attempt, mounted server/tool/catalog revision, normalized argument representation and digest, effective policy revision, and the reason approval is required. Keep model tool-call IDs and UI request IDs distinct from the runtime's unique invocation identity. Raw secrets must not become renderer-visible digests/payloads or logs.

All host-bound calls, including Auto, traverse admission. Auto is a policy decision that still needs exact execution identity, not the absence of a ledger credit. UAR Ask requires a recorded human decision even if Boss would normally auto-approve; Boss Ask can tighten UAR Auto. Either Deny stops before dispatch. Standalone UAR uses the same coordinator with its own adapter; no new Boss dependency inside core orchestration.

The host must bind an admitted immutable envelope to the arriving execution, atomically claim it once, and recheck current host restrictions/generation. The MCP extension location or dedicated admission API remains an analyze decision: ordinary arguments cannot carry hidden permission fields, and metadata is not trustworthy just because it exists. Inspect the actual pinned rmcp API before choosing transport. A server-side opaque receipt in the existing authenticated bridge may be sufficient; signed tokens are not presumed necessary.

Proposed observable states: validated → policy denied / awaiting decision / authorized → claimed → succeeded / failed / outcome unknown. Approval decision acknowledgment and execution claim need independent idempotency. A repeated decision can report its previous result; it must not grant another execution. Cancellation/revocation before claim prevents dispatch; cancellation after dispatch does not promise rollback. An ambiguous external result is not automatically retried.

Live renderer/SSE reconnect replays the same pending record and identity, never creates a second decision or grant. For the first delivery, recommend fail-closed generation invalidation on process restart plus inspectable retained audit/result references. Clearly terminate/reconcile interrupted work; do not silently continue old approvals. This satisfies safety across restart, not transparent continuation. If “survive restart” requires continuing the pending run, durable pending records and continuation recovery become an explicit larger requirement. The analyze stage must resolve that product distinction before a plan is approved.

Use existing UAR receipts/run detail/event persistence where suitable; do not create a second database or scheduler without demonstrating the missing capability. Preserve bounded feature modules and adapter contracts for upstream mergeability. No changes to unrelated admin/Compass/Liter-LLM interfaces are needed in this child.

The goal's wording “renderer messages carry opaque identifiers only” needs clarification in analyze: a meaningful approval prompt necessarily needs a display of the action. Recommended distinction: main owns the immutable authoritative arguments, secrets and decision record; outbound presentation is an explicitly sanitized view; inbound approval response contains opaque identity and allowed decision fields, not authoritative replacement arguments. Current raw input presentation does not implement that distinction. Do not silently change the goal or claim that secret redaction has been verified. Approval-time editing remains outside current scope unless explicitly designed, validated and reauthorized.

## Falsifiers and acceptance boundary

The architecture recommendation would need revisiting if an existing production call identity already reaches the bridge and is verified there, or host admission is actually guaranteed by a different authoritative path. No such path was found in the inspected adapter and registry. The fixture diagnosis would weaken if retained tool content from this exact run shows valid file_path arguments or a different selected schema.

At the next approved completed-functionality boundary, use the real catalog → Boss conversation → UAR → MCP → filesystem path with valid schema. Retain sanitized invocation/decision/claim/result IDs and actual failed tool content. One integration scenario set should demonstrate Ask/Auto/Deny composition, two identical calls with distinct identities, child lineage, duplicate/stale decisions, renderer and SSE reconnect separately, cancellation, generation change and outcome-unknown behavior. Prove the expected file effect and absence of unauthorized effects. Do not add per-edit unit loops or rerun a passing broad gate repeatedly. Windows x64 and macOS Apple Silicon remain equally essential release gates in the parent.

## Assessment limits and next handoff

Source review establishes concrete defects and a recommended seam, not operational correctness. Closed-source harness internals, restart guarantees, the exact prior tool-error payload, protocol extension compatibility and crash continuation requirements remain bounded unknowns. No claim of complete verification or exhaustive ecosystem coverage is made.

Analyze must settle the admission transport, envelope/canonicalization contract, policy precedence, catalog revocation semantics and restart product behavior; plan then defines coherent implementation slices and one completed integration boundary. Execution remains outside this assessment and requires the reviewed plan to be shown before proceeding.

## Independent review and unmet evidence

Fresh-context gpt-5.5 review: PASS, zero critical findings, three warnings; producer gpt-6-astra. Review findings and response ledger are retained under review/. Sycophancy screening: assessment 0.017857 (low length warning), reviewer report 0.0. These scores are text-screening results, not correctness measurements.

The assessment artifact is complete, but the goal's reproduced-failure exit criterion is only supported by the existing failed integration artifact. A fresh reproduction of the proposed fixture root cause and the actual tool-error payload remain UNMET; this assessment cannot be used as completed operational evidence or permission to advance the parent's Gate V task. This is intentionally carried to the approved integration boundary rather than running tests during the user's assessment-only pause. Renderer payload compliance and broader secret/log redaction remain explicit analyze gaps. The research package is manually assembled and partially verified; the automated deep-research driver did not complete certification.
