## Why

The current desktop release advertises UAR even when its sidecar payload is missing or corrupt, which prevents customers from using otherwise functional Windows and macOS builds. A patch release must remove every UAR entry point and payload while preserving the rest of The Boss, then publish native installers for both Windows architectures and both macOS architectures without carrying Linux forward on the website.

## What Changes

- Add one immutable release capability that disables UAR across renderer navigation, runtime selection, agent creation, administration, service provisioning, binary management, and packaging while preserving compatibility with stored UAR records.
- Make native payload selection and installer validation profile-aware, derive the complete UAR file inventory from the pinned artifact manifest, and prove disabled installers contain no UAR executable or support files.
- Remove the unsupported native liter-llm binary assumption while retaining managed and external liter-llm service administration.
- Simplify first-run provider setup by removing the CherryIN shortcut and labeling the single remaining action **Set up LLM Providers** in every locale.
- Build version `2.2.1` from one frozen source commit for Windows x64, Windows ARM64, macOS Apple Silicon, and macOS Intel; upload installers directly to GitHub Releases with checksums, sizes, architectures, source commit, release profile, and truthful signing state.
- Run `pnpm build:mac:arm64` locally as part of the final release gate and inspect the mounted application image before publication.
- Update the landing-site release synchronizer and deployed download page so the current release advertises exactly the four supported non-Linux artifacts.
- Produce a structured release receipt and restore the parent `integration-administration` phase at task `4.5` so dedicated UAR repair can continue after customers have a usable release.
- **BREAKING**: UAR is unavailable and absent from the `2.2.1` installers; existing stored UAR agent records remain readable but cannot be selected or executed in this release profile.

## Capabilities

### New Capabilities

- `desktop-release-profile`: Defines immutable application and payload behavior for a UAR-disabled desktop release while retaining persisted-data compatibility.
- `native-desktop-publication`: Defines the four native installer targets, frozen-source publication evidence, GitHub Release metadata, and local Apple Silicon release gate.
- `desktop-download-catalog`: Defines the supported-platform contract between release metadata and the deployed download site, including removal of inherited Linux rows.
- `release-phase-handoff`: Defines the evidence receipt required before the release child restores its parent phase.

### Modified Capabilities

None.

## Impact

- The Boss application bundles, runtime registry, agent service, Prometheus integration service, binary manager, managed-service provisioning, settings navigation, routes, and environment declarations.
- The Boss first-run provider setup view and localized strings.
- The Boss integration artifact selection, before/after-pack hooks, release package validator, target matrix, workflow manifests, release notes, and generated release metadata.
- `Know-Me-Tools/boss-landing-spot` release synchronization, generated download data, and deployed platform presentation.
- KBD/OpenSpec release evidence and the handoff back to `integration-administration`.
- No new runtime dependency, service, database, or port is introduced.
