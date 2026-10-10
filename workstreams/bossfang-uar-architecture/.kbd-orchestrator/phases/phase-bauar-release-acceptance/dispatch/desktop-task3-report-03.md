# Desktop task 01/3 source readiness correction 03

Preserves reports and source manifests 01 and 02. The first consolidated batch actually failed D01 inside invalidRoots before the valid packaged startup. The retained sanitized failure record identified the outer gate call and AssertionError, but no negative-case process result was retained, so the production cause remains undetermined. Root confirmed that the full batch completed and owned cleanup succeeded before releasing this correction.

Only the existing packaged gate and its launch helper changed in this correction. Each invalid-root run now writes an immutable mode0600 JSON under BAUAR_PRIVATE_ROOT before its existing assertions. It records a fixed source-defined case name, actual runOwned category/exitCode, fixed refusal-marker boolean, and actual cleanup booleans. No output lines, credentials, canaries, raw error message, or stack are written. The gate collects the SHA-256 references and includes them on D01 success or failure; scenario.observations retains its boolean/count contract. Existing negative-case behavior, process budgets, and assertions are unchanged.

No production correction is claimed. No standalone/per-case launch, test, build, formatter, independent review, configuration/seal edit, canonical mutation, live-profile operation, or F6 read occurred. Parent owns resealing and retry of the failed consolidated desktop component after this delivery. Packaged ASAR and dependency inputs were not changed by this correction.

All seven owned source paths and current digests follow; five remain unchanged from delivery 02. This is source readiness, not a passing runtime result.

```json
[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/bauarPackagedAcceptance.test.ts",
    "sha256": "233fe23662fa5fe8a2d8006418611308f1cb78207efa03db4c96e37567649291",
    "lines": 352
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/support/bauarPackagedLaunch.ts",
    "sha256": "cb32066f454e2639e86f95fcfbeaae9f246459b950552683c94695d9e1ec878a",
    "lines": 284
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
