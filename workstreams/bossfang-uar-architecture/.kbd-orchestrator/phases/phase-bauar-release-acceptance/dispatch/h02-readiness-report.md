# H02 source readiness amendment

Approved amendment implemented after lead-confirmed complete source-bound Boss package at 2026-10-09T22:32:07. Owned Rust path: /Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_full_harness_cursor.rs. Exact scenario: exact_admission_retry_preserves_original_run_and_rejects_changed_input.

SHA256 d8fbd67b52e672712aaecaca2915d6238ebd76463796487707df5c04181ba41a; 436 lines. Existing two cursor scenarios remain. Only this test file changed in UAR; no production binary/source/lock/toolchain/auth change.

Fixture now owns a per-instance Arc<AtomicUsize> counter incremented by the actual loopback HTTP model handler. Scenario admits one complete payload, requires nonempty original task/run and actual terminal agui.done/model calls>0, then retries identical same admission_id and asserts original admission/task/run/epoch with no additional model call and unchanged retained stream frames. Changed input under same admission_id must produce409/error.code admission_digest_conflict, original task/admission correlation, unchanged model count and unchanged original retained stream. The counter is also checked after retained replay. No synthetic task outcome/model call/receipt is generated.

Loaded prometheus-rust-workspace, rust-best-practices and rust-async-patterns. rust-router absent. Nearest Rust tier rules recommend per-edit checks; explicit phase task scope defers all checks to consolidated integration and finite read-only rustfmt. No tests/builds/format commands/product review/commits/canonical edits ran. Compile and runtime behavior remain unverified; the selected server-full,test-probes supporting batch must execute the new named scenario (>0 substantive cursor tests). F6 excluded files never accessed.
