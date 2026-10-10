# Independent adjudication — round two

Date: 2026-10-08. Scope: the new CRITICAL claim in `findings-r2.json`, approved desktop child task 10 / `bauar-05-native-discovery-admission`. Read-only bounded source adjudication; no replacement formal verdict or acceptance certification. Exact served adjudicator identity is unknown; no verified cross-model claim is made.

**Disposition: CRITICAL contradicted.** UAR has no separate durable `NativeClaimed` evidence state, as the reviewer observes, but the approved contract does not require one. It requires persisted UAR claim intent and persisted **host** claim state before dispatch. The inspected desktop path has both, owned by the components named in the design.

## Binding specification

Spec root: `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/openspec/changes/bauar-05-native-discovery-admission`.

- `design.md:7` assigns the native executor to UAR and host admission records to the Boss.
- `design.md:27–29` requires the host record owner to persist the consuming transition before publishing it to memory and returning the bound native receipt.
- `design.md:35` explicitly orders durable UAR claim intent, host consuming native claim, positive acknowledgment, final cancellation observation, native execution, and terminal persistence.
- `specs/native-tool-admission/spec.md:43` requires claim intent and host claim state to be persisted before native dispatch. It does not place both records in UAR's ledger or name a durable `NativeClaimed` evidence variant.
- `design.md:41–46` and `specs/native-tool-admission/spec.md:58–77` preserve uncertainty and prohibit effect replay. Restart/resume is a non-goal (`design.md:13`); prior live authority remains unsupported/unknown pending reconciliation.

## Concrete persistence and acknowledgment chain

UAR root: `/Users/gqadonis/.claude/worktrees/bauar-uar`. Boss root: `/Users/gqadonis/.claude/worktrees/bauar-boss`.

1. **UAR saves intent before requesting consumption.** UAR `src/uar/runtime/tool_admission/lifecycle.rs:210–223` holds the invocation mutex, requires pending state, awaits saving `ClaimIntent` at lines 215–220, and only then calls `host.consume_native`. A failed save exits before that call.
2. **The actual desktop owner supplies persistence.** Boss `src/main/ai/runtime/uar/UarRuntimeConnection.ts:318–340` creates the host bridge with `persistLifecycle: (snapshot) => uarApprovalLifecycleStore.persist(snapshot)` at line 338. `src/main/ai/runtime/uar/UarHostMcpBridge.ts:51–65` passes those options into the single `UarHostToolAdmission` owner. Although the constructor type allows an omitted callback for other callers, it is supplied in this reviewed desktop path.
3. **Boss commits a claimed snapshot before publishing the state.** Boss `src/main/ai/runtime/uar/UarHostToolAdmission.ts:403–409` builds the next snapshot and calls persistence before assigning `record.state`. The snapshot includes admission/invocation/run identity, execution kind and state at lines 412–428. `src/main/ai/runtime/uar/UarApprovalLifecycleStore.ts:38–49` writes this snapshot inside `withWriteTx`; its database upsert completes through `.run()` at lines 88–102. `src/main/data/db/DbService.ts:244–248` directly returns the transaction result; lines 214–218 document the synchronous commit-before-return contract. There is no unawaited asynchronous persistence callback in this chain.
4. **Successful acknowledgment follows that transition.** Boss `UarHostToolAdmission.ts:288–302` revalidates exact authority and native kind, then transitions to `claimed`. A thrown persistence error returns HTTP 503 at lines 303–305. HTTP 200 is issued only afterward at line 307.
5. **UAR requires the acknowledgment before returning an admitted claim.** UAR `src/uar/runtime/tool_admission/http.rs:315–330` awaits the native claim response and rejects failed transport/status. UAR `lifecycle.rs:223–240` checks exact receipt equality and returns an error after unsuccessful consumption. Only success reaches the in-memory `NativeClaimed` assignment and `Ok(())` at lines 242–244. `src/llm/orchestrator.rs:562–576` does not return the admitted invocation from this route when claim fails; actual native execution then applies its dispatch guard at lines 654–660 or 1118–1123.

Therefore, the host's durable claimed state already distinguishes consumption before dispatch. The absence of a duplicate post-ack record in UAR does not negate that persisted host state. If execution stops before UAR's in-memory assignment, this call has not successfully returned to its dispatch caller; UAR still has durable intent and the host may have durable consumption. That is the approved uncertainty boundary, not evidence of an effect occurring without durable claim records.

## Restart and uncertainty are deliberate

UAR `lifecycle.rs:119–134` maps prior-epoch `ClaimIntent` evidence to `OutcomeUnknown`. Boss `UarApprovalLifecycleStore.ts:65–75` maps an earlier process's `claimed` snapshot to `outcome-unknown`. These are reconciliation records, not resumable execution capabilities. The approved design explicitly accepts that a native claim acknowledgment authorizes execution but does not prove that its effect occurred (`design.md:46`). A second UAR durable state could add detail, but the reviewer has not established it as a requirement or an observed defect.

## Retained warning and limits

The round-two non-dispatch outcome-error WARNING remains open under the narrower disposition in `independent-adjudication.md` W1. This adjudication does not claim that all outcome errors are static or that no secret could reach a persistence error. It does not rerun that investigation or authorize a fix.

No tests, builds, fault injection, services, lifecycle mutations, excluded-file access/search/hash, raw/private logs or snapshots, or process listings were performed. No product code or earlier evidence was changed; the sole write is this file. Source inspection establishes the ownership and ordering above, not a new runtime or storage-durability experiment. Original review findings and BLOCK verdict remain intact pending formal review-owner disposition.
