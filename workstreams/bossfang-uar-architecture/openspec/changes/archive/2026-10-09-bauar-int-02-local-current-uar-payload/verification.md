# Verification contract — local current UAR bundle

## Behavior: Produce a source-bound local bundle through existing packaging

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-integration-2026-10-09 / bauar-int-02-local-current-uar-payload / tasks 1.1–1.2,2.1–2.4 |
| Source identity | Actual UAR checkpoint, final Boss local-pin commit, locked dependency authority, server-full profile, generated binary/archive/app hashes |
| Production entry point | Cargo release uar-sidecar build; Node scripts/package-boss-sidecar.mjs darwin-arm64 aarch64-apple-darwin; Boss Node scripts/prepare-local-uar-payload.cjs; existing build followed by electron-builder --mac --arm64 --dir --publish never |
| Real collaborators | Actual compiler/linker and model/policy/library inputs; existing packager; Boss local source validator; Electron beforePack/afterPack hooks and generated application |
| Boundary exercised | Compiled executable → archive → verified local payload → app.asar.unpacked/resources/binaries/darwin-arm64 |
| Observable result | Source/feature/lockfile/build chain agrees with the actual bundled UAR, with intact hook receipts |
| Negative control | In a disposable candidate, supply a stale source record or corrupt a real archive byte; full preparation/packaging path must reject it rather than emit success |
| Isolation | Owner-assigned isolated candidate/output roots, disposable negative-control copies, serialized shared build outputs; do not clear accepted caches |
| Prerequisites | Completed source/pin wiring, native Apple Silicon toolchain, existing pinned package dependencies and native inputs; package checks not bypassed |
| Final local gate | Shared planned runner below, at the completed-delivery acceptance boundary; production assembly commands recorded separately |
| Evidence | Actual build/package receipts may be produced by implementation; deliberate negative-control/acceptance results remain pending until run |
| Limitations | Unsigned directory bundle only; not signed DMG/installed, Windows, Intel macOS, public CI or remote certification |

## Behavior: Generated Boss selects its bundled UAR

| Field | Required declaration |
| --- | --- |
| Canonical identity | Same phase/change / task 2.4 delivery boundary; later runtime acceptance deferred |
| Source identity | Actual generated app and bundled binary digest/source marker from local-delivery.json |
| Production entry point | Launch the generated Boss application under its private profile and invoke its shipped managed-UAR integration check, with no external UAR path override |
| Real collaborators | Generated Electron main/renderer/IPC, managed sidecar supervisor, bundled UAR, private data store and loopback listener |
| Boundary exercised | Actual packaged application process → managed child executable → authenticated integration operation |
| Observable result | Started child path is inside that bundle and its digest matches the receipt; real integration check result and cleanup outcome recorded |
| Negative control | Stale/missing local payload or a public-mode/CI local selection is rejected; external override startup cannot satisfy the bundled-current assertion |
| Isolation | Shared final gate private profile/loopback/data roots; no real user settings edited; cleanup owned by runner |
| Prerequisites | Completed actual directory bundle, local profile, intact hook outputs, available native tools |
| Final local gate | Shared planned runner below; no startup test during unfinished source wiring |
| Evidence | Pending packaged startup/sidecar-path/authenticated-check receipt, explicit no-external-override configuration class |
| Limitations | Startup/check alone cannot prove full tool/approval matrix, signing or installed operation |

## Scenario matrix

| Requirement/scenario | Owner tasks | Positive observation | Real negative control / disposition |
| --- | --- | --- | --- |
| Source/build/bundle identity chain |1.1–1.2,2.1–2.4 | Real source/binary/archive/file/app identities match | Stale source record in a disposable payload is rejected by production preparation |
| Archive/file integrity checks |2.2–2.3 | Existing full-path validators/hook outcomes retained | Corrupt real archive byte; packaging refuses, no success receipt |
| Bundled selection without override |2.3–2.4 | Real managed child resolves inside generated bundle | External override trace cannot count as bundled-current |
| Local/public mode separation |2.3–2.4 | Native local candidate remains local | Production preparation with CI/local selection refuses; no publishing performed |
| Explicit server-full profile |1.1,2.1–2.2 | Actual build and packaging records use server-full, no test features | Deliberately misdeclared feature receipt cannot claim conformance; static receipt check is supplementary, not a runtime test |
| Honest downstream limitations |2.4 | Local production/package separated from runtime/signing/platform claims | Deferred or absent acceptance cannot be marked PASS |

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

