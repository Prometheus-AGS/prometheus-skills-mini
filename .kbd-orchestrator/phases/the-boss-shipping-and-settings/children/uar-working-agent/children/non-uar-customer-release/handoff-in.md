# Handoff in — uar-working-agent › non-uar-customer-release

**Spawned by:** `uar-working-agent`

## Why this child was spawned

The customer needs a complete non-Linux release before the UAR sidecar investigation can continue. The current sidecar is excluded because the Windows installer omitted it and the macOS package was unusable; those failures must not prevent delivery of the completed non-UAR product.

## Inputs

- `../assessment.md`
- `../plan.md`
- The Boss worktree at `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar`
- Existing GitHub Release and landing-site publication automation

## Success criteria

- UAR is absent from customer navigation, routes, startup, diagnostics, and required payload validation in the release build.
- Windows x64, Windows ARM64, macOS Apple Silicon, and macOS Intel installers are built from one recorded source revision and published to GitHub Releases.
- Release metadata and `the-boss.know-me.tools` expose the verified downloads; Linux is intentionally omitted.
- Apple Silicon is also built locally with `pnpm build:mac:arm64` and the produced DMG is mounted and inspected by the packaging validator.

## Expected deliverables

- Reversible UAR release feature gate.
- Four native installer manifests with source revision, checksum, size, architecture, and signing state.
- GitHub Release and landing-site URLs.
- Handoff naming the exact follow-up child for UAR sidecar repair.
