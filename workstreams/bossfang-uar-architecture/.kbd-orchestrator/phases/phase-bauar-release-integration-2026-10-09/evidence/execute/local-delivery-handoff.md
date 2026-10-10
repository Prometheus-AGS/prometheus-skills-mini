# Local delivery handoff — change02 / task 6

The three-repository source intake, current-UAR production build, sidecar archive and unsigned local darwin-arm64 Boss directory bundle are complete. Runtime acceptance, tests, negative controls, cumulative independent review and certification remain **operator-deferred and UNPASSED**. F6 remains **cancelled**. Publication is **not-authorized**. This receipt does not advance shipping/C05.

Actual app: [The Boss.app](</Users/gqadonis/.claude/worktrees/bauar-release-boss/dist/mac-arm64/The Boss.app>). Actual archive: [uar-sidecar-darwin-arm64.tar.gz](</Users/gqadonis/.claude/worktrees/bauar-release-uar/dist/boss-sidecar/uar-sidecar-darwin-arm64.tar.gz>). These are retained local outputs; no installation, signed app/DMG, notarization, remote release or additional platform delivery is claimed.

[local-delivery.json](local-delivery.json) SHA256: `76c0bd1ff5dd331070b699e3916e5814cf7f6e4c0911321d3a72f3be0a189984`. [local-delivery-validation.json](local-delivery-validation.json): strict draft 2020-12 schema validation valid, executed once using Node v22.20.0 and installed Ajv. Formal schema validity is receipt structure evidence, not independent review or certification. Task6 consumed existing receipts and hashed receipt files only; it did not rerun successful builds or access product files.

## Source and payload identity

- UAR source checkpoint: `84ca0ffff5da8fafc1e2e7f5585efc07a396b14e`.
- Boss final pin commit: `7a5bdb4b7c02e9f13875fc7f837815c03fe3dacd`; parent intake checkpoint: `bda3715df5425e323188f84c595978dbd4f2d1e5`. The only post-intake source edit was the local UAR revision pin.
- Bossfang checkpoint: `1d518936cb15b79d30bdd315510ff925613a0f4d`, approved bac04 baseline with 279 inherited commits; original main remains `16beef0fcf3053970a901990df4fedbdf86bd87d` at the documented intake boundary.
- Intake: 241 selected paths, 94 additions and 147 modifications. [source-intake.json](source-intake.json) SHA256 `ae8dcf2d657cd419a45f65f6e7ae619bf50bbc90940b1ef9322cd97728cef13f`; [source-intake-handoff.md](source-intake-handoff.md) retains bases, source roots and strict approval producer/caller inventory.
- Built UAR binary: `/Users/gqadonis/.claude/worktrees/bauar-release-uar/target/aarch64-apple-darwin/release/uar-sidecar`, 296935808 bytes, SHA256 `9f91874091f8241d97209fd21b8c0c5b79ae6cdeb82ee0e873a5ea4540a8adea`.
- Archive: 124104664 bytes, SHA256 `47a565ce5e4f63f28eebd9183a6ed6eeeffbdad13d1c8a6ec318fb2498c34bcb`; the existing packager emitted 12 files from the actual UAR checkpoint.
- Archive file manifest: `/Users/gqadonis/.claude/worktrees/bauar-release-uar/dist/boss-sidecar/uar-sidecar-darwin-arm64/payload-manifest.json`, SHA256 `97227f91f5f88d19b9a054e356f8364a94c1a0f1f3bcdc09a9a56be4dc5dde93`.
- App bundled UAR binary: `/Users/gqadonis/.claude/worktrees/bauar-release-boss/dist/mac-arm64/The Boss.app/Contents/Resources/app.asar.unpacked/resources/binaries/darwin-arm64/uar-sidecar`, SHA256 `9f91874091f8241d97209fd21b8c0c5b79ae6cdeb82ee0e873a5ea4540a8adea`, matching the actual build/archive receipt.
- App source marker: `/Users/gqadonis/.claude/worktrees/bauar-release-boss/dist/mac-arm64/The Boss.app/Contents/Resources/app.asar.unpacked/resources/binaries/darwin-arm64/.uar-local-payload.json`, SHA256 `d9d800ff54a56fce5e6ec1f6df9a11f807b218a1c53b5f4d19fc211ef3600050`, source `84ca0ffff5da8fafc1e2e7f5585efc07a396b14e`, archive SHA256 `47a565ce5e4f63f28eebd9183a6ed6eeeffbdad13d1c8a6ec318fb2498c34bcb`.
- App payload manifest: `/Users/gqadonis/.claude/worktrees/bauar-release-boss/dist/mac-arm64/The Boss.app/Contents/Resources/app.asar.unpacked/resources/binaries/darwin-arm64/payload-manifest.json`, SHA256 `0e81fe2225a520dac4a4f7c798fa11f61a064b9a0a50ea2325debac9ab81f063`. Its digest intentionally differs from the archive manifest because Boss adds archiveSha256; the file records match, as recorded in [boss-delivery.json](boss-delivery.json).

Build profile was release, native target aarch64-apple-darwin, explicit server-full with default minimal enabled. Test-probes and bauar-native-admission-gate were excluded. Exact dependency-authority hashes are carried in local-delivery.json from recorded build and final Boss authorities; gitlinks and feature expansion remain in [build-inputs.json](build-inputs.json). No dependency pins were upgraded.

## Actual operation history

The following command list deliberately retains the failed offline graph restore (exit 1). Completion applies to the subsequent successful operations, not every historical attempt. Full cwd, argv and versions are in local-delivery.json; environment and logs are in the linked operation receipts.

| # | Actual command | Exit | Recorded tool version |
| --- | --- | --- | --- |
| 1 | `cargo build --locked --release --target aarch64-apple-darwin --bin uar-sidecar --features server-full` | 0 | cargo 1.99.0-nightly (59800466c 2026-07-07) |
| 2 | `/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node scripts/package-boss-sidecar.mjs darwin-arm64 aarch64-apple-darwin` | 0 | v22.20.0 |
| 3 | `/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node scripts/prepare-local-uar-payload.cjs` | 0 | Node v24.11.1 |
| 4 | `/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node /Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs install --offline --frozen-lockfile --frozen-store --ignore-scripts` | 1 | Node v24.11.1; pnpm 12.3.4 |
| 5 | `/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node /Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs install --no-offline --frozen-lockfile --frozen-store --ignore-scripts` | 0 | Node v24.11.1; pnpm 12.3.4 |
| 6 | `/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node /Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs --filter @cherrystudio/dsh-bridge build` | 0 | Node v24.11.1; pnpm 12.3.4 |
| 7 | `/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node /Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs run build` | 0 | Node v24.11.1; pnpm 12.3.4 |
| 8 | `/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node /Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs exec electron-builder --mac --arm64 --dir --publish never` | 0 | Node v24.11.1; pnpm 12.3.4; electron-builder 26.15.6; Electron 44.2.0 |

Node22 orchestrated the work and ran UAR packaging. Boss children used the already-installed Node24.11.1 with pnpm12.3.4; this is an explicit runtime adaptation from the planned Node22 child commands, not an installed toolchain upgrade. Existing dependency-copy failures and route failures remain in [boss-input-direct-cli-failure.json](boss-input-direct-cli-failure.json), [boss-input-diagnosis.json](boss-input-diagnosis.json), [boss-input-repair.json](boss-input-repair.json) and [pnpm route log](boss-pnpm-route-failure.log). Exact dependency lookup was repaired in candidate generated inputs, then the observed incomplete copied graph was restored using the frozen lockfile/store and ignore-scripts. Offline restoration failed on missing locked assets; the authorized online restoration reused 2614, downloaded 139 and added 2761 packages. Earlier copied inputs were retained under the candidate .context/bauar-dependency-inputs/before-graph-rebuild directory. There was no product source repair, root prepare lifecycle execution, shared Git configuration change or pin upgrade.

The successful DSH bridge build, Boss build and electron-builder directory assembly all exited 0. Existing beforePack and afterPack remained intact and completed. beforePack performed native rebuilding, current local UAR staging, bundled binary checks and pinned mini preparation. afterPack performed packaged Claude CLI and UAR identity/inventory/hash/executable checks, including its inseparable invalid-launch-token rejection probe (expected exit2/refusal). These are packaging-hook results only: no Boss managed startup or successful delegated runtime acceptance is claimed. Signing autodiscovery was disabled and publication was disabled with --publish never. The operator-deferred acceptance negative controls were not run.

## Evidence and preservation boundaries

| Receipt | SHA256 |
| --- | --- |
| [source-intake.json](source-intake.json) | `ae8dcf2d657cd419a45f65f6e7ae619bf50bbc90940b1ef9322cd97728cef13f` |
| [build-inputs.json](build-inputs.json) | `fe86a83ee98f67df5b3b46c13d24b88a95a8d22e16b2dd50326bc56c91c1e3f1` |
| [boss-local-pin.json](boss-local-pin.json) | `176c8d266b27e4a326942585b35593d03601445a123e1d79cc0bbb4aa75c777c` |
| [uar-build.json](uar-build.json) | `938bcb3996a6dd9549beeb79e52f2831d507615cfd55f734099bb3af04c5b15f` |
| [uar-package.json](uar-package.json) | `74dffb684e82cf32429aec0dc8e6d12e8508d0f75ce4f67bfecb2d638cf00b20` |
| [boss-local-uar-preparation.json](boss-local-uar-preparation.json) | `4d6c1c2638d2dec69da282aef1a19b4ff1b945b5b1b642becce44ac8855c3061` |
| [boss-delivery.json](boss-delivery.json) | `be2e8b906734c979c2e99f04b535e520ba9120d728e13085139a3b421018fbd9` |
| [boss-bundle.json](boss-bundle.json) | `07fff55aaed133ad831c74074fca52cb5ca0bbac3208c85f487a07e7fc604bdc` |
| [boss-graph-install.json](boss-graph-install.json) | `bcfbea62afb3eecc9bf17ccd8d27237df7c364652dbe987a0e0827bb8eb0e126` |
| [boss-graph-online-2026-10-09T13-36-44-301Z.json](boss-graph-online-2026-10-09T13-36-44-301Z.json) | `e2bcd333f43589c7ba4e8493658cab5cf08437c66f273b280409ee0538867966` |
| [boss-dsh-2026-10-09T13-37-18-766Z.json](boss-dsh-2026-10-09T13-37-18-766Z.json) | `2b15bb1e196b228c00ff60768d373441908215004ebe1ab86068bb007258979d` |
| [boss-build-2026-10-09T13-37-27-199Z.json](boss-build-2026-10-09T13-37-27-199Z.json) | `81f62fe4d98c56bdf65852a05d52ec35e51f2b80a6ec39b216b387496169b955` |
| [boss-bundle-2026-10-09T13-38-47-743Z.json](boss-bundle-2026-10-09T13-38-47-743Z.json) | `2f38e73a0ef1459c762f75eca2355b0799db9c56d5eb3a8fad3c41e4c00f437b` |
| [boss-prepare-2026-10-09T12-39-01-296Z.json](boss-prepare-2026-10-09T12-39-01-296Z.json) | `b4d62de5a3935c306554fabbed05af82f104502dc1c7caeb2843ea7e6e87c4e3` |

Original selected source bytes/modes/index/ref preservation is recorded at the finite intake boundaries in intake/uar.json, intake/boss.json and intake/bossfang.json, linked through source-intake.json. UAR build/package receipts preserve their candidate HEAD and finite dependency authorities. Boss bundle/delivery receipts preserve the candidate and primary authority hashes/HEADs after actual assembly. These historical recorded scopes do not assert unrelated source state or a new final source scan. Task6 did not inspect/hash/search/diff/test tests/bauar_session_owner.rs or src/uar/mcp_server.rs, and did not run whole-original-UAR Git status/diff. No new security hardening was added.

Root retains ownership of canonical task/stage completion, hooks, backend archive and cleanup. Keep all candidate refs, outputs, original caches and receipts; do not prune/reset them. No execute.handoff.json or canonical state was changed by task6. No public four-platform artifacts, signed/installed acceptance, macOS Intel/Windows checks, public CI or remote receiver/IdP/custodian acceptance is claimed. Downstream runtime/review/certification work remains with the operator's deferred boundary.
