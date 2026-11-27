# VLBV protocol eval — claude-code

Generated 2026-11-27T10:05:41Z at commit `d759cdfbca960cf985b318a671ba26d41f3c5ba4`. Status: **run**.

Harness: 2.1.331 (Claude Code); model: harness default (family anthropic). Grader: MiniMax-M3. Samples declared: 3; decision rule: A sample is PASS only when every deterministic check passes AND the grader returns PASS. A failed deterministic check makes the sample FAIL regardless of the grader.

| Pass | Fail | Blocked | Not exercised |
|---|---|---|---|
| 8 | 1 | 0 | 0 |

| Case | Class | Verdict | Reason |
|---|---|---|---|
| OF01 | agent | PASS | 2 of 3 samples passed (needs 2) |
| OF02 | agent | PASS | 3 of 3 samples passed (needs 2) |
| OF03 | agent | FAIL | 2 of 3 samples failed; at most 0 allowed |
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
