# Desktop task 01/3 source readiness correction 02

Preserves desktop-task3-report.md and desktop-task3-sources.json as initial delivery history. Superseding current source hashes follow.

The lead observed an actual schema mismatch: scenario.observations admits only booleans and nonnegative integers, while the original catch path inserted a string category and nested diagnostic. Corrected the gate and receipt helper together: failure observations are now booleans only; the source-defined sanitized diagnostic/category/owned line number are written to a separate immutable mode0600 JSON under BAUAR_PRIVATE_ROOT. Its SHA-256 evidence reference is included in the failed scenario receipt. No raw message/body/canary is written.

UarSidecarService.ensureReady was inspected at actual candidate lines113–126: it exposes processId from running.processId. status lines129–143 also exposes the same optional value. D01 uses the actually exposed ensureReady processId and rejects missing/noninteger values before invoking ps against that exact owned PID. There is no invented PID field or fallback.

All other scenario mappings, actual ASAR main-directory threading, supporting fixture separation and commands remain as initial report. No runtime, test, build, formatter or review ran; this is a coherent source-interface correction before sealing. Parent owns canonical state and final manifests.

```json
[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/bauarPackagedAcceptance.test.ts",
    "sha256": "7c1f3e172dfafdc2ff3303d4e73173bdea63732c765925baa263ef5acfb0fd15",
    "lines": 349
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/support/bauarPackagedLaunch.ts",
    "sha256": "e4dfbe594908d95b390124099051a9a43ea88eca7ba5a294baf96831a47586f7",
    "lines": 273
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/playwright.config.ts",
    "sha256": "4d34d12a83b4e45fd3eb587900c96cada9b0709c3d66a5106441da319495b839",
    "lines": 28
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/scripts/gates/bauar-native-admission-controls.ts",
    "sha256": "b399f3cac713de73a46183f7104ce353174da04d536a2b89e380463f97e6b2ec",
    "lines": 319
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/scripts/gates/bauar-native-desktop-cases.ts",
    "sha256": "cf9a74ebd024fa0da1d56d64f083ea24d1495743300536615614636755bbd214",
    "lines": 399
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/scripts/gates/bauar-secret-projection-lifecycle.ts",
    "sha256": "70bf01b63487292757e52df73b655463c1fcb8a15c8ba44c04a28975729b7047",
    "lines": 19
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/scripts/gates/bauar-post-ack-cases.ts",
    "sha256": "2443fdf6c8d9ce1fea62a1cf146e696f4f9ddb41796822c52370b988b8506aa2",
    "lines": 351
  }
]
```
