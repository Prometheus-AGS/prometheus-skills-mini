# Decision log — karpathy-logs-node

### 2026-09-21T17:50Z — knowledge layer implementation
Options: a Node OKF writer in this pack · the Rust `pk` CLI vendored as a submodule
Decision: **`pk`, vendored at `tools/prometheus-knowledge`** | Provenance: user
Operator decision after assess. Withdrew the Node `events.jsonl` writer, the `log.md` projection and the
Node OKF writer/reader. Recorded here because it set the baseline every entry below starts from.

### 2026-09-21T20:05Z — where the progress recorder lives
Options: a thin Node recorder that calls `pk` · a `pk record-progress` subcommand upstream
Decision: **Node recorder; `pk` is an optional transport** | Provenance: research
The degrade goal decides it. Receipts, idempotency, the lock, the 256 KiB bound and the secret rejection
must work with no `pk` present — and with 0 releases that is every clean machine. A subcommand would make
them vanish exactly when `pk` is missing.

### 2026-09-21T20:05Z — receipt hash portability
Options: forbid non-integers in hashed fields · emit a Python-compatible float token · declare incompatibility · adopt an RFC 8785 library
Decision: **Python float token on the single field `elapsedHours`; no library** | Provenance: observation
Re-observed on the golden receipt: naive Node hash DIFFERS, the single-field token MATCHES the recorded
`eventSha256`, and the identity hash MATCHES with no special handling. Hook replays compare the identity
hash, which holds no float, so hook events already port. RFC 8785 libraries (`canonicalize` 5.1.0,
`json-canonicalize` 3.0.1) are healthy but *must* write `0` — they cannot reproduce hashes made from
Python's `0.0`. Verified for one receipt and an integer-valued float only; the spec rejects an
`elapsedHours` in (0, 1e-4), where the two languages' tokens diverge.

### 2026-09-21T20:05Z — one `events.jsonl` or two — **DISSOLVED**
Supersedes the open question in `assessment.md`; that text stays as the record of what was believed.
Decision: **no decision needed** | Provenance: observation
The recorder never writes `events.jsonl`. It appends to `.prometheus/session-log.md` and writes receipts;
only pk's `pk-event-store` writes `events.jsonl`. The assessment inferred a shared file from the file's
contents without reading the recorder.

### 2026-09-21T20:05Z — `pk` present, LLM absent
Options: port the Python outbox + drain it · start `pk-learning-worker` · retry from the receipt
Decision: **retry from the receipt; drop the learning queue** | Provenance: research
`pk ingest` cannot succeed without an LLM and has no raw mode. Upstream already writes
`complete: false` / `memory.status: "degraded"` and retries the memory write from the receipt's own event
snapshot on replay, so the receipt is a durable queue of one. Result states: `recorded`, `duplicate`,
`degraded`. `queued` is never *emitted* here but must be *read*: source-pack receipts carry it, and a
`complete: true` + `queued` receipt replays as `duplicate` and is never retried. No Python, no third daemon.

### 2026-09-21T20:05Z — how the recorder is invoked
Options: a seventh harness hook · a general Node KBD lifecycle dispatcher · a CLI the KBD skills name
Decision: **a CLI named at each boundary** | Provenance: research
Upstream fires it from KBD lifecycle hooks with a 15 s timeout, not from the 1 s harness hook; `pk ingest`
makes an LLM call and must never sit inside a 1 s budget. This pack has no Node lifecycle dispatcher
(0 `.mjs` files mention `task:after`). A CLI adds no harness hook, so `hooks/dispatch`'s "exactly six
ported ids" scenario stands.

### 2026-09-21T20:05Z — `pk` distribution
Options: cargo-dist · taiki-e/upload-rust-binary-action · cargo-binstall · build from source
Decision: **nothing adopted this phase; cargo-dist is the reference for the next** | Provenance: research
cargo-dist 0.32.0 documents both Windows triples and per-artifact SHA-256, matching what The Boss's
`download-binaries.js` consumes. It is a change to the pk repository (operator go-ahead) and its consumer is
`the-boss-integration`. cargo-binstall rejected: pk has no published artifacts for it to fetch. (An earlier
draft said it needs Rust on the user's machine; the judge corrected that — installing prebuilt binaries
without a toolchain is what binstall is for.)

### 2026-09-21T20:05Z — OKF version (UNRESOLVED — operator)
Options: move `pk` to OKF v0.2 upstream · declare `okf_version: "0.1"` here until it does
Decision: **none yet** | Provenance: —
`pk` is v0.1 throughout (10 mentions, 0 of v0.2); this pack's `index.md` says `0.2`. Nothing breaks today —
pk checks only that the index block declares nothing but `okf_version`, not its value — but the standing
constraint is v0.2 and the only writer emits v0.1. Recommendation: declare `0.1` now, track v0.2 as a pk
follow-up. Not decided silently.

### 2026-09-21T20:40Z — a missing `prometheus` CLI (UNRESOLVED — spec)
Options: record as `degraded` without canonical validation · refuse the event (upstream: exit 2)
Decision: **none yet** | Provenance: review (judge k3, finding R1/R10, verified at record-progress.py:283-313)
`canonical_validate` confirms every event against `prometheus kbd status --json`. Skipping it yields weaker
evidence; refusing means no progress memory on a machine without the CLI. Surfaced by the adversarial review,
not by the analysis — the first draft never mentioned `canonical_validate`.

### 2026-09-21T20:40Z — analyze review
Decision: **PASS**, round 1 | Provenance: critic MiniMax-M3, judge k3 (endpoint-reported; verified-distinct)
0 CRITICAL, 7 WARNING, 8 SUGGESTION; 1 critic finding rejected as factually wrong. All 7 WARNINGs were checked
against source and were right. Fixes were applied after the PASS and are unreviewed.
