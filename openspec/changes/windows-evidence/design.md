## Context

The phase exit criterion is that every Windows behaviour it claims has been observed on `windows-latest`. This change adds no behaviour of its own: it runs the matrix, records evidence, and fixes what breaks. It therefore sets `skip_specs: true`; a fix that changes a requirement updates the owning capability's delta in that fix's own commit.

## Goals / Non-Goals

**Goals**
- Turn every self-reported Windows claim in this phase into an observed one, or mark it NOT MET.

**Non-Goals**
- New features. Tuning beyond what a failing run demands.
- Pushing: the owner pushes; the agent never does (A-16).

## Decisions

- **Evidence lives at `.kbd-orchestrator/phases/platform-foundation/evidence/windows.md`** — beside the phase's other artifacts, where `/kbd-reflect` reads.
- **One row per claim: claim, asserting test name, run URL, job, Node version, result** — a claim without a run stays labelled self-reported (A-6).
- **Each Windows failure is fixed with a reproducer first** — A-16: a failing-test commit, then the fix commit, at the root cause.

## Risks / Trade-offs

- BLOCKED on owner prerequisite P2. Without a remote this change cannot start, the last two phase goals are NOT MET, and the phase must not be reflected as done.
- Its size is whatever Windows breaks; it cannot be estimated in advance.
