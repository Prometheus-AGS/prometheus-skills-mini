# Source intake handoff — change01 / task 5

The source intake implementation is complete: 241 paths (94 additions, 147 modifications, no deletions) are represented by the three actual checkpoint commits below. Acceptance and certification are operator-deferred; publication is not authorized. Build/package/runtime evidence is not claimed.

[Source receipt](source-intake.json) SHA256: `ae8dcf2d657cd419a45f65f6e7ae619bf50bbc90940b1ef9322cd97728cef13f`. [Schema validation](source-intake-validation.json): valid under draft 2020-12 with installed Ajv and ajv-formats. Checks compared finite existing receipts only; worker product hashes were not rerun.

| Repository | Candidate root | Base | Checkpoint | Intake owner |
| --- | --- | --- | --- | --- |
| uar | `/Users/gqadonis/.claude/worktrees/bauar-release-uar` | `a7cb972992d4f83db6585449ea81af0fe4a1c990` | `84ca0ffff5da8fafc1e2e7f5585efc07a396b14e` | uar-intake |
| boss | `/Users/gqadonis/.claude/worktrees/bauar-release-boss` | `822ed9990bd7626bbf76b04eeae184739c0f0655` | `bda3715df5425e323188f84c595978dbd4f2d1e5` | boss-intake |
| bossfang | `/Users/gqadonis/.claude/worktrees/bauar-release-bossfang` | `bac04cb6b2c144520e28234ad77f00d4cf0f5b23` | `1d518936cb15b79d30bdd315510ff925613a0f4d` | bossfang-intake |

Each candidate uses branch `codex/bauar-release-integration-2026-10-09`. Source roots, accepted bases and source HEADs remain separately recorded in the source receipt. Boss retains target-only commits `822ed9990bd7626bbf76b04eeae184739c0f0655` and `777af8e9fd81b7b6a4143e08ac81c42c99fbe8b9`. All 279 Bossfang inherited commit IDs are retained verbatim in the receipt. Bossfang is based on approved `bac04cb6b2c144520e28234ad77f00d4cf0f5b23`; original main `16beef0fcf3053970a901990df4fedbdf86bd87d` remains preserved. This is not an old-main backport.

Original-state preservation is evidenced by [UAR originalStatePreserved / originalScopedDigests](intake/uar.json), [Boss originalStateComparison](intake/boss.json), and [Bossfang preservation.before / preservation.after](intake/bossfang.json), bound to [task1 inputs](intake-inputs.json) and [candidate creation](candidate-creation.json). These are finite selected-path bytes/modes/index/ref claims; unrelated state is not claimed.

## Producer / consumer pairing

The following inventory is copied from Boss’s actual receipt; all listed paths occur in its 43-path intake. Contracts are inventory evidence with runtime behavior deferred.

### strict-tool-approval

Exact originating approvalId is preserved; controller serializes approval_id to /api/uar/runs/{runId}/tool-approval. Inventory-only; runtime deferred.

Producers: `src/main/ai/runtime/uar/UarAguiAdapter.ts`.

Consumers: `src/main/ai/runtime/uar/UarToolApprovalController.ts`, `src/main/ai/runtime/uar/uarApprovalLifecycle.ts`, `tests/e2e/gates/bauarApprovalClientFixture.ts`, `tests/e2e/gates/support/uarExperienceProvider.ts`, `tests/e2e/gates/uarExperienceGate.test.ts`, `scripts/gates/uar-exact-tool-admission.ts`.

### host-tool-admission-v2

Version 2 /uar/admission/v2 and tools.know-me.the-boss/admission; runtime_native/host_mcp exact invocation identity. Inventory-only; runtime deferred.

Producers: `src/main/ai/runtime/uar/toolAdmission/wire.ts`, `src/main/ai/runtime/uar/UarHostToolAdmission.ts`.

Consumers: `src/main/ai/runtime/uar/UarHostMcpBridge.ts`, `src/main/ai/mcp/createMcpBridgeServer.ts`, `src/main/ai/runtime/uar/uarHostClaimRevalidation.ts`.

## Change02 dependency handoff

The lead retains canonical completion and must transfer exclusive UAR/Boss candidate ownership from intake to the delivery owner before change02. Change02 task1 consumes this receipt and its SHA256, freezes actual toolchain/dependency/build inputs, and resolves native assets. Task2 changes only candidate Boss `build/local-uar-source.json` to UAR checkpoint `84ca0ffff5da8fafc1e2e7f5585efc07a396b14e` and creates the final Boss commit. The current Boss checkpoint above is the intake checkpoint, not that future final commit. Complete the source pin before the authorized Cargo/package/Boss directory-bundle operations.

The Boss receipt reports candidate `node_modules` absent and protected source `/Users/gqadonis/.claude/worktrees/bauar-boss/node_modules` also absent. Candidate `resources/binaries` and `resources/binaries/darwin-arm64` are absent while both exist in that source. `resources/uar`, `vendor`, `vendor/liter-llm`, and `vendor/universal-agent-runtime` are absent in both. These are existence-only observations; nothing was installed or copied.

Additional lead-reported metadata for change02 task1: primary Boss `/Users/gqadonis/Projects/prometheus/the-boss` has node_modules and native binaries; its package.json and pnpm-lock.yaml hashes match the candidate (`31fea5b69c367c82e0c5df8d7ff42f003593ab1c4a418f38f877f4a9df493bf0` and `39772b76b78b869b75171091396acd28742b43d4ffea54edd85cace5ec4675a7`). Native host is darwin-arm64, non-CI. This task did not independently inspect or materialize those inputs; bounded reuse and provenance belong to change02 task1.

Retain F6 exclusions `tests/bauar_session_owner.rs` and `src/uar/mcp_server.rs`; neither was accessed by this task. F6 remains cancelled. No product tests, builds, independent review, global formatting, publication, merge, branch push, dependency installation, asset copy or canonical KBD writes occurred here. No security hardening was added. Preserve all candidate refs/receipts and original caches; the lead remains cleanup owner.
