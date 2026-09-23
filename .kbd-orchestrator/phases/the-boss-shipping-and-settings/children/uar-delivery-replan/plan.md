# UAR in The Boss — ship working experiences in successive phases

Status: proposed for operator reflection and approval. Planning-only child; no execution authorization is implied. Producer: GPT-6 Astra. Execution recommendation: GPT-5.6-sol, with this contract and frozen phase handoffs. Independent review results live under review/.

Effective instruction precedence: effective-constraints.md records the operator override of historical mini unit-test/build/archive triggers for this effort. Those obsolete commands are not additional gates. Only this change’s document validation runs now; phase integration/packaging runs after execution approval.

## 1. Delivery objective and hard boundaries

Deliver the full approved UAR experience through successive complete releases: first a useful installed agent, then interactive workflows, knowledge/storage, and adaptive intelligence. Windows x64 is first priority; Apple Silicon second. Publish each ready customer platform immediately. Mac Intel follows; Windows ARM64/Linux x64/ARM64 follow together and never delay customer platforms.

The first release is explicitly labeled UAR preview and advertises only implemented capabilities. All later capabilities remain assigned below; preview is not permission to drop them. Existing runtimes, Compass/filesystem MCP and mini remain usable throughout. No new competing application, chat store, provider registry, Docker stack or generic runtime framework.

The current phase produces documents and independent review only. After the operator reflects and approves, create a separate execution phase for P1. Existing UAR worktree changes belong to their current author; reconcile/commit them deliberately before execution, never overwrite them or run competing writers in that checkout.

## 2. Architecture and contracts

### Ownership

The Boss owns agent definitions, provider selection/secrets, workspace resolution, approvals, canonical conversation messages, settings and user-visible lifecycle. UAR owns the model/tool loop, skill selection, context reduction, retrieval, and A2UI generation. Use the existing runtime driver/connection/stream-adapter interfaces; main-process services follow BaseService and the established registry. Renderer talks only to typed, sender-validated IPC.

One application-supervised UAR process multiplexes sessions. Do not switch to per-session processes merely to bypass missing identity checks. Complete the existing principal work. A host-created stable principal is bound to application profile + workspace + conversation; UAR accepts that assertion only on launch-token-authenticated requests. Identity is not accepted from model arguments or an arbitrary browser header. Validate run/session/principal ownership on create, stream, cancel, approval, resume, child runs, KB access and A2UI continuation.

The application-owned UAR data directory is separate from standalone UAR data. Do not import standalone settings or provider keys silently. No new user-managed daemon. Docker remains optional.

### Trusted run envelope (P1)

Version the host contract and feature capabilities. Bind one immutable run envelope: host request ID, principal, conversation ID, agent artifact, provider kind/base URL/model/key, workspace cwd + allowed roots, resolved MCP server snapshot, host policy, reasoning effort, and sanitized host history. UAR's existing RunExecutionRequest already carries several internal bindings; extend the HTTP ingress to construct those verified bindings rather than adding a second execution engine.

Keys travel over the authenticated request and live only in memory; secret-bearing types must redact Debug and omit secrets from outgoing serialization/checkpoints. Do not literally make request fields undecodable: the HTTP ingress must deserialize the credential, while persisted/output representations exclude it. Bind the selected provider after routing; credentials for one provider cannot be reused against another endpoint. Provider fallback requires an explicit host-supplied matching credential, otherwise fail visibly. Resume, child and A2UI continuation preserve or reacquire the correct credential; missing credentials after restart fail closed.

The Boss does not call global provider/MCP registration for run credentials. UAR sidecar rejects global MCP mutation independently of optional settings/persistence initialization. Run-specific connections and tokens are closed/revoked on end/cancel/restart; a stable host-managed catalog can be snapshotted per run without writing workspace IDs into shared agent rows. Connection signatures include workspace identity, effective config and sidecar generation.

### Tools and approvals (P1)

Bridge the complete existing runtime-neutral session catalog, including built-ins, managed Compass/filesystem, memory when enabled, mini skills and selected external MCP servers. Resolve it through existing Boss services. UAR receives only that run's servers; expose missing required servers as actionable failures. Preserve distinct server/tool names and existing approval policy.

Define a namespaced MCP request metadata extension for host-run ID and UAR tool-call ID. UAR attaches it from trusted executor state, not model-provided arguments. The host binds the authenticated bridge token to principal/workspace/run and independently hashes the canonical parsed tool arguments. An approval is keyed by (principal, run, toolCallId, tool name, argument hash); a mismatched, missing or revoked record cannot execute. JSON-RPC request IDs alone are not tool-call identity. Persist approved/denied/result facts in the existing host message/tool lifecycle; never persist the bearer token.

UAR approval events become existing Boss approval cards. Host policy decides auto-approval, acceptEdits and plan-mode refusals, records the outcome, then acknowledges UAR. An automatically allowed action still has a host decision record. The bridge checks that record at execution. Reject duplicate execution of a consumed call; return a known recorded result when available. If a connection fails after an effect and no result is known, show an indeterminate outcome; never automatically replay a write or terminal command. Cancel pending approvals on run termination.

For the P1 preview, expose effectful file/shell/browser/network operations only through the host-managed catalog; disable UAR native alternatives that would bypass this boundary, with explicit capability/UI disclosure. P4 enables any approved native execution mode only when it participates in the same permission/approval contract. Working directory is not a filesystem sandbox; terminal permission is shown as code execution. No false confinement promise.

### Streaming and restart (P1)

Consume the pinned UAR AG-UI profile through a main-process adapter into existing UIMessageChunk/data parts. Map text, reasoning, steps, tool inputs/results/errors, approvals, terminal usage, cancellation and custom traces. Never render hidden/internal model content as user-facing reasoning. Unknown semantic events yield a visible diagnostic; unsupported required protocol capabilities prevent the run.

Give text/reasoning stable per-step IDs. Preserve event order and deduplicate by run/event identity. Keep SSE consumption in main while approval UI is open. Fix the observed lag-drop path: report a replay gap explicitly and resync from a sufficient authoritative snapshot; if required history is no longer available, terminate visibly and offer a new turn. Do not pretend a truncated replay reconstructs the run.

The Boss remains the durable visible-history owner. On sidecar death, finalize in-flight turns as interrupted; preserve partial output and completed tool results. The next user-requested turn sends sanitized host history to a fresh UAR session, including necessary tool-result pairing. It does not resume external side effects automatically. Checkpoint resume is a separate explicit operation with ownership, current permissions and reacquired credentials. Store bounded, redacted diagnostic events separately from conversation persistence; never append raw secret-bearing envelopes. Reuse current retention machinery, adding explicit caps for observed unbounded run/session/A2UI stores.

### Storage and knowledge

P1 must start with Docker absent, using one application-owned embedded store and a visible effective-backend status. Use the agreed compiled feature set; embedded state has one writer and a persistent app-data path. The explicit sidecar-mode MCP lock must hold on this path. Remote sharing and user-directed data movement arrive in P3; preview settings must not advertise remote options before those paths exist.

P3 connects to the existing pinned SurrealDB 3.2.4 service under separate UAR namespace/database credentials, never root or another consumer's identity. Automatic mode may choose local only at a documented startup boundary; an explicit remote selection reports connection failure. Never switch a live run's store or silently merge local state into remote. Local-only state remains labeled; explicit copy requires a source/target summary, confirmation, durable completion record and preservation of source data on failure.

Preserve the earlier decision that UAR KBs are principal-owned. The Boss stores reusable document selections per agent/workspace, but materializes the selected documents into each conversation principal's UAR KB before running. Display ingestion progress and reuse the same principal's indexed copy. A new conversation must not read another principal's KB. This deliberate duplication avoids inventing cross-principal authorization and is visible to the user; deduplicated shared-KB grants are not a hidden requirement. Documents persist across app restart; deleted/unavailable sources and changed versions are reported. Shared agent memory remains through the existing host memory tool; do not silently merge it with UAR conversation memory.

### A2UI (P2)

Use official compatible @a2ui/react and @a2ui/web_core v0.9 APIs; preserve pinned schema compatibility and the existing React instance. Advertise only supported catalogs/components. Implement the nine UAR catalog components with Boss UI primitives, supporting both the UAR catalog ID and basic catalog ID. Do not publish UAR's private renderer packages.

Main validates envelopes, owns bounded surface snapshots/revisions and the surface-to-principal/run mapping. Renderer sees only its conversation's snapshots. Actions include the surface revision and declared action ID; IPC rechecks owner/current surface and rejects undeclared/stale actions. Disable pending actions and use a host-generated action request ID so a double click/retry cannot create duplicate continuation runs. Continuations reuse the inline agent artifact and current credentials as a new turn. Saved surfaces remain readable after restart; expired run actions become visibly unavailable unless the explicit continuation contract can reconstruct them safely.

## 3. Demonstrable phases and acceptance

Each phase finishes production wiring, settings and every existing locale before its build. No dead buttons, placeholder translations or options without behavior. Every newly exposed setting belongs to the phase that implements its behavior.

| Phase | User-visible outcome | Production work and dependencies | Full integration gate on the frozen candidate |
|---|---|---|---|
| P1 — Working UAR agent | Install, choose UAR, converse, use Compass/filesystem/skills, approve an edit, continue after restart. | Reuse launch security; finish principal/isolation + retention; run envelope/credentials/MCP; host history/cwd; core AG-UI fidelity; driver/service/bridge; basic UAR settings and operational diagnostics; local startup; native payload + actual installers. | Installed Windows x64 and Apple Silicon: real configured provider completes a task; two concurrent workspaces with distinct files and credentials stay isolated; approval/denial and plan mode affect real operations; cancel stops the run; sidecar restart preserves visible conversation and permits a correct next turn; no Docker required. Exercise the actual launch/API/bridge boundary to reject wrong ownership/token and bypass attempts before external preview distribution. |
| P2 — Interactive workflows | Agent presents a useful form/choice; user's action completes the workflow and survives reopening the conversation. | P1 contracts; official A2UI renderer/catalogs; snapshots/actions/continuations; A2UI lifecycle/action traces plus already-emitted P1 tool/skill/context traces; .agent.md import/export with named lossy-field disclosure. | Installed app: full nine-component catalog example, a real provider-generated form, action continuation exactly once, stale/foreign action refusal, reopen saved surface, import/export disclosed fields. P1 installed flow remains usable. |
| P3 — Knowledge and resilient storage | Upload documents, get grounded citations, use shared Docker DB or explicit local fallback with clear ownership and persistence. | P1 identity/history; scoped SurrealDB connection; encrypted settings/migration; UAR-KB upload/selection and request-scoped ingestion credentials; effective backend UI; explicit local-to-remote copy; fallback lock obligation. | Installed app: ingest a real multi-document set and retrieve a known fact with source; a second principal cannot retrieve it without its own ingestion; restart retains selection/index; stop/start Docker follows declared behavior; explicit remote fails visibly; copy succeeds once or leaves source intact; exported diagnostics omit secrets. |
| P4 — Adaptive intelligence and full configuration | Skills/compaction/chunking choices change actual work; budgets and execution controls constrain it. | P1–P3; LLM and real local-embedding selection; agentic chunking; actual settings behavior; guardrails/sycophancy; execution modes and sub-agent lifecycle; complete feature/trace inventory. | Installed app: meaningful task set with real skill corpus/model; paraphrase selection, offline local matching after assets installed, exact document reconstruction/retrieval after agentic chunking, compaction retains required facts, budget/guardrail stops effectful work, child runs retain principal/tools/budget and produce attributed traces. |
| P5 — Concurrent platform lane (starts after P1 customer publication, not after P4) | Latest accepted experience on Mac Intel, then Windows ARM64/Linux x64/ARM64. | Use P1 release automation and latest completed phase pins. Mac Intel may build after the customer P1 artifacts are published; final group after Intel. | Actual native installers launch the sidecar and exercise chat/tools/A2UI/storage as available on those targets. Publish each completed platform, with actual signing status and matching checksums. No claim of installed acceptance for untested hardware. |

P2–P4 together retain the full approved scope. P5 starts immediately after P1 Windows x64/Apple Silicon publication: Mac Intel first, then Windows ARM64/Linux together, repeating against each later accepted phase. Its numbering is a lane identifier, not a chronological position after P4. It is not a prerequisite for P2–P4 customer-platform development. Budget/sub-agent/execution-control traces ship in P4 with the behavior they describe; P2 covers only traces already produced by P1 and its own A2UI workflows. A complete older customer release stays advertised until its replacement passes the relevant release gate. Never overwrite released binaries under the same filename/version: use a new prerelease/version and immutable manifest.

### Named acceptance scenarios and observable results

Fixture ownership: P1 creates a disposable two-workspace acceptance fixture and keeps it in the phase integration assets; no tests are authored or run in this planning child. Each installer run starts from a clean copy. Never use customer directories.

- **P1-WorkspaceTask:** workspace A contains package.json, src/calculator.ts with an add function and docs/change-request.md requesting a named comment marker. Workspace B contains a distinct private marker. Through the installed chat UI, ask UAR to locate add through Compass, read it with filesystem MCP and insert exactly the requested comment after approval. Pass: the correct function is cited, the host tool record identifies both MCP servers, A has the one requested edit, B is byte-for-byte unchanged. Denial subcase leaves A unchanged. Plan-mode subcase can read but cannot edit/execute.
- **P1-IsolationRecovery:** run A/B concurrently with distinct provider credentials and distinct private facts. Through the real authenticated API exercise wrong-principal run/approval access and mismatched call metadata; all are refused and no extra operation occurs. Stop the sidecar mid-turn, restart, and ask for A's earlier fact. Pass: visible interrupted turn, correct A fact restored from host history, no B fact/credential in A output/diagnostics, and no repeated edit. Reuse existing integration instrumentation to observe bound provider identity without recording secret values.
- **P2-FormAction:** a fixture surface covers each of the nine APIs enumerated from the pinned UAR catalog, recording the exact names in the phase fixture before renderer implementation. Use a provider-generated approval-free planning form to choose a task priority. Pass: supported components render; one submit yields one continuation using the selected value; duplicate/foreign/stale actions do not execute; reopened history shows the last snapshot. Catalog/API mapping is a P2 input, not permission to invent component APIs.
- **P2-DefinitionRoundTrip:** import the committed UAR agent templates selected for this integration, export and re-import them. Pass: all supported fields survive and every unsupported field is identified to the user before committing the import; no silent loss.
- **P3-KnowledgeStorage:** source documents contain known project names, dates and one private marker; choose them for an agent, ingest, then ask for a named project's date. Pass: correct date plus source citation; another principal without its own ingestion gets no private marker. Restart keeps the selection/index. Automatic-local, explicit-remote failure, and explicit copy each produce the specified visible backend and leave the source intact on an injected transport failure.
- **P4-SelectionAndControls:** record ten labeled workspace tasks against the shipped skill inventory, including five paraphrases with no skill-name overlap, before implementing the matcher. LLM matching must select the human-labeled relevant skill for at least four of those five paraphrases; report keyword baseline and actual model/version/cost rather than claiming guaranteed superiority. Local matching, after declared assets are installed, must complete with network disabled and at least four relevant selections from the same five. Failure leaves the affected option unavailable and the P4 capability incomplete, not silently replaced.
- **P4-ContextAndChunking:** a three-topic document must reconstruct byte-for-byte from ordered chunks, produce multiple topic-appropriate chunks and retrieve a known fact from each topic with a source. Force compaction in a conversation containing three named facts, a completed tool result and a pending instruction; all remain usable without repetition of completed effects. A one-tool-call budget stops the second effectful call; a guardrail denial remains a denial despite agent auto approval. Child-run scenarios enforce the same principal, tool scope and cumulative budget.

All required deterministic invariants must pass; no percentage allowance for isolation, secret handling, approvals or data integrity. Stochastic selection thresholds evaluate only the matching feature; a failure is addressed in that phase. One real-provider task and the boundary failure scenarios run on each customer-platform candidate. Record any unavailable hardware as pending rather than passing.

### Integration gate mechanics

No unit-test targets, per-edit runs, mocked-function completion claims, repeated broad review loops or standalone verification builds. Existing tests/WIP may be retained without being counted as new completion evidence. Think through contracts, ownership and failure paths while coding. Compiler/type errors are fixed during the actual phase application/installer build; a narrow compiler check requires a concrete implementation blocker.

At the phase boundary run one coherent integration gate across real application, process, protocol, filesystem and storage boundaries. Deterministic fixtures may supply model responses for rare errors but must drive those same real boundaries; a real configured provider must also complete the phase's user workflow. Record the observed result, not simply that an option propagated. Failed scenarios justify fixing and rerunning the affected path. Broaden only when changes affect additional completed behavior.

Do not gate the phase on unrelated legacy suites. An observed credential leak, cross-workspace access, approval bypass, destructive replay, installer launch failure or loss of the primary workflow blocks that candidate's distribution. An absent later-phase feature does not block P1 if disabled/disclosed and still assigned to a later phase.

## 4. Keep building while acceptance happens

Use two lanes after the operator approves execution:

1. Development lane: finish Pn, commit both repos and all dependency pins, and freeze a release-candidate manifest. Hand it to acceptance. Start Pn+1 in new worktrees from exactly that candidate with separate build/target directories.
2. Acceptance/release lane: actual native builds and phase integration run only on the frozen Pn commits, then publish and obtain operator/customer feedback. Record app commit, UAR commit, mini pin, protocol capabilities, features, artifact checksum, signing and scenario outcomes. A result belongs only to those commits.

Only one local Rust build writer at a time because this host already experienced memory pressure; writing next-phase code can overlap that build. Native CI jobs use separate runners. Never run Cargo mutation/install commands against another lane's lockfile or target directory. Make per-worktree target locations explicit before invoking Cargo; the existing global target path must not silently be shared.

A Pn failure gets a focused correction on its candidate branch. Bring the fix into Pn+1 before Pn+1 freezes. If the failure invalidates a shared contract, stop only work depending on that contract; independent UI/documentation can continue. If it is packaging-only, development continues. Do not claim that testing Pn validates later changes. Never merge or publish half-written Pn+1 to repair Pn.

At most one succeeding unaccepted phase is allowed to accumulate. This keeps feedback actionable rather than building several releases on a broken foundation. Windows installed acceptance can remain pending without idling independent coding; it cannot silently become passed.

## 5. Release work is part of P1

The sidecar release workflow is tag-triggered, uses native runners, and builds release payloads rather than test suites. Preserve the agreed feature set minimal,local-models,document-intelligence,wasm-runtime and panic=unwind. Apply the existing dependency pins. Inventory dynamic libraries, OCR data, embedding model assets and licenses actually needed at runtime. Bundle required native assets; model downloads must be explicit, checksummed/versioned, have progress/cancel and an offline status. No developer-home files or developer Rust installation can be required on the target machine.

Reuse The Boss GitHub-release publisher and integration manifest instead of building another distribution system. Pin sidecar archive/version/source/features/checksum per platform and the frozen mini revision plus full dependency closure. No IPFS. Native packaging records disk, memory, payload size, startup timing and build duration; retain the existing Windows NSIS-only/preflight fix. One phase candidate build is the build used for acceptance and publication, not a throwaway validation build followed by an identical rebuild.

Once completed P1 production wiring is frozen, produce Windows x64 immediately, then Apple Silicon, and publish each through GitHub and the website when its gate is satisfied. A failure on the less urgent architectures does not delay them. Signing status remains explicit. Future installer acceptance checks upgrade/migration as well as clean install; rolling back the executable must not overwrite newer data. Use versioned app-owned store locations/supported migrations and preserve a pre-migration backup when the migration changes compatibility.

## 6. Map the old backlog without losing work

| Existing UAR change / requirement | New owner phase |
|---|---|
| sidecar-launch-security | Already implemented; P1 consumes it and closes the settings-independent lock obligation before fallback can ship. |
| sidecar-session-principal | P1; retain current WIP, include ownership on approval/continuation and bounded session/run state. |
| run-scoped-credentials-and-mcp-servers | P1, including explicit bridge call correlation and child/resume credential handling. |
| run-request-host-context | P1. P2 adds A2UI continuation use of the same envelope. |
| agui-runs-stream-fidelity | P1 lifecycle/replay; P2 complete surface/trace handling. |
| encrypt-persisted-secrets | P3 full standalone/settings migration; P1 never writes host secrets and disables persistence APIs that could accept them in managed sidecar mode. |
| surreal-scoped-signin-and-embedded-fallback | P1 offline startup + invariant lock; P3 scoped remote and explicit copy semantics. |
| skill-matching-llm-and-local-embedding | P4. P1 mounts the full packaged skills and supports existing working selection. |
| agentic-chunking | P4. P3 ships existing working chunking; unmarked KBs keep semantic 0.5. |
| sidecar-release-pipeline | P1 customer targets; P5 remaining platforms. |
| .agent.md import/export; nine-component A2UI; trace inventory | P2; imported fields unsupported by UAR remain explicitly disclosed. |
| Per-agent context, prefer/max-active, memory/KB, budget, permission/execution settings | P1 basic approval/model/workspace; P3 KB/storage; P4 all remaining behavior and diagnostics. |
| App-wide matching, activation, guardrails/sycophancy | P4; settings re-pushed on restart, denials cannot be weakened per agent. |
| Skills/runtime dependencies, UI polish, all locales, operational diagnostics | Every phase that exposes the capability; no final cleanup bucket. |

Existing ten OpenSpec changes remain contracts, not ten forced release gates. On execution approval, update their task cross-references to P1–P4; add focused Boss changes per phase. Never check off a complete old change merely because one split part shipped.

## 7. Supersession register

This plan, when approved, replaces execution directions in agile-exploring-oasis.md and contradictory passages in D1–D4, while retaining their operator feature decisions:

- Backend-first ten-change sequence → cross-repository demonstrable phases.
- Test-first/per-change RED/review loops → complete implementation, then phase integration.
- Publish private UAR A2UI packages → official compatible renderer, Boss catalog components.
- Global provider/MCP registration → run-only credentials/server snapshot.
- Implement unreachable legacy classifier stubs → do not expose them; implement active algorithms in P4.
- panic=abort → panic=unwind, preserving existing cleanup semantics.
- Main-push builds/all platforms as one gate → tag-triggered releases, customer targets first.
- Raw AG-UI event archive → bounded redacted event evidence plus canonical host messages.
- Silent fallback/merge → declared startup policy, visible local-only state, explicit copy.
- Repeated fresh permissions for previously authorized routine steps → session authorization persists; this new execution itself waits for reflection/approval as requested.
- A plan's size or a model's confidence is not evidence of superiority. Report measured delivery outcomes.

## 8. Work ownership, stop conditions and model handoff

GPT-5.6-sol is the proposed primary implementation model, following the user's preference and the app's available model description. This is an operational choice, not a benchmark claim. Keep architecture contracts in the phase handoff so a model change does not restart planning. Use Astra for a concrete unresolved architectural decision only, not as a required reviewer for every edit. Independent adversarial review occurs now; later review is driven by a changed trust boundary/architecture or observed failure, not a ritual loop.

At execution start assign one writer to each owned module and worktree. The UAR owner handles ingress, runtime resources and storage; Boss owner handles driver/bridge/service/settings/rendering; a release lane consumes frozen commits. This is authorized parallel work after approval, but the same file or Cargo target has one writer. Shared contract changes are recorded before downstream consumers change.

Stop and resolve: an invariant cannot be met, a dependency pin must change, the full required feature set cannot build on a customer platform, or preserving data requires an architectural change. Bring a concrete choice and impact to the operator; no silent reduction. Do not stop for an optional later feature or an unrelated legacy failure.

Completion of this planning child means source-grounded plan + independent review + dispositions + execution handoff delivered. Reflection and execution approval remain pending. Each phase later completes only with its implemented capability, scoped integration evidence, packaged artifacts, and accurately recorded installed acceptance.

## 9. Outcome ledger for the proposed article

Record phase start/freeze/artifact/first installed-success timestamps; producer/executor/reviewer model labels; commits and worktree ownership; implementation time, actual build time and integration time separately; escaped defects and recovery time; human interventions; customer-observed outcomes. Keep secrets/customer content out. Code volume, passing unit-test counts, and self-awarded scores are not success measures. This is a case study unless a controlled comparison is actually performed.
