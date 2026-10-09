# Analyze: phase-bauar-release-acceptance

Date: 2026-10-09
Boundary: Analyze only. Recommendations below await Spec/Plan approval; no product implementation, build, app launch or runtime test occurred.

## Recommendation

Complete a bounded **unsigned macOS ARM64 local acceptance delivery** using the installed testing stack and retained source candidates. Adapt existing scenario logic and integration gates rather than introducing a framework, service or dependency upgrade. The unanswered acceptance-target question is recorded as an open scope decision; local unsigned acceptance is a proposed conservative scope, not implied permission to sign, install or publish.

One concrete adaptation needs architecture approval: launch the real packaged Boss with private configuration, profile and logs, without editing the operator's live boot configuration or substituting an external UAR. The inspected packaged bootstrap does not provide a sufficient existing switch for this contract. Propose the smallest explicit early startup-root capability in Boss; Spec must define its interface and path coverage before implementation. If an already available isolated OS user can run the unchanged app instead, that can avoid a product change, but that environment has not been established. Do not assume HOME or --user-data-dir alone isolates all Electron paths.

Keep UAR and Bossfang execution architecture unchanged unless the approved completed-delivery scenarios reproduce a defect. Reuse the existing UAR release binary when its input identity is unchanged. A necessary Boss startup-root change would require a new source-bound Boss package, not recompilation of unchanged UAR.

## Retained baseline and updated tooling disposition

[Assess](assessment.md) and its [bounded baseline](evidence/assess/baseline.json) bind UAR `84ca0ffff5da8fafc1e2e7f5585efc07a396b14e`, Boss `7a5bdb4b7c02e9f13875fc7f837815c03fe3dacd` and Bossfang `1d518936cb15b79d30bdd315510ff925613a0f4d`. The unsigned app and source-bound sidecar were built in the predecessor phase; current-bundle successful operation remains unpassed. This stage retains that evidence rather than claiming a fresh build.

The separate reconcile fixes are now merged: [mini PR52](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/52) at `790b183d4c17134a50355b0d684edfec8420c2b1`, [full PR176](https://github.com/Prometheus-AGS/prometheus-skill-system/pull/176) at `95c8d7768b8a8a915ed2784808b04710fdb1d04b`. Verification in this session matched all 35 mini handoff files and all 24 full generated module-copy digests. Their 4/4 integration passes concern skill commands, not BAUAR. Windows and historical hook effects remain unverified; inherited full distribution drift and mini broad-suite dependency failures are separate. Primary checkouts and installed caches were not promoted during Analyze.

## Existing stack and candidate decisions

| Candidate | Decision | Fit and adaptation |
| --- | --- | --- |
| cand-001: Playwright Electron automation | ADAPT | Installed Playwright 1.62.1 / Electron 44.2.0; reuse actual executable launch, main-process observation and controlled shutdown. Replace development/external-sidecar launch assumptions. |
| cand-002: Boss experience and approval fixtures | ADAPT | Reuse scenarios and controlled model responses while exercising real router, approvals and tool effects; bind packaged generation and binary selection. |
| cand-003: Bossfang full harness integration gate | ADAPT | Reuse real API/kernel hosts, UAR, embedded persistence, controlled peers and interruption scenarios with current source-bound binaries. |
| cand-004: Eligible UAR regression targets | ADAPT | Finite HTTP/stdio identity, resource-grant, secret-projection and cursor targets. Separate test-feature evidence from production packaged behavior. |
| cand-005: Node orchestration primitives | ADOPT | Existing Node LTS filesystem, child process and hashing APIs can coordinate private roots and typed receipts; no new runtime/service. |
| cand-006: Spectron | REJECT | Repository is deprecated; replacement adds migration without addressing the observed launch-root constraint. |
| cand-007: Boss early path/bootstrap pattern | ADAPT | Extend its existing configuration responsibility minimally if approved; do not add an invented bypass around the path freeze. |

Installed versions are inputs, not upgrade recommendations. Registry research observed Playwright latest 1.64.0 (Apache-2.0, modified 2026-10-09) and Spectron 19.0.0 (MIT, modified 2024-09-22). No installation or pin change follows. Current official Playwright Electron guidance calls the API experimental and documents launch arguments/environment and application evaluation/closure; it does not prove every documented feature against installed 1.62.1. [Official API](https://playwright.dev/docs/api/class-electron). Local installed metadata and existing fixtures are the version-specific implementation evidence.

## Packaged startup isolation: observed limitation and correction

[Existing experience gate](/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/uarExperienceGate.test.ts:88) launches development output and requires an external UAR path. Its assertions are reusable; its launch cannot establish bundled selection.

[Old packaged helper](../bossfang-uar-authorization-and-execution/evidence/execute/parent-resume-2026-10-08/check-packaged-external-uar-04.mjs) edits `~/.the-boss/boot-config.json` to route the app into a private profile, then restores it. Reusing that behavior violates the requested private execution boundary even though it has cleanup.

[Constants](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/paths/constants.ts:24) resolves boot configuration under the home directory and logs through Electron. [Packaged userData selection](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/preboot/userDataLocation.ts:55) uses the executable-specific boot map or branded appData; the development suffix branch applies only when unpackaged. [Preboot contract](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/preboot/README.md) requires early path establishment before registry initialization and single-instance locking. Optional configuration capability belongs in its existing responsibility, with only necessary early bindings.

Proposed correction: explicitly select a private root before boot-config/logging consumers resolve paths, establish userData/sessionData and owned sidecar storage before the path freeze, and preserve ordinary startup when not selected. Exact flag/environment names and affected paths belong in Spec, not an invented Analyze API. Acceptance must observe the resolved paths and prove live configuration/profile/log files remain unchanged. HOME affects Node's POSIX home lookup, but does not by itself prove Electron appData/log coverage. [Versioned Node docs](https://nodejs.org/download/release/v22.20.0/docs/api/os.html#oshomedir), [Electron app paths](https://www.electronjs.org/docs/latest/api/app).

Private launch still uses the actual packaged executable with `app.isPackaged` true and the actual UAR inside that bundle. Record source/artifact identities and `binarySource: bundle`; forbid the external override in this gate. Use explicit child environments, fixture credentials and owned process IDs. Disable or sanitize traces/screenshots/raw stderr where secret canaries could be captured; publish only bounded outcomes and counts. This is the existing credential/tool-execution and profile boundary, not a new JWT forwarding requirement.

## Proposed acceptance deliveries and ownership

| Delivery | Owner responsibility | Required evidence |
| --- | --- | --- |
| Private packaged launch and desktop workflows | Boss implementation owner | Correct bundled selection, authenticated check, exact approvals, eager/deferred discovery, permitted/denied effects, generation changes and cancellation races; private paths and owned shutdown |
| Selected job delegation | Bossfang harness owner | One admission/owning UAR loop, mapped input/policy, observation, cancellation, lost acknowledgement, partial stream/reconnect and epoch restart outcomes; no duplicate admission/effect |
| Eligible regression and local packaging controls | UAR/provenance owner | Finite allowed targets, configured HTTP/stdio credential isolation and secret projections; stale-source/corrupt-archive/public-mode controls on disposable copies |
| Coordination and cumulative review | Workstream lead plus independent reviewer | Typed source-bound receipts, reviewed finite allowlist, retained prior passes/debts, explicit release-readiness verdict |

Roles are proposed responsibilities, not claims that agents have started. Plan assigns concrete owners and disjoint files. Finish coherent production/helper adaptations before the one consolidated integration boundary. A reviewer examines the completed delivery; artifact vetting here does not certify product behavior. Single writers own each build directory. If a completed gate fails, batch the fix and rerun only its failed scope.

The existing [Bossfang gate](/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-gate.mjs) accepts already-built API-host, kernel-test and UAR binaries plus UAR source. It requires Node 24; it does not build/install or start a shared daemon. [Runtime fixtures](/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-runtime.mjs) provide private child environments, actual UAR startup, embedded Surreal persistence and controlled HTTP/model/MCP peers. [API host](/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/crates/librefang-api/tests/bauar_harness_host.rs) and [kernel entry contract](/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/crates/librefang-kernel/tests/bauar_harness_delegation.rs) are complementary: the kernel target alone is not full selected tool-flow evidence.

Controlled model responses make cases deterministic; they must not replace the actual executor, approval routing or filesystem effects with mocks. This gate can use the packaged UAR binary as a standalone private harness peer, but cannot certify packaged desktop startup. Automatic cron/deferred producers lacking the selected JobAttemptRef remain native; automatic UAR job selection is not added to this scope.

## Finite acceptance scenarios for Spec

1. Actual packaged startup selects the source-bound bundled UAR, succeeds at authenticated integration, and records private root paths. Reject stale source, corrupt archive and public-mode misuse using retained packaging contracts in disposable copies.
2. Exact approval IDs bind the originating execution and current generation. Denied, edited, consumed/stale and cancelled decisions have no unauthorized target effect. Discovery and target approvals remain distinct; successful target effect occurs once.
3. Bossfang selected normal/streamed execution runs through UAR; model-provider calls stay response-only. Native compatibility and unsupported ephemeral selection retain existing behavior.
4. Interrupted streams/reconnect observe the same execution. Lost acknowledgement and partial terminal capture reconcile instead of resubmitting. Cancellation reports actual outcome. Restart yields unsupported/unknown requiring reconciliation, without automatic replay or a durable recovery claim.
5. Eligible configured HTTP/stdio cases preserve run/owner/destination credential boundaries and prevent cross-run secret projection. Wrong-audience/expired/insufficient-scope and cross-owner cases are selected from existing observed identity/grant paths; do not prescribe forwarding the caller JWT to MCP. No production remote receiver/IdP certification.
6. Cumulative independent review covers the finite BAUAR product changes and paired callers; scoped formatting checks document retained global debt rather than rewriting unrelated files.

Eligible UAR files are [identity boundary](/Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_identity_boundary.rs), [resource grants](/Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_resource_grants.rs), [stdio boundary](/Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_stdio_boundary.rs), [secret projection](/Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_secret_projection.rs) and [full-harness cursor](/Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_full_harness_cursor.rs). Identity-boundary tests require server and test-probes; a separately compiled test target is supporting regression evidence, not the production server-full bundle. Plan must specify exact commands/features at the complete boundary. No bare workspace/all-tests command and no F6 file inspection or execution.

## Responsibility boundaries and release decision

The model provider produces responses. UAR owns the admitted agent loop, tools, approvals and continuation. Bossfang owns jobs, attempts, submission intent and outcome reconciliation. Boss owns desktop admission/UI, managed sidecar lifecycle and explicit application/server MCP configuration. Configured MCP peers enforce their own declared authentication. Preserve empty shipped defaults and strict owned-caller approval IDs.

Propose the workstream lead as local acceptance coordinator and the operator as release-scope authority. Signed/installed macOS, Intel/Windows and publication need separately selected requirements, native hosts/owners and authority; their availability has not been established. Do not make these unselected scopes prerequisites for local acceptance. No product merge, release, installation or shipping/C05 advancement is authorized here.

Open decisions for Spec review:
- Accept the proposed unsigned local target or select a wider release target.
- Approve the minimal early private-root contract, or identify an existing isolated OS-user environment that avoids it.
- Confirm finite regression and cumulative review boundaries; assign signing/platform/publication ownership only if requested.

## Prior lessons, budget and verification limits

Applicable [prior-context](prior-context.md) quotes: “keep locked dependency topology intact; resolve application child runtime requirements before builds”; “separate implementation, build/package evidence, runtime acceptance and publication”; “Its 4/4 integration groups test the skill commands, not BAUAR runtime behavior.” These support existing locked tooling, explicit Node child versions and separate evidence classes.

Prior-context has no Knowledge gaps heading or entries; there are no recalled learn-goal offers to enumerate. No evolver bridge exists. Research mode is stack specified; no stack-discovery artifact is required.

Research reused the pre-interruption bounded session: tier1 two GitHub searches; tier2 six Context7 calls (resolve/query for Playwright, Electron and versioned Node) plus two batched official-document verification retrievals; tier3 two registry queries; tier4 zero. Tier2 reached its eight-query cap; no further landscape queries were performed on resume. The 20-minute cap applies to active research, with interrupted time excluded; this resume writes and reviews existing findings. Confidence is high in inspected launch-contract mismatch and available source patterns, moderate in proposed integration fit, and unverified in current runtime acceptance.

Context7's versioned Node query returned irrelevant snippets; Node API claims use the official v22.20.0 pages instead. [Child process docs](https://nodejs.org/download/release/v22.20.0/docs/api/child_process.html#child_processspawncommand-args-options). No undocumented launch isolation guarantee is inferred. Spectron rejection uses its [deprecated repository](https://github.com/electron-userland/spectron).

Legacy lifecycle shell/Python hooks are skipped by the Node-only adapter; external memory recall/writeback is not claimed. The sycophancy-correction skill file is absent; its MCP screen is available. Exact producer model identity is unavailable, so fresh-context artifact review must disclose unverified distinct-model independence. None of these adaptations marks deferred product certification passed.

No product files, configuration, dependency pins, services or immutable plugin caches were changed. F6 remains cancelled; excluded UAR files were not inspected. All acceptance scenarios remain proposed and unrun at this stage. Preserve candidates, artifacts, caches and rollback inputs.

## Analyze quality gates and unresolved review finding

Candidate schema validation passed for seven candidates, including primary named gap links for all three build recommendations. Seventeen local analysis links resolve, and the fifteen inspected supporting input digests were unchanged during artifact validation. Official documentation links were verified during the original bounded research session.

Fresh-context artifact review round1: PASS, zero critical / one warning about build-required traceability. Primary gap links were supplied. The first second-round packet accidentally omitted the narrative during candidate replacement; both invalid packet and resulting findings are retained under names ending in -invalid and excluded from completion evidence. The corrected second-round packet contains both full artifact bodies and fifteen source/receipt entries, with no cap truncation.

Final corrected round2: PASS, zero critical / one warning. See [findings](review/analyze/findings-round2.json). Its unresolved warning asks for more concrete dispositions for signing, installation, Intel/Windows and publication ownership against the third seeded goal. These remain explicit operator/Spec decision inputs; unsigned-local is a proposal, not a resolved wider release matrix. Carry this warning into Spec rather than infer approval from silence.

Both review findings screens scored 0.0; narrative screen scored 0.01785714365541935 with one low length advisory and no required correction. The reviewer supplied a concrete warning, so an empty checked-classes array is not being used as evidence for a finding-free report. Review independence remains cross_model_check=unverified-producer-unknown. Artifact review does not certify product code or current bundled operation.

The first schema attempt encountered missing ajv-formats. Installed Ajv plus an explicit generated ISO timestamp format validated the formal schema; no package was installed. [Validation receipt](evidence/analyze/artifact-validation.json) records that adaptation. No product/runtime gates ran. Analyze completion hands off recommendations and open decisions, not release readiness.

