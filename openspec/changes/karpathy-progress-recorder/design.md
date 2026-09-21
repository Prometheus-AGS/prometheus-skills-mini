# Design — karpathy-progress-recorder

## What is being ported, and what is not

`record-progress.py` is 671 lines. The port is its contract, function by function: `event_from_hook` (:135), `validate_event` (:207), `canonical_validate` (:283), `markdown_record` (:315), `append_session_log` (:341), the lock (:361), `memory_write` (:399), `event_sha256` (:479), `event_identity_sha256` (:490), `write_receipt` (:509), `receipt_path` (:59).

Not ported: the outbox fallback inside `memory_write` (:428–470). It shells out to `enqueue-memory-operation.py` and relies on `pk-learning-worker` to drain it — Python and a third daemon, both forbidden here. Its job is done by the receipt (below).

## Module layout

`lib/karpathy/` is one capability. It imports only `lib/platform/`. Split by responsibility, each file well under 500 lines:

| Module | Responsibility | Upstream functions |
|---|---|---|
| `event.mjs` | build a hook event; read an `--input` event | `event_from_hook`, `parse_hook_subject`, `load_event` |
| `validate.mjs` | the size bound, the secret pattern, field rules | `validate_event` |
| `canonical-state.mjs` | CLI or projection; agreement check | `kbd_status`, `canonical_validate` |
| `hash.mjs` | sorted-key serialisation, the float token, both hashes | `event_sha256`, `event_identity_sha256` |
| `receipt.mjs` | path, read, two-phase atomic write | `receipt_path`, `write_receipt` |
| `session-log.mjs` | marker check, locked append | `markdown_record`, `append_session_log` |
| `transport.mjs` | `pk ingest`, `PK_BIN`, timeout → `accepted` or `degraded` | `memory_write` |
| `record.mjs` | the orchestration: new event, replay, flush | `main` |

Pure functions take data and return data (`hash`, `validate`, `markdown_record`, the replay decision). I/O sits in `receipt`, `session-log`, `transport` and `canonical-state`, each taking its collaborators as parameters so a test injects a fake `spawn` and a temp root — the pattern `lib/refiner/provider.mjs` already uses for `home`.

## The two hashes, and why only one needed work

Replay compares a *different* hash by origin (:571–576): `eventIdentitySha256` for `--from-hook`, `eventSha256` for `--input`. The identity hash covers one integer and seven string-or-null fields, so nothing in it can serialise differently between Python and JavaScript. Observed: the Node value equals the recorded one with no special handling.

`eventSha256` covers the whole event minus `observedAt`, and exactly one field in it can be a float: `elapsedHours`, bounded 0–1000 (:240–242). Python writes `0.0`; `JSON.stringify` writes `0`. Observed on the recorded receipt: naive `ca79e321…` differs from the recorded `760d332e…`; emitting that field as `0.0` reproduces it exactly.

So the rule is one function on one named field, not a canonicaliser. RFC 8785 libraries were rejected for a reason that is a property of the problem: the RFC *mandates* ECMAScript number serialisation, so a conformant library must write `0`.

**What is verified and what is not.** One receipt, one value: an integer-valued float. For ordinary decimals in [0.0001, 1000] Python's `repr` and JavaScript's `toString` both produce the shortest round-tripping decimal, and agree; that is expected, not yet observed, so `tasks.md` records vectors rather than assuming. Below 0.0001 they diverge (`1e-05` against `0.00001`), so that range is refused instead of guessed. Vectors must come from a real Python run by a human, once, and be committed as data — this repository must not run Python, and a vector computed by the code under test proves nothing.

## The receipt is the outbox

`config.yaml` requires that memory writes survive a service being down and are "flushed later". Upstream's answer is an outbox drained by a worker. This pack's answer uses what upstream already writes: a receipt with `complete: false` holds the full event snapshot, and replay retries delivery from that snapshot (:586–600). The receipt is therefore a durable queue of one.

What upstream does not provide is a *trigger*: a boundary is never replayed by itself, so a degraded record would stay degraded forever. `--flush-degraded` is that trigger. It is bounded by `--limit` because each retry may wait out the `pk` timeout, and an unbounded sweep over a long-degraded project could take minutes.

Stated plainly, because the source pack's behaviour invites the wrong assumption: a source-pack receipt that is `complete: true` with `memory.status: "queued"` replays as `duplicate` and is **never** retried by anyone — delivery of that memory depends on the Python outbox having been drained. This pack reads that state and must not claim it delivers it.

## Canonical state without the CLI

Upstream refuses every event it cannot confirm against `prometheus kbd status --json`. `config.yaml` limits this pack's dependencies to node, git and the openspec CLI, so the CLI cannot be required. Resolution order: the CLI when it resolves; else `.kbd-orchestrator/current-waypoint.json`, which carries `projectId`, `runId`, the active phase and the next change and task. The receipt records `canonicalState: "cli" | "projection"`, so a reader can tell confirmed evidence from best-effort evidence. That key is this pack's extension: upstream's `write_receipt` does not emit it, and upstream's reader uses `prior.get(…)`, so an extra key is ignored. A CLI that resolves but fails is treated as absent — a broken CLI must not be worse than a missing one.

Two hazards, both observed in this repository: `project.json` carries a *different* `projectId` (`prometheus-skills-mini`) from the waypoint (a UUID), and the event id is a hash over the project id — reading the wrong file would silently fork every event id. Observed: the recorded `eventId` `kpm-d6f1c4a3…` is reproduced from the waypoint's id and **not** from `project.json`'s. And the projection cannot confirm a task's *status*, only name the active subject, so the agreement check runs only in `cli` mode.

## Security boundary (A-3)

The trust boundary is event input: hook environment variables and an `--input` file, both of which reach an append-only log and a receipt that nothing un-writes. Hardening is a **full** port of `validate_event` (`:207-280`) and of the seven-alternative `SECRET` pattern (`:22-27`): a closed field set, per-field limits that differ by field (128, 64, 200, 160, 200, 1 000, 2 000, 4 000 — not one blanket limit), three closed value sets, and `touchedFiles` entries refused when absolute under POSIX **or** Windows rules. Upstream already tests both conventions (`PureWindowsPath`), so this is a port, not a Windows addition.

The first draft of this change ported one secret alternative and four checks and described that as "all ported". It was written from grep fragments of a function that was never read whole; the adversarial review caught it. `tasks.md` 3.0 exists so the implementation does not repeat that.

Two departures from upstream, each stated: refusal messages never contain the text the secret pattern matched, and an unsafe `touchedFiles` entry is named by index rather than echoed as upstream does (`:256`, `{path!r}`). Field checks run *before* the secret scan, so an echoed path can carry a secret the scan never reached — and a secret in a hook log has leaked as surely as one in the session log.

`PK_BIN` is operator-controlled configuration, not event input. It is passed to `spawnExecutable`, which already refuses anything that resolves to a script and never uses a shell.

## What this change cannot prove

- That `pk ingest` *succeeds* from Node on Windows. CI has no `pk` (0 releases; the submodule is not checked out and nothing builds Rust). The transport is proven against an injected `spawn` and against a real executable that fails; the success path against a real `pk` is a manual check, labelled self-reported until a release exists.
- That the hashes port for non-integer `elapsedHours`, until the Python vectors exist.
