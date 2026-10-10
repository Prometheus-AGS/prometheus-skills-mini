# Finite current-source harness scenario inventory

Phase phase-bauar-release-acceptance; change bauar-acc-02-current-harness-regression; backend2 / Spec1.2. Source inventory only, recorded 2026-10-09T21:45:32.529Z. No runtime PASS, product build/test/review or executable authoring performed.

Bossfang HEAD 1d518936cb15b79d30bdd315510ff925613a0f4d; UAR HEAD 84ca0ffff5da8fafc1e2e7f5585efc07a396b14e. Prior task1 input declaration SHA256 5e70a9665828e8a5e59c77dd7cbd04a78141ce1d8d4c4708152fea779290c2ba; corrected current declaration SHA256 1865127862e60aa20e9ee52802fa61ad0b43fefaa24ec2315740bdd20b7de64e. Task1 sources/gate imports/host compiler commands remain authoritative; exact package/test compiler-artifact resolution is pending. This inventory adds finite eligible test/helper/fixture hashes below, without F6 access or broad traversal.

## H01/H02: all 18 counted cases

Source abbreviations: gate = /Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-gate.mjs; native = /Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-native.mjs; kernel = /Users/gqadonis/.claude/worktrees/bauar-release-bossfang/crates/librefang-kernel/tests/bauar_harness_delegation.rs. Line locations are static aids, not runtime evidence. The first13 entries are primary completed markers; last5 are nested kernel cases. Cancellation3 surfaces, partial-terminal and ephemeral2 calls are subcases and do not increase the counted18.

| Count | Exact case name | Behavior | Source | Actual asserted observable / paired control |
| --- | --- | --- | --- | --- |
| 1 | registered-owner-and-explicit-unsupported | H01 | gate:149–164 | Missing/master owner credentials 401/403; steer/durable recovery/delegated-user/native configuration 422; provider admission count 0. |
| 2 | normal-exact-approval-and-reconciliation | H01/H02 | gate:166–297 (normal) | Original task/run/epoch retained; effect0 before approval; wrong/missing ID/stale revision refused with unchanged projection; replay admission baseline+1; exact approval effect1; duplicate409 remains effect1; terminal cursor matches provider; REST/RPC/history/observed nonzero usage parity; board reconciliation idempotent; sealed reads do not reopen provider. |
| 3 | streaming-and-outcome-commit-crash | H01/H02 | gate:166–297 (streaming) | Same controls as normal; SIGKILL host restart retains fully committed history. Separate partial-terminal subcase has terminalAt but cursor<provider cursor; after restart reconciliation_required, board in_progress, effect1, admissions baseline+1. |
| 4 | exact-denial-no-effect | H01 | gate:300–309 | Exact denied approval settles actual provider terminal; BAUAR_DENIED effect0. No particular denied terminal executionState is asserted. |
| 5 | three-surface-cancellation-exact-caller-revision | H02 | gate:311–342 | direct/REST/RPC each reject missing/stale revision; exact revision 200/202; actual terminal cancelled, cancellation.requested/terminal true; three respective effects0. |
| 6 | lost-admission-and-decision-response-no-reenactment | H02 | gate:345–360 | Real proxy losses observed; admission/approval effectState effect_unconfirmed; retry resolves original task; actual completed terminal; BAUAR_LOST effect1; admissions baseline+1. |
| 7 | observation-reconnect-original-run | H02 | gate:362–381 | Interrupt actual active provider stream; effect0; retained runId equals original; exact approval completes with effect1 and unchanged admission count. |
| 8 | provider-admission-before-host-capture-crash | H02 | gate:383–396 | Provider accepted before SIGKILL capture loss; restarted host reports outcome_unknown/recovery_unsupported/reconciliation_required; admission baseline+1 and effect0. |
| 9 | durable-intent-crash-before-a2a | H02 | gate:398–407 | selected_intent_committed before SIGKILL; restarted admission503 selected_attempt_outcome_unknown; selected intent retained; unchanged admissions and effect0. This is intent persistence, not durable execution recovery. |
| 10 | actual-pending-and-stale-sweep-preserves-selected-intent | H01 | native:1–152 | Actual pending native model call and stale reset retry_count>0/status pending; pending native task-class call exactly1, selected markers exactly1, both effects0; selected intent preserved; admissions native baseline+1; physical request unknown0. |
| 11 | enabled-wake-native-and-selected-cas-winners | H01 | native:1–157 | Native wake owns native intent; selected attempt cannot be natively mutated/retried/deleted (409 original control required); selected exact approval yields effect1; admissions native baseline+1. |
| 12 | provider-epoch-restart-remains-unknown | H02 | gate:414–426 | Restart actual UAR; unsupported/unknown/reconciliation required, executionState not completed; retry retains original uarTaskId; admissions unchanged and BAUAR_EPOCH effect0. |
| 13 | native-legacy-and-ephemeral-kernel-contract | H01 | gate:428–454 | Kernel libtest exit0, receipt.executedCases5/cases.length5; no additional provider admission/effect; five native markers observed as actual model calls; peer.failures.length0. |
| 14 | native-normal | H01 | kernel:91–97 | ResolvedDispatch::Native outcome native and real response BAUAR_NATIVE_NORMAL done. |
| 15 | native-stream | H01 | kernel:99–113 | Native streaming outcome; event_count>0 and real task response BAUAR_NATIVE_STREAM done. |
| 16 | native-ephemeral-entrypoints | H01 | kernel:115–125 | Both native send ephemeral and spawned ephemeral worker return respective actual model marker responses. |
| 17 | legacy-uar-model-provider | H01 | kernel:127–138 | Legacy provider name uar with Native dispatch remains Native; BAUAR_LEGACY_MODEL actual response. |
| 18 | selected-ephemeral-refuses-before-reservation | H01 | kernel:140–178 | Both selected ephemeral APIs return EphemeralUnsupported; attempt count unchanged, intent Unclaimed, selected task absent from stored UAR attempts. |

## H03/H04: exact supporting batch

Program /Users/gqadonis/.cargo/bin/cargo; cwd /Users/gqadonis/.claude/worktrees/bauar-release-uar; argv (literal Plan):

```json
["test","--locked","--features","server-full,test-probes","--test","bauar_identity_boundary","--test","bauar_resource_grants","--test","bauar_stdio_boundary","--test","bauar_secret_projection","--test","bauar_full_harness_cursor","--","--test-threads=1"]
```

CARGO_TARGET_DIR /Users/gqadonis/.claude/worktrees/bauar-release-uar/target; CARGO_BUILD_JOBS2; RUST_MIN_STACK16777216; UAR pinned nightly toolchain from harness-inputs. Features server-full,test-probes; supporting debug/test profile only. Each target must independently report >0 executed tests and zero failed/ignored selected substantive scenarios. A final overall exit0 or a cfg-disabled target with0 tests is incomplete. Exact expected source names are below; future bounded readiness amendments must be separately source-bound.

| Target | Behavior / existing substantive assertions | Expected current source test names |
| --- | --- | --- |
| bauar_identity_boundary | H03: actual standalone HTTP router admits signed mapped configured authority; wrong/missing issuer/audience/expiry/nbf/tenant/sub/workspace or wrong signing algorithm denies before model; API key issue/direct/exchange/revoke bounds TTL/roles and owner/tenant/admin-kind; synthetic JWKS rotation rejects old signature, serializes refresh, honors cooldown/hard-age/failure/recovery and sanitizes diagnostics. Positive model/receiver controls accompany denied authority. | http_key_issue_direct_exchange_revoke_preserve_identity_roles_and_bounded_ttl; key_metadata_and_mutation_require_owner_tenant_and_exact_issuer_admin_kind; standalone_host_grant_requires_mapped_issuer_credential_and_retains_scope_attenuation; explicit_local_startup_validates_signed_registered_claims_before_run_admission; incomplete_remote_policy_is_rejected_at_actual_startup; remote_jwks_router_requires_tenant_and_mapping_for_bearer_and_direct_key; real_jwks_rotation_cooldown_failed_refresh_hard_age_and_recovery; remote_jwks_header_and_body_delay_share_the_total_verifier_budget |
| bauar_resource_grants | H03: bad receiver credential401 effect0 then valid credential effect1; three runs each produce exactly one independently labeled/session-scoped effect (aggregate4 incl receiver control); expired/insufficient-scope/unregistered destination deny; foreign-owner/unchanged revision/wider scope/alternate destination renewal deny without new effect; new-run renewal effect5/new session; expired-at-effect/revoked/policy-denied calls preserve effect count5; shipped mcp preset empty. | grants_pin_owner_run_destination_revision_lease_and_action |
| bauar_stdio_boundary | H04: captured declared environment only, undeclared/helper/HOME absent; no inherited stdin; lazy captured reconnect and effect once; cancellation during initialize/call causes kill/reap, no new heartbeat, no retry; raw stderr canary absent stdout/stderr; unavailable required sandbox denied before spawn; configured constructor works. Parent wrapper must execute. | child_host_helper; stdio_boundary_captures_environment_owns_children_and_discards_raw_stderr |
| bauar_secret_projection | H04: real provider/MCP effect exactly1; executable echo retains secret/control while ordinary streams/model messages/retained strings/stderr omit canary variants; same-owner second turn retains first user/world state, does not replay effect; executable secret artifact rejects before model/effect. Metadata test separately validates explicit version/retained-byte hash/legacy absent projection. | actual_provider_and_mcp_copies_hide_variants_without_changing_execution; projected_receipt_metadata_is_explicit_and_hashes_retained_bytes |
| bauar_full_harness_cursor | H04/H02: actual production router/executor with real HTTP model emits RuntimeStep; contiguous full-harness ids match actual history, filtered steps become uar.cursor, Last-Event-ID reconnect yields identical original suffix starting cursor+1; ordinary AG-UI suppresses steps; real retained-history overflow emits one agui.error frame id2/code STREAM_GAP/request_id original run. | filtered_runtime_steps_keep_original_cursors_and_reconnect_without_gaps; lost_retained_history_remains_an_explicit_stream_gap |

Identity target has8 substantive tests, resource1, stdio2 top-level (one is a helper), secret2, cursor2. Do not count stdio child_host_helper's outer no-op return as coverage: when HELPER absent it returns immediately. The substantive wrapper launches the same test binary --exact child_host_helper --nocapture with fixture environment, then verifies child exit and receiver receipts.

## Binary, fixture and credential boundaries

Identity fixture invokes launch_standalone → CARGO_BIN_EXE_universal-agent-runtime. sidecar_process also supports CARGO_BIN_EXE_uar-sidecar; actual source selection must be recorded per target rather than claiming every supporting target uses the sidecar. These supporting-profile binaries never replace the packaged server-full sidecar used by H01/H02.

Stdio source hardcodes /opt/homebrew/opt/node@24/bin/node: exists, measured --version v24.21.0, SHA256 c7772c6a80072b2696ab9f5036229cdaf280b993e9a819171d7efd50a7ad99f8. This is an additional actual prerequisite, distinct from H01/H02 Node v24.11.1; no runtime or dependency was changed. Receiver source is /Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/fixtures/bauar_mcp_stdio.mjs.

Sidecar helper Workspace uses unique tempfile root containing home/work/data/logs and embedded surrealkv data. spawn clears environment, supplies fixture HOME/skills, optional TMPDIR and explicit synthetic fixture credentials; no live profile or shared service takeover. Stdio wrapper uses a unique tempfile root with snapshot/initializing/calling/configured/sandbox receipt subdirectories and env_clear. Actual paths/lifetime/cleanup must be observed at execution; existing tempfile helpers may delete fixture workspaces, so do not promise every internal receipt remains available after exit. Capture required bounded sanitized outcomes during the actual run; retain coordinator receipts and source inputs.

Cursor target is an in-process production router with fixture Extension(UserContext), in-memory SessionStore/catalog and a real loopback HTTP model. It proves router/executor/SSE cursor behavior; it does not start a sidecar, exercise authentication middleware, or certify persisted restart recovery. Identity/JWKS/resource peers use synthetic configured credentials and real loopback HTTP; no external production IdP/custody/receiver, caller-JWT-forwarding, automatic cron/deferred UAR selection, OS tenant sandbox, or durable replay claim. Shipped MCP defaults stay empty.

## Gate output contract and coordinator adjudication

Run literal harness argv from harness-inputs after sealing both host binaries and current package. Gate Node asserts major24. Final stdout contains JSON {passed:true, executedCases:18, receipt:<unique-root>/receipt.json}. The coordinator must require process exit0 after finally cleanup, not accept this pre-cleanup printed marker alone.

The main receipt has schemaVersion1; completed exact13 names above without duplicates; executedCases18; effects actual fixed fixture labels; realModelCalls>0; modelRequestClasses {task,auxiliary,continuation,unknown} with unknown0 and sum==realModelCalls; primaryAssigneeWake=false, primaryBackgroundSweep=false, raceAssigneeWake=true, raceTaskBoardSweep=true; limitation string. Require exact13 name membership plus18 count, not only length. The nested <unique-root>/kernel/receipt.json has schemaVersion1, executedCases5, cases exact5 names above, nativeAgent/legacyAgent/providerInstance.

Assertion-backed observations that are NOT final emitted fields: kernel exit0, peer.failures.length0, all local original-admission before/after counters, all effect per-case baselines, correlation/terminal/recovery/cancellation fields, usage/history parity, sealed provider-read counter. With unchanged source digest and actual successful execution, the gate has exercised these assertions; the coordinator may cite that source-bound assertion coverage. Do not invent final receipt fields for peerFailures/admissionCount/recoveryState or claim raw snapshots were persisted. effects array independently permits fixed-label count reconciliation: NORMAL/STREAM/PARTIAL_TERMINAL/LOST/RECONNECT/SELECTED_RACE each1; denied/cancel/capture/intent/epoch/native labels each0.

Stderr structured records include harnessCompletedCase/completedCaseCount, boardReconciliationCheckpoint and nativePhysicalClassCounts. On failure harnessFailureCheckpoint reports fixed stage, cancellationSurface/cancellationStep, lastCompletedCase/completedCaseCount and classified owned child status; kernel-stage checkpoint may be emitted. These are diagnostics, not synthetic outcomes. Avoid persisting unrestricted assertion output or fixture credential/request bytes.

Successful terminal receipt and stdout are written BEFORE finally stops kernel/host/provider and closes proxy/peer. Existing gate has no persisted cleanup-success field; coordinator must record real exit/signal/owned-child supervision and actual cleanup outcome separately. Five Cargo targets each need their own named libtest summary and substantive names, profile/binary/source identity and actual exit/cleanup; no blanket all-target PASS.

## Coverage status and bounded readiness amendment

Runtime unavailable/pending: missing exact API/kernel executables/hashes, post-production current package seal, actual H01–H04 executions/counts/cleanups. These do not mean source assertions are absent.

BLOCKED source assertion: verification H02 requires changed exact-retry payload conflicts. Existing Boss job replay deliberately changes streaming yet reuses its original attempt; it is not a changed provider admission-digest test. Proxy can classify admission_digest_conflict, but no selected scenario invokes a same-admission-ID changed-payload retry and asserts409. No current PASS may cover this control by title alone.

Concrete bounded proposal, reserved for executable scenario readiness after the complete production barrier: amend ONLY /Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_full_harness_cursor.rs. Reuse its Fixture.request production /api/uar/full-harness/v1/tasks route and real model collaborator; preserve one explicit complete admission payload/admission_id. Admit original, settle original run, retry identical payload and assert same original task/run identity; retry that same admission_id with input changed and assert HTTP409 plus exact admission_digest_conflict. Add an actual model request counter in this file's existing loopback model fixture and assert both retries add0 model calls; retain original run/history. This remains within the already selected cursor target/server-full,test-probes batch, introduces no product/auth redesign and touches no F6 file. Proposal only: no test source authored here.

Exact300s JWKS equality is explicitly unexecuted in existing source; the selected target tests hard-age at301s. No expanded equality claim. Resource renewal proves new-run isolation and rejected old revision extension, not arbitrary external credential-store/custody guarantees.

## Finite additional source identity

| Eligible exact path under UAR root | SHA256 |
| --- | --- |
| tests/bauar_identity_boundary.rs | 4ed982bf76ffc80625622f89e77ce4db63cc78bed107a22913f3c47d66fd18f3 |
| tests/bauar_resource_grants.rs | dbbf3d35f9f0a299aa7dc364d379dff7aaa82a222c71c4ac35a00c40e2cd46ad |
| tests/bauar_stdio_boundary.rs | 9e7edefe5f2f30ec84e0e073e2be29257c4b7a31964d2c85fa53e869a4332dc2 |
| tests/bauar_secret_projection.rs | a4b3ec9761fddb35ccaa14946a8964bb6ce9512a3d30ad983a65d166bcf1ef86 |
| tests/bauar_full_harness_cursor.rs | de354385c0f3ac88bf5fd095373d4c9186df09068310e95dacb69bc0535e6bc8 |
| tests/bauar_identity_boundary/key_authority.rs | 38fc5f5a2521882bb410d13c340d26574e7beebdf3fe8e76bf55e6e6dc0644c4 |
| tests/bauar_identity_boundary/local_admission.rs | 983166f349dffebaf9e0fc086e1862c3c59ffb216a8beb1c309820bd30534802 |
| tests/bauar_identity_boundary/remote_jwks.rs | fba40deae93b28254e4b5eb98c9d16834dfc73f12ca6ba052025e0863951c352 |
| tests/support/sidecar_process.rs | 335894aa5fe8ea49183002df77ba2f6dcb04c2df7b04fc037c845abb947d2dbe |
| tests/support/bauar_identity_peer.rs | 0bacaa617b09e65114792e2c2921514990ee71c48a0fe310727db04a1293b384 |
| tests/support/bauar_resource_peer.rs | c5326d41d82ce9652286ca5f24b411cef62436226f717c0bd56e8ed50384a71b |
| tests/support/bauar_secret_provider.rs | 525af8bdba51c8310f5756e30fa15f3cf059d8a066981435cf48eb82b27f24a6 |
| tests/support/bauar_secret_harness.rs | f4ba448932721a141e1ee06769fea9daec645a6932b87fa9bdd56bebf3eabf66 |
| tests/integration/live/stub_llm.rs | de9b969b595cb2d902f4710642417669833f002eccf44230771a74a92bcfe69b |
| tests/fixtures/bauar_mcp_stdio.mjs | cf4564582ddd42b7756863ae9f623994004dca64874f7837d2d4a6c19f0ef704 |
