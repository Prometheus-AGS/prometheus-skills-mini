# Analysis: consolidate the UAR/Boss baseline and resolve approval authority
Date: 2026-09-24. Stage: analyze. Stack specified: existing Rust UAR and Electron/TypeScript Boss; no stack replacement.
Scope: eight integration repositories and their registered worktrees, relevant submodules and packaging pins. Product implementation, merges, WIP commits, deletion and tests remain outside this analysis. Remote-tracking refs were refreshed at the user's explicit direction.

## Recommendation

Create one accepted source checkpoint per repository, recorded together in an integration-baseline manifest. Reuse the active Boss/UAR integration worktrees after preserving their current state and reconciling incoming changes. Mini needs both its local shipping work and the already published agent-team changes. Do not select a baseline merely because a checkout is called main, and do not merge every old worktree wholesale.

A source baseline and a known behavioral baseline are different milestones. This analysis establishes provenance and likely integration order. Only a completed real Boss → UAR → MCP workflow built from that recorded source set can establish behavior. The previous malformed Gate V does not supply that evidence.

The quickest safe path is: preserve → consolidate active source → reconcile dependency pins → build the actual selected pair → run one meaningful integration boundary → freeze the result → implement the approval correction against that baseline. Resolving every unrelated historical experiment is not a prerequisite to delivering the active integration, but every worktree receives a preserve/adopt/archive disposition.

## Evidence inventory

research/consolidation/inventory.json records 33 registered worktrees in eight repositories: 32 directories exist; 18 had dirty status entries at inventory time. These are worktree/status counts, not numbers of changed files or broken implementations. One full-pack registration points to a missing temporary directory. No inspected index contained an in-progress merge, cherry-pick, rebase or index lock.

Remote refs were fetched for all eight repositories with no checkout, pull, rebase, prune, working-branch move or push. Liter-LLM origin/main advanced from d27dfa235 to 928c41a6e. Boss main is f1314b46ad. An initial short ls-remote pattern also matched changeset-release/main, producing a false Boss divergence; exact-ref lookup plus GitHub API resolved it. The erroneous simulation is retained as superseded evidence, excluded from decisions. ref-refresh.json is the authoritative refresh receipt; initial remote-heads.json is historical and contains that corrected error.

The agent-fabric-convergence group is an independent planning initiative. Its README, dependencies.md and baseline-ledger.md explicitly reserve this UAR/Boss integration as D-UAR-P1 and mini as D-MINI. Its five overlapping product worktrees are clean snapshots, not newer product implementations to merge into this task. Leave its KBD identity and planning files intact; its future product slices consume our accepted checkpoint.

## Committed histories: what can actually be combined

Git merge-tree simulations inspect committed objects without changing branches, the index or working files. They do write Git objects. Clean merge results do not prove runtime compatibility and exclude all dirty and untracked files.

| Repository / source | Relation to refreshed main | Observed committed merge | Disposition |
|---|---|---|---|
| Boss feat/uar-agent-runtime, 2fa0b4b87f | 15 feature-only commits; 3 main-only commits | Clean | Retain active feature; incorporate f1314b46ad, including mini bundle/release changes |
| UAR feat/the-boss-sidecar, 19e2ad1575 | 15 commits ahead; contains c29af47be3 main | Clean / ancestor relationship | Retain integration history; no main reset or rebase needed |
| Mini local main, 4178a489b3 | 23 local-only; 9 remote-only | Two conflicts, both generated KBD position JSON | Preserve both product histories; reconcile canonical KBD state and regenerate projections |
| Full pack main, 10a416589b | 17 commits behind add9b48949 | Ancestor, but local WIP exists | Preserve WIP; advance to accepted main and reapply intentional source changes |
| UAR presentation WIP, aa553c6e5f | 2 commits unique, 60 integration-only | 80 conflicting paths, including runtime, API, frontend and process artifacts | Do not wholesale merge; explicit feature/hunk recovery against the accepted integration |
| Full-pack gateway-secrets, 2b1ce32c04 | 1 unique commit | HANDOFF.md add/add conflict | Evaluate its actual launcher/config change; separate historical handoff from executable configuration |
| Compass preflight, 54dbee7656 | 1 unique commit | 5 conflicts, including graph/core code | Preserve; evaluate whether current implementation supersedes its graph-limit correction |
| Memory dependency branch, dd7fdcd6d8 | 1 unique commit, 33 main-only | Cargo.lock conflict | Preserve; compare resolved dependency/security intent against current main before selective adoption |
| Liter-LLM host-transport, e627af981b | 1 unique commit, 172 main-only | 3 HTTP transport conflicts | Required dependency reconciliation; preserve host-credential isolation while adapting to 928c41a6e |

The Boss main-only commits are the merged agent-team mini update and release metadata. Mini's remote-only work includes KBD authority corrections and portable agent teams; choosing only the local checkout loses those features, choosing only origin/main loses service-discovery work and shipping records. The remote-ref counts and exact hashes are in merge-analysis.json and ref-refresh.json.

## Uncommitted behavior: the part a branch merge cannot recover

- Active Boss: 20 modified tracked files plus untracked Gate V. Changes include sidecar/session authority, MCP transport, PATH/full-pack/service behavior, release tools and settings UI. Preserve and classify these into coherent checkpoint commits; release metadata is not automatically evidence of a newly built artifact.
- Active UAR: 13 modified tracked files. Actual product changes include model context-window selection, effective policy in run inspection, Ask preservation, and route/server changes. Some edits are formatting. pnpm-lock.yaml has 57 insertions and 2,484 deletions; this is an unresolved lockfile change, not something to keep or discard mechanically.
- Presentation recovery: 75 tracked changed paths plus untracked additions at inventory time; 4,150 insertions / 913 deletions in the tracked diff. It overlaps the active UAR dirty manager.rs and broad committed runtime/presentation changes. A clean HEAD merge elsewhere says nothing about this WIP.
- Liter-LLM primary checkout has an uncommitted tower/service.rs streaming/cancellation change. The host-transport commit does not include it. Record its intended behavior and provenance, then deliberately integrate or quarantine it; do not let a submodule update silently lose it.
- Full pack has uncommitted context/distribution sources, generated output and instructions. Prefer source reconciliation followed by regeneration; generated copies are not independent sources of truth.
- Detached Apple release checkout has rewritten/generated skill files and Compass skill directories. Retain as release evidence; recreate future payloads from pinned sources rather than treating post-build resource copies as the authoritative skills repository.
- Other dirty checkouts mostly contain instructions, local harness settings, knowledge logs, submodule instruction edits or generated artifacts. “Mostly” is not permission to delete them. The disposition ledger retains them until classified.

Submodule details were inspected separately: dirty nested repositories can exist without a changed gitlink. The current submodule-details.json records 23 selected/dirty nested states; recursively preserve any dirty nested child before a parent update. Local configuration may contain credentials: private recovery backups stay outside published Git artifacts. Do not blanket git add/stash/push working directories.

## Dependency and payload drift

Boss build/integration-sources.json currently pins UAR c29af47be3, before the 15 administration commits; mini 86b2c7e1a7, before the divergent current lines; full-pack CLI e57421a86f; memory 6acb605659; Liter-LLM c5c6caac61. Boss's resources/prometheus-skills-mini gitlink has already moved on main while that build-source manifest still uses 86b2c7e1a7. These are distinct source selectors, not an atomic baseline.

Active UAR vendors Liter-LLM e627af981b for isolated host-supplied credentials and full-pack source e57421a86f. Mini pins Liter-LLM 928c41a6e and memory 4ed6b2c79b. Existing versions.toml prose pins differ from some actual Git trees. The operator-authored versions.toml rule remains in force: record requested pin decisions for operator reconciliation rather than editing those files silently.

A package built from a fresh Boss commit could therefore still ship an older UAR or mini unless every actual source selector is aligned. Gate V additionally accepts THE_BOSS_UAR_SIDECAR_PATH, so its executable may differ from both the worktree and packaging pin. Record the executable path, checksum, build source/dirty status, enabled features, Boss output hash, payload revision and service/config profile. An executable filename or successful launch is not source provenance.

The consolidated manifest should identify repository remote, immutable commit/tree, intended dirty status (zero for production inputs), recursive pins, generated asset inputs, toolchain/build features, actual binary checksums and acceptance evidence. Keep release installers and their existing published provenance unchanged until replacements are built.

## Reconciliation sequence for Spec/Plan

1. **Preservation and ownership.** Take a timestamped private recovery inventory of all relevant worktrees, committed refs, staged/unstaged binary patches, needed untracked/ignored source/config and nested submodules. Git bundles preserve committed objects only; they do not capture WIP. Stop overlapping writers on the selected surfaces by existing ownership mechanisms, without interfering with independent convergence work. Verify that HEAD/index/status have not moved while taking each snapshot. Do not remove registrations yet.
2. **Active WIP checkpoint.** Partition Boss/UAR/mini/full-pack/Liter WIP by intended change. Commit only reviewed-to-scope product source and required fixtures to recoverable integration refs, with Assisted-by attribution; keep private local config, credentials, caches, generated runtime data and unrelated work out. “Checkpoint” does not claim passing behavior. Record excluded work with a recovery location and reason.
3. **Committed convergence.** In the selected active integration lanes, merge Boss main into Boss integration; UAR already contains main. Merge mini local and remote histories. Preserve canonical project/run identities and journal evidence; do not hand-merge current-waypoint.json or position.json and declare success. Use the installed KBD replica/conflict/status interfaces to reconcile canonical state, then regenerate those projections. Resolve any genuine CRDT conflict through the supported adjudication path, not timestamp selection. Advance full-pack base after WIP preservation.
4. **Dependencies before consumers.** Reconcile Liter-LLM's host-credential-isolation commit with the newer upstream merge and the separate streaming WIP in one bounded dependency slice. Only then choose the UAR vendor pin and mini gateway pin deliberately; the library and service may use different revisions only if documented as an intentional compatibility choice. Align memory, filesystem, Compass, pk and skill source pins by capability requirements. Do not drag every dependency's historical branch into this acceptance.
5. **One payload closure.** Update Boss's source manifest, resource mini gitlink, runtime binary manifest, full-pack CLI source and generated skill payload together from accepted commits. Verify the inventory/dependency closure rather than only skill count. Current primary mini has 53 top-level SKILL.md directories versus 57 in fetched main; this is a directory count, not complete runnable-payload validation. Keep user-authored/full-pack installations protected by the existing ownership logic.
6. **Behavior baseline.** At this completed consolidation boundary, fix the Gate V fixture's file_path contract and retain real failed tool results; build the selected production pair once and exercise the actual configured catalog/conversation/MCP path. Record known failures and the exact source set. No per-edit unit loop. Do not make approval-architecture changes merely to satisfy invalid input. If observed contract defects prevent a passing baseline, freeze it as an explicitly failing reproducible baseline, then fix that coherent defect against it; do not loop trying to label it green.
7. **Approval implementation and release.** Design/implement the bounded approval contract using the consolidated source, then run its complete integration boundary. Windows x64 and macOS Apple Silicon remain required. Archive/remove redundant worktrees only after their unique work is either integrated or durably recoverable with a recorded disposition; do not delete the independent convergence group's checkouts.

These are analysis decisions for an approved plan, not actions executed in this stage. No checkpoint commits, merges, product edits or tests have been performed.

## Codex is the primary Rust architectural reference

The consolidated research/landscape/harness-landscape.md now includes Codex in the version table, every comparison row and a dedicated Rust-to-UAR mapping. Separating it into a companion report in assessment made the requested comparison incomplete; that documentation omission is corrected.

At local Codex 986ff1cc7ced, shared request_approval coordinates review, prepared MCP bindings retain catalog authority, and the core execution continuation resumes after the decision. App-server maps transport IDs and replays still-live pending requests; single-consumption callbacks prevent multiple replies from resolving one waiter. Host restrictions remain independently authoritative. Apply those mechanisms inside UAR's existing broker and Boss adapter. Do not import a replacement Codex runtime.

This does not resolve our distributed admission seam by itself. Exact invocation identity must reach the Boss bridge; policy composition cannot weaken UAR Ask; renderer presentation needs a sanitized action view and opaque reply IDs; generation changes must fail closed rather than replay ambiguous side effects. The decisions below fix the authority and transport contract now; implementation must bind that contract to the recorded baseline rather than silently targeting a different checkout from packaging.

## Approval architecture decisions for Spec/Plan

These are proposed contracts, not claims that current code implements them. Consolidation changes source selection, not the following authority decisions.

| Decision | Chosen architecture | Alternatives rejected or deferred |
|---|---|---|
| Execution owner | UAR owns the prepared invocation, pending continuation, root/child lineage, decision and terminal result. Extend its existing broker. Boss is the presentation and host admission adapter. | Moving the run loop into Boss or replacing UAR with Codex duplicates existing runtime responsibilities. |
| Policy precedence | Resolve UAR catalog/run policy and Boss workspace/tool restrictions before execution: deny dominates ask, ask dominates auto. Host auto cannot downgrade UAR Ask; approval cannot override a host deny. Recheck current host restrictions at dispatch. | Independent UI approval loops or last-writer-wins policy cause inconsistent authority. |
| Prepared identity | Immutable execution context contains runtime epoch, root/run ID, invocation ID, resolved catalog/tool binding, workspace/principal, canonical argument digest and policy revision. A repeated identical tool call receives a different invocation ID. JSON-RPC request ID is transport correlation, not authority. | Tool name plus arguments FIFO cannot distinguish concurrent identical calls or stale approvals. |
| Host admission | Boss prepares a host-scoped admission record through an authenticated internal adapter exchange, returns its disposition to UAR, then records the resulting allowed decision against that exact invocation. Only that record permits a hosted MCP execution. | Treating a model-supplied metadata field, renderer reply or argument hash alone as permission is insufficient. |
| MCP transport | Carry a namespaced opaque admission reference and invocation identity in tools/call params._meta between UAR and the managed Boss bridge. Keep tool arguments schema-pure. Host consumes the matching admission atomically on this authenticated, generation-bound connection. | Changing every external tool schema or using FIFO argument matching is unnecessary. This is a private adapter contract, not a generic MCP authorization standard. |
| Renderer boundary | Main process sends a safe action description with meaningful target/operation details, redacted credential fields and opaque request/reply IDs. Main resolves and authenticates replies to existing pending records; renderer supplies only a decision, never replacement tool arguments or a claimed principal. | Sending raw credential-bearing arguments or displaying nothing but an opaque ID makes consent unsafe or meaningless. |
| Live reconnect | Reattach to the same running broker using pending snapshot plus existing event cursor; replay display events with stable IDs. One waiter consumes one terminal decision. Duplicate/stale replies report their state and do not dispatch again. | Rebuilding pending actions from arbitrary client events creates a second authority. |
| Cancellation/children | Root cancellation invalidates descendants and unconsumed host admissions. Child runs inherit ceilings and get distinct invocation IDs. The final dispatch transition checks cancellation, epoch and permission; cancellation after execution starts cannot promise to undo the effect. | Detached child approval queues and cancellation implemented only in the UI leave executable work behind. |
| Process restart | A changed UAR or host epoch invalidates pending approvals and unconsumed admissions. Persist lifecycle/audit outcomes; surface interrupted or outcome-unknown actions. Require a fresh user action for retry. | Transparent crash continuation and exactly-once arbitrary external effects are outside this release. No autonomous replay of ambiguous writes. |
| Approval-time editing | Allow or deny the prepared call. Editing the requested action creates a new invocation and approval. | In-place argument mutation after review invalidates the identity being approved. |

Transport feasibility was inspected against UAR's direct pinned rmcp =3.1.2, not inferred from latest online docs: CallToolRequestParams has a public meta: Option<RequestMetaObject> serialized as _meta (model.rs:4054–4109). The existing registry creates the name/arguments request but does not propagate invocation authority. No rmcp upgrade is required merely to carry this metadata. Compass's separate rmcp pin is not a reason to silently upgrade UAR. See research/consolidation/rmcp-metadata.json for the source hash and excerpt.

The host admission exchange is new adapter work on the existing managed UAR/Boss channel, not a new daemon, external MCP method requirement, or bearer credential exposed to the renderer. Its lifecycle is prepare → policy resolution/human decision → authorized → consumed or cancelled. The host issues opaque, connection-bound record IDs; only trusted UAR/main-process control messages can authorize them. Tools/call presents the record, and Boss checks the full stored binding against the actual call before dispatch. Unknown, expired-generation, cancelled, already-consumed or mismatched records are refused. Treat those checks as the actual tool-execution trust boundary, not speculative hardening. Generic third-party MCP servers remain unchanged: UAR gates them before calling; the additional host admission record applies only to the managed Boss bridge.

Do not hold a registry/global mutex while awaiting a human, network response or tool result. Reuse the existing per-invocation waiter and short atomic transitions. If both UAR and host request approval, the human sees one composed request; a host policy change that newly requires consent invalidates the old admission and returns to that same coordinator. The adapter protocol/version and exact DTO names belong in Spec; its authority, identity, wire location and lifecycle are decided here.

Codex supplies inspected precedents for prepared catalog bindings, a core-owned continuation, correlation, single-consumption replies and replay of live pending work. It does not prove our distributed contract works. The completion gate must demonstrate identical concurrent calls, UAR Ask + host auto, host deny, detach/reconnect, root cancellation, stale-generation replies, and actual tool-result propagation through the complete configured conversation path. Run this as a completed behavior boundary, not isolated per-edit unit loops.

## Critical path versus recovery queue

The approval-critical baseline consists of the active Boss/UAR source and dirty changes affecting that path; the exact Liter-LLM dependency needed to build/run that pair; the existing fixture correction; and immutable references for the payload actually loaded. Preserve all other work now, but do not make historical feature recovery, full-pack regeneration, every skill upgrade or worktree retirement prerequisites to implementing this approval contract. Mini/full-pack reconciliation and complete payload closure remain delivery work and must finish before their release gate.

A minimal known failing baseline is acceptable when it records the real contract failure and binary provenance. There is no requirement to achieve a green baseline by fixing unrelated features before starting the approval fix. The broader reconciliation sequence above is a delivery dependency map, not an instruction to finish every row serially before architecture work.

## Scope precedence

The generated 2026-09-21 constraints describe the full pack as reference-only. Subsequent explicit operator instructions require modifying its context bootstrap, copying all current skills across the integration repositories, and now analyzing their consolidation. Those instructions override that older reference-only constraint within the requested integration scope. This analyze stage has changed no full-pack product files: only explicitly requested remote-tracking ref refresh. The later plan may reconcile required full-pack changes, preserving unrelated work. This does not authorize writes to independent convergence planning or arbitrary experiments.

## Build-versus-adopt decisions and bounded research

Adopt existing Git history/merge inspection and existing KBD canonical reconciliation. Adapt existing source/payload manifests into a single cross-repository checkpoint. Reference Codex's concrete Rust lifecycle and the already researched other harnesses. Reject blanket directory copying, wholesale merging all experiments, replacing UAR, or adding a new repository-management daemon.

Tier 1: one gh repository search confirmed the Git upstream. Tier 2: Context7 resolved Git and queried merge-tree's documented semantics. Local Git 2.54.0 performed the simulations. Tiers 3/4 were unnecessary: no new dependency or missing framework was selected. Prior assessment harness research is reused, not repeated. Research cap: 8 queries/tier, 20 minutes; findings are partial regarding legacy WIP semantics, not an exhaustive recovery audit.

## Open decisions and risks carried to the plan

- The 80-conflict presentation recovery and its uncommitted work need a module/feature disposition before deletion, but need not block a checkpoint of the already working integration history.
- The required host-transport Liter adaptation and the lockfile delta require semantic decisions, not merge-tool acceptance.
- No current artifact proves the active dirty source set is the binary used in Gate V.
- Pin-authority discrepancies need explicit operator-approved reconciliation; no version update is implied by this analysis.
- Canonical KBD projections must remain derived. Convergence's independent identity is not to be merged into this shipping identity.
- The assessment's fresh reproduction and renderer-secret boundaries remain unverified; the plan must retain these evidence gaps.
- Repository ownership and source markers must be rechecked immediately before execution because other tasks are active.

## Completion evidence

Completed: local worktree/dirty/nested-source inventory; refreshed remote refs; seven committed merge simulations plus Liter dependency simulation; packaging pin inspection; Codex comparison integration; bounded candidate set and worktree dispositions. No production test/build or behavioral validation. Independent review is recorded separately under review/analyze/.

