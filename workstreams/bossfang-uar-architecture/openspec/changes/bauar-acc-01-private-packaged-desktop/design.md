# Design

## Context

See [proposal](proposal.md) for the observed gap and [private-profile contract](specs/packaged-profile-isolation/spec.md). Existing constants load before boot-config/logger singletons, and main.ts resolves userData before single-instance locking and path-registry freeze. Its strict low-level dependency rule permits only Node built-ins and Electron. The packaged branch does not honor the development suffix. This is optional path configuration, not a new service.

## Goals / Non-Goals

**Goals:** isolate the exercised application-owned roots; prove current packaged sidecar selection and effect-bound exact approvals; reuse existing fixtures.

**Non-Goals:** universal OS sandbox, isolation of unselected third-party browser/provider imports, new credential custody, scheduler/recovery architecture, default-profile launch certification, signed/installed release.

## Decisions

1. Proposed environment interface: `THE_BOSS_PROFILE_ROOT`, read once in `core/paths/constants.ts` before any ordinary boot-config/logging consumer. Absent leaves existing branches unchanged. A supplied empty value is invalid; absolute existing directory and access are required. Node filesystem checks and Electron path assignment remain in this low-level module, no imports from services/business modules and no code added to main.ts.
2. Selected canonical root R owns `R/config` (CHERRY_HOME), `R/config/boot-config.json`, `R/user-data`, `R/session-data`, `R/logs`, `R/temp` (Electron temp; app.temp may append its current product suffix), and UAR storage under selected userData/Data/Agents/.uar according to the existing registry. Create these only after validating selection. `app.setAppLogsPath` precedes LOGS_DIR snapshot. UserData/sessionData/temp must be set before downstream singleton use; userDataLocation must honor the selected root ahead of dev/boot-map/portable branches. The fixed path contract keeps private boot-map data from redirecting it. No unrelated path-registry rewrite.
3. Use built-in-only exports from constants for the selected paths; a new ordinary helper import here would violate the module's dependency rule. Logger unavailable at this point: invalid selection uses a fixed error category without echoing environment, configuration or credentials. Normal logging behavior stays unchanged outside selected private launch.
4. Adapt existing controlled provider/approval/native-desktop logic into new acceptance-only gate files named in proposal; do not use development main output or an external sidecar. Launch actual `dist/mac-arm64/The Boss.app/Contents/MacOS/The Boss` through installed Playwright Electron. Observe `app.isPackaged`, private resolved paths, managed executable/digest, authenticated integration and actual fixture effects. The three enumerated existing acceptance helpers currently resolve process.cwd()/out/main; adapt their main-directory input to the actual packaged app path, preserving development defaults. No mocked executor. Missing/empty/whitespace approval event cases are explicitly protocol-mutated real UAR streams; they are client compatibility evidence, not a claim of an independently malformed server.
5. Capture bounded categories/counts, not raw request bodies or credentials. Disable trace/screenshots/video for this gate in the existing shared config conditional; other gate settings unchanged. Controlled peer receipts must redact before disk write. Scan retained ordinary projection/fixture outputs for known canaries without printing matched values. Retain safe source/digest metadata only.
6. Repackage Boss after all parent production tasks are complete. Reuse unchanged UAR source/profile/archive digest; do not spend an hour rebuilding it. Retain the old .app under a separately named candidate copy before the package writer runs. Locked/pinned existing hooks are authorized from the earlier packaging scope decision; no changed dependencies or hooks.

## Risks / Trade-offs

- Early imports → keep constants dependency rule and bind before singleton construction; test actual package, not the helper.
- Third-party OS/keychain/system resources → gate selects only controlled providers; explicit owned-root claim, no universal sandbox claim.
- Default-profile compatibility → preserve unselected branches byte-identical where possible and include them in cumulative scoped review. No default-profile startup is run against the live account; this remains a declared untested compatibility limitation, not a selected private-launch prerequisite.
- New Boss source → frozen manifest/package receipts must bind that source, not retained prior asar. Do not overwrite or relabel old evidence.

## Migration Plan

No data migration. Optional variable is new; absence preserves current behavior. Use a newly named retained local candidate. Rollback means select old candidate and omit the variable; do not reset/delete sources or migrate ordinary profiles.

## Acceptance and dependencies

Tasks and populated [verification](verification.md) are requirements; no runtime gates have run. Root implementation 01/1.1, manifests 02/1.1–1.2 and coordinator 03/1.1–1.2 form the parent production barrier. Packaging 01/1.2 follows it; executable test adaptation 01/2.1 follows completed production/package. Change 03/2.1 runs the consolidated gate. No per-edit tests, native module rebuild or product review before that barrier.

Plan approval ratifies the proposed optional root and unsigned local scope. Wider release authority remains separate.

## Plan reuse evidence

Plan references the existing Analyze candidates without reopening its research budget. 
- library: cand-001; ADAPT: Installed Playwright Electron automation. Keep installed versions; adapt actual bundle launch and private roots rather than introducing another framework. Evidence: [Existing framework/config; installed Playwright1.62.1 and Electron44.2.0 observed in local metadata.](/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/playwright.config.ts); [Official experimental Electron API supports actual executable launch, supplied environment and main-process observation.](https://playwright.dev/docs/api/class-electron); [npm view observed latest1.64.0; no upgrade selected.](https://www.npmjs.com/package/@playwright/test). Risks retained: Current documentation is not a version-pinned compatibility proof for1.62.1. Traces/screenshots may retain secret canaries; sanitize or disable sensitive capture.

- library: cand-002; ADAPT: Boss experience and approval integration fixtures. Reuse bounded assertions while proving current packaged generation and bundled binary selection. Evidence: [Existing gate launches development output with required external sidecar override; scenario logic is reusable but launch contract must change.](/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/uarExperienceGate.test.ts); [Controlled model responses check actual filesystem effect before completion.](/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/support/uarExperienceProvider.ts). Risks retained: Unchanged gate would certify external-sidecar behavior. Fixtures cannot replace actual tool/admission authorities with mocks.

- library: cand-007; ADAPT: Existing Boss early startup configuration/path pattern. Smallest proposed Boss adaptation for explicit isolated acceptance requirement; Spec/Plan approval required before implementation, then repackage Boss only if UAR unchanged. Evidence: [Boot config resolves under home and logger paths are fixed early.](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/paths/constants.ts); [Packaged selection uses boot map/branded appData; development suffix is unpackaged-only.](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/preboot/userDataLocation.ts); [Path roots must precede registry freeze/single-instance startup; capability belongs to existing startup configuration responsibility.](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/preboot/README.md); [Application path configuration timing is explicit; sessionData must be established early.](https://www.electronjs.org/docs/latest/api/app). Risks retained: Proposed private-root interface does not exist yet in inspected paths. Must cover early config/log consumers and retain ordinary defaults. Alternative isolated OS-user environment availability not established.

See [Plan](../../../.kbd-orchestrator/phases/phase-bauar-release-acceptance/plan.md). Proposed commands/runtime/input records remain unexecuted; task timing and source boundaries are governed by the full-production barrier.
