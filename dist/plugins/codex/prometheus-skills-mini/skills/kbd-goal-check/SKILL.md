---
name: kbd-goal-check
description: Use after each execution turn within a goal-driven KBD phase to evaluate whether the active phase's stopping condition has been met, without the implementer agent grading its own work — returns PASS (with evidence for the adopted outcome) or CONTINUE (with the missing observation and next authorized action). Implements the maker-is-not-evaluator pattern for harnesses whose loop is a queue rather than a condition-based loop.
license: MIT
metadata:
  version: '1.1.0'
  tags: 'process, goal, evaluator, kimi, loop, condition-check'
---

# /kbd-goal-check

Evaluate whether the active KBD goal phase's stopping condition is met.
Invoke this after each execution turn — before deciding whether to continue
the loop or advance to the next phase.

## Progress Signals (MANDATORY)

Before any other action, emit:

```
Starting kbd-goal-check — <goal slug>
```

When the stopping-condition assessment is complete, emit:

```
Completed kbd-goal-check — <goal slug> (status: <met|not-met>)
```

Emit to plain response text — no tool call needed.

## When to Use

- After each execution turn within a goal-driven phase
- Whenever you need an impartial check of goal completion
- Before advancing to the next phase condition

## What This Does

1. **Reads the stopping condition** of the goal already running in this
   session, and the adopted outcome it serves from
   `.kbd-orchestrator/phases/<phase>/adopted-contract.json`
2. **Reads the recorded evidence** for that outcome
3. **Checks the outcome's oracle** against that evidence — never a test count
   or a task count
4. **Returns PASS or CONTINUE** with specific evidence

This skill only reads. It runs no build, test or product command, and it
changes no KBD state; phase closure stays with `kbd-phase-close-eval`.

## Output Format

```
PASS
Outcome: a support agent can refund an order from the order page (scenario S1).
Oracle: the customer's balance shows the refund — observed for candidate 4f2a9c1
(boundary-results.json, S1: PASS).
Stopping condition: "S1 observed at the real entry" — SATISFIED.
```

or

```
CONTINUE
Outcome: a support agent can refund an order from the order page (scenario S1).
Missing observation: the balance was never read after a refund (S1: NOT_EXERCISED
for candidate 4f2a9c1; the PASS on record is for an earlier candidate).
Next authorized action: the change the runtime names next inside the adopted
slice — report it, do not choose a different one.
```

Passing automated checks is not a PASS here unless they are the outcome's
oracle. A journey nobody exercised is `NOT_EXERCISED`, not a failure. A result
recorded for an earlier candidate does not carry to a changed candidate.

## Steps to Follow

### 1. Find the active goal and phase

Use the goal the session is already running; read
`.kbd-orchestrator/current-waypoint.json` for the active phase. If no goal is
running, say so and stop — do not create one.

### 2. Read the adopted outcome

Read `phases/<phase>/adopted-contract.json` and take the scenario the goal
serves: `actor`, `usefulOutcome`, `productionEntry`, `oracle`, `reasonNow`.
With no adopted contract, return CONTINUE with "outcome not adopted"; do not
invent an outcome or substitute a test suite for it.

### 3. Read the evidence

Read `phases/<phase>/boundary-results.json` and any evidence references the
scenario lists. Note which candidate each result belongs to.

### 4. Check the oracle

Compare the oracle's expected observation with the recorded one for the
current candidate:

- observed and matching → PASS
- observed and not matching → CONTINUE, naming the difference
- not observed, or observed only for an earlier candidate → CONTINUE,
  `NOT_EXERCISED`, naming the missing observation
- waiting on an approval, or a job still running → CONTINUE, naming what is
  awaited; this is not a failure

### 5. Return verdict

**If PASS:** write the verdict and evidence to the response. The orchestrator
decides what follows.

**If CONTINUE:** write the verdict, the missing observation, and the next
authorized action as the runtime or the phase ledger names it. The implementer
continues on the next turn.

## Separation of Concerns

This skill enforces **maker ≠ evaluator**: the agent that did the work should
NOT grade whether the goal is met. This skill is always a separate evaluation
step from the implementation turn.

Do NOT call this skill from within the same turn that did the implementation.
The orchestrator calls it as a separate turn.
