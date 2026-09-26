# Reflection — non-UAR customer release

Date: 2026-09-25

## Goal achievement

| Goal | Result | Evidence |
|---|---|---|
| Publish a customer-usable The Boss build with UAR unreachable | MET | The `non-uar` profile is recorded in `release-manifest.json`; final package validation excluded the complete UAR inventory while retaining Compass, Rust Filesystem, Prometheus, `pk`, Node, skills, and service administration. |
| Ship every requested non-Linux desktop target | MET | GitHub Release `v2.2.1` contains Windows x64, Windows ARM64, macOS Apple Silicon, and macOS Intel installers from source `7f1b0d16d84196f3002f6e8dcaae55336c1f2fe8`. |
| Replace CherryIN onboarding with provider setup | MET | The release removes **Connect CherryIN** and exposes the translated **Set up LLM Providers** action. |
| Publish direct, verifiable downloads on the customer site | MET | `https://the-boss.know-me.tools` renders version `2.2.1`, the four exact GitHub Release links, no Linux download section, and no IPFS download URL. |
| Preserve unfinished UAR work for repair after release | MET | The release used a clean worktree and immutable build capability; existing UAR records remain readable while UAR launch, settings, IPC, runtime selection, and payload are disabled. |

Overall achievement: **100% of this child phase's release goals met**.

## Delivered changes

- Published The Boss `2.2.1` from frozen source commit `7f1b0d16d84196f3002f6e8dcaae55336c1f2fe8` with release metadata at `aa9a022364ca4de8483e67385e2ef740edc70e26`.
- Published four immutable GitHub Release assets with recorded byte sizes, SHA-256 checksums, architectures, source identity, feature profile, and truthful signing state.
- Built Apple Silicon locally with the exact `pnpm build:mac:arm64` command and passed mounted application-image validation.
- Completed the native workflow at GitHub Actions run `36137797825`; all four native installer jobs and final asset-byte verification passed.
- Published the landing-site contract at commit `66e87492ac45784ad1b39a36a61efb93990f7144`, deployed it through the connected Lovable project, and verified the live rendered download surface.
- Pinned the packaged mini payload at `9959b72e22b3abe71cddca49fb8267349a09a3d5`, containing 60 skills and 2,774 runtime files.
- Verified and archived OpenSpec change `ship-non-uar-desktop-release`.

The structured source of release evidence is `evidence/release-2.2.1-receipt.json`.

## Artifact Quality Summary

| Metric | Value |
|---|---|
| Changes with separate artifact-refiner QA | 0/1 |
| Final native release gates | 5/5 passed |
| Published asset byte checks | 4/4 passed |
| Live site download rows | 4/4 matched |

The phase deliberately used its single real release boundary rather than a separate refinement loop. Evidence comes from the local Apple Silicon installer build, four native packaging jobs, installed-image validators, GitHub Release byte verification, and the deployed site. OpenSpec validation passed before archive.

## Observed corrections

- Windows checkout initially failed on long paths in the packaged mini payload; the release workflow now enables Git long-path support.
- Recursive submodules were required for the nested liter-llm source used by the payload.
- Windows checkout line-ending conversion changed catalog bytes and broke pinned checksum validation; disabling `core.autocrlf` for the release checkout preserved the committed catalog.

These were observed packaging failures at the release gate and were corrected without starting an intermediate test loop.

## Technical debt and limits

- UAR remains intentionally disabled and absent from `2.2.1`. The reported Windows `ENOENT` and corrupt-sidecar packaging path are unresolved product work and require a dedicated child investigation before UAR is re-enabled.
- All four installers are unsigned; the macOS DMGs are not notarized. Release metadata and the website report this accurately.
- Native packaging and installed-image validators passed. Human installed-operation feedback on customer Windows and macOS machines remains post-publication evidence, not a claim made by this reflection.

## Lessons

- A capability must govern UI, IPC, process lifecycle, runtime registration, binary selection, and package validation together. Hiding navigation alone cannot make a broken sidecar safe to ship.
- Installer inputs must be byte-stable across operating systems. Checkout line-ending behavior is part of the native payload contract when manifests record checksums.
- Direct GitHub Release assets remove a failure-prone distribution hop and make website metadata traceable to release bytes.
- The UAR repair should start from the published `2.2.1` baseline and treat sidecar discovery, package layout, executable dependencies, and launch diagnostics as one cross-platform architecture problem.

## Recommended next work

Restore `integration-administration` at task `4.5` and finish its existing Gate C boundary. Then open the dedicated UAR-sidecar child phase to reproduce and repair Windows and Apple Silicon package/launch behavior before re-enabling the capability in a later release.
