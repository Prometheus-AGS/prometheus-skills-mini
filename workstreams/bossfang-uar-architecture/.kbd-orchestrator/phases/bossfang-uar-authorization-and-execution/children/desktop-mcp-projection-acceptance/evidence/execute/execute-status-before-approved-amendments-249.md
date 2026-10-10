# Native admission execution checkpoint — 2026-10-07

**Execute remains active, task9 in progress and task10 pending.** This is a development checkpoint, not an Execute handover, installed-app acceptance or release certification. Reflect has not started. Canonical revision249.

## Current result

The approved native-admission correction is implemented and built in the isolated Boss/UAR trees. Runtime-native approval consumes its exact durable Boss admission before UAR executes the local tool; host-MCP execution retains its separate receiving-server consumption. The strict v2 source-kind/receipt binding and owned-caller cutover remain in place.

The latest real Electron/genuine-UAR attempt, G2-11, exited1 at the retained final MCP sink assertions:

| Evidence | Actual result |
| --- | --- |
| G1-01 authenticated host protocol | Passed, including30 added native protocol cases; synthetic authority producer, not genuine native execution |
| Six eager/deferred success/isError/error profiles | All passed exact preparation/approval/revision/effect checks |
| Seven native fault scenarios | All passed their actual-sidecar/control-flow/durable-storage oracles |
| Nine event scenarios | Eight passed; split reasoning failed |
| Snapshot scenario | Passed with one real assistant snapshot, exact projected text, secret absence, persistence and control correlation |
| MCP fixture fresh sessions | Eager2/deferred4 authenticated initializations and sessions accepted; lastHTTP200, filler effects0 |
| Catalog trace credential absence | Failed: six of12 catalog-list spans contained the controlled credential canary in inputs |
| Transport-error marker predicate | Failed: results were canary-free with verified generic failure/provenance, but lacked the original fixture-specific marker |
| Split reasoning | Failed: real text arrived; reasoning event/output requirements remained unmet |
| Post-ack/pre-body cancellation | BLOCKED/unrun; separate required control not yet authorized |
| Final QA / independent review / Reflect | Pending; not reported as passed |

The seven native scenarios cover cancellation before approval, lost acknowledgment, held acknowledgment, host-terminal persistence failure, isolated restart refusing old/kindless/v1 authority, UAR claim-intent persistence failure, and UAR local-terminal persistence failure. Claim-intent failure caused zero host consumption; local-terminal failure retained consumed intent as unknown without replay. These are case-specific production-path observations. They do not directly measure native body entry or replace the distinct post-ack cancellation case.

Actual receipts: [G2-11 summary](G2-11-summary.json), [finite failed-gate evidence](G2-11-finite-failure.json), [prelaunch binding](G2-11-prelaunch-binding.json), [post-gate source binding](G2-11-source-binding.json), [G1 receipt](host-admission-v2-acceptance.json). All229 frozen source hashes and staged artifacts matched after G2-11. Compiler completion and source/artifact binding preceded launch. Dependency pins remained unchanged.

## Corrections verified within the approved gate scope

- Corrected trace capture to observe the application's real shared tracer provider.
- Retained original failed assertions as failed per-case outcomes while collecting independent scenarios after normal cleanup. Operational exceptions still propagate; original final predicates remain mandatory.
- Corrected the external MCP fixture to allocate genuine SDK server/transport instances per authenticated session. Pinned SDK1.27.1 rejects reinitialization of one stateful transport. Fresh-session operation and restart acceptance now have actual receipts; G2-09's exact failing HTTP response was not recorded.
- Corrected snapshot replay to use the last actual preterminal source cursor after text and validate the delivered suffix. The initial repeated cursor0 produced empty history. An intermediate completed-step requirement was overstrict and removed after source review. G2-11 actually observed stepStarts1/stepFinishes0 and successful real snapshot plus terminal replay. No cursor, event or authority was fabricated.

Sources and author handoffs: [SDK/session and initial snapshot correction](boss-task9-g2-09.md), [snapshot followup](uar-task9-snapshot-cursor-followup.md), [final snapshot authoring](boss-task9-g2-10.md).

## Three concrete scope approvals remain pending

1. [Catalog trace and marker correction](catalog-trace-scope-proposal.md): prevent full configured credentials entering catalog span arguments; amend the documented marker oracle while retaining secret absence and error provenance.
2. [One-file real reasoning mapping](reasoning-event-scope-proposal.md): emit the existing typed SDK reasoning_content as UAR ReasoningDelta in src/llm/liter_driver.rs. No dependency or vendored change is needed.
3. [Post-ack cancellation control design](post-ack-cancellation-test-control-design.md): add an explicitly nondefault gate build control and actual body-entry measurement using the real cancellation API. Held acknowledgment cannot cover this interval.

Each proposal is reviewable. None has been implemented. The [approved Plan](../../plan.md) freezes exact product scope, preserves original assertions and prohibits unapproved production test instrumentation; the existing Execute approval does not silently amend these decisions. The three asynchronous approval questions remain pending. Silence and preselected choices are not approval.

## Verification limitations and next boundary

- Task9 stays open until the approved observed corrections are resolved. Task10, artifact refinement, formal adversarial review, driver verify/archive and Execute completion remain pending. These gates are not skipped or certified.
- Development bundles are genuine full-feature artifacts, not installed macOS/Windows or published releases. Parent/shipping gates remain blocked.
- Earlier G2-03 HTTP404 and G2-08 unclassified registration failures did not recur in G2-11; their exact causes remain unestablished. See [bounded registration source investigation](uar-task9-registration-paths.md). Diagnostic additions are not claimed as a product registration fix.
- G2-08 overlapped a read-only compiler after a failed prelaunch rebind. [Sequencing limitation](G2-08-sequencing-limitation.json) remains preserved. Later G2-09/10/11 prerequisite chains were completed before launch.
- Source capture retains two preexisting Bossfang baseline coverage gaps; historical equality is unproven. No Bossfang child edit, dependency/pin, service/default, release or parent-certification change was made.
- D0 remains excluded. The earlier accidental one-line source-search exposure remains disclosed; no dedicated excluded-file open/hash or rejected diagnostic retry is claimed.
- Root alone runs compilers/builds/gates and owns KBD transitions; implementation owners are now idle. Final independent review has not started.

After scope approval, implement only those bounded changes, rebuild affected artifacts, rerun only the failed gate, and perform the required completed-delivery QA and independent review. Stop before Reflect for the operator's handover review.
