# Assessment: bossfang-uar-authorization-and-execution

Project: bossfang-uar-architecture  
Date: 2026-10-06  
Stage: Assess complete; awaiting human approval to enter Analyze  
Implementation counter: 0 of 0 defined changes (no implementation plan has been approved)

## Outcome and scope

**The phase is necessary.** Local desktop authorization has substantive controls to preserve, but the current code does not establish a complete remote multi-user trust boundary. Bossfang's UAR LLM-driver path reaches a UAR-owned model/tool loop beneath Bossfang's own loop. The appropriate starting recommendation is explicit harness delegation, with Bossfang owning jobs and UAR owning execution; this is a recommendation for analysis and architectural approval, not an already approved implementation design.

This assessment covers **every F1–F7 finding and every acceptance scenario** from the [architecture review](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/docs/research/bossfang-uar-architecture-review-2026-10-06.md). The review remains the detailed source/citation ledger; its static findings and test candidates do not become reproduced defects merely by being placed in a phase.

The new workstream has canonical project UUID `7041aa63-d951-4b19-a59c-b963d65b3b83`, distinct from the shipping project's `78f44ea7-639e-4a07-a792-01eeb9d2a48a`. Its KBD/OpenSpec root is:

`/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture`

The separate Git worktree alone was insufficient isolation: canonical KBD state is shared by project UUID. The nested project prevents phase activation from changing the shipping run. The shipping project remained at canonical KBD state revision 999 (a journal version, not a Git SHA) and its original active path after this phase was created.

## Evidence and baseline

| Source | Revision / evidence |
|---|---|
| Bossfang | `16beef0fcf3053970a901990df4fedbdf86bd87d` |
| UAR | `a7cb972992d4f83db6585449ea81af0fe4a1c990` |
| The Boss | `e2ae2ce21245030293c0bea96ed02ae853b820a7` |
| Worktree tooling baseline | `6044ecdeb5c8c957646fef422d886a4568212888`; branch `codex/bossfang-uar-authorization-and-execution` |
| Prior runtime evidence | The Boss exact-tool-admission scenario passed during the architectural review, on 2026-10-06. Production HTTP bridge, fixture tools; not full stack or installed-app acceptance. |
| Fresh assessment evidence | Re-read canonical phase state; checked repository revisions and relevant source status; hashed local cited files; initialized and validated isolated KBD/OpenSpec state. |
| Product verification this stage | No new product build, exploit, full-stack run or platform test. |

The relevant product source status remained clean and the revisions match the reviewed baseline. Unrelated pre-existing working-tree changes remain in the product checkouts. Full status snapshots and selected source revisions are in [sources-receipt.json](sources-receipt.json); file digests are in [source-baseline.json](evidence/source-baseline.json). The architectural review is copied into this worktree so its untracked original is not the sole handover input.

Confidence is high for directly inspected control flow and missing consumer wiring; medium for consequences conditional on deployment or unexecuted transport behavior. Build health and deployment certification remain unknown.

## Prior context and lessons applied

The existing Node recall helper reached memory and wrote [prior-context.md](prior-context.md). Its five returned entries identify `unknown` projects and give no usable product-specific lesson details. They are not treated as evidence that the architecture works. This new workstream has no previous phase reflection.

Applicable source lessons, retained explicitly:

- Review: “the normal terminal `stop` maps to Bossfang `EndTurn`.” Therefore F1 is an execution-contract mismatch; unconditional duplicate writes are not an established fact.
- Review: “UAR already implements a delegation API” and “Process restart recovery remains explicitly unsupported.” Therefore assess the consumer gap and capability limits rather than plan a replacement provider from scratch.
- Constitution A-6: “An unverified claim reported as verified is worse than no test.” Therefore existing test source, prior fixture evidence and future integrated acceptance remain separate.

The recall helper returned no prompt-time knowledge-gap entries. The assessment's unresolved questions are actual analysis inputs: production MCP resource contracts, scheduled-job recovery requirements, root approval compatibility and cross-principal transport behavior. Optional learning suggestions are `/learn-goal MCP OAuth resource-specific authorization` and `/learn-goal admission idempotency versus remote side-effect guarantees`; neither has been run or made a substitute for source verification.

## Implementation completeness

“DONE” below means the specified mechanism is present in the reviewed code, not that every deployment passed acceptance.

| Area | Status | Current evidence and limitation |
|---|---|---|
| UAR JWT signature/expiry verification | PARTIAL | Fixed HS256/RS256 algorithms and expiry validation exist; issuer/audience are optional and JWKS key freshness lacks a bound. Review F3. |
| API-key credential authority | PARTIAL | Hashed keys, expiry/revocation and JWT exchange exist; roles are copied without attenuation, tenant is dropped and revoke lacks an owner check. Review F2. |
| Trusted local-host provenance | PARTIAL | Typed launch authentication exists, but MCP grant admission also infers host trust from the mintable `host-session` role. Review F2. |
| Run/owner-bound MCP transport and grants | DONE, verification partial | Owner keys, run-owned caches, registered destinations, header snapshots, finite leases and no failed-call replay exist. Do not reimplement them. Review §§3, 6. |
| End-to-end receiving-server resource authorization | PARTIAL / evidence missing | UAR grant assertions are not cryptographic proof of the downstream token's authority. The remote test fixture maps token labels, not real issuer/audience/scope enforcement. Review F4. |
| Stdio process boundary | PARTIAL | Cleared/captured environment and supervision exist; requested OS sandbox backend is unavailable. No automatic HTTP JWT delegation applies. Review §§3, 6. |
| Exact prepared invocation / host admission | DONE, verification partial | Payload/owner/run/policy/lease binding and host claim-before-effect exist. Prior bridge fixture passed; all clients are not certified. Review F7 and §9. |
| Root approval response identity | PARTIAL | Child replies require exact identity; legacy root replies can remain run-only. Stale-decision behavior needs targeted evidence. Review F7. |
| MCP transport-session identity | PARTIAL / test candidate | Run ownership exists; SDK legacy session operations require cross-principal verification. No leak or exploit was reproduced. Review F6. |
| Bossfang UAR harness consumer | MISSING on inspected path | Current LlmDriver calls UAR's full execution route; full-harness endpoint use was not found in inspected Bossfang consumers. Review F1. |
| UAR full-harness provider | DONE, acceptance partial | Admission/receipt/shared executor implemented; integration parent gate pending, restart recovery and steer declared unsupported. Review §§4, 7. |
| The Boss native UAR adapter | PARTIAL | Tracks/cancels exact run and reconnects observation; does not yet consume C05 admission/reconciliation. Review F5. |
| Cross-component cancellation/retry/recovery contract | PARTIAL | Individual controls exist; no unified proven attempt/outcome contract across Bossfang and UAR. Review F5. |
| Credential secrecy | PARTIAL, no observed automatic leak | SecretString, redacted Debug, non-serialized run resources and provider encryption exist; tool-result content can enter history unchanged. Review §6. |
| Codex/Claude harness comparison | CONTEXT for G2, no independent implementation gap | User-requested comparison informs execution-contract design; it does not authorize renaming providers or modifying those adapters. Review §4.4. |

No implementation area is labeled STUB without evidence. Unimplemented consumer wiring is distinguished from implemented infrastructure lacking end-to-end verification.

## Gap register: all review findings retained

| ID | Priority / confidence | Actual boundary and gap | Required disposition in later stages |
|---|---|---|---|
| F1 | High / high static | Bossfang LlmDriver → UAR full execution. Histories, tools, results, budgets and cancellation do not obey one completion contract. | Compare explicit harness delegation with true inference-only use. Select and specify the authoritative loop; reproduce relevant current mismatch and prove the final execution path. Preserve the normal EndTurn counterevidence. |
| F2 | High when exposed / high code, medium consequence | API-key role minting → host trust; key tenant/ownership authority. Shared-secret mode can admit a self-minted host role under the documented destination prerequisites. | Constrain delegated/reserved roles, bind host provenance, preserve tenant, authorize revoke. Prove ordinary-user rejection and intended host success. Do not misreport JWKS-mode or settings-admin bypass. |
| F3 | High remote / high static | Remote relying-party verification and cached JWKS. Optional issuer/audience and no freshness bound. | Define separate remote profile and local launch behavior, clock tolerance and key rotation/removal requirements; specify/test bounded refresh. |
| F4 | High acceptance gap / high | UAR host grant → receiving MCP resource authorization. Declared scope/expiry are not token validation. | Inventory real servers and credential classes. Specify resource-correct credential acquisition, refresh and receiver enforcement; evaluate token exchange only where supported. |
| F5 | Medium / high wiring, medium failure consequence | Job attempt → run admission/stream/cancel/recovery. Run identity and side-effect uncertainty are not unified across the current driver. | Specify submit/reconcile/observe/cancel and retry ownership. Require unknown-outcome handling. Either implement recovery or explicitly constrain jobs to advertised unsupported restart recovery; analysis must expose that product choice. |
| F6 | Medium / medium candidate | Authenticated caller → legacy MCP transport session. Session operations may lack owner binding. | Reproduce with two principals and one session ID; correct if confirmed, or close with evidence of the enforcing layer. Do not silently omit it because run-status ownership exists. |
| F7 | Medium / high static | Human root approval → pending prepared invocation. Legacy run-only replies weaken explicit identity. | Establish actual stale/replayed decision behavior, migrate compatibility deliberately and demonstrate exact invocation binding without weakening the host claim. |

Two cross-cutting G7 dispositions accompany F1–F7; these are requirements at observed boundaries, not newly reproduced defects:

- **G7-A: service versus user identity.** Analyze must inventory Bossfang's receiving MCP service, UAR host admission and each selected remote resource; distinguish service actor from delegated user/tenant, and identify which layer enforces that distinction. Close with a named local/remote trust contract and later positive/negative identity scenarios. Trace: review §§3, 6, F2/F4; acceptance row “Bossfang receiving MCP service identity.”
- **G7-B: logging and model-context exposure.** Analyze must map credential-bearing headers/environment/error/tool-result paths to logs, persistence and model history, define permitted exposure and redaction boundaries, and select safe canary fixtures for later integrated verification. “Model-context limits” here means sensitive credential/identity exposure to model inputs, not a new context-window performance project. Trace: review §6 and the credential-output acceptance row; no automatic credential leak is asserted.

F2’s consequences still require the registered-destination/host policy and a downstream-valid credential; it does not automatically defeat resource-server checks. F5’s duplicate-effect concern is not proof that every failed HTTP call is retried. UAR already refuses to replay a failed MCP tool call. These constraints must travel into every later stage.

## Specification alignment and existing work

| Existing intent / contract | Alignment | Assessment |
|---|---|---|
| UAR JWT-hardening spec | Current conditional issuer/audience behavior matches that local spec | Remote strictness is a new explicit deployment requirement; do not claim an existing spec violation. |
| UAR tenant-isolation spec | Verified tenant is distinct from user and certain boundaries fail closed | Key exchange/direct key claims losing tenant require reconciliation with intended access paths. |
| Run-scoped credentials and MCP design | Much of the mechanism is implemented | Older “no remote credentials” background is stale. Preserve current binding/cache/lease design. |
| Bossfang C04 service-instance placement | Explicitly did not transfer the loop | The current driver does not satisfy full-run delegation simply because placement is implemented. |
| UAR C05 full-run delegation | Provider implementation exists | Reuse admission/receipt/executor; parent integration acceptance remains open. |
| Bossfang C05 design | Targets the intended ownership split | Consumer wiring is still missing in inspected source. Coordinate rather than create an overlapping competing implementation. |
| Local The Boss exact admission work | Substantial implemented controls and one prior fixture pass | Preserve exact claim and policy checks; do not close installed/remote delivery gates from this evidence. |
| New isolated workstream OpenSpec | No active changes or specifications yet | Expected at Assess. Analyze follows approval; specification is retained under the no-skips instruction before Plan and Execute. |

Spec inputs and links are retained in the review's contradiction table and source ledger. Their task checkmarks are intent/progress evidence, not newly reproduced behavior.

## Cross-tool progress and concurrency

The new canonical phase contains **zero registered changes, zero completed implementation changes and no other active stage**. There is no prior work in this isolated phase to claim as delivered.

The original shipping run and its outstanding integration/release gates remain owned by that run. UAR C05 and Bossfang C05 overlap this scope, and The Boss has concurrent unrelated work. Before planning source edits, analysis must identify ownership and dependency boundaries. Before Execute, create separate UAR/Bossfang/The Boss worktrees at reviewed revisions or explicitly rebase the evidence on changed source. No shared source checkout is an authorized execution target merely because it was used for assessment.

## Acceptance coverage inventory

This inventory preserves every review scenario. “Not run” is not a failure result.

| Scenario | Current evidence | Remaining observation |
|---|---|---|
| Wrong issuer / audience UAR JWT | Static verifier configuration | Reject before run admission in remote profile. |
| Expired / future UAR JWT | Static defaults, including leeway | Reject beyond documented tolerance. |
| Removed / same-kid changed signing key | Static freshness gap | Enforce bounded refresh/removal behavior. |
| Insufficient grant or MCP scope | Static grant subset checks | Deny at both grant and real resource boundary, with no effect. |
| Wrong-audience / expired resource credential | No production-server proof | Receiver rejects independently of inbound UAR JWT. |
| Cross-tenant access and forged tenant arguments | Owner construction and test source | Two-principal run, binding, resource and cancel isolation. |
| Reserved-role self-issuance | Static F2 call chain | Ordinary caller cannot create host authority; legitimate host succeeds. |
| Credential reuse/renewal between runs | Remote grant scenario source | No crossover; stale grant denied; renewal changes binding as specified. |
| Approval mismatch, absence and replay | Prior bridge fixture reproduced | Maintain passing bridge behavior and add root/stale-decision coverage. |
| Delegated execution | Static current loop mismatch | One authoritative executor; distinguish observed tool events from proposals. |
| Cancellation | Native run identity source | Acknowledged cancellation and classification of already in-flight effects. |
| Interrupted stream and reconnect | Native adapter and no-replay source | Reattach same execution; no new tool or task admission. |
| Lost submission response / retry | C05 reservation source | Same admission yields same receipt; incompatible payload rejected. |
| Restart recovery | C05 explicitly unsupported | Product behavior must match capability; no silent rerun of uncertain effects. |
| MCP session crossover | F6 candidate | Principal B cannot use/replay/delete A's session. |
| Stdio environment and termination | Source and existing scenario code | Allowed environment, no unrelated credentials, cancellation/shutdown behavior. |
| Key revoke/tenant preservation | F2 static | Owner/admin revoke policy; claims retain intended tenant authority. |
| Credential output / log / prompt handling | Redacted representations; unfiltered result path | Inspect actual safe fixtures and error/result paths; do not claim universal data-loss prevention. |
| Bossfang receiving MCP service identity | Static role, no-auth and agent-context paths | Distinguish local trusted operator/service from delegated remote user; enforce deployment assumptions. |

The resulting coverage classification is **PARTIAL**: one isolated bridge scenario has prior runtime evidence; the rest is static or unexecuted integration acceptance. Percentage coverage is unknown—no instrumented coverage run or defensible denominator exists.

### F6 reproduction ownership

F6 targets UAR's HTTP MCP server/session transport, not Bossfang's tool server. The reviewed UAR HTTP routes and SDK transport-session code are the starting boundary. Analyze must select an isolated in-process/ephemeral fixture and the actual supported test principal issuer; that fixture is not yet chosen. Capture A's initialized session, attempt B's POST continuation, GET/replay and DELETE against it, and assert B cannot observe A's response or change A's session lifecycle. Also prove A still succeeds. If the enforcing middleware closes this path, cite and execute it before closing F6. This unresolved fixture/issuer choice is an explicit Analyze input.

## Build health and constraints

- **Build health: UNKNOWN.** No new Rust/TypeScript build ran during assessment. The prior review found no current-source UAR integration binaries in normal target directories and did not certify the older executable.
- **Known build failures: none observed in this stage.** This does not imply all repositories build.
- **KBD initialization: PASS within scope.** Workstream configuration validator passed, managed OpenSpec 1.14.1 refresh completed with latest verification and no authored-state changes, canonical phase creation and stage gate succeeded.
- **Original-state isolation: PASS at recorded checks.** Original project UUID/revision/active path remained unchanged; separate UUID used for new mutations.
- **Rule compliance:** Node equivalents used for upstream shell/jq lifecycle instructions. No product source/dependency/service edits, no new daemon, no broad or partial-implementation testing, and no generated progress/waypoint hand edits.
- **Hook limitation:** the shipped Node dispatcher was invoked for phase:before and assess:before. Its built-in file contains harness event definitions, not matching lifecycle command-array entries, so no lifecycle side-effect commands matched. Required recall was run explicitly. Do not claim a memory stage-writeback hook ran; handoff persistence is local and authoritative.
- **Source-sync limitation:** the installed `pk` CLI has no `sources` subcommand. A fresh local sources receipt records selected repositories/commits and file hashes. No private/remote knowledge source was selected or silently treated as synchronized.
- **Model preflight:** two configured dispatchable canonical identities and the existing Liter gateway were found. Exact producer canonical model ID is unavailable; review must disclose this instead of manufacturing an identity.
- **Scope evidence:** [assessment-scope-check.json](evidence/assessment-scope-check.json) records zero tracked changes, zero new code files and zero changed paths under tooling lib/scripts/hooks/rules/docker/skills. All 59 source digests still match. Full inherited build/test/archive gates were not run: this is an assessment boundary, no implementation or archive, and those source surfaces were not changed. This is not a claim that the untouched baseline passes every historical constraint.
- **File-isolation limit:** no pre-initialization hash snapshot of all ignored original metadata was captured, so byte-for-byte immutability of every original metadata file is unverified. OpenSpec refresh and KBD mutations targeted the nested root; canonical original revision/path and cited source files are directly checked. No product-file write was performed.
- **Tooling follow-up disposition:** lifecycle-hook command matching is an out-of-scope tooling limitation for this architecture phase. Continue explicit recall and local stage handoffs; do not silently certify automatic memory writeback or add a hook fix to this product plan.
- **Security hardening added: none.** This is assessment, not remediation.

## Goal progress

| Goal from goals.md | Status | Reason |
|---|---|---|
| G1: account for all findings/scenarios | MET for assessment | F1–F7 and the full acceptance inventory are carried forward with evidence labels. |
| G2: one authoritative execution loop | NOT MET | Recommendation exists; implementation and architectural decision are pending. |
| G3: key/JWT/tenant authority correction | NOT MET | Static gaps identified; correction and integration proof pending. |
| G4: resource credentials and server enforcement | PARTIAL | Mechanisms exist; complete receiver and lifecycle evidence missing. |
| G5: exact approval and session boundaries | PARTIAL | Exact host admission implemented; legacy root/session gaps unresolved. |
| G6: cancellation, retry and recovery | PARTIAL | Local mechanisms exist; end-to-end attempt contract incomplete. |
| G7: local/remote separation and secrecy | PARTIAL | Distinctions documented; remote acceptance and operational requirements pending. |
| G8: reconcile active work and isolate implementation | PARTIAL | Existing C04/C05 work identified; source worktrees and ownership resolution belong to later approved stages. |
| G9: full lifecycle with approval stops | PARTIAL | Assess only; Analyze, Spec, Plan, Execute and Reflect are not entered or skipped. |
| G10: evidence/review and original state preservation | MET for assessment with disclosed limits | Independent artifact review completed; exact producer identity and full ignored-metadata byte isolation remain unverified. No product certification is claimed. |

## Open decisions for Analyze—not decisions already made

1. Must Bossfang use UAR exclusively as a full harness, or must a separate true inference-only mode also remain supported?
2. Which actual remote MCP servers, authorization servers, tenant contracts and credential brokers are in deployment scope?
3. What scheduled-job behavior is required across UAR restart: explicit unsupported/unknown outcome, or durable recovery? The current C05 API cannot be described as durable.
4. Which component owns delegated token acquisition and refresh, and where is user versus service/actor authority recorded?
5. What compatibility window is acceptable for root approval clients and the completion-shaped UAR adapter?
6. Which existing C05 workstreams own source changes, and which changes can this phase integrate without conflicting with them?

Analyze must turn these into evidence-backed options and concrete architecture tradeoffs. It must not implement the fixes or silently reduce coverage.

## Stage completion and handover

Independent artifact review: **PASS, 0 CRITICAL / 0 WARNING / 2 SUGGESTION**, MiniMax-M3 via a fresh-context gateway call. [Final findings](review/assess/findings.json) and [reviewer screen](review/assess/sycophancy.final.json) are retained. Reviewer screen score: 0.0; assessment screen score: 0.017857, low length flag only. The exact producer canonical identity is unavailable; the receipt correctly records `unverified-producer-unknown`, not verified model separation.

Round 1 identified three critical packet/coverage weaknesses, four warnings and two suggestions. The revised packet includes the full linked source ledger, phase file tree, source digests and scope check; the assessment now gives explicit G7 identity/exposure dispositions, F6 fixture ownership and tooling limitations. A second-round attempt hit its output limit and was rejected, then the completed retry returned the PASS above. All review receipts are retained.

The two optional suggestions are carried forward: F1 includes later-stage reproduction/proof obligations, and the Codex/Claude comparison remains a table row clearly marked context only. These are intentionally retained to preserve the user's required acceptance coverage and original comparison request. They authorize no implementation or adapter renaming. Analyze must make the architectural choice before any Plan/Execute work.

Assessment handoff records the resolved round-1 warnings: partial original-metadata evidence, unresolved F6 fixture selection, out-of-scope lifecycle hook writeback, and comparator-only scope. No unresolved critical or warning finding remains in the final independent review.

The authorized next action after assessment completion is **stop and request the user's approval for Analyze**. A completed assessment/handoff is not that approval. The KBD pipeline’s Spec stage (normally optional, retained under the user’s no-skips instruction) will also be performed and reviewed between Analyze and Plan; no lifecycle slot is silently skipped. Product changes, execution gates and reflection remain future work.

ASSESSMENT COMPLETE means this gap assessment is finished—not that its phase goals have been implemented.

