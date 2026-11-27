# Qualification receipts — issue-98-outcome-first-parity

Status of every qualification item for Mini #98. A status is one of PASS, FAIL, BLOCKED or
NOT_EXERCISED. Nothing here is a model-session result yet: task 4.2 needs the operator's go-ahead
because each session is a paid model run.

## What has been exercised (no model sessions)

Recorded on 2026-11-27 on branch `fix/issue-98-qualification`, macOS, Node from the local toolchain.

| Check | Command | Result |
|---|---|---|
| The opt-in corpus loads, the default corpus still has 23 cases, an unknown corpus is refused | `node --test evals/vlbv-protocol/outcome-first.integration.test.mjs` | PASS (6 of 6) |
| Every skill and script the fixture installs exists in the generated package | same file | PASS |
| A seeded lesson reaches the real lookup script; one search leaves exactly one marker | same file | PASS |
| Memory service down and pk present: the lookup answers from pk, no search recorded | same file | PASS (skipped on Windows: no stand-in pk executable) |
| Both sources down: the lookup exits 0 and says nothing was recalled | same file | PASS |
| A harness that produces no output gives BLOCKED for all nine cases, never PASS | `node evals/vlbv-protocol/run.mjs --corpus outcome-first --stub exit0 --samples 3 --report-dir <scratch>` | PASS (9 BLOCKED, 0 PASS, report valid) |

These show the cases can be run and that a silent harness cannot pass them. They say nothing about
how an agent behaves.

## Agent cases (task 4.2)

Each case needs 3 samples per run. Cases marked critical need 3 of 3 passing samples; the rest need
2 of 3. Two runs are planned on one full-capability harness: one with the `prometheus` helper as
installed and one with `--no-helper`.

| Case | Behaviour | With helper | No helper |
|---|---|---|---|
| OF01 | Scope dilution: the adopted outcome comes before the task list | NOT_EXERCISED | NOT_EXERCISED |
| OF02 | Mixed product and fixture failure are reported separately | NOT_EXERCISED | NOT_EXERCISED |
| OF03 | An approval wait is not a failed attempt (critical) | NOT_EXERCISED | NOT_EXERCISED |
| OF04 | A repeated release setup failure gets one bounded setup repair | NOT_EXERCISED | NOT_EXERCISED |
| OF05 | A quiet running build is not counted or cancelled (critical) | NOT_EXERCISED | NOT_EXERCISED |
| OFM1 | A recalled lesson changes the next action; exactly one lookup | NOT_EXERCISED | NOT_EXERCISED |
| OFM2 | Memory service down: one pk lookup, then continue | NOT_EXERCISED | NOT_EXERCISED |
| OFM3 | Both sources down: work continues (critical) | NOT_EXERCISED | NOT_EXERCISED |
| OFM4 | Stale or conflicting recall cannot override scope or approval (critical) | NOT_EXERCISED | NOT_EXERCISED |

Reason for every NOT_EXERCISED above: no model session has been run; operator go-ahead pending.

To run them:

```text
node evals/vlbv-protocol/run.mjs --corpus outcome-first --harness claude-code --samples 3
node evals/vlbv-protocol/run.mjs --corpus outcome-first --harness claude-code --samples 3 --no-helper
```

Reports are written to `evals/reports/outcome-first/`; transcripts stay under `evals/runs/`, which is
not committed. The grader needs the liter-llm gateway. Without it every sample is BLOCKED.

## Opt-in outcome-ranked scope on one new phase (task 4.3)

NOT_EXERCISED. It needs a real new phase planned twice, once with the opt-in ranking and once
without, and a person to compare the two plans. No default was changed by this change: the ranking
text in `kbd-plan` and `kbd-assess` is marked opt-in for new phases.

## Comparison with the full pack (task 4.4)

NOT_EXERCISED. Mini #98 asks for the same result as Full #256. Full #256 is open and has no
implementation, branch or pull request, so there is no full-pack behaviour or contract to replay these
cases against. Mini reuses the adopted-contract v2 field names so the comparison can be made when
Full #256 lands. Until then Mini #98 stays open.

## Limits of these cases

- The memory service is a local stand-in started by the runner, and pk is a system program that
  echoes its arguments. A live surreal-memory hit and a live pk hit are not exercised.
- OFM2's stand-in pk does not exist on Windows; that case is BLOCKED there.
- `--no-helper` removes every PATH directory that holds a `prometheus` executable. If the harness
  CLI lives in the same directory, the harness still starts (it is launched by absolute path) but
  its own child processes lose that directory.
