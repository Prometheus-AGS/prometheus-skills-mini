# Child execution checkpoint — 2026-10-07

Status: Execute active, task 9 in progress, task 10 pending. This is a checkpoint, not an Execute handover or release certification. Canonical revision 249. Reflect has not started.

## Actual results

- G1-01 passed the real authenticated host HTTP/MCP boundary, including the 30 added native protocol cases and retained original controls. Its authority producer is synthetic; the receipt explicitly has genuineNativeExecution=false. It does not certify actual native body execution.
- The complete development Boss bundle and genuine full-feature UAR sidecar built successfully. Their identities are retained in [artifact manifest](final-artifact-manifest-08.json). This is development evidence, not installed macOS/Windows acceptance.
- G2-06 identified 12 catalog-list spans; six contained the controlled credential canary in their inputs. Six target-call spans contained no canary and had redacted inputs. All six provider-result observations had canaryAbsent=true. For the transport-error cases, genericMcpFailure and failureProvenanceMatches were true, while the original fixture marker check was false.
- G2-07 emitted two real text events and zero reasoning events. Exact text, secret absence, persistence and control-ID predicates passed; split event counts and split reasoning failed. The SDK preserves typed reasoning_content, but the selected UAR Liter driver omits its normalized-event mapping. The [one-file scope proposal](reasoning-event-scope-proposal.md) is static source evidence; it has not been implemented or validated in a corrected runtime.
- G2-08 exited 1 during registration before any provider request, capture or SSE frame. HTTP status was unavailable and the current classifier returned unclassified. All seven native fault scenarios and all event scenarios remained unrun in this attempt. See [finite evidence](G2-08-finite-failure.json). This is not evidence that those scenarios fail.
- G2-08 overlapped the read-only compiler because root continued after the prelaunch rebind lacked a completed compiler receipt. The compiler subsequently passed with pins unchanged. Source and artifacts matched after the gate. Preserve [sequencing limitation](G2-08-sequencing-limitation.json); do not claim compiler completion or artifact binding before launch. No final acceptance claim follows from this attempt.
- The earlier G2-03 registration HTTP404 remains unexplained and must not be assumed to have the same cause as G2-08's unclassified error.

## Latest complete attempt: G2-09

G2-09 exited 1 at native_restart. Unlike G2-08, its compiler receipt and frozen source/artifact binding completed before launch; all229 source hashes and staged artifacts also matched after completion. See [summary](G2-09-summary.json), [finite evidence](G2-09-finite-failure.json), and [prelaunch binding](G2-09-prelaunch-binding.json).

All six eager/deferred success/isError/error profiles retained their exact approval/revision/effect checks. Seven event scenarios passed: partial, reconnect, interrupted, cancel, run-error, approval and approval-error. Split failed its reasoning count/output checks. Snapshot failed textRedacted, exactText and snapshotObserved; source diagnosis is in progress, so do not reduce that failure to a missing snapshot label alone.

The four before_approval/drop_ack/hold_ack/host_terminal native scenarios returned passed finite receipts under their existing actual-sidecar/control-flow/storage oracles. These are case-specific results, not direct native body-entry measurements or blanket native recovery certification. Restart failed: the actual controlled provider was not offered discovery (one request, zero discovery/target proposals). Both UAR storage-failure scenarios remained unrun because restart stopped the sequence. FC-POSTACK-CANCEL remains blocked/unrun and cannot be covered by held acknowledgment.

The earlier registration failures did not occur in this attempt. Their causes remain unestablished; do not describe the diagnostic addition as a product registration fix. Catalog trace and transport-marker failures are still present in the finite sink observation, and all original final predicates remain mandatory.


Snapshot source localization is now documented in [snapshot scenario investigation](uar-task9-snapshot-scenario.md). The fixture repeated initial last-event-id=0 and then blanked replayed deltas. Its snapshot count measures rewritten assistant messages, not total MESSAGES_SNAPSHOT frames. A bounded correction using an actually observed pre-terminal cursor is authorized within existing gate ownership; product snapshot code remains unchanged. Runtime correction acceptance is pending.

## Latest complete attempt: G2-10

G2-10 exited1 at the retained final MCP sink assertions. Compiler completion and source/artifact binding preceded launch; all229 source hashes and staged artifacts matched afterward. See [summary](G2-10-summary.json), [finite evidence](G2-10-finite-failure.json), and [prelaunch binding](G2-10-prelaunch-binding.json).

All six eager/deferred profile checks passed. All seven native scenarios returned passed receipts under their actual-sidecar/control-flow/durable-storage oracles, including restart refusal of prior/kindless/v1 authority and both UAR claim-intent/local-terminal persistence failures. Fresh MCP fixture sessions were observed: eager2/deferred4 authenticated initializations, corresponding sessions created and accepted, last HTTP200, filler effects0. This confirms fresh-session operation in the corrected fixture; G2-09 did not record its failing HTTP status, so precise causal attribution to that earlier failure remains source-supported rather than directly reproduced.

Seven event scenarios passed. Split reasoning still failed. Snapshot stopped before any rewritten stream/frame/message; its returned stream error failed the original expected-success predicate. The exact fixed refusal is being localized; the cursor correction is not accepted as fixed. Original secret-absence/content/persistence/control checks remain required.

Catalog span credential exposure and transport-marker checks still fail. FC-POSTACK-CANCEL remains blocked/unrun, and held acknowledgment is not a substitute. No native case receipt directly measures body entry; the dedicated post-ack design addresses that separate requirement. No overall acceptance, final QA, independent review, Execute completion or Reflect is claimed.

## Corrections and pending decisions

Within the already approved gate scope, the shared real trace-provider observer was corrected, finite diagnostics were added, and original event assertions now produce failed per-case outcomes after normal cleanup so later independent cases can run. Operational exceptions still propagate; original predicates and the final all-events-passed check remain required. No failed assertion becomes a pass.

Three concrete scope amendments await operator approval:

1. [Catalog trace and marker-oracle correction](catalog-trace-scope-proposal.md): prevent configured server credentials from entering catalog trace arguments, and correct the documented fixture-specific marker checks without weakening secret-absence requirements.
2. [Real reasoning mapping](reasoning-event-scope-proposal.md): add only the missing typed reasoning_content to ReasoningDelta mapping in src/llm/liter_driver.rs; no vendored code or dependency change.
3. [Post-ack cancellation control](post-ack-cancellation-test-control-design.md): explicitly gated UAR-only observation/control with actual body-entry measurement and the real cancellation API. The held-ack case is different and cannot substitute for FC-POSTACK-CANCEL. No instrumentation has been added.

The Boss owner is diagnosing the early registration error through bounded finite categories. The UAR owner is inspecting admission/registration source paths read-only. No speculative production retry, timing change, provider default or service change has been introduced.

## Boundaries and limitations

- Task 9 remains open; task 10 review, artifact QA and formal adversarial review have not run. They must not be reported as passed.
- Pending approvals are not approval by silence or by preselected UI defaults.
- No Bossfang code, dependency/pin, resident service, release/publication, parent certification or installed-app changes.
- D0 remains excluded. The earlier accidental one-line source-search exposure remains disclosed; no excluded file was deliberately opened/hashed and the rejected diagnostic was not retried.
- The source inventory retains two preexisting Bossfang baseline coverage gaps. Historical hash equality is unproven; do not attribute these paths to this child.
- The passing protocol gate is retained rather than rerun for gate-only corrections. Failed/unrun acceptance requirements remain explicit.
