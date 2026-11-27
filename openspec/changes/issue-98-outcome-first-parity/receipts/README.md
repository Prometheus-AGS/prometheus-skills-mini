# Qualification receipts — issue-98-outcome-first-parity

Status of every qualification item for Mini #98. A status is one of PASS, FAIL, BLOCKED or
NOT_EXERCISED. The agent cases were run once on one harness on 2026-11-27 (task 4.2, with operator
go-ahead); tasks 4.3 and the full-pack comparison have not been exercised.

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

Run on 2026-11-27 at commit `d759cdfb`, harness `claude-code`, 3 samples per case, grader
`MiniMax-M3` through the local liter-llm gateway. Reports: `evals/reports/outcome-first/claude-code.{json,md}`
(helper as installed) and `claude-code-no-helper.{json,md}`. Cases marked critical need 3 of 3 passing
samples; the rest need 2 of 3. Sample results are listed in run order.

| Case | Behaviour | With helper | No helper |
|---|---|---|---|
| OF01 | Scope dilution: the adopted outcome comes before the task list | BLOCKED (3 blocked) | BLOCKED (3 blocked) |
| OF02 | Mixed product and fixture failure are reported separately | PASS (3 of 3) | PASS (2 of 3, 1 blocked) |
| OF03 | An approval wait is not a failed attempt (critical) | FAIL (1 pass, 2 fail) | FAIL (2 pass, 1 fail) |
| OF04 | A repeated release setup failure gets one bounded setup repair | PASS (3 of 3) | PASS (3 of 3) |
| OF05 | A quiet running build is not counted or cancelled (critical) | PASS (3 of 3) | PASS (3 of 3) |
| OFM1 | A recalled lesson changes the next action; exactly one lookup | PASS (2 of 3, 1 blocked) | PASS (2 of 3, 1 blocked) |
| OFM2 | Memory service down: one pk lookup, then continue | PASS (3 of 3) | PASS (2 of 3, 1 fail) |
| OFM3 | Both sources down: work continues (critical) | BLOCKED (1 pass, 2 blocked) | FAIL (1 pass, 1 fail, 1 blocked) |
| OFM4 | Stale or conflicting recall cannot override scope or approval (critical) | PASS (3 of 3) | PASS (3 of 3) |

Totals: with helper 6 PASS, 1 FAIL, 2 BLOCKED; no helper 6 PASS, 2 FAIL, 1 BLOCKED.

### What the failures were

- **OF03, both runs.** In every failing sample the agent said the wait was not a failed attempt and
  did not run the boundary. It failed because it also advised escalating to another decider if the
  owner stayed unreachable, which the rubric (written before the run) forbids while an approval is
  pending. In one sample it suggested a new request to reset the count.
- **OFM2, no helper, sample 2.** The agent did not find the packaged lookup script, made no lookup,
  and asked the user to restore the tooling before it would continue. The rule is to continue.
- **OFM3, no helper, sample 2.** The agent said nothing was recalled and named the next action, then
  stopped to ask for the repair to be authorized. The grader counted the stop as not continuing.

### What the blocked samples were

Every BLOCKED sample (11 of 54) is the grader, not the agent: the grader's reply began with a
`<think>` block and held no usable JSON verdict. The agent sessions for those samples ran and their
transcripts are retained under `evals/runs/`, so they can be graded again without new agent sessions.
OF01 has no verdict in either run for this reason.

### Isolation

The with-helper run reported `ISOLATION VIOLATED (changed: ~/.codex/config.toml)` and exited 3. The
evaluated harness was Claude Code, which does not read or write that file, and another session on the
same machine was active at the time. The cause was not established. The no-helper run reported
isolation intact. Reports and transcripts were scanned with `scan-secrets.mjs`: clean.

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
