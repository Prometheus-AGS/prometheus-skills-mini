# Backend 2 — frozen production declarations and finite review scope

Phase: phase-bauar-release-acceptance. Change: bauar-acc-03-local-acceptance-evidence. Backend 2 / Spec 1.2. Source-only delivery, 2026-10-09. Canonical position restored at revision 472; root reports backend 1 ended at revision 470 and backend 2 begun at 472. This report does not end a task or declare the production barrier open.

## Delivered artifacts

| Relative path | Bytes | Lines | SHA256 |
| --- | ---: | ---: | --- |
| acceptance/candidate-inputs.json | 155573 | 2359 | 5abfa8785431174d2f46baca9388a2dcb71dd77f459d4aa84f7cae9bf2ae2166 |
| acceptance/review-paths.json | 104587 | 1979 | 40b997dc8643fcf93988add45e6429cd25cc007be28406c3bd01cf5bbe7e8669 |
| evidence/execute/production-recorded-01.json | 70263 | 1298 | a52cdcbbaf3b65e22d712b100d797826f9fbd796f2a581c054635740ea555fc2 |
| acceptance/lib/adapters.mjs | 12161 | 173 | 0758b78938402e246488e3c6a4ffd65be553a0f3590eae41f32f9e34bc7900ff |
| acceptance/lib/inputs.mjs | 8951 | 114 | 59e4545bcc612906871b6e759fcc2d2b2f516da52504412376bbaf8f6c9c4de6 |
| acceptance/config.schema.json | 13301 | 10 | 7126efc947d26f95d3bb0cf91f490a5c68d510bf184377eed5677d75961058d4 |

The three JSON data artifacts are finite manifests, not executable modules. Corrected code modules remain under 500 lines. Exact worker model variant/effort remain unknown in this reused worker; the earlier task's proposed assignment is not treated as current runtime identity.

candidate-inputs.json has 280 selected file references, 8 components and 14 stable scenario IDs. Components are desktop, harness, uar-regression, four actual package-validator invocations, and the future evidence-controls driver. Scenarios are D01–D04, H01, H02.harness, H02.exact-retry, H03, H04, E01.pristine/stale-source/modified-archive/public-mode, and E02. The owning execution task is 03/2.1; source and product scope are separately enumerated.

production-recorded-02.json is the final immutable declaration and is explicitly source-recorded-canonical-barrier-pending. It records actual known source/tool/config/review identities and retained predecessor package identity. It does not claim the retained package is the new acceptance package, invent emitted hosts, set future hashes to zeros, or self-certify backend 2 completion.

## Finite source and review scope

review-paths.json contains all 241 inherited eligible intake paths: UAR126, Boss43 and Bossfang72. Each was selected by the literal Plan list before file access and individually hashed. The excluded F6 basenames were rejected before access. No UAR broad scan, status or diff was run. Three exact git rev-parse HEAD operations returned:

- UAR: 84ca0ffff5da8fafc1e2e7f5585efc07a396b14e.
- Boss: 7a5bdb4b7c02e9f13875fc7f837815c03fe3dacd.
- Bossfang: 1d518936cb15b79d30bdd315510ff925613a0f4d.

The review bases remain the Plan's UAR a7cb972992d4f83db6585449ea81af0fe4a1c990, Boss 822ed9990bd7626bbf76b04eeae184739c0f0655, and Bossfang bac04cb6b2c144520e28234ad77f00d4cf0f5b23. Bossfang's inherited279 commits remain an uncertified baseline integration limitation.

Additions include Boss build/local-uar-source.json, the three new private-root source/documentation files, exact validator/tool/package input files and phase coordinator/schema modules. Review-paths/config self-binding is through the immutable production-recorded artifact; the review manifest does not recursively hash itself or the not-yet-written candidate config.

The planned mutable cursor test, three Boss gate helpers, Playwright config, new packaged test/launch helper and phase scenario drivers are separately listed for runtime-seal binding. Existing baseline hashes stay in the review manifest as baseline-only records. They are excluded from production selected file hashes. Later source readiness must append current scenario source identities without rewriting this baseline.

Format scope is only newly changed production/scenario/phase files. Boss's existing oxfmt --check is declared with actual availability/output pending; phase formatter availability remains unverified; the eventual exact cursor Rust change uses read-only rustfmt --check with skip_children=true. No formatter, cargo fmt, global lint or product review ran.

## Authorized bounded corrections during this freeze

Original backend1 delivery and its hashes remain preserved in dispatch/evidence-report.md. Root explicitly authorized these corrections under the existing requirements before the barrier:

1. adapters.mjs now requires the five exact documented kernel case names, exposes all18 actual harness cases to the configured mappings, and requires task+auxiliary+continuation+unknown model-request counts to equal realModelCalls. Original hash was 1811feb0caf86c746d95d34c207fdd1c61ddd9ed8e71a0b16bb6a8f82e47e90b; current hash is in the table.
2. inputs.mjs plus config.schema.json now scope component package identity through required packagePaths and host identity through actual sealed command argv. Source paths and scenario IDs were already scoped; compatibility intentionally does not use global config/seal hashes as the reusable identity. Original inputs hash was b5b0fa0edfcd7c720e316b992f1ab6366dc5b19996bd5b9170266af30d7b4f3b; original schema hash was 2fac353a35c5a6ddae66b801f4bea0f892afefe857309ba48527db9beee1b68a.

Desktop binds its app executable/asar/sidecar/marker. Harness binds only its sidecar/marker and exact two resolved hosts. Supporting Cargo and coordinator controls bind no desktop package. A change confined to the cursor scenario source therefore invalidates the supporting regression component, not a compatible desktop/harness PASS. Global source/package/seal identities remain admission and final-aggregate provenance.

No other backend1 production module changed. processes.mjs remains frozen at 9db8c0af6ae9182b0f62c6a1efe889b1ff71f3f0d4c3b27d7b5e3e856b20e179.

## Exact lead-owned barrier recipe after ending backend2

The current selected-source digest is:

78d5b1c67ed623e523680e2525aa9220f02235d3fedd78e916dc4db973d794e6

After the lead ends backend2 and obtains the actual readReconcileState snapshot, write the new immutable file:

evidence/execute/production-barrier-01.json

Required fields consumed by the coordinator are schemaVersion:1, phase:"phase-bauar-release-acceptance", sourceSha256 equal to the digest above, completedAt equal to an actual observed completion time, and tasks containing exactly one complete entry for each of:

- bauar-acc-01-private-packaged-desktop/1.1
- bauar-acc-02-current-harness-regression/1.1
- bauar-acc-02-current-harness-regression/1.2
- bauar-acc-03-local-acceptance-evidence/1.1
- bauar-acc-03-local-acceptance-evidence/1.2

Each task entry is {key:theExactKey,status:"complete"}. Preserve actual canonical revision/snapshot reference and backend-ID mapping in additional evidence fields if useful. Do not write this file until all five actual canonical results are complete. This worker deliberately left the file absent. The recorded declaration is a separate artifact and must not be overwritten or substituted as the completed barrier.

The digest recipe remains the backend1 report's canonical object-key ordering with array order preserved. selected is sourceFiles, gateFiles, manifests, profile, approvedPlan, commandContract in that exact order. Config, barrier and runtime-seal hashes are outside selected, avoiding a cycle.

## Future runtime binding and scenario readiness

The frozen runtime seal path is evidence/execute/attempts/runtime-seal-01.json. It remains absent. After actual packaging, host compilation/resolution and scenario authoring, the lead writes the actual $defs/seal record from config.schema.json with the frozen config SHA, actual barrier SHA, source/profile identity, packageFiles, hostFiles, scenarioSources/readiness, emitted command program digests and build receipts. No runtime seal should reuse old package identity without actual current-byte evidence.

Resolve only the existing literal command placeholders through seal.substitutions: resolved-api-host-executable, resolved-kernel-test-executable, controlled-copy-Resources and local-or-public. Each component's key is componentId:placeholder. Exact host paths come from matching compiler-artifact receipts, never newest-file selection.

The H02 cursor amendment is declared by exact future test name exact_admission_retry_preserves_original_run_and_rejects_changed_input in the unchanged five-target Cargo batch. Existing identity tests use their actual module-qualified names. All15 substantive named tests, including the new H02 test, must be observed; the outer no-op stdio helper is not counted as substantive coverage. The existing missing-H02 inventory disposition is preserved; a future readiness record must map the actual new source/name before runtime admission.

Future executable paths, approved but not created here:
- Boss tests/e2e/gates/bauarPackagedAcceptance.test.ts and support/bauarPackagedLaunch.ts, with the three existing gate helpers and Playwright config under desktop ownership.
- UAR tests/bauar_full_harness_cursor.rs, under the explicit H02 readiness amendment.
- acceptance/scenarios/evidence-controls.mjs, Node22/common component protocol, to exercise the actual completed coordinator's E02 negative inputs/receipts/process lifecycle after the barrier.
- acceptance/scenarios/package-controls.mjs if needed for E01 disposable fixture preparation under the approved minimal Git/copied inspectLocalUarRecord/archive checksum recipe. No scenario file was authored here.

All E01 runtime validator controls are identified by validatorControlId; the runtime seal supplies actual original/controlled file digests, argumentPath, expectedExit, source-bound refusal predicate and matching positiveComponentId. The four IDs are package-pristine, package-stale-source, package-modified-archive and package-public-mode. Negative controls must point to package-pristine. Their selected validator source paths/package binding match. Preparation must use privateRoot copies; original selected inputs are rehashed.

## Permitted artifact check and remaining work

One source-only inline Node22 data check validated candidate-inputs against the formal config schema vocabulary, the typed recorded declaration, 241 review entries, 8 components/14 scenarios, absent barrier/seal and exclusion of mutable scenario files from production selection. It did not import the coordinator or execute a gate. Named hashes and exact HEAD reads are artifact provenance, not runtime acceptance.

No compiler, syntax check, executable scenario authoring, package build, product launch, test, formatter, runtime acceptance, independent review, commit or canonical hook was run. No installed cache/profile/service was changed. Node tools used the absolute Node22 executable with login:false; there was no new process-list incident during this task.

The only selected delivery remains unsigned local darwin-arm64. Signing/notarization, installed operation and Intel/Windows are deferred; production remote receiver/IdP/custody excluded; publish/merge/release/shipping/cache promotion unauthorized. Operator release authority remains separate from source completion and future runtime/finalization verdicts.


## Final freeze after the approved Plan amendment

The current approved Plan hash is befdc718486d5e969c48f28be88854a538b277d7151bea99172b3cd8f337168f; coordinator-freeze-correction.json is c6b1d31fbc7087270dd7676cda64e783f22cafa5c9d5bfb51b12fc3606716c2f. The candidate config now binds both. Its final SHA256 is 74b3db8984b1234da94f7f5f5aac45409c2ead1a541db6416e811fe985cc0154. The final immutable declaration is evidence/execute/production-recorded-02.json, SHA256 33923605735c07e5551169e893dbbd8d3dd035bf1de6c556e958a3f3a65bf5f8. Its sourceSha256 is 78d5b1c67ed623e523680e2525aa9220f02235d3fedd78e916dc4db973d794e6, covering280 selected references.

The earlier artifact table preserves the pre-Plan-amendment candidate measurement and production-recorded-01.json. The final02 declaration explicitly supersedes01; neither immutable declaration was overwritten. review-paths.json remains byte-identical: its selfAndConfig provenance label names the initial01 recording, while final02 is authoritative for the amended frozen candidate config. The final selected refs and actual config/review hashes are all carried in02. The source-only schema check preceded this hash-only Plan-reference amendment; no executable coordinator validation occurred.
