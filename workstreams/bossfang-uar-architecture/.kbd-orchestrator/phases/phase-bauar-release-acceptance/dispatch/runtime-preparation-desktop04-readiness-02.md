# Dormant preparation amendment: desktop04 and compiler wrapper correction03

Supersedes the earlier source-readiness reports for the changed modules only; original reports and byte-identical pre-desktop04 module snapshots remain historical. No binder, sealer, packet assembly, config/barrier writes, build, runtime gate, review or formatter ran in this task.

Binder08 now requires the exact eight desktop source suffixes: prior seven plus the already selected scripts/gates/bauar-secret-projection-mcp.ts. Existing component declaration is retained; if absent, only this already selected fixture can be appended to desktop sourcePaths. Sealer03 checks the same eight actual declared refs, emits recordedDesktopSources and formatScope.desktopPaths for all eight, and the packet assembler explicitly includes recordedDesktopSources in its finite union.

Binder request adds mandatory commandCorrection:{path,sha256}, naming actual compiler-environment-correction-03.json. The record must identify uar-regression and exact before env.SCCACHE_DISABLE="1" / after build.rustc-wrapper="". Only argv position1 after existing --config may change. Receipt retains complete before/after command objects. All other command arguments, features, profiles, targets, environments, package path names and executionKey remain unchanged; arbitrary command drift is rejected.

Sealer03 cumulative preparation inventory additionally requires actual diagnostic driver05/06 modules, diagnostic05/06 receipts, compiler-diagnostic-amendment02 and compiler-environment-correction03. Pending diagnostic06 may not be represented as completed; metadata execution remains held until root releases final coherent package/source/runtime preparation and frozen config.

Actual readiness input paths remain explicit CLI/binder request refs. Desktop report04/source04 and harness fixture readiness02 are source-ready evidence; package02 is still pending and no runtime acceptance is claimed here. Root owns all actual binding and sealing. New module hashes below must be used for eventual source review/format metadata.

[
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/candidate-input-binding-08.mjs",
    "sha256": "d0cbf5dc7f0ceb4f6ec0ba226a69b30cc8b606f878e4f64ee314f0065f198b27",
    "lines": 189
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/runtime-seal-driver-03.mjs",
    "sha256": "f61f8deb94000ef69b939454c1b480dc0e976bf47e24b7fd9aa831bbe1b3a3e6",
    "lines": 243
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/cumulative-review-packet-driver-01.mjs",
    "sha256": "cc42742609c7d0a4dda744d6125cef11c9b0f2fc3993d3fe7eed2acb73eef17b",
    "lines": 213
  }
]
