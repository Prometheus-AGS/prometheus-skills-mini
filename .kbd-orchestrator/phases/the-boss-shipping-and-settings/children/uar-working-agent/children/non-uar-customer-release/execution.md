# Execution — non-UAR customer release

## Backend

Hybrid execution:

- KBD is the canonical phase, task, evidence, certification, and publication state.
- OpenSpec change `ship-non-uar-desktop-release` is the implementation checklist and behavioral contract.
- Production code is implemented in a clean The Boss release worktree and the authenticated `Know-Me-Tools/boss-landing-spot` repository.

The OpenSpec planning store is repo-local to `prometheus-skills-mini`, so its generated `allowedEditRoots` lists only mini. The approved KBD plan and operator request explicitly define the cross-repository implementation targets; no Boss or site source is copied into mini.

## Dispatch contract

- Release branch: `release/2.2.1-non-uar`
- Release worktree: `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-release-2.2.1`
- Source baseline: committed integration head `02423129d5d60f4b61b9afaef25c8a4001c1ab0f`, reconciled with `origin/main`
- Distribution: GitHub Releases only
- Targets: `win32-x64`, `win32-arm64`, `darwin-arm64`, `darwin-x64`
- Feature profile: `THE_BOSS_UAR_ENABLED=0`
- Final integration gate: local `pnpm build:mac:arm64`, packaged-image inspection, then four native release jobs and public asset/site verification

## Ownership

- Root/release lead: worktree, source reconciliation, KBD/OpenSpec task state, commits, native dispatch, release aggregation, evidence, handoff.
- Runtime/desktop implementer: UAR capability and reachability gates plus onboarding/locales.
- Packaging implementer: artifact selection, binary inventory, pack hooks, validator, release matrix and metadata.
- Site implementer: landing repository supported-platform policy and deployment preparation.
- Reviewer/verifier roles stay dormant until all production code is complete.

## Rules

- Preserve every dirty file in existing checkouts by working only in the clean release worktree.
- Complete production tasks 1.1–3.1 before running any test suite or installer build.
- Mark tasks only through `kbd-apply` and keep the OpenSpec checklist synchronized.
- Fix only failures observed at the final native release gate and rerun only the affected gate.
- Execute completes only after GitHub assets, site deployment, release receipt, OpenSpec verification/archive, and canonical parent restoration are proven.
