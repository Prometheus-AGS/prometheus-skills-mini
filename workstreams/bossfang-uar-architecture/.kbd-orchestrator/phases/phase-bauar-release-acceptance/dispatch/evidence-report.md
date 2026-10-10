# Backend 1 source delivery — local acceptance evidence coordinator

Date: 2026-10-09. Phase: phase-bauar-release-acceptance. Change: bauar-acc-03-local-acceptance-evidence. Backend task 1 / Spec 1.1.

This is an authored-source delivery. No runtime PASS, task completion, release permission, or production barrier is claimed. The parent remains the only canonical task/hook owner.

## Ownership and execution identity

This worker authored the entry, records, inputs, environment, receipts, adapters, stages and two schemas. Its exact deployed model variant and reasoning effort are not exposed in this reused worker; both are recorded as unknown. The parent assigned processes.mjs to the desktop owner under the same backend task, reporting the selected route as gpt-6-astra/high. That module's source hash below matches the owner's delivery. No subagents were created by this worker, and no product or prior-phase source was edited.

The kbd-apply skill was read at /Users/gqadonis/.codex/skills/kbd-apply/SKILL.md; the parent exclusively owns canonical transitions, completion and checkbox edits. Expected sycophancy-correction skill remains absent. The current Execute position restored after compaction was revision 468.

## Completed production responsibilities

- Entry accepts exactly --config ABSOLUTE_PATH --stage integration|finalize and prints a finite JSON result. Fixed categories map observed expectation failures to exit 1 and unavailable/incomplete evidence to exit 2.
- inputs verifies explicitly selected regular files, excludes forbidden UAR basenames before filesystem access, verifies installed executable realpaths/digests, production declaration, immutable runtime seal, exact scenario ownership/coverage, actual command bindings and scenario readiness. No repository-wide UAR traversal exists.
- records provides source hashing, canonical-object digest, finite schema validation and exclusive immutable writes. The local validator implements the vocabulary used by the two supplied draft-2020-12 schemas; it is not a general JSON Schema library.
- environment constructs a new explicit map without copying process.env or changing coordinator HOME/CODEX_HOME. Each attempt receives fresh HOME, CODEX_HOME, XDG, TMP, queue, plugin, store and app directories. THE_BOSS_PROFILE_ROOT names the existing private app directory; THE_BOSS_ACCEPTANCE_ROOT is also supplied as suite scratch. Only configured build-class tool/cache paths can supply CARGO_HOME, RUSTUP_HOME and CARGO_TARGET_DIR. Generated fixture credentials use only declared BAUAR_FIXTURE_* keys and never enter receipts.
- processes owns a POSIX process group, drains bounded transient lines, observes actual exit and group disappearance, performs owned 10-second graceful then bounded forced cleanup, and reports unknown cleanup. Only flat booleans/counts reach observations. See dispatch/processes-report.md for its author's scope and limitations.
- stages serializes components and target writers, writes start/PID/execution journals, retains all attempts, and reuses only exact compatible PASS scopes. An unfinished journal or uncertain process result blocks reconciliation; it does not resubmit an original job. A completed failed or invalidated scope may run with a new private fixture. A stale integration lock requires explicit reconciliation; the coordinator never guesses that its owner is dead.
- finalize has no runOwned call path. It rehashes source-bound component, formatting and cumulative review evidence and writes only a fresh aggregate record. Unverified review independence remains BLOCKED unless a new source-bound operator disposition explicitly waives independence after an actual completed product review. WAIVED remains visible and is never labeled an executed review PASS.

## Frozen component protocol

The child reads BAUAR_COMPONENT_BINDING_PATH and writes BAUAR_COMPONENT_RECEIPT_PATH. Its component receipt must match receipt.schema.json $defs/component. Binding fields are executionKey, componentId, bindingSha256, configSha256, sourceSha256, packageSha256, profileSha256, scenarioSha256 and runtimeSealSha256. Scenario records contain stable id/ownerTaskKey, finite observations, actual nonzero executedCount for PASS, paired negative status/count and selected evidence file references. A PASS requires complete inventory and reconciled cleanup with zero live owned resources. The process supervisor independently verifies group cleanup after child exit.

No raw stdout/stderr is persisted by the supervisor. The adapter closure may retain a private receipt path or parsed gate record transiently; outputPolicy.result returns only finite counts/booleans. output_policy_failed is BLOCKED even when cleanup itself is known.

## Existing gate adapters

Harness: requires one actual final stdout record with passed=true and executedCases=18, final process exit 0 after the gate's finally cleanup, and absent owned PGID. It reads the actual source-bound receipt and requires all 13 known completed cases, kernel receipt with 5 cases, positive realModelCalls, at least 3 effects and unknown model-request count zero. It reports admission/peer assertion completion only as gateAssertionsCompleted, an assertion-backed runtime observation; it does not invent absent persisted admission/peer fields. Original case names are used only for configured finite scenario mappings.

Cargo: requires every explicitly declared target header, one nonzero passing summary per target, zero failed/ignored/measured/filtered tests, and every exact declared negative test name observed as ok. The future approved H02 name is exact_admission_retry_preserves_original_run_and_rejects_changed_input. Merely declaring this name cannot pass: actual output and post-barrier scenario readiness must exist. The unchanged 18-case harness does not by itself close the observed H02 gap.

Package validator: generic production invocation adapter only; no corruption scenario was authored here. It binds the actual validator argument root to the selected control file, verifies original/control hashes before and after invocation, requires a source-bound exact finite refusal predicate, and pairs negative invocation with an actual matching pristine component PASS. Pristine exit 0 alone lacks meaning unless original/control equality and declared actual invocation hold. Negative exit alone cannot PASS. Stale-source/modified-archive require differing actual hashes; public-mode uses an explicitly declared control and exact failure predicate. The future E01 scenario author must preserve the approved disposable Git/source-marker/archive checksum recipe and generate these inputs after the production barrier.

## Config, declaration and runtime seal without a cycle

Backend 2 remains separate and is not delivered here. It can predeclare runtimeSealPath and production.declarationPath without their future hashes. It declares stable component/scenario IDs, future scenario source paths, the exact future Cargo negative name, and validatorControlId placeholders.

sourceSha256 is digest(selected), where selected is sourceFiles followed by gateFiles, manifests, profile, approvedPlan and commandContract in that order. digest recursively sorts object keys, preserves array order and hashes compact JSON UTF-8. File SHA256 values hash exact bytes. The configuration itself, production declaration and runtime seal must not appear in selected; otherwise their binding would cycle.

The parent's future production declaration has schemaVersion 1, phase, sourceSha256, completedAt, and tasks entries with key/status complete for the five exact required task keys. It must reflect actual canonical reconciliation after backend 2 ends, not this worker's assertion.

After actual packaging and executable scenario readiness, the runtime seal conforms to config.schema.json $defs/seal. It binds configSha256, productionSha256, sourceSha256, profileSha256, actual packageFiles/hostFiles/scenarioSources, scenarioReadiness, productionBuildReceipts, emitted/resolved commands, executable digests and Node versions. scenarioReadiness contains schemaVersion 1, ready=true, sourceSha256=digest(scenarioSources), and declaredAt after production completion. These are future actual artifacts, not authored placeholder receipts.

validatorControlId resolves uniquely through seal.validatorControls. Each actual control includes id, kind, original and controlled file references, argumentPath, expectedExit, and—when negative—a source-defined failurePredicate plus positiveComponentId (or an explicit pre-existing positiveReceipt reference). positiveComponentId resolves a compatible earlier pristine component receipt at runtime, avoiding a future receipt hash in frozen configuration. Positive and negative controls must select the same sourcePaths so their source digest and original/package/profile binding match. Controlled copies reside under privateRoot; the sealed command must actually contain argumentPath.

Components with adapters use scenarioCases/negativeCases to map actual finite case/test/control names to configured scenario IDs. requiredObservations names must have a true or positive actual value; missing observations remain BLOCKED. Supporting Cargo requires explicit configured CARGO_HOME/RUSTUP_HOME/CARGO_TARGET_DIR and a build-class environment. Do not add absent H02 observations to harness receipts.

## Actual source manifest

| Relative path | Lines | Bytes | SHA256 |
| --- | ---: | ---: | --- |
| acceptance/local-release-acceptance.mjs | 19 | 947 | 52488bad56b1eba67e9513e15313b38917db5faabdbafeba940d503713d190e6 |
| acceptance/lib/records.mjs | 118 | 6711 | 68621714661d8c7923b05ef3c021bc3998b4ca03b2c4fde4dbeaccad32c9dbd1 |
| acceptance/lib/inputs.mjs | 111 | 8678 | b5b0fa0edfcd7c720e316b992f1ab6366dc5b19996bd5b9170266af30d7b4f3b |
| acceptance/lib/environment.mjs | 41 | 2759 | 2e869ad195f64b66a3fb6f3d36a91bcc0f0774596576b41cb03ee4e76cf5bda5 |
| acceptance/lib/receipts.mjs | 70 | 4487 | 787b037ef00628b1176638746bdaf5835f5cde125e0655eae7ac72bdfb66eff2 |
| acceptance/lib/adapters.mjs | 167 | 11512 | 1811feb0caf86c746d95d34c207fdd1c61ddd9ed8e71a0b16bb6a8f82e47e90b |
| acceptance/lib/stages.mjs | 200 | 12952 | 9dc346c3d6455eda196e549b753a7a2a03001a46ee3129e60ca6e752089b8ab2 |
| acceptance/lib/processes.mjs | 194 | 7304 | 9db8c0af6ae9182b0f62c6a1efe889b1ff71f3f0d4c3b27d7b5e3e856b20e179 |
| acceptance/config.schema.json | 10 | 13181 | 2fac353a35c5a6ddae66b801f4bea0f892afefe857309ba48527db9beee1b68a |
| acceptance/receipt.schema.json | 7 | 8640 | fe231173f7d8be269f969d424e2aa9f7e8f8c019d9c530fc73ea6b56fd6c984b |

All code modules are under 500 lines. Hashing and byte/line inventory above were performed on these exact phase files only. These measurements do not validate syntax or behavior.

## Unrun work and limits

No coordinator import, syntax check, compiler, test, gate, package build, product review or scenario execution was run. Backend 2 candidate-inputs/review-paths/freeze remain pending, as do the actual canonical production barrier, package and host emissions, scenario adaptation/readiness, runtime integration and independent completed-product review. The five production task states are not advanced here.

Unsigned local darwin-arm64 is the only selected scope. Signing/notarization, installed operation and other platforms remain deferred; remote receiver/IdP/custody excluded; publication, merge, release, shipping/C05 and cache promotion unauthorized. The coordinator does not certify a universal third-party OS/keychain sandbox. It observes owned process-group cleanup and requires the packaged desktop scenarios to provide actual private-root/live-root observations.

Actual trust boundaries hardened under A-3 are configuration/evidence provenance, runtime command/env admission, child output-to-receipt sanitization, owned process lifecycle, and reuse/finalization authority. Guards trace to those boundaries or the explicit missing/stale/zero-count/interrupted scenarios in E01–E03.

## Authoring incident (not acceptance evidence)

Two stdin-fed schema-authoring commands stalled before writing; one used bare node and one an absolute Node22 invocation. The precise shell/stdin cause was not established. Only positively identified owned authoring processes were stopped. Subsequent authoring used the absolute Node22 executable with login:false and an argument-based script.

One diagnostic process listing unexpectedly included unrelated process title arguments in tool output. They were not reused or copied into files/reports. Subsequent ownership selection was in-memory with count/PID-only output. No unrelated process was stopped. This incident establishes no acceptance result and does not authorize broader process inspection.

No source edits outside the assigned phase paths, dependency changes, installs, shared services, live-profile changes, commits or canonical hook calls were made by this worker.

