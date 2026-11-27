# VLBV protocol eval — claude-code

Generated 2026-11-27T11:53:16Z at commit `5e5c65fcb24b6b092bd51cc3299126d0380b5a1e`. Status: **run**.

Harness: 2.1.331 (Claude Code); model: harness default (family anthropic). Grader: MiniMax-M3. Samples declared: 3; decision rule: A sample is PASS only when every deterministic check passes AND the grader returns PASS. A failed deterministic check makes the sample FAIL regardless of the grader.

| Pass | Fail | Blocked | Not exercised |
|---|---|---|---|
| 9 | 0 | 0 | 0 |

| Case | Class | Verdict | Reason |
|---|---|---|---|
| OF01 | agent | PASS | 2 of 3 samples passed (needs 2) |
| OF02 | agent | PASS | 3 of 3 samples passed (needs 2) |
| OF03 | agent | PASS | 3 of 3 samples passed (needs 3) |
| OF04 | agent | PASS | 3 of 3 samples passed (needs 2) |
| OF05 | agent | PASS | 3 of 3 samples passed (needs 3) |
| OFM1 | agent | PASS | 3 of 3 samples passed (needs 2) |
| OFM2 | agent | PASS | 3 of 3 samples passed (needs 2) |
| OFM3 | agent | PASS | 3 of 3 samples passed (needs 3) |
| OFM4 | agent | PASS | 3 of 3 samples passed (needs 3) |

## Isolation (AUTH-ISO-1)

- Real harness state unchanged: false
- Keychain item listing unchanged: true
- Copied auth files left behind: 0
- Auth files in the repository working tree: 0
- changed: ~/.codex/config.toml
