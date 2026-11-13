## Current qualification — installed closeout, 2026-11-13

The historical run below is preserved. Its local-only runtime and missing installed-surface limitations are superseded for #81 by [installed-closeout-2026-11-13/identity.json](installed-closeout-2026-11-13/identity.json) and [parity.json](installed-closeout-2026-11-13/parity.json).

- Repaired source: upstream PR #223 head `7f56124f235a5bccd586ff69e8576de28af1b55f`, merged as `6d26f0c2b41b4b98260b64a278b59ec0973916f9`. Clean upstream source worktree observed.
- Executable: prometheus 1.14.0, SHA-256 `580bd03c7188e3b371cd428f85de7859bd92eadc42b9a9cacb56689b9f21525a`; absolute path in identity.json. Build relationship is upstream-reported, not independently attested here.
- Mini base: `c54ffdfc8e78a170a8b3f41db66ba44433a0a353` plus uncommitted corpus/adapter and qualification-runner changes. Exact runner/adapter hashes and full generated/installed payload file hashes are recorded. The corpus stays pinned to `f4076141`; #81 uses its existing cases 18–23, not the later budget case outside this issue.
- Selected-installed surface: Claude Code 2.1.319, real marketplace installation into isolated configuration. Registry reports mini 1.13.2; repository package.json reports 1.14.0. Preserve these labels; payload hashes establish the tested bytes. All 821 installed files match generated Claude. No live user configuration or credential changes.
- Result: 6/6 cases on each of four surfaces with exact normalized parity, real direct/native and Node-wrapper routes, no successor. The initial driver's 240-second limit interrupted the last surface; installed-only resumption passed in 89 seconds. No passing surface was rerun.
- Reproduction: invocation.json gives the initial exact arguments/environment; installed-invocation.json gives the bounded resumption. installation.json and the copied marketplace/install registries establish actual registration. All files are under the linked run directory. Temporary installation paths are session-local; recreate through the documented installer invocation if removed.
- Reuse these receipts for #62; no second corpus/ledger. Windows/Linux, installed Codex, remote control plane and harness hook activation remain unverified.

## Historical qualification (preserved)

# Receipt identity — mini #81 (run 2026-11-13, macOS arm64)

One run of `node --test scripts/kbd-phase-closure.conformance.test.mjs` with
`PROMETHEUS_CLI_TEST_BINARY` set to the repaired binary and `PROMETHEUS_CLI_REQUIRED=1`.
Result: 5/5 tests pass; 23/23 corpus cases on each of source, generated claude, generated codex.

## Canonical artifact (A1)

- Source: `Prometheus-AGS/prometheus-skill-system` commit
  `f4076141edace19dc3e841e421686744a4d38c7e`, branch
  `claude/fix-219-phase-close-admission-1d13d7`. **Local only: not pushed, not merged.**
- Binary: `tools/prometheus-cli/target/release/prometheus` in that worktree,
  `prometheus 1.14.0`, sha256
  `2a398174064324df9b42319956e5d5f3ce681bc40c7b339f8edc5d6f5315472f`.
  The version string is the same as an unrepaired 1.14.0; identify it by hash.
  The link from source commit to binary is the building session's report, not independently attested.
- Corpus: vendored from that commit, git tree `287ef28691e6e4eaaa0d1baa5f9959fee2b2c907`.

## Mini identity

- The receipts record mini commit `c54ffdf`, but the run used an **uncommitted** working tree on
  branch `kbd/issue-81-admission-parity`: the adapter change
  (`test/conformance/kbd-phase-closure-adapter.mjs`) and the refreshed vendored corpus.
  No mini production file was changed.

## Acceptance mapping

| | Cases | Result |
|---|---|---|
| A2 wrong phase / wrong project / missing source hashes / empty observation | 18, 19, 20, 22 (and 21, stale hash) | Direct close exit 7, Node wrapper exit 2, no CLOSED, on all three surfaces |
| A3 valid receipt closes once, repeat and replay idempotent, no successor | 23 | Pass on all three surfaces |
| A4 identical disposition across entry points | all | Source, generated claude and generated codex agree |

## Not verified

- **Selected-installed entry point (part of A4):** no installed mini payload was found on this
  machine, so it was not run.
- Windows and Linux hosts; the remote control plane.
- Budget-ceiling agreement between routes is outside these four cases. The upstream session
  reports direct close still accepts over-ceiling evidence that the wrappers refuse.

## Closeout confirmation

#81 closed as completed; verified by GitHub read-back. See installed-closeout-2026-11-13/github-closure.json. Independent static and evidence-consistency reviews are in ../review/installed-closeout; same-family, no independent re-execution or source-to-binary attestation claimed. Final strict screens passed with score 0.
