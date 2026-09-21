# Decision log — hook-entry-node-only

### 2026-09-21T10:45Z — hook port scope
Options: port all 31 upstream ids · port the KBD lifecycle subset · port nothing until services exist
Decision: **6 ids** — 5 KBD lifecycle plus subagent-fallback-checkpoint | Provenance: research
Every id mapped to its payload in hook-dispatch-v1.sh and classified against what this project ships.
25 deferred or dropped, each with a named destination phase. Three of the six carry the 1 s budget.

### 2026-09-21T10:45Z — dispatch mechanism
Options: hand-written switch · static import map · lazy await import()
Decision: hand-written dispatch with a **static** import map | Provenance: research
A static map is what makes the manifest-resolution test expressible without executing the hook.

### 2026-09-21T10:45Z — cold-start measurement
Options: node:perf_hooks + spawnSync · tinybench · mitata
Decision: node built-ins | Provenance: research
Both libraries are healthy (tinybench 6.2.0, 0 deps, 2026-09-09) but measure in-process throughput,
not process start. Rejected on fit, not maintenance.

### 2026-09-21T10:45Z — harness exec-form support (UNRESOLVED)
Options: assume exec form · probe empirically before designing
Decision: **probe**, as plan task 1 after the goal-1 re-review | Provenance: research (inconclusive)
6 live hook entries inspected, 0 use args. Different surface from a plugin hooks.json, so inconclusive
either way. Not a detail to assume: if unsupported, a shell string re-enters the path and C1/C3 fail.

### 2026-09-21T12:17Z — harness exec-form support — **RESOLVED**
Supersedes the UNRESOLVED entry above; that entry is left in place as the record of what was known
when the decision to probe was made.
Decision: **exec form fires on this harness** | Provenance: observation, not documentation
Verified by deletion-and-recreation: an exec-form `PreToolUse` hook was registered, fired, its evidence
file deleted, and the harness recreated it at 12:17:55.820Z. argv arrived as 4 discrete tokens, so no
shell re-tokenised it. The design proceeded unchanged and no shell-string fallback was adopted.
Scope: Claude Code on macOS. The Windows leg is CI evidence (run 35602464300); other harnesses have no
hooks directory and remain unverified. Evidence: `evidence/exec-form-probe.md`.
