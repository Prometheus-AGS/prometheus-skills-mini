# Analysis — non-UAR customer release

## Build-versus-reuse decision

No new framework, service, or packaging system is needed. The fastest safe implementation adapts The Boss's existing Electron/Vite feature-definition seam, integration artifact manifest, native runner matrix, installer validators, GitHub Release workflow, and landing-site synchronizer.

The release failure is a contract-composition problem:

1. The application assumes UAR exists through UI, runtime registration, binary management, and service actions.
2. Packaging assumes UAR exists through the native tool manifest and post-pack probes.
3. Platform selection uses a manifest narrowed to the two platforms for which UAR artifacts were available.
4. A later liter-llm administration change treats liter-llm as a required native desktop tool even though the release manifest defines it as service/catalog integration.
5. The website retains older platform rows, which would keep Linux advertised unless the release explicitly declares its supported platform set.

One versioned release profile must resolve all five assumptions together.

## Selected design

### 1. Shared UAR release profile

Adapt the existing `define` block in the Electron Vite configuration. Resolve `THE_BOSS_UAR_ENABLED` once with strict `0`/`1` semantics and inject `__UAR_ENABLED__` into main, renderer, preload, and utility-process bundles. Node packaging scripts import the same resolver from a CommonJS release-profile module.

The default is enabled for ordinary development. The `2.2.1` release workflow and local release command set `THE_BOSS_UAR_ENABLED=0`. Each installer manifest records the profile so retry aggregation cannot combine enabled and disabled artifacts.

Runtime compatibility remains additive:

- persisted `uar` agent rows stay parseable;
- new UAR selection and creation are rejected while disabled;
- UAR runtime registration, administrative actions, credential provisioning, and sidecar launch are disabled;
- the lifecycle service stays registered as a lazy dependency with explicit disabled responses.

### 2. Manifest-driven payload subtraction

Adapt `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/integration-binaries.js` to load tools for the selected profile. In the disabled profile it excludes UAR from validation and returned downloads. It also removes the accidental native liter-llm requirement; liter-llm remains the existing managed/external service plus packaged provider catalogs.

The UAR artifact inventory contains more than the executable. `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/before-pack.js` must derive every UAR file for the current platform from the pinned `uar-sidecar` package entry and exclude that inventory plus `.uar-sidecar-version`. `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/after-pack.js` must assert those files are absent. This makes stale local downloads harmless and proves the installer contains no dead sidecar payload.

The binary manager filters UAR from startup extraction/probes while disabled. liter-llm is also removed from its bundled-native list until a real native artifact exists; service management remains available.

### 3. Four-platform release selection

Adapt `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/release-platforms.cjs` to use the release profile. The disabled profile accepts exactly `win32-x64`, `win32-arm64`, `darwin-x64`, and `darwin-arm64`, and rejects Linux. The integration manifest can advertise these four targets because the five included native tools already have pinned artifacts for them.

Package validation becomes profile-aware on every native runner:

- always inspect the produced application image and core payload;
- disabled profile: prove declared UAR files are absent;
- enabled profile: retain the existing UAR identity, checksum, executable, and startup probe.

### 4. Clean release source

Create a clean release worktree and branch from the current committed integration head, merge the latest `origin/main` release metadata, then add only the release profile and completed production changes. This avoids incorporating unrelated working-tree files while retaining the 36 committed integration changes.

The branch is frozen before native dispatch. Version, tag, release target commit, installer manifests, and workflow SHA remain identical throughout publication.

### 5. Publication and site policy

Reuse `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/.github/workflows/the-boss-release.yml` with the four-platform input and release-wide UAR-disabled environment. Each native runner builds and uploads its installer; aggregation writes checksums, sizes, architectures, source commit, profile, and truthful signing state.

The landing repository consumes `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/RELEASES.md`, but its carry-forward rule must accept a supported-platform set. For `2.2.1`, the set is the two Windows and two macOS targets. Linux rows are omitted instead of inherited from `2.1.3`.

### 6. Verified parent handoff

The child writes one release receipt containing the frozen Boss source commit, release tag, feature profile, all four GitHub asset URLs, byte sizes, SHA-256 digests, signing state, local Apple Silicon validation result, native workflow run URL, landing-site commit/deployment URL, and live-link responses. `handoff-out.md` points to that receipt and names `integration-administration` task 4.5 as the restored work. The sidecar-repair child may begin only after this receipt exists and the parent cursor is restored.

## Evidence excerpts from the target worktree

The target file tree and source values are embedded here because the KBD control plane resides in mini while the implementation resides in The Boss:

```text
/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/electron.vite.config.ts
  main.define currently injects __APP_EDITION__.

/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/integration-binaries.js
  requiredTools = [compass, rust-mcp-filesystem, prometheus, pk, node, uar-sidecar]
  packaging mode additionally pushes liter-llm.
  returned manifest tools are all marked required.

/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/before-pack.js
  beforePack downloads binaries with --packaging, verifies them, packages Prometheus,
  and excludes non-target resource platform directories.

/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/scripts/after-pack.js
  afterPack calls verifyAndProbePackagedUarPayload for darwin-arm64 and win32-x64.

/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/src/main/services/binaryManager/BinaryManager.ts
  BUNDLED_TOOLS includes uar-sidecar and liter-llm unconditionally.

/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/src/main/ai/runtime/registerDrivers.ts
  registerRuntimeDrivers registers UarRuntimeDriver unconditionally.

/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/src/renderer/components/AgentRuntimeOption.tsx
  RUNTIMES is every key of AGENT_RUNTIME_CAPABILITIES, including uar.

/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/src/renderer/components/settingsMenu.ts
  settingsItems contains /settings/uar unconditionally.

/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar/.github/workflows/the-boss-release.yml
  workflow_dispatch accepts platforms; build jobs use native runners; publish-complete-release
  aggregates manifests, commits release metadata, publishes the GitHub Release, and verifies assets.
```

Named gaps used below:

- `release-capability-contract`: one immutable UAR capability must cover UI, runtime, service actions, and packaging.
- `payload-profile`: UAR inventory must be excluded and proven absent while the five supported native tools remain pinned.
- `native-publication`: four native desktop installers must be built and published from one frozen commit.
- `site-platform-policy`: the website must show the four current artifacts without retaining Linux.
- `parent-release-handoff`: integration-administration must receive an exact, replayable proof of the released source and four published artifacts before the UAR repair child begins.

## Candidate evaluation

| Candidate | Verdict | Reason |
|---|---|---|
| Existing Electron Vite compile-time `define` | Adapt | Already supplies the app-edition constant to the main bundle and supports dead-code elimination. |
| Runtime preference stored in the settings database | Reject | A broken sidecar can be reached before or outside a renderer preference; release payload composition cannot depend on a mutable preference. |
| Remove UAR source/schema types | Reject | Breaks persisted UAR records and creates a large migration unrelated to the release. |
| Keep lazy UAR lifecycle service with disabled guard | Adapt | Preserves dependency graph and blocks every launch path at one process boundary. |
| Existing integration artifact manifest | Adapt | Already owns versions, URLs, checksums, and per-platform inventory. |
| Hard-coded sidecar filename exclusions | Reject | Misses UAR libraries, models, license, and payload manifest. |
| Existing native GitHub Actions matrix | Adopt | It already uses the four required native runners and direct GitHub Release upload. |
| Existing landing-site release sync | Adapt | It already validates release data but must stop carrying unsupported Linux rows forward. |
| KBD child handoff plus release evidence receipt | Adapt | Existing child-exit semantics can restore the parent; the release receipt supplies the product evidence the parent needs. |

## Ordering consequences

1. Implement the shared release profile and complete UAR reachability gate first.
2. Make payload selection and validation profile-aware, then expand the supported platform list.
3. Create the clean `2.2.1` release branch and update claims/metadata.
4. Complete all production changes before any build.
5. Run local Apple Silicon packaging and the four native release jobs as the single phase-boundary gate.
6. Publish and update the site only from the verified aggregate manifest.

## Remaining risks

- Signing credentials are currently absent. Artifacts can be correctly built and published, but OS reputation warnings remain and must be disclosed.
- macOS Intel and Windows ARM64 may reveal native dependency gaps not visible from source inspection; those are handled as failures of the final native gate.
- The release child does not certify UAR. It explicitly removes the feature from the product and returns to the sidecar repair phase after publication.

## Recommendation

Build the profile within the existing architecture. Add no dependency. Release `2.2.1` from a clean branch with UAR disabled and absent, verify all four native installers, publish to GitHub Releases, remove Linux from the live landing page, then resume Gate C and the dedicated UAR repair child.
