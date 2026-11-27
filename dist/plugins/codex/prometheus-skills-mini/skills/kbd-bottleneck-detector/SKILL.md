---
name: kbd-bottleneck-detector
description: Evaluate or repair canonical KBD task, change and phase boundaries. Use when progress receipts, projections, or build gates may be stale, or when the user mentions "bottleneck detector". Also gives an advisory recommendation when the same blocker has stopped two completed attempts. Do NOT use for creating or advancing phases (see kbd-new-child and kbd-next-phase).
license: MIT
metadata:
  version: '1.1.0'
  tags: 'process, orchestration, recovery'
---

# /kbd-bottleneck-detector

## Progress Signals (MANDATORY)

Before running the detector, emit:

```text
Starting kbd-bottleneck-detector — <status|evaluate|repair> <boundary>
```

After the detector returns, emit its actual outcome:

```text
Completed kbd-bottleneck-detector — <pass|blocked|repaired|pending_review>
```

Use the boundary and outcome returned by the detector. A blocked or pending
review result completes the detector operation without completing the boundary.

Run it directly:

```bash
node scripts/kbd-bottleneck-detector.mjs status
node scripts/kbd-bottleneck-detector.mjs evaluate task before <task-id>
node scripts/kbd-bottleneck-detector.mjs repair phase after <phase-id>
```

`evaluate` does not repair projections. `repair` may rewrite only derived KBD
waypoint, progress, and position projections; it must not change the canonical
revision. Treat `blocked` as a real lifecycle blocker and use the exact progress
signal returned by the command.

Diagnosing duplicate, missing, or out-of-order receipts, certification
failures, or authority ambiguity: the canonical authority is the signed KBD
event journal. Waypoint, progress, and position files are replayable
projections and never prove completion by themselves.

- A successful `before` receipt opens one obligation keyed by boundary kind and
  canonical subject. A duplicate start is blocked.
- A successful `after` receipt closes that obligation. Missing or out-of-order
  completion is blocked and records a typed blocker.
- Projection repair is safe only when replay leaves the canonical revision
  unchanged. Ambiguous authority permits no canonical mutation.
- Integration and certification gates require complete implementation state.
  Certification also requires closed boundaries, valid task completion
  receipts, a passed integration gate, no unfinished gate, and no unresolved
  blocker.

`guard evaluate --json` returns `outcome` (`pass`, `repaired`, or `blocked`),
`authoritativeRevision`, `position`, `findings`, `outstandingObligations`,
`exactSignal`, `repairedProjections`, and `receiptId`. Surface `exactSignal`
verbatim, followed by `Position: <position> @ revision <authoritativeRevision>`.
`status` exposes the same folded obligations and latest receipt/gate summaries.

Ordinary evaluation is deterministic, local, and network-free. At phase or
child completion, on ambiguous canonical authority, or after the same violation
twice at one revision, load and run the installed `adversarial-review` skill.

## Advice for a repeated blocker

`advise` needs no `prometheus` CLI, changes nothing and never stops or
cancels work. It reads attempt records you supply; it does not infer attempts
from logs.

```bash
node scripts/kbd-bottleneck-detector.mjs advise <attempts.json>
```

`attempts.json` is a list, oldest first:

```json
[
  { "blocker": "release-signing", "completed": true, "waitingOnApproval": false, "evidence": "ci-run-812", "kind": "setup" },
  { "blocker": "release-signing", "completed": true, "waitingOnApproval": false, "evidence": "ci-run-812", "kind": "setup" }
]
```

- `completed` is true only when the attempt ran to an end. A job that is still
  running, or whose progress you cannot see, is not a completed attempt: do
  not count it and do not stop it.
- `waitingOnApproval` marks an attempt held for an approval. A wait is not a
  failed attempt, and no recommendation is issued while one is pending.
- `evidence` is a reference to what the attempt observed. A new value is new
  evidence and resets the count.
- `kind` is what stands in the way: `setup`, `measurement`, `authority` or
  `architecture`.

After two completed attempts at the same blocker with no new evidence it
recommends exactly one of:

| Kind | Recommendation |
|---|---|
| `setup` | Bounded setup repair: fix the environment, fixture or tooling once, within a stated limit. |
| `measurement` | Measurement repair: fix the check or oracle; do not change the product to satisfy it. |
| `authority` (or kind not stated) | One exact authority handoff: one question or approval request to the person who decides. |
| `architecture` | A scoped architecture child, opened through the existing child-phase path. |

The recommendation is advice. It grants no authority, opens no child and
approves nothing: act on it only through the existing scope, approval and
child-phase paths. Report product failures and fixture or harness failures
separately; a harness failure is not a product failure.

Never attach this detector to operator-requested Stop. Stop remains advisory and
fail-open.
