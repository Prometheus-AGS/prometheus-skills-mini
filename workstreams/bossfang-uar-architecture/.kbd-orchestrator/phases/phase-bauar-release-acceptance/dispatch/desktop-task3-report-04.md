# Desktop task 01/3 source readiness correction 04

Preserves deliveries 01–03. The actual consolidated D01 retry proved the packaged invalid-root startup remained alive for 30 seconds and did not emit its fixed refusal. The authorized production correction in constants.ts now emits only that fixed message with synchronous fs.writeSync and exits with status 2 before logger/configuration setup; the preboot README documents that behavior. Package01 remains copied and hash-verified under retained-before-startup-refusal.

The unchanged prepare hook initially failed on broken liter-llm Git metadata. Authorized local recovery copied the pinned commit into exclusive self-contained metadata without checkout/source edits, and the unchanged hook then proved the H02 test source was the remaining dirty artifact. Attempt03 temporarily materialized only H02 HEAD bytes, passed unchanged preparation, then failed the genuine Boss build with TypeScript errors. Its finally restored the exact H02 working bytes and all owned process groups were absent.

Bounded diagnostic06 identified TS2307 at UarHostMcpBridge.ts:6 and uarProjectedMcpTransport.ts:4, plus TS2322 at the launch helper’s electron.launch env. These source errors are distinct from native dependency failures. The e2e configuration inherits browser aliases; the external MCP fixture previously imported a separate source bridge exercise eagerly, bringing its main-only aliases into that compiler graph. Production bridge imports remain unchanged. Root authorized one additional fixture path: bauar-secret-projection-mcp.ts now loads the exact source bridge only inside exerciseProjectedClaims, retaining a typed narrow factory/operation contract using the actual SDK and admission types. The packaged gate uses its external HTTP fixture capability. The existing claim exercise still invokes the real source factory at the exact URL and has not been executed by this worker.

The launch helper now filters undefined inherited environment values into Record<string,string>, satisfying Electron’s actual launch contract while preserving all defined values and overrides. No dependency versions, manifests, lockfile, hooks or tsconfig were changed.

Production and fixture corrections are coherent and ready for the failed build retry. Build/package retry and H02 staging are held for the root’s single-writer release while it diagnoses the UAR compiler. No runtime test, standalone/per-case fixture launch, formatter, review, source/config/seal promotion or canonical mutation was performed. Package02 and passing D01–D04 are not claimed. All eight desktop source paths below are under 500 lines; six unchanged from delivery03. Production hashes are separately recorded in desktop-startup-correction-readiness-01.json.

```json
[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/bauarPackagedAcceptance.test.ts",
    "sha256": "233fe23662fa5fe8a2d8006418611308f1cb78207efa03db4c96e37567649291",
    "lines": 352
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/tests/e2e/gates/support/bauarPackagedLaunch.ts",
    "sha256": "e376ee6ed4ae213aaf212f539bd4bcb0d357681b259a737d3fc60c80005390a3",
    "lines": 286
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
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/scripts/gates/bauar-secret-projection-mcp.ts",
    "sha256": "3800bd4d7fe17841f366e07c2e7a34f62398b0aea6b19c9d729e1aaed6642054",
    "lines": 437
  }
]
```
