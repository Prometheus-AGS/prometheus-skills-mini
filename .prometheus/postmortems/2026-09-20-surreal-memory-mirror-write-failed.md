---
type: Postmortem
title: kbd-memory-log mirror write failed while surreal-memory reported healthy
description: A 3 s client timeout against 1.7-5.4 s writes, plus a server bug that restarts the embedding executor when a request is aborted.
tags: [surreal-memory, kbd-memory-log, launchd, upstream]
generated: { by: claude-code/claude-fable-5-1, at: "2026-09-21T02:40:00Z" }
status: stable
stale_after: "2026-12-31T00:00:00Z"
sources:
  - id: server-log
    resource: ~/.prometheus/logs/surreal-memory-native.stderr.log
    title: surreal-memory launch agent stderr
  - id: mirror-script
    resource: ~/.claude/skills/kbd-process-orchestrator/shared/lib/memory-log.sh
    title: installed kbd-memory-log mirror (curl --max-time 3)
---

# 2026-09-20 — `kbd-memory-log: mirror write failed` while surreal-memory reported healthy

Owner of the defects: `prometheus-skill-pack` (server in `tools/surreal-memory-server`, client in
`skills/process/kbd-process-orchestrator/shared/lib/memory-log.sh`). Not this repo. Nothing was patched there;
this is the hand-off note (A-16). Status: **open upstream**.

## Symptom

`/kbd-new-phase platform-foundation` printed `kbd-memory-log: mirror write failed; lifecycle continues`. The
surreal-memory MCP server also timed out when this session connected. Both launch agents looked fine:
`launchctl list` showed them running with exit status 0 and `/health` returned 200 on `:23001` and `:28000`.

## What was observed (all on macOS, this machine, 2026-09-20 local / 09-21 UTC)

1. **The launch agents are correct.** `ai.prometheus.surrealdb-native` and `ai.prometheus.surreal-memory-native`
   are loaded with `RunAtLoad` + `KeepAlive`; launchd reports `runs = 1`, `last exit code = (never exited)`.
   Nothing is crashing.
2. **They were being removed and re-added from outside.** The unified log shows `removing service` for
   surreal-memory at 20:44, 20:55, 20:59 and 21:30, and for SurrealDB at **21:20:38 with no re-add until
   21:30:14 — a 10-minute outage**. The 21:30 re-bootstrap was
   `launchctl ← bash ← codex[95863] ← ChatGPT[95344]`: a Codex session in the ChatGPT desktop app running the
   pack's service installer. Initiators of the earlier removals were not recoverable from the log.
3. **Startup is slow.** "Starting Rust Memory MCP Server" → "Starting REST API" took 23 s, 36 s, 82 s and once
   never completed in 4 min before the next restart. A client connecting in that window times out.
4. **A healthy server still fails the mirror.** A faithful replay of the missed event through the real
   `memory-log.sh` failed again at 3.78 s. The same POST with a 60 s timeout returned **HTTP 201 in 4.87 s**.
   Undisturbed writes measured 5.39 s and 1.72 s. `memory-log.sh` hardcodes `curl --max-time 3`.
5. **Reproducer for the server bug.** Abort one write mid-flight (`--max-time 0.15`), then write again:
   the embedding executor PID changed (74370 → 79212) and the next write took **12.54 s**. The server logs
   `embedding executor generation N returned a mismatched request id and restarted` —
   83 occurrences of this error family since 2026-08-09.

## Root cause

Two defects that feed each other:

- **Server:** when a client disconnects mid-request, the in-flight embedding is orphaned; its reply is then
  matched against the *next* request, reported as a mismatched request id, and the MLX executor is killed and
  cold-started. Request cancellation is not handled in the executor protocol.
- **Client:** a 3 s budget against an operation whose normal latency is 1.7–5.4 s. Every timeout is an abort,
  every abort triggers the server defect, and the cold start makes the next write slower — so it aborts too.

`/health` does not exercise the embedding path, so it stays green throughout.

## Fix

None applied — both defects are in another repository's code and in a read-only installed plugin generation
that the next install replaces. The missed `phase:before` event was written by hand with a long timeout
(HTTP 201), so no lifecycle data was lost.

Suggested upstream, smallest first: raise or make configurable the mirror's `--max-time` (≥ 15 s, it is
already fire-and-forget); make the server drain or discard an orphaned embedding reply instead of restarting
the executor; have `/health` report embedding readiness separately from liveness.

## Prevention — constraints this puts on `memory-bridge-node` in this repo

- **Never abort an in-flight write to surreal-memory.** Let it finish or fail on its own; bound the *hook*, not
  the request, by handing the operation to the durable outbox and returning.
- Budget writes at ≥ 15 s; treat 1.7–5.4 s as normal, 12 s+ as "executor cold", not as failure.
- Liveness (`/health` 200) is not readiness. Expect minutes of startup after any restart; the outbox, not a
  retry loop, absorbs that window.
- Write idempotently (stable entity name) so an outbox replay after an ambiguous timeout is safe.

## Leftovers

Four diagnostic entities were created while measuring, all under `prometheus-skills-mini/_diagnostic/`
(`warm-1`, `warm-2`, `after-abort`, and possibly `aborted`), type `kbd_diagnostic`, each observation marked
"safe to delete". They were left in place rather than deleted without being asked.
