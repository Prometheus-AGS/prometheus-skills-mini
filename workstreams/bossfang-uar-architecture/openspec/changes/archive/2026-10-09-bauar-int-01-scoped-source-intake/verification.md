# Verification contract — scoped source intake

Apply the installed KBD production-acceptance template. Task IDs below are stable labels in tasks.md; OpenSpec's backend ordinal IDs are mapped by its apply instructions, not guessed.

## Behavior: Complete isolated intake of the coordinated source set

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-integration-2026-10-09 / bauar-int-01-scoped-source-intake / tasks 1.1–1.5 |
| Source identity | Bound241-path inventory; exact UAR/Boss/Bossfang baseline and candidate commits from source-intake.json |
| Production entry point | Real Git candidate checkpoint construction and linked source-intake handoff consumed by the existing sidecar/local Boss packaging entry points |
| Real collaborators | The actual three repositories, Git object stores/indexes/worktrees, isolated candidate commits and source/payload receipts |
| Boundary exercised | Repository filesystem and Git checkpoint boundary; explicitly selected paths only |
| Observable result | All selected deltas and94 additions are in candidates; baseline ancestry/target-only work and paired contracts are inspectable; source/primary state preserved |
| Negative control | A changed selected input in a disposable source copy must require rebind/reconciliation; removing one selected addition must make the completeness check fail, with no candidate success claim |
| Isolation | Disposable clone/copy roots and ownership as declared in the shared final gate; no primary/source mutation |
| Prerequisites | Approved Plan/candidate refs, completed source/pin implementation and actual generated delivery receipt; Git and Node 22 available |
| Final local gate | The exact shared argv contract below; no per-task tests |
| Evidence | Pending local-release-intake.json with scenario labels and actual baseline/commit/hash results |
| Limitations | Content/ancestry checks establish intake only; they do not establish runtime approvals, execution or public release acceptance |

## Scenario matrix

| Requirement/scenario | Owner tasks | Positive observation | Real negative control / disposition |
| --- | --- | --- | --- |
| Complete scoped source checkpoints: modifications/additions/deletions/modes |1.1–1.4 | Exact inventory and committed candidates agree | Remove a selected addition from disposable candidate; reject complete-intake claim |
| Input changed after binding |1.1 | Changed path is rebound explicitly before candidate promotion | Alter a bound selected source copy; old binding cannot authorize overwrite |
| Explicit Bossfang baseline |1.3 | bac04 ancestry and279 inherited commits disclosed separately | Compare against old main 16beef0; a receipt describing the newer candidate as an old main-only backport is rejected |
| Protected source/primary checkouts |1.2–1.5 | Scoped hashes/index/ref metadata unchanged; candidate refs recoverable | Any changed protected selected state remains a failed intake result; never reset it to manufacture a pass |
| Coordinated compatibility set |1.2–1.5 | Owned exact-approval producer/consumer and full-harness files bound as one set | An omitted caller/source checkpoint prevents a compatible-set claim; runtime semantics remain pending until actual bundled operation |
| Honest completion status |1.5 | Implementation, deferred checks and publication separately represented | A deferred check labeled PASS or shipping/C05 completion without its own evidence is rejected |

## Behavior: Runtime preservation on the eventual integrated candidate

| Field | Required declaration |
| --- | --- |
| Canonical identity | Same phase/change; task 1.5 preserves existing requirements; runtime acceptance is downstream/deferred |
| Source identity | Final integrated checkpoints and local bundle from change02, not the old external override |
| Production entry point | Generated Boss application's managed-UAR integration check and exact approval operation; actual Bossfang UAR-harness job submission/observation/cancellation |
| Real collaborators | Packaged Boss supervisor/IPC, bundled UAR HTTP/SSE execution, Bossfang client/API and private attempt/approval stores; controlled real-process tool/provider peers if needed |
| Boundary exercised | Actual process/HTTP/SSE execution and approval/effect boundary under the preserved production contract |
| Observable result | One authoritative UAR loop; exact approval reaches its invocation; reconnect observes the same execution; restart produces unsupported/unknown without resubmission |
| Negative control | Missing/stale approval identity or revision cannot authorize the next invocation; disconnected observation cannot create a new run; cancelled attempt cannot be revived |
| Isolation | Same final gate scratch roots; synthetic controlled peers/private stores only; no external receiver or F6 operations |
| Prerequisites | Complete actual bundle and Bossfang source; local provider/tool controls available; no requirement to select a production remote IdP/server |
| Final local gate | Shared planned runner below, using shipped entry points; author only at the completed-delivery acceptance boundary |
| Evidence | Pending real runtime trace with exact run/invocation/approval/epoch/cursor IDs and effect count; secrets excluded |
| Limitations | This is retained-contract acceptance, not a new recovery/remote capability; unavailable controls make that acceptance BLOCKED and do not retrospectively erase implementation intake |

## Deferred final acceptance boundary

Status: NOT RUN; operator-deferred. These are acceptance requirements for a later completed-delivery run, not executable tests authored during Spec and not implementation-blocking task additions. The proposed Node runner `acceptance/local-release-intake.mjs` does not exist yet. Author it only after both changes' coherent production wiring is complete and when the deferred acceptance work is taken up. Its full production path must use real Git candidates, the generated Boss app, its managed UAR and private stores, not a replacement mock.

Exact planned final gate (argv contract, Node 22; roots come from the actual linked delivery receipt):

```json
{
  "program": "/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node",
  "args": [
    "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-integration-2026-10-09/acceptance/local-release-intake.mjs",
    "--receipt",
    "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-integration-2026-10-09/evidence/execute/local-delivery.json"
  ],
  "cwd": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture"
}
```

This one runner covers the scenario matrix from both changes. Its per-scenario receipts must distinguish source-intake checks, actual packaged runtime operations and intentionally blocked/deferred controls. A missing tool/service/isolation prerequisite means BLOCKED acceptance, never PASS. Exit 2 is BLOCKED. Exit 0 counts only for the declared positive result and negative control actually observed. Do not run F6, broad regression, global formatting or public release checks through this batch.

Isolation: Plan-assigned candidate roots are the production inputs; negative controls use only disposable clones/copies beneath an owner-identified scratch root recorded in the receipt. Launch Boss with a private Electron user-data profile, UAR embedded data roots and an unused loopback port chosen by its existing supervisor. Any child-specific home/cache overrides remain in the child environment; no global home or live application/memory roots are changed. The runner owns its child processes/scratch data cleanup and records cleanup uncertainty; source checkouts, caches and delivery artifacts remain intact. No shared SurrealDB, IdP, remote MCP server or daemon is required.

Evidence destination: phase `evidence/acceptance/local-release-intake.json` plus per-scenario finite command/outcome receipts; none is produced or claimed here. Raw output must exclude secrets. Retained prior passes remain evidence of their original source/payload only.

