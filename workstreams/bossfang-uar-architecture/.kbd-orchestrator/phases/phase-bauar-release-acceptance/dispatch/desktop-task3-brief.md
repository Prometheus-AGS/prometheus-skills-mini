### 01/2.1 — executable scenario source readiness

**Owner:** desktop; cwd Boss. Create tests/e2e/gates/bauarPackagedAcceptance.test.ts and support/bauarPackagedLaunch.ts. Modify tests/e2e/gates/playwright.config.ts and exactly three helpers: scripts/gates/bauar-native-admission-controls.ts, bauar-native-desktop-cases.ts, bauar-secret-projection-lifecycle.ts. Other provider/approval fixtures are reused unchanged.

Proposed launchPackaged(config,profileRoot)→{app,page,mainDirectory,stop}; launch real app executable through installed Playwright Electron, inspect app.isPackaged and app.getAppPath in actual main process. mainDirectory=join(app.getAppPath(),"out","main") resolved inside Electron ASAR; require exactly one already-loaded Application chunk. Never substitute development out/main or external sidecar.

Append optional mainDirectory argument/options to installNativeControls, exerciseNativeDesktopCases, exerciseNativeStorageCases, exerciseNativeRestart and closeProjectionHistorySession as needed, forward through nested calls/storageRoot. Omitted-input development behavior remains join(process.cwd(),"out/main"); selected packaged gate supplies actual ASAR directory. No product service edits for test convenience.

Map all D01–D04 Spec rows into named real scenarios: invalid roots/private boot-map; bundle selection/authenticated readiness; strict approval matrix with actual effect counts; eager0discovery/1admission/1approval/1effect and deferred32fillers/1discovery/2admissions/2exact approvals/1target effect; existing claim/persistence/cancel/restart controls; split/error/partial/reconnect same execution/cursor; known secret echo/projection negatives. The root's branded appData fallback must be bypassed and private selected userData observed; do not inspect live default profile contents or reset global appData.

THE_BOSS_E2E_GATE=bauarPackagedAcceptance.test.ts selects safe capture conditional: trace/screenshot/video off; other gates unchanged. Gate uses THE_BOSS_ACCEPTANCE_CONFIG referring to source-bound phase config. Report only fixed case identifiers/categories/counts/digests, no raw error/body/canary attachments. Scenario source delivery ends this task; real assertions wait for03/2.1.

Full phase global constraints remain binding. Parent alone owns canonical state. No commits or unrelated edits. Return /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/dispatch/desktop-task3-report.md.
