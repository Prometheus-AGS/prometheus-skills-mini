## Current assessment — 2026-11-13 installed closeout

The earlier blocked assessment below is superseded by fresh bounded qualification. A1–A4 now have receipts in [installed-closeout-2026-11-13](receipts/installed-closeout-2026-11-13/).

- A1: upstream PR #223 merged source `7f56124f235a5bccd586ff69e8576de28af1b55f` (merge `6d26f0c2b41b4b98260b64a278b59ec0973916f9`). Selected prometheus 1.14.0 SHA-256 `580bd03c7188e3b371cd428f85de7859bd92eadc42b9a9cacb56689b9f21525a`. Source-to-binary provenance remains upstream-reported, not independently attested.
- A2: cases 18–22 refuse wrong phase/project, absent/stale source hashes and empty observation fields through direct CLI (exit 7) and Node wrapper (exit 2), without CLOSED.
- A3: case 23 closes once; duplicate, changed-source retry and checkpoint replay are idempotent, with zero successor events.
- A4: source, generated Claude, generated Codex and selected-installed Claude each pass 6/6 cases; normalized results and canonical dispositions are identical. Claude 2.1.319 installed the package through its supported marketplace CLI into a disposable home/config; actual registry and payload hashes are retained.

The initial outer driver ended before the installed receipt at its four-minute bound. The three completed passing receipts were retained; only installed Claude was resumed. Aggregate equality is recorded in parity.json. Distribution check: 104 skills, no byte/mode drift. Corpus integrity and golden vectors pass. No production files changed. Windows/Linux, installed Codex, remote control plane and harness hooks were not exercised. This closes the bounded issue only, not the broader #62/#69 work or canonical KBD lifecycle.

## Historical assessment (preserved)

# Assessment — issue-81-admission-parity

Assessed 2026-11-13 against mini `c54ffdf` and full-pack `origin/main` `f8afbe2c`.
Source: [mini #81](https://github.com/Prometheus-AGS/prometheus-skills-mini/issues/81),
dependent on [full-pack #219](https://github.com/Prometheus-AGS/prometheus-skill-system/issues/219).

## Disposition: BLOCKED at A1 — no repaired canonical artifact exists

| Acceptance | State | Evidence |
|---|---|---|
| A1 select repaired shared-runtime artifact | **Blocked** | #219 is OPEN with no linked PR or branch. `close_input` in `tools/prometheus-cli/crates/prometheus-cli/src/commands/kbd_phase.rs` at `f8afbe2c` still keeps only `runId`, `contractDigest`, the evidence hash, scenarios and budget values; it reads no `phase`, `projectId`, `sourceDigests`, `attempted`, `observed` or `evidence`. Latest release is v1.13.0. |
| A2 refusal cases through both routes | Blocked by A1 | The direct route cannot refuse until the repair lands. |
| A3 valid receipt closes once, idempotent | Blocked by A1 | Must be receipted against the same repaired artifact. |
| A4 source / generated / installed parity | Blocked by A1 | Same. |

## Observed (this session)

- Mini's Node wrapper `lib/kbd/phase-close-eval.mjs` checks phase, project, run, contract digest,
  non-empty and fresh `sourceDigests`, and non-empty `attempted`/`observed`/`evidence` before it
  calls `prometheus kbd phase close`. This was read from source, not executed. It matches the
  issue's statement that no Node false-PASS defect is claimed.
- The installed binary on this machine is `prometheus 1.13.2`
  (sha256 `d0254e92…7517`, both `/usr/local/bin` and `~/.local/bin`). The issue's reproduction
  used 1.14.0 (sha256 `1dec570d…bc8d`), which is not installed here.

## Not verified

- The direct-CLI false CLOSED was not re-run in this session; it is taken from #219's recorded
  reproduction plus the source reading above.
- Nothing was run on Windows.

## Conclusion

There is no mini-side defect to fix. The fix lives in the full pack (CLI adapter + kbd-runtime
admission). Mini's work is qualification only and cannot produce receipts until a repaired
`prometheus` binary with a recorded source and binary identity is available.

The existing harness `scripts/kbd-phase-closure.conformance.test.mjs` already drives source and
both generated payloads against a real binary in isolated roots, so the four cases can be added
there rather than in a second corpus, as the issue requires.

## Closeout record

GitHub #81 closed as completed and read back on 2026-11-13. Acceptance comment: https://github.com/Prometheus-AGS/prometheus-skills-mini/issues/81#issuecomment-6850016120 . Fresh-context code/JavaScript reviews and evidence-consistency review found no defects; same-family limitation recorded. Final code and revised evidence screens passed strictly with score 0; the rejected first evidence-summary attempt is preserved. No production security hardening was added. Unrelated existing high-severity Zod dev-dependency advisory was recorded without changing dependencies. The new OpenSpec plan is committed locally as 68bcbb9; runner/evidence and pre-existing changes remain local, with no push or release.
