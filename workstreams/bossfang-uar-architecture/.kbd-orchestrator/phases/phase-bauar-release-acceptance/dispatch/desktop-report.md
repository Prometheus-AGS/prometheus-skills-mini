# Desktop source handoff

Task: phase-bauar-release-acceptance / bauar-acc-01-private-packaged-desktop / backend 1 (Spec 1.1).
Status: scoped production source delivered; no runtime acceptance or independent review claim.

## Source manifest

- /Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/paths/constants.ts
  - SHA-256: `538f88ca47220a5d1f157a3d71637d40e217a148c3e1a867cdc5b780b97fcb96`
  - 5781 bytes; 138 lines.
- /Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/preboot/userDataLocation.ts
  - SHA-256: `ee296097de584e64bd14aefe8fa4bf191582c97ba56973a3037dc1f6c704f03f`
  - 4345 bytes; 116 lines.
- /Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/preboot/README.md
  - SHA-256: `46caa3eee97fdbafa42e77f311b49f8697b5f2fc0e8b5e9ae742478bae16e078`
  - 10900 bytes; 220 lines.

## Changes and contract

- constants.ts reads THE_BOSS_PROFILE_ROOT once. Absence returns undefined before filesystem access or Electron mutation in the new resolver. The exported PRIVATE_PROFILE_PATHS is a frozen record typed Readonly with root/config/userData/sessionData/logs/temp.
- Supplied selection must be absolute, exist, resolve through filesystem realpath to a directory, and be writable/searchable. Validation happens before creating the five owned subdirectories. Empty/relative/missing/file/inaccessible roots abort with the fixed message THE_BOSS_PROFILE_ROOT is invalid or unavailable.; neither supplied value nor underlying filesystem error is echoed.
- Selected root R binds CHERRY_HOME to R/config and therefore BOOT_CONFIG_PATH to R/config/boot-config.json. The resolver creates config/user-data/session-data/logs/temp, sets Electron userData/sessionData/temp, and sets application logs before LOGS_DIR is captured or downstream logger/boot-config singleton construction.
- resolveUserDataLocation returns immediately on PRIVATE_PROFILE_PATHS before development suffix, boot-map, portable, branded appData or legacy-directory selection. The private branch also bypasses dev log diversion, so suffix configuration cannot redirect either path.
- Existing pathRegistry source derives supervised UAR persistence from userData/Data/Agents/.uar and app.temp from Electron temp plus PRODUCT_DIRNAME; neither registry nor main.ts changed. No appData override, auth changes, service or dependency changes.
- Existing preboot README documents the optional root, exact directory contract, priority and limitations. It explicitly excludes a universal OS/keychain sandbox and external browser/provider imports.

## Absent-variable compatibility (source reasoning only)

The added resolver returns undefined immediately when the variable is absent. CHERRY_HOME then uses its original path.join(os.homedir(), CHERRY_HOME_DIRNAME) expression. BOOT_CONFIG_PATH and LOGS_DIR retain their original expressions. The old dev-log branch body is unchanged, and its added private-root condition is true when absent. userDataLocation's existing development, boot-map, portable, branded fallback and legacy-inspection bodies remain unchanged and retain order. There is no filesystem creation or app.setPath call from the new absent resolver. Actual default-profile runtime remains untested; this is not live-default compatibility certification.

## Evidence and deferred gates

Read the assigned desktop brief, change design/tasks/verification and private-profile specification, applicable Boss instructions, core/path/preboot documentation and exact source consumers. The three owned source files were clean in the initial scoped git status. Context7 /electron/electron documentation retrieved 2026-10-09 confirms app.setPath requires existing directories, sessionData must be set before ready, and setAppLogsPath must precede default log path access (source: https://github.com/electron/electron/blob/main/docs/api/app.md).

Boss .compass/verification.json was absent; graph freshness is unavailable. Used the documented bounded exact-source fallback for the constants consumers, registry derivation and main.ts resolver call. No graph build or runtime proof is implied.

No builds, tests, executable scenarios, compiler/lint gates, per-task product reviews, commits, canonical lifecycle operations or checkbox changes were performed. File hashing above is artifact identity only. The parent five-production-task barrier remains closed until the lead records all tasks. D01 actual packaged acceptance belongs to consolidated 03/2.1 after packaging and scenario readiness. Independent cumulative review remains deferred.

## Scope and boundary notes

The only writes are the three assigned source/documentation files and this report. No UAR file was accessed; excluded F6 paths were not read, searched, hashed, diffed or tested. No profile launch, live-profile mutation, cache pruning, dependency change or service takeover occurred.

A-3 boundary: the externally supplied environment path controls application-owned filesystem initialization. Explicit validation and fixed nonsecret failure preserve fail-closed selection without a silent ordinary-profile fallback. The catch also presents directory-creation or Electron-binding failures with the same fixed category; it does not promise rollback of directories created after successful root validation. No universal filesystem or OS sandbox guarantee is introduced.

The KBD skill's lifecycle examples and generic team per-task review instructions are subordinated to the task dispatch: the parent alone owns lifecycle/hooks, and all product gates remain at the complete delivery boundary. Existing sign-off instructions conflict with mini A-15 but are immaterial here because no commit is authorized or made. Expected sycophancy-correction SKILL.md is absent per the dispatch; no self-review certification is claimed.
