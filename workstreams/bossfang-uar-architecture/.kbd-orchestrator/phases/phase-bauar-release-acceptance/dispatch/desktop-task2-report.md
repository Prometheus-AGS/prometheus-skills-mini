# Desktop packaging handoff

Task: phase-bauar-release-acceptance / bauar-acc-01-private-packaged-desktop / backend2 (Spec1.2).

Result: the actual pinned payload preparation, application build and unsigned darwin-arm64 directory package each exited 0 after the five-task production barrier. Source/package binding passed. D01–D04 runtime acceptance has NOT run.

## Actual candidate and identity

- App: /Users/gqadonis/.claude/worktrees/bauar-release-boss/dist/mac-arm64/The Boss.app
- Boss source HEAD: 7a5bdb4b7c02e9f13875fc7f837815c03fe3dacd, with the three declared private-root source/documentation changes. Fifteen exact source/build-input hashes were recorded before the recipe and remained unchanged afterward.
- New ASAR SHA-256: 8a5bfa31956a357673b738006368f035d7256e48acd710da578786639b366120 (325872428 bytes).
- Retained prior ASAR SHA-256: cb035b690d5f9c77879eaa5243903594014fcb093734522e255b4f2ff51c4c9c. The new ASAR differs.
- Exact private-root compiled chunk: out/main/LoggerService-xDwPhVuw.js. Its built output and ASAR bytes both hash to 3d56860480cf7b71de6c8ccb74f59260d7d15688b7e3c5035ad3946d14859a4f; both contain THE_BOSS_PROFILE_ROOT.
- Bundled UAR SHA-256: 9f91874091f8241d97209fd21b8c0c5b79ae6cdeb82ee0e873a5ea4540a8adea.
- UAR source: 84ca0ffff5da8fafc1e2e7f5585efc07a396b14e; retained server-full payload. No UAR rebuild or source edit occurred.
- UAR archive SHA-256: 47a565ce5e4f63f28eebd9183a6ed6eeeffbdad13d1c8a6ec318fb2498c34bcb; matches packaged local marker archiveSha256.
- Packaged local marker SHA-256: d9d800ff54a56fce5e6ec1f6df9a11f807b218a1c53b5f4d19fc211ef3600050.
- Payload manifest SHA-256: 0e81fe2225a520dac4a4f7c798fa11f61a064b9a0a50ea2325debac9ab81f063.

## Execution and retention

All commands used /Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node with login:false and an explicit environment: Node24 first on PATH, THE_BOSS_UAR_ENABLED=1, THE_BOSS_UAR_LOCAL=1, THE_BOSS_LOCAL_UAR_SOURCE_DIR set to the isolated UAR candidate, CSC_IDENTITY_AUTO_DISCOVERY=false, CI absent. No .env/default production dotenv file existed in the isolated Boss cwd. Literal argv/environment are preserved in boss-package-plan-01.json. Child ambient credentials were not copied.

1. scripts/prepare-local-uar-payload.cjs — exit 0, 22:10:09–22:10:10Z.
2. pnpm.mjs run build — exit 0, 22:10:10–22:11:10Z. This includes the approved build script's typechecks and Electron-vite/utility builds; no separate broad lint/test gate was run.
3. pnpm.mjs exec electron-builder --mac --arm64 --dir --publish never — exit 0, 22:12:01–22:32:07Z. Existing native rebuild/download/package hooks were unchanged. No signing/notarization, DMG/installed operation, publication, merge or cache promotion claim.

Every stage receipt reports observed groupAbsent=true, unknownDescendants=false, no forced/graceful stop needed and outputPolicyFailed=false. Output was parsed transiently into counts and a digest; no raw build log or broad status listing was retained. The build errorLines counter is a broad substring counter (asset names can include “error”), not an observed compilation failure; actual build exit was 0.

Before electron-builder, the complete old app was copied to /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/retained-before-private-root/The Boss.app with Node cp preserving existing symlinks and timestamps. Actual capacity was checked (23,586,373,632 bytes available before copy; 622,847,389 bytes in the five selected identity files). Full copy completed and executable, Info.plist, ASAR, UAR and marker digests matched source. This is finite identity evidence plus completed-copy evidence, not a hash of every app file.

An earlier unnecessary recursive metadata inventory was positively identified by the original heredoc and parent/child relation and cancelled only at its owned PID3161; observed exit143. Its cancelled/not-used records are retained. It supplied no package evidence. No source, target, cache, old package or failure artifact was pruned.

Capacity briefly fell below5GiB during parallel host compilation. The lead stopped only its owned host compiler, then capacity recovered. Boss packaging remained within its original30-minute budget. The dependency mutation window was announced before hooks and released after builder completion.

## Disclosed existing-hook exception

existing-hook-status-preflight: local-uar-payload.cjs performs its pre-existing broad Git status internally. The lead explicitly confirmed the human-authorized unchanged packaging recipe includes this validator operation. No direct broad UAR agent status/review/search/read/hash/diff/test was performed, no raw status listing was retained, and no hook or excluded F6 file changed. The after-pack refusal probe remains inseparable packaging validation, not successful desktop startup evidence.

## Receipts and tools

- /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/boss-package-plan-01.json
  - SHA-256: 38161d9edcef76a201fb766dd51db7e60308f86185db0f2daaf189d9968a9898
- /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/boss-retention-01.json
  - SHA-256: f72f2976ea8f6f30e1e62a1c30798b5d852f3987009d79d36908a7d3cf7f5ecc
- /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/boss-stage-0-receipt-01.json
  - SHA-256: 47e5298555d55b5e2ce45d36765cd1ca457176f39c89558b7c763da19896dccb
- /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/boss-stage-1-receipt-01.json
  - SHA-256: 68ebbadd8ebcafc03801c9583c7e8ded662bf3ed5ba4737681347fcfc9c4e684
- /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/boss-stage-2-receipt-01.json
  - SHA-256: 3797b580caac0b3d54731eb2f5dd1f8d69c8bdb976c5fa2ce766dc07310fe45e
- /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/boss-package-01.json
  - SHA-256: 36d7f19b8c5642d23c215fdf8557c64d3762909bdda6c0af19054d573b642ed7
- /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/boss-build-driver-01.mjs
  - SHA-256: 41d26aa043b0e5cf9867186494d567c3dd5b426652d795ab2c3c950fe5be03c1
- /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/boss-package-bind-01.mjs
  - SHA-256: 45d95423781644d434a4f365e8106219ae79eaf16b0d8a363c6a0b8d7d78eacc
- /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/unused-retention-scan-01.json
  - SHA-256: b3fe7a91093d0a66a650f871732f178317a1998107dda6b7e4f5919428cfcd6a
- /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/unused-retention-scan-02.json
  - SHA-256: 4e4ce24e12bd9d8f1a6a49a12e4245e071ce6fc2664194ec8258ccbd11772b16

boss-package-01.json contains actual package-file identities, selected compiled-chunk binding, source manifest, per-stage receipt references and retention reference. The two small evidence-local Node drivers only execute the approved literal packaging recipe and bind its selected outputs; they do not create acceptance scenarios.

## Remaining boundary

No runtime scenarios, default-profile launch, GUI automation, product review, commit, canonical/task checkbox update or subagent occurred. Bossfang host compilation is a separate lead-owned prerequisite and was not claimed complete by this task. Signing/notarization, installation, other platforms, remote certification and release authority remain separate. Ready for parent lifecycle completion and assigned task3 scenario source work.
