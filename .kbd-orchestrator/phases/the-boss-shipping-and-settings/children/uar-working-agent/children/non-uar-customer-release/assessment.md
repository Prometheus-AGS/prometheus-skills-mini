# Assessment — non-UAR customer release

## Outcome

The requested release is feasible without repairing the UAR sidecar first, provided UAR is disabled at the product, runtime, and packaging boundaries rather than merely hidden from Settings. The release must use a new version because `v2.2.0` is already published. The next available patch version is `2.2.1`.

The four supported release targets are:

| Target | Native runner | Package |
|---|---|---|
| Windows x64 | `windows-2025` | NSIS setup executable |
| Windows ARM64 | `windows-11-arm` | NSIS setup executable |
| macOS Apple Silicon | `macos-15` | DMG |
| macOS Intel | `macos-15-intel` | DMG |

Linux is outside this release. The landing site must remove its retained Linux download rows instead of silently carrying forward the previous Linux release.

## Observed current state

This assessment is intentionally cross-repository. Its product source is the Boss worktree at `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar`; the mini repository contains the KBD control plane. The claims below were verified against that Boss worktree and the `Prometheus-AGS/the-boss` GitHub repository, rather than inferred from the mini file tree.

1. `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/package.json` declares `2.2.0`. `gh release view v2.2.0 --repo Prometheus-AGS/the-boss` returned `isDraft: false`, `isPrerelease: false`, publication time `2026-09-24T06:02:51Z`, and Windows x64 plus Apple Silicon assets with GitHub-recorded SHA-256 digests. `gh release list` showed no version above `2.2.0`; a published release must not be repurposed.
2. `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/release-platforms.cjs` defines all four requested targets, but `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/build/integration-artifacts.json` currently permits only `win32-x64` and `darwin-arm64`.
3. The five non-UAR native tools already have recorded artifacts for all requested targets: Compass, Rust Filesystem, Prometheus, `pk`, and Node. A release does not require rebuilding those tools.
4. UAR is currently required by `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/integration-binaries.js`, probed by `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/after-pack.js`, and required by `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/validate-release-package.cjs`. Omitting the executable without changing these contracts makes packaging fail.
5. UAR is exposed independently through `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/src/renderer/components/AgentRuntimeOption.tsx`, `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/src/renderer/components/settingsMenu.ts`, `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/src/main/ai/runtime/registerDrivers.ts`, `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/src/main/ai/runtime/uar/UarSidecarService.ts`, diagnostics, managed service provisioning, and administration IPC. Hiding one view would leave executable paths into the broken runtime.
6. `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/integration-binaries.js` now requires a native `liter-llm` tool, while the integration manifest contains no such per-platform binary. liter-llm is represented here by service configuration, image/catalog sources, and the detected gateway; packaging the desktop must not invent a missing native executable.
7. The release workflow accepts an explicit platform subset and uploads immutable assets to GitHub Releases. The supported dispatch is the four requested platform keys from one frozen release branch and source commit.
8. `Know-Me-Tools/boss-landing-spot` currently retains older artifacts for platforms absent from the newest release. Its sync policy therefore needs an explicit supported-platform list for this release so Linux disappears while all four desktop targets point at `2.2.1`.
9. The latest successful release had no signing secrets. Windows and macOS artifacts were unsigned, and macOS notarization is disabled. This must be reported accurately in the release manifest and website rather than described as signed.
10. The active Boss worktree contains unrelated and partially completed changes. Release construction needs a clean release branch/worktree that imports only the completed production commits and the release-specific changes, preserving the current integration worktree unchanged.

### Boss evidence included for downstream stages

The cross-repository observations were collected from the following bounded Boss tree; these paths all existed at Boss commit `02423129d5d60f4b61b9afaef25c8a4001c1ab0f` when assessed:

```text
package.json
electron.vite.config.ts
electron-builder.yml
build/integration-artifacts.json
scripts/integration-binaries.js
scripts/release-platforms.cjs
scripts/before-pack.js
scripts/after-pack.js
scripts/validate-release-package.cjs
scripts/prepare-github-release.cjs
.github/workflows/the-boss-release.yml
src/main/ai/runtime/registerDrivers.ts
src/main/ai/runtime/uar/UarSidecarService.ts
src/main/data/services/AgentService.ts
src/main/services/binaryManager/BinaryManager.ts
src/main/services/prometheus/PrometheusIntegrationService.ts
src/main/services/prometheus/managedServices.ts
src/renderer/components/AgentRuntimeOption.tsx
src/renderer/components/settingsMenu.ts
src/renderer/routes/settings/uar.tsx
```

The relevant source values were read directly:

```text
package.json: version = 2.2.0
release-platforms.cjs:
  win32-x64   -> windows-2025   -> build:win:x64:release
  win32-arm64 -> windows-11-arm -> build:win:arm64:release
  darwin-x64  -> macos-15-intel -> build:mac:x64
  darwin-arm64-> macos-15       -> build:mac:arm64
integration-artifacts.json: platforms = [win32-x64, darwin-arm64]
integration-binaries.js: required desktop tools include uar-sidecar and liter-llm
integration-artifacts.json: no liter-llm tool entry exists
electron-builder.yml: mac.notarize = false
```

GitHub returned this release state during assessment:

```text
repository: Prometheus-AGS/the-boss
tag: v2.2.0
draft: false
prerelease: false
publishedAt: 2026-09-24T06:02:51Z
assets:
  The-Boss-2.2.0-mac-arm64.dmg
    size: 583295159
    sha256: 1b524e9e78974531f933b1368009318d7bf580fe1aa26aaa68f2e09da96c0a33
  The-Boss-2.2.0-win-x64-setup.exe
    size: 447946049
    sha256: bb0ac31116d0342e162321576b043f4f0e51b9cfa7c6204774d8799ef4e3fe5c
```

## Required architecture

### One explicit release feature contract

Introduce a single build feature, `THE_BOSS_UAR_ENABLED`, with a release value of `0` for `2.2.1`. Both Electron processes and Node packaging scripts must consume the same semantic value. The enabled value remains the development/default behavior so the subsequent sidecar-repair child can continue without reverting the release code.

When disabled:

- the agent creation selector excludes UAR while retaining compatibility with persisted `uar` records;
- UAR Settings navigation and direct routes are unavailable;
- the UAR runtime driver is not registered;
- sidecar start/restart/admin APIs refuse with a stable disabled-feature result before spawning;
- diagnostics and onboarding do not offer UAR operations;
- new UAR agents cannot be created while persisted UAR agent records remain readable;
- general service setup does not provision UAR-specific SurrealDB credentials, namespace, or database;
- the binary manager does not extract or probe UAR and stale UAR files are excluded from the package;
- packaging neither downloads nor requires nor probes a UAR executable;
- release notes do not claim UAR support.

The lazy sidecar service remains registered because `AgentSessionRuntimeService` declares it as a dependency. Its disabled guard is the runtime backstop and avoids unrelated service-graph surgery.

### Release source isolation

Create a clean `release/v2.2.1` worktree from the intended Boss source commit. Bring in completed non-UAR production work and the feature-gate/release changes as explicit commits. Freeze the branch before dispatching native builds; the GitHub release workflow requires branch head, tag, draft, and workflow SHA to remain identical.

### Packaging and publication

- Expand the integration manifest to the four requested platforms using the already recorded five-tool artifacts.
- Remove the accidental native liter-llm requirement unless a real pinned per-platform executable is deliberately added later.
- Make package validation feature-aware: validate the application image and core payload on all four native runners, and validate UAR only when the feature is enabled.
- Keep Windows release output to NSIS setup installers.
- Run `pnpm build:mac:arm64` locally and require the existing DMG verification/mount/application inspection path to pass without a UAR probe.
- Build the remaining targets on native GitHub runners, produce checksums and sizes, publish directly to GitHub Releases, then sync the landing site from the generated release metadata.

## Completion boundary

Implementation completes only when all feature-gate and release-production code is written. The operator explicitly requires phase-boundary integration testing instead of unit, per-edit, or partial verification loops. For this release child, the mandatory gate is therefore the actual local Apple Silicon build plus the four native workflow builds, package validators, published-byte checksum/size checks, and live landing-site link checks. Those production builds include compilation and packaging checks and supersede generic mini-repository `npm` commands that do not build or validate the Boss product.

The mini constitution still requires one final integration gate after implementation and allows rerunning only a failed gate after a fix. This completion boundary follows that rule: it does not skip verification; it places verification at the actual native release boundary.

## Risks carried into planning

- A release flag applied only to UI or packaging would leave a broken runtime path.
- The release source must exclude unrelated dirty files without dropping completed Compass, filesystem, skills, Services, and liter administration functionality.
- Windows ARM64 and Intel macOS have not been built at the current source revision; native runner failures are release-gate failures and must be fixed on the same frozen release branch.
- Unsigned artifacts may trigger operating-system reputation warnings. The release metadata must disclose this accurately; adding new signing credentials is not assumed.

## Decision

Proceed with a dedicated `2.2.1` non-UAR release. Keep the UAR implementation in source behind the feature contract, publish the four requested desktop platforms, remove Linux from the current website offer, and return to `integration-administration` task 4.5 before opening the focused sidecar-repair child.

## Unresolved adversarial-review findings

The assessment received two bounded review rounds. The remaining findings are recorded rather than hidden:

1. The reviewer said the Boss source was not present in the mini repository packet. This is a cross-repository child by design. The exact Boss commit, bounded file tree, source values, and live GitHub release metadata are now embedded above so analyze and plan do not depend on an unseen assertion.
2. The reviewer asked for generic mini `npm run check`, `npm test`, and `npm run spec:validate` commands in addition to the native release gate. The operator's explicit session instruction has higher precedence and requires production implementation followed by integration testing at the completed phase boundary. The native application builds, package validators, installed-image inspection, published-byte checks, and live-site checks are that boundary. Generic mini unit suites are not added to this child.
