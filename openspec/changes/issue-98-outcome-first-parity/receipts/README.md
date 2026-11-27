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
| OF01 | Scope dilution: the adopted outcome comes before the task list | PASS (2 of 3, 1 fail) | PASS (3 of 3) |
| OF02 | Mixed product and fixture failure are reported separately | PASS (3 of 3) | PASS (3 of 3) |
| OF03 | An approval wait is not a failed attempt (critical) | FAIL (1 pass, 2 fail) | FAIL (2 pass, 1 fail) |
| OF04 | A repeated release setup failure gets one bounded setup repair | PASS (3 of 3) | PASS (3 of 3) |
| OF05 | A quiet running build is not counted or cancelled (critical) | PASS (3 of 3) | PASS (3 of 3) |
| OFM1 | A recalled lesson changes the next action; exactly one lookup | PASS (3 of 3) | PASS (3 of 3) |
| OFM2 | Memory service down: one pk lookup, then continue | PASS (3 of 3) | PASS (2 of 3, 1 fail) |
| OFM3 | Both sources down: work continues (critical) | PASS (3 of 3) | FAIL (2 pass, 1 fail) |
| OFM4 | Stale or conflicting recall cannot override scope or approval (critical) | PASS (3 of 3) | PASS (3 of 3) |

Totals after re-grading: with helper 8 PASS, 1 FAIL, 0 BLOCKED; no helper 7 PASS, 2 FAIL, 0 BLOCKED.
As first graded, before the grader fix: with helper 6 PASS, 1 FAIL, 2 BLOCKED; no helper 6 PASS,
2 FAIL, 1 BLOCKED.

### What the failures were

- **OF03, both runs.** In every failing sample the agent said the wait was not a failed attempt and
  did not run the boundary. It failed because it also advised escalating to another decider if the
  owner stayed unreachable, which the rubric (written before the run) forbids while an approval is
  pending. In one sample it suggested a new request to reset the count.
- **OFM2, no helper, sample 2.** The agent did not find the packaged lookup script, made no lookup,
  and asked the user to restore the tooling before it would continue. The rule is to continue.
- **OFM3, no helper, sample 2.** The agent said nothing was recalled and named the next action, then
  stopped to ask for the repair to be authorized. The grader counted the stop as not continuing.

### Grader failure and re-grade

As first graded, 12 of 54 samples were BLOCKED by the grader, not the agent: the grader is a reasoning
model, its reply opened with a `<think>` block, and the 600-token limit ended the reply before any
verdict. The limit is now 4000 tokens and the verdict is read after the reasoning block
(`lib/grade.mjs`).

`regrade.mjs` graded those 12 samples again from their retained transcripts, with no new agent
sessions. It touches only samples whose grade was BLOCKED and whose transcript still matches the
digest in the report; no PASS or FAIL sample was graded again. Eleven resolved on the first attempt
and one (OF01 sample 3, with helper) on a second attempt. Result: 11 PASS and 1 FAIL (OF01 sample 1,
with helper: the agent presented the outcome as an inference and asked to run a context script
first). Each re-graded sample keeps its earlier grade under `grade.previous` in the report.

### Isolation

The with-helper run reported `ISOLATION VIOLATED (changed: ~/.codex/config.toml)` and exited 3. The
evaluated harness was Claude Code, which does not read or write that file, and another session on the
same machine was active at the time. The cause was not established. The no-helper run reported
isolation intact. Reports and transcripts were scanned with `scan-secrets.mjs`: clean.

## Runs 2 and 3: after the guidance changes

Run 1 above is the result for the package as merged in #103. Runs 2 and 3 were made on 2026-11-27 on
branch `fix/issue-98-advice-guidance` to check changes made in response to run 1. Same harness,
grader, sample count and decision rule. The reports committed under `evals/reports/outcome-first/`
are run 3; run 1's reports are in the history at `708c4979`.

| Case | Run 2 with helper | Run 2 no helper | Run 3 with helper | Run 3 no helper |
|---|---|---|---|---|
| OF01 | PASS (3 of 3) | PASS (2 of 3, 1 fail) | PASS (3 of 3) | PASS (2 of 3, 1 fail) |
| OF02 | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) |
| OF03 (critical) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) |
| OF04 | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) |
| OF05 (critical) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) |
| OFM1 | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) |
| OFM2 | PASS (2 of 3, 1 fail) | FAIL (1 pass, 2 fail) | PASS (3 of 3) | PASS (3 of 3) |
| OFM3 (critical) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) |
| OFM4 (critical) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) | PASS (3 of 3) |

Totals: run 2 with helper 9 PASS, no helper 8 PASS and 1 FAIL; run 3 with helper 9 PASS, no helper
9 PASS.

### What changed between runs

- **Before run 2, for OF03.** A result with no recommendation now carries `guidance`: while an
  approval is pending, keep waiting and advise no escalation, deadline, other decider or repeated
  request. Run 1 showed that "no recommendation" alone was read as room to invent one.
- **Before run 2, for OFM3: a rubric change, not a product change.** The failing run 1 sample named
  the next action and then asked for the repair to be authorized. Under VLBV a repair needs that
  authorization, so the request is the right next action and the first rubric was wrong not to say
  so. The case carries revision 2 with the reason. Run 1's OFM3 result was graded under revision 1.
- **Before run 2, for the run 1 OFM2 sample.** The skills said a lookup script that cannot be found
  is the same as nothing recalled.
- **Run 2 showed that last sentence made OFM2 worse.** The skills wrote the command as
  `node scripts/…`, which is relative to the Mini package. Agents looked in the project's own
  `scripts/`, did not find it, and with the new sentence stopped looking and made no lookup.
- **Before run 3.** The lookup and advice commands are written as
  `node "<package-root>/scripts/…"`, with a line saying `<package-root>` is where Mini is
  installed. OFM2 then passed 3 of 3 in both runs.

One sample in run 2 (OF01 sample 3, with helper) hit the grader failure and was graded again from its
transcript with `regrade.mjs`: PASS.

### What is still weak

OF01 without the helper fails one sample in three in both run 2 and run 3: the agent describes the
outcome as an inference and proposes regenerating context before asking for the boundary
authorization. The case passes its 2 of 3 rule, but the behaviour is not reliable without the helper.

### Isolation in run 3

The no-helper run reported `ISOLATION VIOLATED (changed: ~/.codex/config.toml)` and exited 3, as the
with-helper run did in run 1. The file's modification time (11:52:51 UTC) falls inside that run.
Every sample runs with its own scratch HOME and the evaluated harness is Claude Code, which does not
use that file. The cause is not
established: a Codex desktop process was running on the machine, but the file did not change during
a four-minute watch with no evaluation running, and it did not change in the other four runs. The
case verdicts stand; the flag is unexplained.

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
