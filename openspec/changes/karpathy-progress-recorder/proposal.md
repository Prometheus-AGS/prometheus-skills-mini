## Why

The source pack records every completed task, change and phase boundary: a receipt, a line in the session log, and a project-scoped memory through `pk ingest`. That recorder is 671 lines of Python (`record-progress.py`) driven by shell lifecycle hooks — neither of which this pack may ship. Until it is ported, progress memory does not exist here, and a project that moves between packs loses its history.

The operator decided the knowledge layer is the Rust `pk` CLI, not a Node implementation. `pk` has no recorder, no receipts and no idempotency — those live only in the Python script that *calls* `pk` — and with 0 releases, `pk` is absent from every clean machine. So the recorder is Node, and `pk` is a transport it uses when it can.

## What Changes

- Add `lib/karpathy/` and the entry point `scripts/record-progress.mjs`: a port of the upstream recorder's contract, by name — `event_from_hook`, `validate_event`, `canonical_validate`, `markdown_record`, `append_session_log`, the per-event lock, `memory_write`, both hash functions, `write_receipt`, `receipt_path`.
- Keep the on-disk contract byte-compatible where it is observable: `.prometheus/progress-memory-receipts/<sha256(eventId)>.json`, `eventIdentitySha256`, `eventSha256`, the session-log marker. `eventSha256` reproduces the Python value by emitting the one float-capable field, `elapsedHours`, as Python writes it.
- `pk` is optional. `PK_BIN` or a `PATH` lookup, `shell: false`, record on stdin, a 0.1–10 s timeout. Absent, timed out, non-zero, or no LLM behind it: the result is `degraded`, exit 0, and the receipt stays retryable.
- The `prometheus` CLI is optional too (`config.yaml`: the pack depends on node, git and the openspec CLI). Canonical state comes from the CLI when present, else from the `current-waypoint.json` projection; the receipt records which.
- `--flush-degraded` retries incomplete and degraded receipts, because a boundary is never replayed on its own.
- Carry the source pack's `karpathy-progress-memory` skill document, rewritten to the Node CLI. This repository carries **no KBD lifecycle skill yet**, so nothing fires the recorder automatically; the skill document says so and names the follow-up. No harness hook is added.

## Capabilities

### New Capabilities
- `karpathy/progress-recorder`: the recorder's contract — inputs, validation, receipts, replay, the session log, the `pk` transport, result states and exit codes.

### Modified Capabilities
<!-- none. `hooks/dispatch` keeps "exactly six ported ids": the recorder is a CLI, not a harness hook. -->

## Impact

- New: `lib/karpathy/*.mjs` (each under 500 lines, split by responsibility), `scripts/record-progress.mjs`, their `node:test` files, recorded hash vectors under `lib/karpathy/fixtures/`.
- New: `skills/karpathy-progress-memory/SKILL.md`, carried from the source pack (119 lines there) with its invocations rewritten.
- No new runtime dependency: `package.json` keeps none.
- Security (A-3): event input is untrusted and lands in an append-only file; the size bound (256 000 bytes — what upstream enforces, though its message says "256 KiB") and the secret-pattern rejection are ported, not reinvented.

## Non-goals

- The Python outbox, `pk-learning-worker`, or any queue drain: the receipt is the durable record, and nothing here starts a daemon.
- Writing OKF. `pk` writes the knowledge bundle; see change `okf-v02-via-pk`.
- A general Node dispatcher for KBD lifecycle hooks, or wiring the recorder into KBD skills this repository does not carry yet.
- `pk context` retrieval at prompt time: upstream does that from a harness hook this phase does not port.
- Rewriting `session-log.md` as an OKF concept, or rendering `log.md`.

## Source

KBD phase `karpathy-logs-node` — `.kbd-orchestrator/phases/karpathy-logs-node/analysis.md` (cand-201, -203, -207, -208; build items 1–3) and `decision-log.md`.
