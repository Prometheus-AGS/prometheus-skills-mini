# Design

## Context

The existing Node driver has no reconcile branch. Its native backend list can
migrate legacy artifacts, and runtime status can write live projections. Neither
operation is suitable for a read-only scan.

## Decisions

Read backend files directly using existing backend layouts and identity rules.
Resolve explicit or active nested phase IDs, compare tasks and both progress
counts, and preserve the full pack JSON contract with errors added. Missing or
ambiguous artifacts produce exit 2; identified drift produces exit 1.

Read canonical authority through the existing installed CLI in an isolated copy
of the project's manifest, registration, CRDT document and journals. Verify source
digests remain stable across the copy/read. Never treat a projection as canonical
authority and never mutate the inspected project's files for a scan.

Opt-in repair is restricted to the actual active phase and active backend tasks
that are complete while their unambiguous canonical counterparts are incomplete.
Reuse begin/end task transitions, boundary guards and hooks; stop on failure and
rescan. Preserve cancelled tasks and archived history. Legacy count repair uses
the existing atomic writer; runtime projections remain runtime-owned.

## Verification and constraints

Finish both packs and payloads before entry-point integration scenarios. Exercise
real installed canonical runtime with temporary projects, all filesystem backends,
archives, mapping, invalid inputs, repair and replay, and read-only digest checks.
No tests or certification of BAUAR product behavior are implied. Windows remains
unverified unless executed there. The operator's explicit apply request supersedes
the propose skill's generic stop-after-planning guidance; leave edits uncommitted.
