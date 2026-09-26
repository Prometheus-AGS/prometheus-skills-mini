# Plan — non-UAR customer release

## Outcome

Publish The Boss `2.2.1` for Windows x64, Windows ARM64, macOS Apple Silicon, and macOS Intel from one frozen source commit. UAR is hidden, unreachable, and absent from these installers; every existing non-UAR integration remains packaged. The release is distributed through GitHub Releases and `the-boss.know-me.tools` advertises exactly those four artifacts. After publication, the child returns to `integration-administration` task `4.5` and the dedicated UAR repair work continues.

OpenSpec change: `ship-non-uar-desktop-release`

## Execution discipline

- Create a clean release worktree and preserve all unrelated changes in the current integration checkout.
- Complete all production code and release metadata before running builds.
- Run no unit suites, per-edit checks, review loops, or standalone verification builds during implementation.
- Use one phase-boundary integration gate: local Apple Silicon installer build and inspection, then the four native installer jobs and their installed-image validators.
- If a platform fails, fix the observed failure and rerun that platform gate only. Successful immutable artifacts remain usable when their source commit/profile still matches the frozen release identity.
- Keep verifier, reviewer, auditor, and integration-checker roles dormant until the complete production increment reaches the native release gate.

## Ordered work

### Change 1 — Freeze source and remove UAR reachability

**Tasks:** OpenSpec `1.1–1.2`  
**Gaps:** `release-capability-contract`  
**Reuse:** existing Electron Vite compile-time definitions and lazy sidecar lifecycle boundary  
**Owner:** boss-core runtime/desktop implementer, with the release lead owning the clean worktree

1. Create a clean `2.2.1` worktree from the current committed integration head and reconcile current `origin/main` release metadata without taking any dirty files from the integration checkout.
2. Resolve `THE_BOSS_UAR_ENABLED` once and inject the same `__UAR_ENABLED__` value into main, renderer, preload, utility processes, and packaging scripts.
3. Gate runtime registration, new agent creation, runtime selection, settings navigation/search, direct routes, integration actions/history, managed UAR credential provisioning, binary extraction, and every sidecar start/admin method.
4. Keep persisted UAR discriminants readable; disabled builds return explicit unavailable results and launch no process.
5. Remove **Connect CherryIN**, rename the remaining first-run action to **Set up LLM Providers**, and update every supported locale.

**Completion evidence before the gate:** static reachability inventory tied to the changed call sites and locale inventory. No executable verification yet.

### Change 2 — Build a manifest-driven non-UAR payload

**Tasks:** OpenSpec `2.1–2.2`  
**Gaps:** `payload-profile`, `native-publication`  
**Reuse:** existing integration artifact manifest, `before-pack`, `after-pack`, package validator, and native platform matrix  
**Owner:** boss-core packaging/release implementer

1. Exclude UAR from artifact selection for the disabled profile and derive its complete current-platform file inventory from the pinned sidecar package.
2. Exclude and assert absence of the executable, marker, models, dynamic libraries, license, and payload manifest even when stale cache files exist.
3. Retain Compass, Rust Filesystem MCP, Prometheus CLI, `pk`, and Node across all four targets.
4. Stop requiring liter-llm as a native desktop binary; retain its managed/external service and provider catalog behavior.
5. Set `2.2.1`, define exactly four non-Linux targets, and bind version, source commit, feature profile, architecture, checksums, sizes, and truthful signing state into aggregation.

**Completion evidence before the gate:** static manifest/inventory/validator trace for all four targets. No installer build yet.

### Change 3 — Make website platform support explicit

**Task:** OpenSpec `3.1`  
**Gap:** `site-platform-policy`  
**Reuse:** existing `boss-landing-spot` release synchronizer and generated download data  
**Owner:** boss-core UX/site implementer

1. Clone or update the private landing repository through its authenticated remote.
2. Add an exact supported-platform allowlist to the current release input.
3. Generate four current-release Windows/macOS rows from verified GitHub Release metadata and reject unavailable assets.
4. Remove IPFS and inherited Linux rows from current-release presentation.

**Completion evidence before the gate:** static source-to-generated-data mapping. Deployment waits for published assets.

### Change 4 — Run the native gate and publish immediately

**Tasks:** OpenSpec `4.1–4.2`  
**Gap:** `native-publication`  
**Owner:** boss-core release lead; native platform jobs own their installer builds; verifier role activates here

1. Commit all production changes and freeze the release source identity.
2. Run `pnpm build:mac:arm64` locally in the clean worktree. Mount or unpack the produced image and exercise the actual packaged application contract: launch/image validity, non-UAR payload presence, simplified first-run provider setup, and total UAR payload absence.
3. Dispatch the same frozen commit to Windows x64, Windows ARM64, Apple Silicon, and Mac Intel native runners.
4. Preserve successful immutable artifacts; fix only observed build/package failures and rerun affected jobs.
5. Publish all four installers directly to `Prometheus-AGS/the-boss` GitHub Releases, then immediately commit and push `RELEASES.md` and `release-manifest.json`.
6. Synchronize, commit, push, and deploy the landing site. Verify live `2.2.1` links and downloaded byte metadata.

**Integration gate:** this is the only runtime/build gate in the phase.

### Change 5 — Close the child with replayable evidence

**Task:** OpenSpec `5.1`  
**Gap:** `parent-release-handoff`  
**Owner:** KBD/release lead

1. Write one structured release receipt binding the frozen source to the four artifacts and the deployed site.
2. Record local Apple Silicon evidence, native workflow URL, checksums, signing state, commits, deployment, and live-link results.
3. Reflect and hand off the child.
4. Restore `integration-administration` task `4.5` through typed KBD transitions; do not edit generated waypoint projections.
5. Start the dedicated UAR sidecar investigation only after canonical state and the receipt agree.

## Agent-team coordination

The existing `boss-core` team remains the execution team. Ownership is exclusive by surface:

- **Release lead:** clean worktree, source freeze, commits, workflow dispatch, manifests, receipt, KBD handoff.
- **Runtime/desktop implementer:** compile-time capability, runtime/service guards, agent compatibility, onboarding action and locales.
- **Packaging implementer:** artifact selection, binary inventory, before/after-pack behavior, validators, platform matrix.
- **UX/site implementer:** landing synchronizer, generated release data, public platform policy and deployment.
- **Verifier/reviewer roles:** dormant until Change 4; then inspect only the complete native release boundary.

Agents share no writable build directory. Dependency-mutating commands and local installer builds are serialized.

## Acceptance

The child is complete only when:

1. GitHub Release `v2.2.1` contains resolving Windows x64, Windows ARM64, Apple Silicon, and Mac Intel installers from the same frozen commit.
2. Each artifact's version, architecture, size, SHA-256, feature profile, source commit, and signing state are recorded and verified.
3. The local Apple Silicon DMG is mountable and its packaged application satisfies the disabled-UAR profile.
4. UAR is absent from navigation, runtime selection, administration, process launch, and installer payload; stored UAR records remain intact.
5. The first-run screen has no CherryIN action and offers **Set up LLM Providers** through localized strings.
6. Compass, Rust Filesystem MCP, Prometheus CLI, `pk`, packaged skills, Docker services, SurrealDB, surreal-memory-server, and liter-llm configuration remain present.
7. `the-boss.know-me.tools` displays version `2.2.1` with four resolving GitHub Release URLs and no current Linux or IPFS row.
8. The release receipt is checked in and canonical KBD position is restored to `integration-administration` task `4.5`.

## Rollback

Keep `2.2.0` and its existing site entry unchanged until `2.2.1` assets and site links are verified. If any publication step fails, do not issue the child receipt or replace the current advertised release. Resume from the frozen commit and the last verified immutable artifact.

## Unresolved adversarial-review findings

No independent finding set was produced. The REST judge preflight reported no canonical identity for the configured judge/critic models and refused with `JUDGE_MODEL_COLLISION`; two isolated cross-model fallback agents then failed because their provider requires usage credits. This is a pending independent review, not a pass. It does not authorize intermediate test or review loops during implementation; the plan must receive an independent cumulative review at the completed native release boundary before final certification.
