# Next packaging action — 2026-10-08

This is a read-only packaging disposition, not a package result or an independent acceptance verdict. No build, test, installation, service, commit, source copy, pin change or canonical state change was performed. F6 is outside this disposition following the operator's direction.

## Concrete next action

The smallest existing local development route is **a current Boss macOS arm64 directory package using the unchanged canonical UAR-enabled packaging profile, followed by a local launch against the accepted complete external current UAR development payload**. Keep the bundled canonical payload intact. This can establish current Boss packaged execution with an external current UAR; it cannot establish that current UAR was bundled, signed, distributed or installed.

Root, acting as `boss-lead`, should assign that bounded package operation to one `boss-desktop` writer and retain the accepted current source/artifact identity in its receipt. The retained contract already identifies the external-runtime path as supported but unverified (`../final-gate-matrix.json`, `boss.packagedAcceptanceInventory.currentBossExternalCurrentUar`). Before dispatch, bind the existing external override to the exact accepted complete payload rather than creating or relabeling a payload. The precise runtime override implementation was not reopened in this packaging-hooks-only investigation.

The proposed operation, serialized after the active runtime gate, is:

1. Restore the existing pinned `resources/prometheus-skills-mini` checkout and its pinned `tools/liter-llm` catalog subtree. The current Boss HEAD gitlink and integration manifest agree on mini `f38a98a6ed064f9e5b8b9837e8b91781af570d22`; the manifest pins liter-llm `4f25d39f0075656b70bf945880d6033beda6d663`. These assets are currently absent. Use the repository's submodule initialization at the recorded checkpoints; do not substitute the repaired working mini tree or change a pin. This is prerequisite restoration, not a new payload release.
2. In `/Users/gqadonis/.claude/worktrees/bauar-boss`, use the UAR-enabled canonical profile for both compilation and packaging: `THE_BOSS_UAR_ENABLED=1`, `THE_BOSS_UAR_LOCAL=0`, with no local-source override. Preserve the actual completed current Boss build identity; rebuild only if that identity does not match the selected package source/output. The declared package entry `./out/main/main.js` exists, as do installed Electron, electron-builder and better-sqlite3 packages; presence alone does not certify their freshness.
3. Run the directory packaging target with the intact hooks. A concrete root command from the Boss directory, with Node 22 on PATH and no inherited local-source override, is:

   ```text
   THE_BOSS_UAR_ENABLED=1 THE_BOSS_UAR_LOCAL=0 pnpm exec electron-builder --mac --arm64 --dir --publish never --config.mac.identity=null
   ```

   This is an explicitly unsigned local development artifact. Do not use `--prepackaged`. Root owns execution. The normal beforePack operation restores missing pinned native resources, rebuilds Electron-native dependencies and packages Prometheus; it is not an offline, read-only or no-install operation.
4. Launch the resulting package through the existing external-payload runtime override, bound to the current accepted private payload, and collect the remaining scoped packaged-app behavior receipt. Record Boss package identity, canonical bundled UAR identity and actual external runtime identity separately. Do not repeat passing broad gates merely because a directory package was produced.

This route is suitable only for a local development packaged-app criterion that permits external current UAR. **If the acceptance task specifically requires current UAR inside the package, the next action is the source checkpoint handoff below, not this substitution.** An unsigned directory cannot satisfy `validate-release-package.cjs` or installed macOS/Windows release acceptance. The runbook's signed installers remain a separate boundary.

## What still prevents bundling current UAR

| Boundary | Fresh observation | Consequence |
| --- | --- | --- |
| Current UAR checkpoint | `git rev-parse HEAD` in the isolated UAR worktree returned `8bff32deb870f6363e94687a2e22492f91a34dfd`. | This alone does not identify uncommitted development content. No UAR source or dirty-file contents were inspected. |
| Local bundle contract | `build/local-uar-source.json` still pins `48bc45b59d02d4febf4ed36e352af367fef73049`, version `1.0.0`, native `darwin-arm64`. `inspectLocalUarRecord()` in `scripts/local-uar-payload.cjs` requires that exact clean Git source. | The fresh HEAD mismatch alone still prevents current-source local bundling. A fresh dirty-state inspection is unnecessary to establish this mismatch. |
| Canonical bundle contract | `build/integration-sources.json` and `build/integration-artifacts.json` still pin UAR `ba7233875f8df3b2add68fc487d364428432c07d`. The sidecar artifact inventory covers Windows x64 and macOS arm64. | Canonical packaging can retain this published payload; a private development payload cannot claim this identity. Availability of the pinned downloads was not tested. |
| Independent packaged verification | `verifyPackagedUarPayload()` in `scripts/uar-payload-integrity.cjs:89` checks source identity, exact inventory, sizes and hashes. Local mode additionally compares the local marker with the local pin (`:70`) and manifest entries (`:125`). | Setting an environment variable or copying the development binary cannot legitimately bypass the source contract. |

For **bundled current UAR**, the exact required owner decision is: select and authorize a reviewed immutable current UAR checkpoint for the local package, then assign the owning UAR team to produce the real complete release-layout payload and the Boss packaging writer to update the local source pin through that handoff. The local validator requires a clean source checkpoint; the retained prerequisite receipt records that the UAR packager uses `target/aarch64-apple-darwin/release/uar-sidecar`. The current private debug payload is not that artifact. This inspection did not reassess the UAR packager or authorize commits/pins. If the intended destination is the customer release instead, use the published immutable payload-record workflow and canonical integration pins described in `docs/contrib/the-boss-release.md`; do not turn a local payload into a public release by relabeling it.

## Actual ownership and retained checks

The existing `boss-core` team routes Electron/build/release integration to `boss-desktop`; `boss-lead` must assign manifests and packaging explicitly. The recorded team task ledger contains no packaging/release task with an assigned owner. `boss-verifier` owns independent completed-boundary review, not production packaging. These are role facts, not evidence that a packaging handoff has been accepted. See Boss `.agent-team/boss-core/routing.md`, `.agent-team/boss-core/handoffs.md`, and `../teams/boss-core.state.json` (selected task titles/owners only).

A handoff must preserve the task/state revision, Git checkpoint and relevant dirty paths, actual source/artifact identities, completed receipts, remaining acceptance and acknowledgement. A peer UAR request is a draft until the destination team accepts its own task. Root can assign the local package writer now; no new daemon or release publication is needed.

The package hooks are real prerequisites, not failures already observed in this investigation:

- `scripts/before-pack.js:197–220` resolves the profile, rebuilds native modules, downloads and verifies bundled binaries, conditionally stages the local payload and packages Prometheus.
- `scripts/after-pack.js` verifies/probes the packaged UAR payload and verifies the packaged Claude CLI. `electron-builder.yml:192–194` retains the before-pack, after-pack and after-sign hooks.
- `scripts/validate-release-package.cjs:67–90` checks a mounted macOS application, sealed resources and its code signature. Therefore that release validator must not be reported as passed for an unsigned directory. Windows installed acceptance is also unrun.

A fresh finite existence check found all six canonical native integration tool binaries and all eleven canonical UAR payload entries absent under `resources/binaries/darwin-arm64`. No local-UAR marker is present. The normal download hook therefore has actual work to do; nothing in this inspection establishes a download failure or permits skipping it. `scripts/package-prometheus.js:79–107` independently binds mini to the Boss gitlink and integration pin, and liter-llm to its pinned checkpoint/catalog hashes; `:124–145` installs the packaged mini's locked dependencies. Restoring those named existing prerequisites is the next executable work, not another architecture decision.

The prior receipt `../current-source-packaging-prerequisites.json` remains accurate about the source-pin mismatch and the absence of an existing dirty-source bundle route. Its broad “packaged evidence blocked” wording is too coarse for the external-runtime local development option already retained in `../final-gate-matrix.json`: that option may proceed with its narrower evidence claim and intact canonical bundle. It does not resolve current-source bundling or release acceptance.

## Verification limit

Fresh evidence here consists of named Boss packaging hooks/configuration/runbooks, selected team ownership metadata and UAR Git HEAD only. The external-runtime option is retained prior contract evidence, not a new runtime reproduction. No signed installer, unsigned directory package, external-payload packaged launch, download availability or installed platform acceptance was exercised. Only this Markdown disposition was added by this assignment.
