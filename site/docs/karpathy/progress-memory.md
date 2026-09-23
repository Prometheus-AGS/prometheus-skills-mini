---
title: Karpathy Progress Memory
sidebar_label: Progress Memory
---

# Karpathy Progress Memory

`skills/karpathy-progress-memory/SKILL.md`: records a successful KBD task, change, or phase
boundary as a canonical, idempotent progress event. Use when a boundary transition succeeds, when
recovering work after context loss, or when KBD progress must survive a memory-service outage
without editing generated projections. **Do not** use it for changing KBD position or status — use
`kbd-process-orchestrator` (the `kbd-*` skills) for that.

Compatibility declared in frontmatter: Node.js LTS (>=22), git, the `prometheus` CLI; `pk` optional.

## Two independent jobs, neither can block the other

| Job | Owner | Where it writes |
|---|---|---|
| Record a task/change/phase boundary; make it idempotent; recover from a crash mid-write | This pack's recorder (`lib/karpathy/`, `scripts/record-progress.mjs`) | `.prometheus/session-log.md`, `.prometheus/progress-memory-receipts/` |
| Distil that history into a searchable, cited knowledge bundle | `pk` (optional, vendored as the `tools/prometheus-knowledge` submodule) | `.prometheus/knowledge/` |

`lib/karpathy/knowledge-bundle.test.mjs` guards that **no code under `lib/` or `scripts/` writes to
`.prometheus/knowledge/`** — that directory belongs exclusively to `pk`.

## `lib/karpathy/` modules

| Module | Ported from | What it does |
|---|---|---|
| `canonical-state.mjs` | — | Resolves which project, run, and phase the recorder is recording for, and whether the event agrees with canonical KBD state. The full pack refuses every event it cannot confirm via `prometheus kbd status --json`; this pack may depend only on node, git, and the OpenSpec CLI, so the `prometheus` CLI is optional — state comes from it when available, else from the `.kbd-orchestrator/current-waypoint.json` projection, and the caller is told which so a receipt can record whether its event was confirmed or best-effort. `.kbd-orchestrator/project.json` is deliberately never read for this — its `projectId` differs from the canonical one, and reading it would silently fork every event id. |
| `event.mjs` | `record-progress.py:88-197` | Builds a progress event for a hook boundary, or reads one given as text. `git` is the only process invoked here, read-only (`rev-parse`, `diff`, `ls-files`), via `spawnExecutable` with an args array; an absent or failing git yields `null`/no files rather than an error. |
| `validate.mjs` | `record-progress.py:199-282` | Validates a progress event exactly as the source's `validate_event` does, so an event one pack accepts, the other accepts too. This is a trust boundary: no refusal reason ever echoes a value from the event, and field checks run before the secret-pattern scan, so an echoed value could never carry exactly what the scan exists to keep out. |
| `hash.mjs` | — | Computes the two hashes a receipt carries so they equal what the source pack's Python recorder computes for the same event — including matching Python's `float()` serialization quirk for the one field that can be a float (`elapsedHours`). |
| `receipt.mjs` | `record-progress.py:59-63,509-540` | Writes receipts in the source pack's on-disk shape, via `lib/platform/atomic-write.mjs` (temp file, exclusive create, then rename) rather than the source's `NamedTemporaryFile` + `fsync` + `os.replace` — same two-phase shape, but the platform helper's bounded Windows AV/indexer retry is something the source never needed. |
| `record.mjs` | `record-progress.py:541-671` | Orchestrates new-event recording, replay, and the flush trigger. A receipt is written **twice** for a new event: `complete: false` with `memory.status: "pending"` before the transport is ever called, then the final state after — what makes a crash between the two recoverable, since an incomplete receipt is retried from its own event snapshot on the next run, never re-validated against a fresh event. |
| `session-log.mjs` | `record-progress.py:315-358` | The human-readable session log: one markdown record per recorded boundary, appended under a lock, deduplicated by a marker. |
| `transport.mjs` | `record-progress.py:399-478` | Delivery to `pk`: optional, bounded, shell-free. Any `pk` failure here is `degraded` — the receipt itself is the retry queue (the source's Python outbox and `pk-learning-worker` daemon are not ported). |

## Reachable outcomes

`recorded | duplicate | degraded`. The source pack's own `queued` state is *read* (for a receipt an
old source-pack run wrote) but never *emitted* by this pack.

## Bounds and safety

The `256_000`-byte payload bound and secret-pattern rejection are kept from the source. `pk`
delivery is bounded by `KPM_PK_TIMEOUT_SECONDS` (default 5s, 0.1–10s range).

## The CLI

```bash
node scripts/record-progress.mjs --from-hook --boundary <boundary>
node scripts/record-progress.mjs --input <file|->
node scripts/record-progress.mjs --flush-degraded
```

`scripts/record-progress.mjs` holds no logic of its own — parse arguments, call `lib/karpathy/`,
print one JSON line, set the exit code.

## OKF v0.2 and the knowledge bundle

`.prometheus/` is the bundle root; `.prometheus/knowledge/` is where `pk` writes concept files, each
carrying the [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
v0.2 fields: `type`, `generated: {by, at}`, `verified: [{by, at}]`, `status`, `stale_after`,
`sources: [...]`. `decisions.md`, `gotchas.md`, and `postmortems/` are this pack's own append-only
memory, outside the bundle and not OKF-conformant.

`pk` stays optional per `openspec/config.yaml`'s binding constraint: with it absent, no knowledge
bundle is written or updated, but the recorder's own receipts and `session-log.md` are entirely
unaffected either way.

## See also

- [KBD Overview](/docs/kbd/overview) — the lifecycle boundaries this recorder observes.
- [Comparison with the full pack](/docs/reference/comparison-with-full-pack) — what the full pack's learning-worker daemon did that this pack deliberately does not replicate.
