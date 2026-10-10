# Desktop startup environment diagnosis — observation 01

Phase: phase-bauar-release-acceptance. Review-only diagnosis of integration03's existing owned D01 instance. **Integration is incomplete; no runtime PASS or completed Execute is claimed.** This artifact records prior bounded observations and current source identity. It adds no product fix or runtime action.

## Observed state and conclusion

The existing instance reached the packaged bundle-readiness call. Its main renderer was complete, with a visible root and an exposed preference API. The actual packaged Application chunk was loaded exactly once. Readonly `application.getExisting` returned the existing UAR service: `startPromise` was present, no running-sidecar record existed, and stopping was false. Thus the observed wait is within UAR startup, after the launch helper's preference step; it is not merely a window-loading delay.

Only the D01 private profile existed. Five invalid-root control receipts had already been produced; this does not certify D01. Metadata showed no files beneath the private UAR directory and no managed-secret ciphertext or temporary ciphertext file beneath private Prometheus state. No secret, configuration or private log body is included here.

One expressly authorized one-second native sample of owned Electron PID16410 completed with exit0 and signalnull. Memory-only classification found `SecItemCopyMatching` twice and Keychain symbols17 times. Raw sample output and logs were discarded; symbol counts establish native Keychain access, **not** a visible consent dialog, permission denial or a proven deadlock.

The inspected control flow narrows the wait to the managed-secret / OS-encryptor initialization corridor. The exact pending native suboperation and any requirement for user consent remain unconfirmed. Timing alone does not justify a product timeout, credential bypass, dependency change or fixture replacement.

## Source trace

| Inspected source | Lines | Relevant behavior |
| --- | --- | --- |
| [Packaged gate](/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/bauarPackagedAcceptance.test.ts:60) | 60–71 | Launch returns before bundleReadiness; D01 requires actual executable/digest/readiness observations before its PASS row. |
| [Launch helper](/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/support/bauarPackagedLaunch.ts:83) | 83–86,190–207 | Preference update precedes launch return; bundleReadiness awaits the real service ensureReady in the actual packaged main directory. |
| [UAR sidecar](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/ai/runtime/uar/UarSidecarService.ts:113) | 113–126,265–278,281–311 | ensureReady awaits ensureRunning; startPromise covers storage selection/startup. Managed secrets precede policy/config files and child spawn. |
| [Managed secrets](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/services/prometheus/integrationConfig.ts:111) | 107–137,199–212 | Missing ciphertext returns an empty secret set; provisioned secrets await async encryption availability, then encryption and an atomic file replacement. |
| [Applied UAR storage](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/ai/runtime/uar/uarStorageProfile.ts:16) | 14–30 | Missing private storage-profile ciphertext selects embedded storage without invoking decryption. |
| [Path registry](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/paths/pathRegistry.ts:202) | 202,216 | UAR and Prometheus state directories resolve under the selected application user-data tree. This does not make macOS Keychain private per profile. |
| [Application](/Users/gqadonis/.claude/worktrees/bauar-release-boss/src/main/core/application/Application.ts:572) | 572–578 | getExisting only resolves an already-created service; the observation did not instantiate or start a service. |

The companion reference JSON records SHA256 for every inspected local source. These are source-linked interpretations, not a complete source review or a substitute for the unfinished integration assertions.

## Exact Electron guidance and contradiction check

The declared and installed package versions were both Electron44.2.0. Context7 was consulted, then the matching official tag was read to avoid substituting later Electron behavior.

The [44.2.0 safeStorage documentation](https://github.com/electron/electron/blob/v44.2.0/docs/api/safe-storage.md) says the async encryptor initializes lazily after app-ready and availability resolves when initialization completes. Its macOS provider uses Keychain; consistent signing affects whether updates are recognized as the same app. Private filesystem roots do not replace this OS provider. This acceptance target is unsigned local macOS ARM64; signing remains deferred.

The [44.2.0 implementation](https://github.com/electron/electron/blob/v44.2.0/shell/browser/api/electron_api_safe_storage.cc) queues availability checks until OnOsCryptReady. A pre-ready availability call resolves false rather than hanging. The observed loaded renderer and initialized existing service give no evidence of a missing app-ready prerequisite.

[Official issue51759](https://github.com/electron/electron/issues/51759) describes Electron42.2.0 false availability and a SIGSEGV; a maintainer reports the correction for43 and a merged42 backport. Those symptoms differ from this live44.2.0 instance. Its arbitrary-delay workaround is not evidence for, or a proposed correction to, this observed wait. No matching documented44.2.0 deadlock was established by the bounded investigation.

## Evidence, limitations and next boundary

The lead's [immutable startup diagnostic](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/desktop-startup-environment-diagnostic-01.json) records the owned attempt, frozen config/seal identities, sanitized observations and pending operator clarification. SHA256: `1b496c1a0f63ebdbd863efd3ef0fb0cd17de890e6da55db7fde0d501c5ea7e40`.

The lead reported that exact SecurityAgent inspection was refused by the tool for safety reasons and asked the operator whether an actual prompt is visible. No alternative UI path or consent bypass was attempted. An unanswered clarification is not permission or proof that a prompt exists. This report makes no claim about live default profiles, OS-wide isolation, completed side effects, signing, installed operation or remote deployment.

This observation only read exact owned metadata, classified logs/stacks in memory, used bounded readonly debugger metadata and inspected the named code/docs. It did not read/hash F6, inspect secret values, restart or terminate the app, start another runtime, mutate credentials, change product/config/seal inputs, run tests/builds/formatting/review, or advance canonical state. The app remains alive under the lead's control. Any environment action or source correction needs an observed cause and a separately recorded boundary; current integration must retain its actual terminal outcome when available.
