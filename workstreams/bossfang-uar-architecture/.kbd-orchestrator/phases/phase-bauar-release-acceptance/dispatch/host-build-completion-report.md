# Host build completion — Execute

Recorded 2026-10-09. Scope: recover the interrupted owned API build, compile the exact API and kernel integration hosts without running them, and retain actual executable/receipt identities. No product code, dependency versions, profile overrides, formatter, review, or test execution was performed by this worker.

## Actual result

The durable Node supervisor exited **0** after serial API then kernel compilation. Both Cargo processes exited **0**, emitted exactly one selected test executable, reported successful build completion, left no owned process group or unknown descendants, and preserved the eight explicitly named Bossfang input hashes. Both receipts retain `acceptanceExecuted: false` and `compiled-not-runtime-tested`. Runtime acceptance belongs to the parent execution owner.

Bossfang source HEAD: `1d518936cb15b79d30bdd315510ff925613a0f4d`.

| Host | Start UTC | Finish UTC | Cargo PID/group | Elapsed |
| --- | --- | --- | --- | --- |
| API | 2026-10-09 22:48:15.518 | 2026-10-09 23:24:36.270 | 27473 | 36m20.752s |
| Kernel | 2026-10-09 23:24:36.592 | 2026-10-09 23:51:17.996 | 5885 | 26m41.404s |

Each receipt reports zero retained compiler errors, one compiler artifact, `buildFinished: true`, `buildSucceeded: true`, no output line overflow or output policy failure, and `sourceUnchanged: true`.

## Exact commands and output identities

Commands ran from `/Users/gqadonis/.claude/worktrees/bauar-release-bossfang` with the original explicit environment, two build jobs, Rust minimum stack 16 MiB, the original Cargo profile, and unchanged logical target directory `.context/bauar-release-acceptance-target`.

```text
/Users/gqadonis/.cargo/bin/cargo test --locked -p librefang-api --no-default-features --features uar-driver,surreal-backend,test-util --test bauar_harness_host --no-run --message-format=json
/Users/gqadonis/.cargo/bin/cargo test --locked -p librefang-kernel --no-default-features --features uar-driver,surreal-backend --test bauar_harness_delegation --no-run --message-format=json
```

The compiler emitted executable paths in the existing configured physical Cargo build directory. The worker used those exact records, canonicalized their paths, and hashed the actual executables; it did not infer a binary by filename or relocate the result.

| Host | Actual executable | SHA-256 | Bytes |
| --- | --- | --- | --- |
| API | `/Users/gqadonis/.cargo-build/b6/2d17bbd02e991f/debug/deps/bauar_harness_host-ca7e09f706903681` | `35058276816c7fad4284afa91ff222976bfa92ebd0f30256c7887fd2d771ac40` | 471463104 |
| Kernel | `/Users/gqadonis/.cargo-build/b6/2d17bbd02e991f/debug/deps/bauar_harness_delegation-9029d9b338b86a1a` | `75884365c0984889c5d89887f3de2991f2f7f8bb4ae46cd2da278b73d11a0705` | 164431432 |

Actual compiler feature records include Cargo feature unification: API `default,surreal-backend,telemetry,test-util,uar-driver`; kernel `default,surreal-backend,uar-driver`. These are the observed features despite the exact command's `--no-default-features`; no narrower closure is claimed. Both actual profiles are opt-level `0`, debuginfo `line-tables-only`, debug assertions and overflow checks enabled, test profile true.

## Evidence

All paths below are relative to this phase directory.

| Artifact | SHA-256 |
| --- | --- |
| `evidence/execute/host-api-compile.receipt-03.json` | `bd04d228291696f94623fced052ee50a3927c618c9c45bd2f2fa0373621b48a4` |
| `evidence/execute/host-api-compiler-artifacts-03.jsonl` | `bdb60d38561cc0a417b83cc08dbef7186b1d7d8df103ce3ba030c7dfe35d203e` |
| `evidence/execute/host-kernel-compile.receipt-03.json` | `b546a2ba526b0b50d31b259b940256ee9d9d80581647fba62bbb3ae88bc1a341` |
| `evidence/execute/host-kernel-compiler-artifacts-03.jsonl` | `59a17f43780b7eaa57ff9f187ba9515d087d746d4bf8927ae9fdb6ff2767ffcb` |
| `evidence/execute/host-build-driver-03.mjs` (118 lines, 6430 bytes) | `78ef1d4aa0ddb517fae23594294de28e8b52ddfdd6258debcbeffefb14489eb9` |

The worker independently reread both receipts and finite compiler records after supervisor exit, required one compiler-emitted artifact per target, and rehashed both executables against the receipt. This is build identity verification, not a runtime scenario gate.

## Interrupted prior build disposition

`evidence/execute/host-api-compile-reconciliation-02.json` records exact identity confirmation for orphan Cargo PID/PGID 58374, PPID 1. The lost supervisor's wait status was unavailable; `exitCode: null` remains explicit. The worker sent SIGTERM only to that confirmed owned group, observed group absence, and retained **CANCELLED**, without inventing successful exit or using SIGKILL. Historical receipts and caches remain retained.

## Boundaries and handover

Only phase-local driver/evidence/report files were authored. The F6 excluded UAR sources were not inspected. No services were added or modified, no model credentials were inspected, no raw process arguments or environment dumps were persisted, and no certification or canonical phase/task transition was made. Parent and runtime sealing owner were notified with exact host identities after both builds completed. The parent may now seal runtime inputs and run the already approved complete delivery gate.
