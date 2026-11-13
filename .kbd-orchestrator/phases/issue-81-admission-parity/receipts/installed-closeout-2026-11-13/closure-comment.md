Verified the four bounded acceptance criteria on macOS arm64 (2026-11-13). Closing as completed. These receipts are reusable by #62; this does not close its broader scope or #69.

| Acceptance | Observed result |
|---|---|
| A1: repaired artifact identity | Upstream PR [#223](https://github.com/Prometheus-AGS/prometheus-skill-system/pull/223) merged head `7f56124f235a5bccd586ff69e8576de28af1b55f`, merge `6d26f0c2b41b4b98260b64a278b59ec0973916f9`. Selected `prometheus 1.14.0`, SHA-256 `580bd03c7188e3b371cd428f85de7859bd92eadc42b9a9cacb56689b9f21525a`. Build provenance is upstream-reported, not independently attested. |
| A2: malformed evidence | Existing corpus cases 18–22: wrong phase/project, missing/stale source hashes, empty required observation. Direct canonical close exits 7 without CLOSED; real Node evaluator exits 2 with REFUSED_BLOCKED. All four surfaces pass. |
| A3: valid closure and replay | Case 23: valid receipt closes once; duplicate direct close, source mutation, evaluator retry and checkpoint replay stay idempotent; changed receipt refused; zero successor events. All four surfaces pass. |
| A4: entry-point parity | Source **6/6**, generated Claude **6/6**, generated Codex **6/6**, registered installed Claude **6/6**. Saved case steps/exits and canonical disposition/phaseStatus/successor snapshots compare exactly. |

The selected installed entry point was installed by **Claude Code 2.1.319** using `claude plugin install prometheus-skills-mini --marketplace <mini-checkout> --scope user --json`, with disposable HOME/USERPROFILE/CLAUDE_CONFIG_DIR/XDG directories. Installer exit 0 and the actual installed_plugins.json registration establish the cache root used by the test. All **821 installed files** match the generated Claude payload. No live home configuration or credentials changed. Marketplace version remains **1.13.2** while repository package.json says **1.14.0**; file hashes, not version labels alone, identify tested bytes.

Execution: `node --test scripts/kbd-phase-closure.conformance.test.mjs`, with explicit `PROMETHEUS_CLI_TEST_BINARY`, `PROMETHEUS_CLI_REQUIRED=1`, `KBD_CONFORMANCE_INSTALLED_ROOT`, and `KBD_CONFORMANCE_CASE_IDS` selecting exact case IDs 18–23. The first outer driver hit its four-minute limit after three surfaces had written passing receipts. Only the unfinished installed surface was resumed with `--test-name-pattern=^corpus on installed claude$` (pass, 89 seconds); aggregate parity was then checked from all four saved receipts. Passing surfaces were not rerun.

Corpus checksums/golden vectors pass. Distribution consistency passes (104 skills, no byte/POSIX-mode drift). Invalid/empty case selection, missing installed root and missing runtime all fail explicitly. Two fresh-context static reviewers and a final evidence review returned no findings; same-family review is recorded, not claimed as cross-model verification.

Evidence is retained locally in `.kbd-orchestrator/phases/issue-81-admission-parity/receipts/installed-closeout-2026-11-13/`: exact invocation/environment, installer output/registries, identity and full payload hashes, four receipts, parity comparison, and negative-control results. Historical receipts remain intact. Mini base is `c54ffdfc8e78a170a8b3f41db66ba44433a0a353` plus existing uncommitted corpus/adapter changes and this qualification runner (runner SHA-256 `89b486010a909abdf12258e31c8ca4a5f62b75757dd73349b2823eb31bc489a6`). No push, release or merge of mini changes is claimed. Corpus remains pinned to `f4076141`; the bounded cases are reused rather than creating another corpus.

Receipt SHA-256 values:

```text
d4cd7389f5fe672c5932f7a8c5ae5ef3e05110661f8be1ea9eb1e04daf51e159  mini-source.receipt.json
24416d3f4db0871322ea4215796f09e9a5e2b89e46bcdb632241d1695ae43d5f  mini-generated-claude.receipt.json
e146bb6d6ca18270f46aee79efa9f70c46c4dfbfd1df6e66ed80024975c71ba8  mini-generated-codex.receipt.json
7a8e1b33ba54dad17a45c5a9d01db3ff24cc546d401bacaf67151933011422ac  mini-installed-claude.receipt.json
5d399bcb98a1ba0030ecd1385bb3f7bf228da6efb83a3490b7fc0e84ed295d8b  identity.json
797973ad0e86a69f7a8d32462047c4e446aada00ca6290d07194b0092e6b7a86  parity.json
```

**Not verified:** Windows, Linux, installed Codex, remote control plane, harness hook activation, independently attested source-to-binary provenance. The full dev-dependency audit separately reports pre-existing Zod advisory GHSA-mrhx-c7xc-m3w5; no dependency changes were made for this qualification.
