# Harness task 03/9 — check disposition

2026-10-08, parent resumed at revision292. Read-only evidence reconciliation, not independent product review or task completion. Root owns builds, dependency restoration and canonical mutations. No competing command was launched.

## Decision

**Do not close 03/9 as fully verified current consumer/provider checks yet.** Retained selected Bossfang lint/build and runtime results are real and useful; their explicitly inventoried consumer files are unchanged. Two previously omitted dirty consumer paths prevent complete historical source equivalence, and the provider's execution/admission surfaces changed in the desktop child. A current exact-source application check cannot be inferred from older provider binaries or from the child's Boss-specific route.

This does not establish a failing consumer implementation. It identifies a verification/provenance gap, not a reason to repeat every passing historical scenario or to reopen D0. The next bounded check is a selected Bossfang harness integration receipt against the accepted current UAR provider artifact, with all72 known Bossfang consumer/gate paths and their actual compiler inputs captured before launch. Root must select which changed-provider behaviors remain uncovered; the existing four-case postlint entry is available but, by itself, does not establish all native/stream/recovery compatibility affected by the newer provider. No arbitrary full-suite requirement is added here.

## Contract and evidence

The coordinating task3.2 requires repository build/integration checks plus accepted checkpoint/platform limits. The repository child task3.2 explicitly says serialized scoped checks, an isolated target, and contributing the BAUAR delta against bac04cb6 to the independent parent04/10 review; final review completion belongs there, not to a duplicate child task. Sources: [parent tasks](../../../../../../openspec/changes/bauar-03-harness-delegation/tasks.md) and the repository child at /Users/gqadonis/.claude/worktrees/bauar-bossfang/workstreams/bauar/openspec/changes/bossfang-bauar-harness-delegation/tasks.md.

| Evidence | Observed outcome | Present applicability |
|---|---|---|
| [Selected clippy07](../bossfang-owned-clippy-07-manifest.json) | Actual exit0, six named owned libraries, API/kernel uar-driver features, warnings denied. | All69 listed consumer files still match their retained SHA256. Preserves this exact selected lint proof. |
| [Selected CLI02](../bossfang-selected-cli-build-02-manifest.json) | Actual exit0, debug darwin-arm64, telemetry/surreal-backend/uar-driver. Artifact858a852d426bdeea7c35fe7c1ce6622d9793739161d16fa09a8de727ac78a342. | Same69 source inventory. SKIP_DASHBOARD_BUILD=1; not a package, dashboard, signed installer or cross-platform result. |
| [H28](../bossfang-harness-runtime-28-acceptance.json) | Eighteen real host/kernel cases with six effect markers and36 actual model calls. | Retains source-inventory-projection-and-legacy-delivery-08.json,60 Bossfang files; do not relabel as postlint/current provider proof. |
| [Postlint01](../bossfang-postlint-runtime-01-acceptance.json) | Four real cases, one admission/effect, two model calls; exact refusals, checkpoint restart, parameter errors and connection/OpenAPI descriptors. | Source21 inventory includes70 Bossfang files. Its extra postlint gate source also hashes unchanged. Provider executable was a269e4078685400f9d10dba33a010945939afac668f367e5856da1a1ca27a454. This is not a run with child source17/provider artifacts. |
| [Child source17 metadata](../../../children/desktop-mcp-projection-acceptance/evidence/execute/final-source-manifest-17.json) | No Bossfang child edit;72 paths inventoried.14 UAR changed/new-to-baseline paths include orchestrator, manager, tool admission, native skills and reasoning mapping. | Metadata only was read for UAR; no provider file was inspected or hashed. Differences in ownership/admission/execution matter to current pair applicability. |

## Source equality actually measured

[Finite comparison](harness-check-disposition.json) records69/69 clippy-bound consumer files unchanged, the postlint gate source unchanged, and the two child17 gap paths unchanged since that child snapshot:72 explicitly named Bossfang files in total. No arbitrary repository traversal or whole-checkout certification was performed.

The gap paths are crates/librefang-llm-drivers/src/drivers/uar.rs and crates/librefang-llm-drivers/src/drivers/uar_run/http.rs. Source17 explicitly states they were dirty before its protected baseline but absent from earlier manifests; current hashes cannot reconstruct their compilation-time hashes. Do not silently add current hashes to historical manifests or erase this limitation.

H28 and postlint inventories also differ on20 changed/newly inventoried paths. Postlint four-case evidence covers the documented lint delta, not the entire H28 matrix. This distinction is already explicit in the receipt and remains valid.

## Required-check conflict to preserve

Bossfang AGENTS.md Process Discipline names workspace library checking, scoped Cargo tests, branding checking and applicable audits; the approved BAUAR child and final gate matrix select scoped real integration, named-library clippy and selected CLI compilation. The recorded matrix explicitly says the Python branding checker is unavailable under Node-only rules, with no port/install. No workspace-library or branding PASS is present among inspected finite Bossfang gate receipts. Treat this as a disclosed check-coverage/constraint disposition for the lead, not an invented failure, implicit waiver, or instruction to run Python/broad tests. The narrower approved gate contract can be reported as satisfied historically; it cannot be described as every repository check passing.

## Exact historical commands and next action

[inventory.md](inventory.md#existing-command-provenance--historical-not-execution-instructions) records exact clippy07, CLI02 and postlint01 command/cwd/artifact provenance. They are retained passing commands, not a rerun queue. The postlint entry is scripts/integration/bauar-postlint-gate.mjs using the actual Bossfang host test executable, actual UAR main executable and isolated UAR root. An applicable new run needs current emitted artifacts; pointing it to the old target/debug path and recording a new timestamp would not close the gap.

1. Lead accepts a current provider artifact/checkpoint and isolates which changed-provider behavior needs consumer coverage, coordinated with root's aggregate desktop retry.
2. Bind72 known consumer/gate paths and any actual additional compiler inputs before the selected build/check; preserve the two historical coverage gaps.
3. Run only the outstanding current-pair check(s) justified by that delta, with one build writer. Preserve H28 and postlint results rather than repeat them as bookkeeping.
4. Contribute this disposition and the BAUAR delta against bac04cb6 to parent04/10's review packet. Record Node-only branding limitation and actual platform profile. Driver decides task exit from the complete check contract; this document performs no task mutation.

No existing UAR C05, original shipping, remote deployment or release certification closes from these receipts. D0 remains excluded. Unsupported/unknown after UAR restart still requires reconciliation and never grants automatic replay.
