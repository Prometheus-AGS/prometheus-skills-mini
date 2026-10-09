# Proposal

## Why

The existing packaged helper edits live boot configuration, while the existing desktop gate selects development output and an external UAR. Current packaged acceptance requires a private launch that proves the managed sidecar came from the application bundle.

## What Changes

- Add optional early `THE_BOSS_PROFILE_ROOT` startup selection for private configuration, Electron user/session data, logs and owned temporary/sidecar storage.
- Preserve ordinary startup when this variable is absent; reject explicitly invalid selection before profile writes.
- Adapt the installed Playwright/Electron desktop gate at the complete parent delivery boundary to launch the actual package without an external UAR override and retain exact approvals and observable tool effects.

## Capabilities

### New Capabilities

- `packaged-profile-isolation`: optional private root selection before packaged application configuration and logger consumers initialize. Existing `platform-location-ownership` governs the mini tooling adapter, a different product/domain.

### Modified Capabilities

None. Existing `native-tool-admission`, `execution-bound-authorization` and `local-uar-bundle-provenance` requirements are acceptance baselines, not redesigned here.

## Impact

scope: Boss `src/main/core/paths/constants.ts`, `src/main/core/preboot/userDataLocation.ts`; acceptance-only new `tests/e2e/gates/bauarPackagedAcceptance.test.ts`, `tests/e2e/gates/support/bauarPackagedLaunch.ts` and minimal routing in `tests/e2e/gates/playwright.config.ts`. Also owned: src/main/core/preboot/README.md; acceptance-only scripts/gates/bauar-native-admission-controls.ts, scripts/gates/bauar-native-desktop-cases.ts and scripts/gates/bauar-secret-projection-lifecycle.ts. The latter three currently bind out/main; minimally accept the actual packaged main-directory path while preserving development defaults. Other gate fixtures remain unchanged. No change to `src/main/main.ts`, boot-config service, path registry or execution architecture is planned.

Owners: change 01 owns these Boss files; change 03 owns common orchestration and receipts. Installed Playwright 1.62.1/Electron 44.2.0; no upgrade. Boss must be repackaged from its completed source after the root change; unchanged UAR is reused by digest. Product root /Users/gqadonis/.claude/worktrees/bauar-release-boss.

## Phase boundary

Phase: `phase-bauar-release-acceptance`. Spec only; implementation awaits explicit Plan handover. [Prior context](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/prior-context.md) requires locked dependencies, matching child runtimes, retained rollback inputs and separate implementation/build/acceptance/publication evidence. [Analyze](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/analysis.md) is intent; its candidate decisions are reused, not proof of successful operation.

The inherited OpenSpec context says all F1–F7 and remote deployments. Later operator decisions override that context: F6 is cancelled; its two excluded UAR files must never be read, searched, hashed, diffed or tested. Remote receivers/IdP/custody and automatic UAR scheduling are excluded. Application/server configuration owns MCP credentials; no caller-JWT forwarding theory is reopened. No installed-cache edits, dependency/pin changes, service takeover, publication or shipping/C05 advancement.
