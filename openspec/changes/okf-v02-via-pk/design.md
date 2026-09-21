# Design — okf-v02-via-pk

## Why a documentation change needs a spec

`config.yaml` is loaded into every OpenSpec artifact as binding context. A stale clause there is not a stale comment: it is an instruction. Two of its clauses currently instruct an agent to build what the operator withdrew.

## Conformant versus current

OKF v0.2 §11 makes a bundle conformant with parseable frontmatter and a `type`. What `pk` 1.8.0 writes meets that. It is not *current*: it emits `timestamp` and a body `# Citations`, which §13.1 supersedes. The operator's ruling is about being current, so the exit criterion is "the pinned `pk` emits `generated` and mapping-form `sources`", not "the bundle passes conformance" — a criterion that would already be met and would therefore prove nothing.

## Ordering

1. `pk`'s `okf-v02-writer` merges upstream (operator go-ahead to push).
2. The pin moves here.
3. `config.yaml` and the README are amended.

Steps 2 and 3 can be prepared before step 1 but not completed. Amending `config.yaml` first would make it claim a v0.2 writer that the pin does not contain; that is the same defect this change exists to remove.

## What stays out of the bundle

Receipts and `session-log.md` sit in `.prometheus/`, outside `.prometheus/knowledge/`. `pk`'s bundle root is `.prometheus/knowledge/wiki/`. `.prometheus/` itself is not a conformant bundle today — `decisions.md`, `gotchas.md` and `session-log.md` have no `type` — and this change does not claim it is.
