## Context

See `proposal.md` for motivation. The implementation target is the committed integration history in `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar`, whose active checkout also contains unrelated and incomplete working-tree changes. The application currently assumes UAR availability in renderer navigation, runtime registration, process supervision, integration actions, binary extraction, artifact selection, and package probes. Its release workflow already has native runners and direct GitHub Release publication, but the artifact manifest is narrowed to the two UAR-supported targets and packaging also expects a native liter-llm executable that the manifest does not provide.

The public release must be built from a clean source snapshot, preserve every non-UAR integration, support two Windows and two macOS architectures, omit Linux, and run one final integration gate after production changes are complete.

## Goals / Non-Goals

**Goals:**

- Make UAR availability one compile-time and packaging-time capability with identical semantics across all application processes and Node packaging scripts.
- Preserve database compatibility while removing every disabled UAR launch and administration path.
- Prove the complete UAR payload is absent from disabled installers, even when stale files exist in local caches.
- Publish four native installers from one frozen `2.2.1` commit and expose only those targets on the live website.
- Return a replayable release receipt to the parent KBD phase.

**Non-Goals:**

- Repairing, certifying, or exposing UAR in `2.2.1`.
- Deleting UAR schemas or migrating stored UAR agents.
- Building Linux installers.
- Adding a native liter-llm executable; existing service administration remains supported.
- Introducing a new build system, runtime dependency, service, or distribution host.

## Decisions

### One strict release-profile resolver

A small shared release-profile module resolves `THE_BOSS_UAR_ENABLED` using strict `0` or `1` values. The Electron Vite configuration injects `__UAR_ENABLED__` into main, renderer, preload, and utility bundles; packaging scripts import the same resolver. Ordinary development defaults to enabled, while the `2.2.1` local and CI release commands set it to `0`.

This is preferred to a settings preference because a mutable renderer value cannot govern files placed in an installer and cannot reliably block early main-process launch paths. Removing UAR types was rejected because it would break stored-record compatibility and greatly expand the patch.

### Gate every UAR reachability layer

The disabled capability is applied to runtime registration, new agent creation, settings navigation/search, direct settings routes, integration actions/history, managed credential provisioning, binary extraction, and the sidecar lifecycle service. The lifecycle service remains registered because existing session-runtime construction depends on it; every process-starting or administrative method returns a stable disabled result before resolving a binary.

The settings route redirects so stale links remain safe. Stored UAR discriminants remain in schemas, but disabled builds reject new selection or execution.

### Derive payload subtraction from the pinned manifest

The integration artifact selector returns only Compass, Rust Filesystem MCP, Prometheus CLI, `pk`, and Node in the disabled profile. It no longer treats liter-llm as a native tool. Before-pack exclusion derives the exact UAR file inventory for the active platform from the pinned `uar-sidecar` artifact entry and adds the version marker. After-pack and final package validation assert every declared UAR file is absent.

Deriving the inventory is preferred to filename literals because current UAR packages contain the executable plus models, dynamic libraries, a license, and a payload manifest. A hard-coded executable exclusion would reproduce the corrupt partial-package failure.

### Use a clean release worktree and frozen commit

Execution creates a new release worktree from the current committed integration head, reconciles the latest `origin/main` release metadata, and carries no unrelated working-tree modifications. All production changes, version metadata, website synchronization logic, and release notes are completed and committed before any installer build starts. The resulting commit is frozen as the only acceptable source commit for all native manifests.

This protects existing work while retaining the committed integration history. Building directly from the dirty integration checkout was rejected because it could silently include partial Gate C or agent-team changes.

### Reuse the native workflow as one release gate

The existing workflow builds `win32-x64`, `win32-arm64`, `darwin-arm64`, and `darwin-x64` on native runners. The disabled profile expands the integration manifest to these four targets because every retained native tool already has an artifact for each target. Linux is rejected by the `2.2.1` supported-platform policy.

The final gate begins with local `pnpm build:mac:arm64`, including mounted/unpacked image validation. The frozen commit is then dispatched to all four native jobs. Successful immutable artifacts are retained; an observed platform failure is fixed and only that platform is rebuilt. No unit, per-edit, or partial verification loop runs before this boundary.

### Publish directly to GitHub and make platform policy explicit

The release workflow uploads installers directly to the `Prometheus-AGS/the-boss` GitHub Release and records checksums, sizes, source commit, architecture, profile, and actual signing state. IPFS is removed from current release claims.

The landing-site synchronizer consumes a supported-platform set from release metadata. This replaces carry-forward behavior that would otherwise retain Linux from an older release. Site deployment happens after release asset verification and fails closed when a current asset is missing.

### Close through a release receipt

One structured receipt records the frozen Boss commit, release tag, UAR profile, all four assets, native workflow run, local Apple Silicon result, release and site commits, deployment URL, and live-link checks. The KBD handoff references this receipt and restores `integration-administration` task `4.5` through typed transitions. This makes the release interruption explicit and lets the later UAR repair work start from a known customer baseline.

## Risks / Trade-offs

- **[Signing credentials may remain unavailable]** → Record the actual signing and notarization state; do not claim signatures that were not produced. Publication can proceed with explicit unsigned status.
- **[Mac Intel or Windows ARM64 exposes a native dependency gap]** → Treat it as a failure of the final native gate, fix the observed blocker on the frozen release branch, update the frozen commit consistently, and rerun affected artifacts.
- **[A UAR path is missed outside the obvious UI]** → The sidecar lifecycle service is the final process boundary and rejects every start/admin call while disabled; package validation independently proves the binary payload is absent.
- **[Stale artifacts are aggregated across profiles]** → Every installer manifest carries version, source commit, and feature profile; aggregation rejects mismatches.
- **[The website retains stale Linux entries]** → Current release metadata declares an exact supported-platform set and the synchronizer uses it as an allowlist.
- **[The clean release worktree misses uncommitted useful changes]** → Only committed integration history is release input; unrelated and partial working-tree files remain preserved for later phases.

## Migration Plan

1. Create a clean `2.2.1` release worktree from the committed integration head and reconcile upstream release metadata.
2. Implement and commit the application capability gate and manifest-driven payload profile.
3. Implement and commit four-platform release metadata plus landing-site supported-platform synchronization.
4. Freeze the source commit and run the single release gate: local Apple Silicon build, then four native jobs and installed-image validators.
5. Publish the GitHub Release, commit aggregate release metadata, synchronize and deploy the landing site, and verify all live asset bytes.
6. Write the release receipt, hand off the child, and restore the parent phase at task `4.5`.

Rollback preserves the existing `2.2.0` release and site data until `2.2.1` has verified assets. If publication cannot complete, the current release remains advertised and the child does not issue its completion receipt.
