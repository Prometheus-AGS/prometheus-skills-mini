# Analysis — karpathy-logs-node

Stage: analyze · 2026-09-21 · mode: **stack specified** (Node.js LTS for this pack's code; the Rust `pk` CLI
for the knowledge layer — both fixed by operator decision, so there is no stack contest to escalate).

Inputs read: `goals.md` (revised), `handoffs/assess.handoff.json`, the upstream recorder
`prometheus-skill-pack/skills/process/karpathy-progress-memory/scripts/record-progress.py` (671 lines,
`wc -l`), the `pk` source at `tools/prometheus-knowledge`, and the Windows CI log of pk PR #12.
`versions.toml`, which CLAUDE.md §0 names, **does not exist in this repository** — nothing was read.

## 1. What changed since assess

**`pk` now builds, runs and passes its tests on Windows — observed, not asserted.** pk PR #12
(`Prometheus-AGS/prometheus-knowledge-rs`), CI run 35644261220, head `61688f1`: ubuntu 142 s, macOS 150 s,
windows 209 s, all green. On `windows-latest`: 113 passed / 0 failed (macOS: 115; diffed with `comm -23`). The
two absent tests carry `#[cfg(unix)]` in source: `pk-store/tests/store_tests.rs:42` (uses
`std::os::unix::fs::symlink`) and `pk-learning-worker/src/main.rs:1291` (uses `MetadataExt`). With `HOME` unset pk resolved
`C:\Users\runneradmin\.prometheus/knowledge`. This meets goal 1 **once the PR is merged**; at the time of
writing it is `MERGEABLE`/`CLEAN` but **unmerged**, and the submodule pin is still `01a1dbe`.

That work also produced facts this stage depends on:

| Fact | Evidence |
|---|---|
| The Karpathy flow calls exactly two pk subcommands: `pk ingest --scope project --source karpathy-progress-memory:<eventId>` (record on stdin) and `pk context … --format hook` | ingest: `record-progress.py:411-416`. context: `shared/scripts/karpathy-hook-dispatch.sh:60`, asserted by `shared/scripts/tests/test-karpathy-hooks.sh:45`; `--format` is a `pk context` flag (`pk context --help`) |
| `pk ingest` **cannot succeed without a reachable LLM**; it has no raw/LLM-free mode | `pk-librarian/src/librarian.rs:48-51` maps the client error to `PkError::llm`; `pk ingest --help` lists only `--kb-dir --source --scope --yes` |
| `pk context` needs no network | its own help text: "without invoking an LLM". Observed running with `HOME` unset on `windows-latest`, exit 0 — on a networked runner, so "no network" rests on the help text and the code path, not on an offline run |
| `pk doctor` is **expected** to report FAIL on a healthy Windows machine — **not observed** | Code reading only (it requires `.sh` dispatchers and `/usr/local/bin`). The one doctor test asserts an *empty* fixture is unhealthy, which says nothing about a healthy one. Treat as a hypothesis; do not gate on `pk doctor` either way |
| pk has 0 releases; the only install path today is building from source | `gh release list` (assess) |

## 2. Corrections to the assessment

Three assessment claims do not survive reading the recorder. Each would have produced a wrong spec.

**2.1 "Two event schemas share `events.jsonl`; one file or two is undecided" — the question dissolves.**
The recorder never touches `events.jsonl`. It appends a markdown record to `.prometheus/session-log.md`
(`append_session_log`, `record-progress.py:341-358`: marker-deduplicated, under a lock, fsynced) and writes a
receipt. `events.jsonl` is written only by pk's `pk-event-store` (`pk-event-store/src/fallback.rs:13`). There
is one writer per file already. **No decision needed; nothing to build.**

**2.2 "Receipt hashes are not portable" — true for one hash, on a path this pack does not have.**
The receipt carries two hashes, and replay compares a *different one depending on the event's origin*
(`record-progress.py:571-576`): `eventIdentitySha256` for `--from-hook`, `eventSha256` only for a manual
`--event <file>`. The identity hash covers eight fields (`record-progress.py:490-503`): one integer (`schemaVersion`) and seven
string-or-null fields — `changeId` and `taskId` are `null` in the golden receipt, and `null` serialises
identically in both languages. No float can reach it. Exactly one event field can be a float:
`elapsedHours`, validated to 0–1000 (`:240-242`). Re-observed this session against the golden receipt
`.prometheus/progress-memory-receipts/dea37563….json`:

```
recorded eventSha256 : 760d332edc72460e98ad7c22627bf9db9b902d7bf4cf473f752017fd30a10a13
naive Node hash      : ca79e321903cc10e8bf23597e19e8ea8f241dafbf476b1fb6527b7878f3ca47e DIFFERS
python-float token   : 760d332edc72460e98ad7c22627bf9db9b902d7bf4cf473f752017fd30a10a13 MATCH
identity hash (Node) : be2c1c523097e921da9a538f10ec9f6b7d00317bafa41062384e398f5b775e7c MATCH
```

So for hook events — the only kind this pack emits — a project **can** already move between packs. The
remaining gap is `eventSha256`, and it closes with one rule on one field (§3, G2). **One receipt, one
observed case**: the rule is verified for an integer-valued float only.

**2.3 "The 1000 ms hook budget" does not apply to the recorder.** Upstream fires it from **KBD lifecycle**
hooks (`task:after`, `change:after`, `phase:after`) with a **15 s** timeout
(`kbd-process-orchestrator/hooks/hooks.json:47-73`), not from the harness `TaskCompleted` hook. This pack's
`lib/hooks/taskcompleted-kbd-receipt.mjs` is an unrelated harness receipt. This matters because
`pk ingest` makes an LLM call and takes seconds; it must never be placed inside a 1 s harness hook.

## 3. Gaps and build-vs-adopt calls

### G1 — The progress recorder: thin Node caller, or a `pk` subcommand? → **Node (build)**

The goal "everything degrades when `pk` is absent" decides this without research. Receipts, idempotency,
the lock, the 256 KiB bound and the secret rejection must work on a machine with no `pk` — which, with 0
releases, is *every* clean machine. A `pk record-progress` subcommand would make all of that vanish exactly
when pk is missing, and would need an upstream Rust change plus a release before this pack could use it.
A Node recorder keeps the contract local and treats pk as one optional transport. No library fits: the
contract (receipt shape, two hashes, marker format) is bespoke to the source pack. **cand-201 adopt;
cand-202 reject.**

Reused, not rebuilt: `lib/platform/lock.mjs` (`wx` lock), `lib/platform/atomic-write.mjs` (receipts),
`lib/platform/spawn.mjs` `spawnExecutable` (pk; `pk.exe` is a real executable and passes `refuseScript`;
`spawnSync` takes `input` and `timeout`, which carries upstream's 0.1–10 s `KPM_PK_TIMEOUT_SECONDS` bound),
`lib/platform/text.mjs` (CRLF-tolerant reads), `lib/hooks/context.mjs` `degradeSafely`.

**`PK_BIN` is part of the contract** (`record-progress.py:402`: `os.environ.get("PK_BIN", "pk")`). The port
must honour it, not only a `PATH` lookup: a `pk` installed by `cargo install` outside `PATH` would otherwise
degrade every record silently.

### G2 — Hash portability → **adopt a single-field Python-float token; no canonicalisation library**

Tier 3 (`npm view`, all 0 dependencies): `canonicalize` 5.1.0 (Apache-2.0, 2026-09-18), `json-canonicalize`
3.0.1 (MIT, 2026-09-10), `fast-json-stable-stringify` 2.1.0 (2023-06-22), `safe-stable-stringify` 2.5.0
(2024-08-24). All healthy; **all rejected**, for a reason that is a property of the problem, not the
packages: RFC 8785 *mandates* ECMAScript number serialisation, so a conformant canonicaliser must write
`0` — it is Python's `0.0` that is non-canonical. No off-the-shelf library can reproduce the recorded hash,
and adopting one would add this pack's first runtime dependency (`package.json` has none) to solve the wrong
problem. Sorted-key serialisation is ~10 lines; the float rule is one function on one named field.
**cand-203 adopt; cand-204/205/206 reject.**

Known limit, stated rather than hidden: Python's `repr` and JS `toString` also diverge below 1e-4
(`1e-05` vs `0.00001`) and at ≥1e16. `elapsedHours` is bounded to 0–1000, so only the small-value case is
reachable, and only via a manual event. The spec should cover integer-valued and ordinary decimals with
recorded vectors and **reject** an `elapsedHours` in (0, 1e-4) rather than guess its token.

### G3 — "Append is not in `lib/platform`" → **adopt `fs.appendFileSync` under the existing lock**

The target is `session-log.md`, not an event log. Node's `'a'` flag is `O_APPEND` on POSIX and
`FILE_APPEND_DATA` on Windows; the write already happens under `lock.mjs`. No new primitive and no library.
Upstream re-reads the whole log to find the marker on every call (O(file)); the receipt's
`sessionLogAppended` flag already answers that for a replay, so the scan is only needed when no receipt
exists. **cand-207 adopt.** `lib/refiner/session.mjs`'s read-modify-write append stays as it is — a bounded
per-artifact log, out of scope (A-4).

### G4 — "pk present, LLM absent" → **adopt upstream's receipt-driven retry; drop the queue**

On pk failure upstream enqueues to a Python outbox (`enqueue-memory-operation.py`) drained by
`pk-learning-worker`. This pack may run neither Python nor a third daemon. It does not need to: upstream
already writes `complete: false` with `memory.status: "degraded"`, and a replay of the same event **retries
the memory write from the receipt's own event snapshot** (`record-progress.py:586-600`). The receipt *is*
the queue. Result states for this pack: `recorded` (pk accepted) · `duplicate` · `degraded` (pk absent,
timed out, or exited non-zero — including no LLM). `queued` is never **emitted** here — but it must be **read**: receipts written by the source pack carry it.
The golden receipt is `complete: true` with `memory.status: "queued"`, and upstream retries only when a
receipt is incomplete *or* degraded (`:586-591`), so that receipt replays as `duplicate` and its memory write
is **never retried** by anyone unless the Python outbox is drained. That is upstream behaviour, not a defect
introduced here, but the spec must state it rather than imply every record eventually reaches `pk`.
The learning queue is **dropped**, not drained. **cand-208 adopt.**

**Process contract, which the result states alone do not convey:** exit `0` for `recorded`, `duplicate`
**and `degraded`** (`:614, :626, :662`) — the degrade goal depends on this; exit `2` for a validation or
I/O error (`:667`). The receipt is written **twice**: `complete: false` *before* the memory write, then the
final state after it, which is what makes a crash between the two recoverable. Upstream tests that with two
seams, `KPM_TEST_CRASH_BEFORE_MEMORY` → exit 74 and `KPM_TEST_CRASH_AFTER_PK` → exit 75 (`:636-648`).

### G5 — Getting `pk` onto a machine → **reference only; belongs to the pk repo and the next phase**

Tier 1 (`gh search repos`) + Tier 2 (Context7 `/axodotdev/cargo-dist`):

| Candidate | Health | Verdict |
|---|---|---|
| `axodotdev/cargo-dist` ("dist") 0.32.0 | ★2121, pushed 2026-09-21, Apache-2.0 | **reference** — docs confirm `x86_64-pc-windows-msvc` **and** `aarch64-pc-windows-msvc` targets and `checksum = "sha256"` per artifact, which is exactly the pinned-version + SHA-256-per-platform-key shape The Boss's `download-binaries.js` consumes |
| `taiki-e/upload-rust-binary-action` | ★323, pushed 2026-09-02, Apache-2.0 | reference — smaller, no installers; the fallback if dist is too much |
| `cargo-bins/cargo-binstall` 1.23.0 | ★2887, GPL-3.0 | reject — pk has 0 published artifacts for it to fetch; and installing binstall itself is no easier than downloading a `pk` binary directly |
| `cargo install --git … --locked pk-cli` | — | reference — the only path that works **today**; needs Rust + MSVC build tools, so it is documented as optional, never required |

Nothing here is adopted **in this phase**: releases are a change to the pk repository (operator go-ahead
required) and their consumer is `the-boss-integration`. This phase's obligation is only that absence
degrades. Unverified: whether pk's `ring` dependency cross-compiles under dist's `cargo-xwin` container, or
needs native Windows runners (it built natively on `windows-latest`).

### G6 — OKF v0.1 vs v0.2 → **no Node work; one operator decision**

pk is v0.1 in its Rust source (`grep -o 'OKF v0\.[0-9]'` over `.rs` only: 10 × v0.1, 0 × v0.2; its markdown
and TOML were not searched). This pack's
`index.md` declares `okf_version: "0.2"`. pk does not reject that — `okf_index_reports` checks only that the
block declares nothing *but* `okf_version`, not its value — so nothing is broken today. But the standing
constraint is OKF v0.2 and the writer is v0.1. Since this pack no longer writes OKF, the only honest options
are (a) move pk to v0.2 upstream, or (b) declare v0.1 here until it does. See Open Questions.

## 4. Build required (no adoptable candidate)

1. **`lib/karpathy/` recorder + `scripts/record-progress.mjs` entry point.** Bespoke contract. The port is
   these upstream functions, by name: `event_from_hook` (`:135`), `validate_event` (`:207`),
   `canonical_validate` (`:283`), `markdown_record` (`:315`), `append_session_log` (`:341`), the lock
   (`:361`), `memory_write` (`:399`), both hash functions (`:479, :490`), `write_receipt` (`:509`),
   `receipt_path` (`:59`). Its inputs: env `KBD_HOOK_NAME`, `KBD_TASK_CLASS`, `KBD_TASK_ELAPSED_HOURS`,
   `PK_BIN`, `KPM_PK_TIMEOUT_SECONDS`; `git rev-parse HEAD` and the touched-file list; and
   **`prometheus kbd status --json`**, which `canonical_validate` needs for *every* event (run id, phase,
   change and task status). That makes the `prometheus` CLI a hard prerequisite upstream — see Open Questions.
2. **An invocation point for lifecycle boundaries.** This pack has no Node dispatcher for `task:after` /
   `change:after` / `phase:after` (`grep -rln "task:after\|kbd_hooks_fire" --include=*.mjs lib scripts` → 0
   files); the installed `kbd_hooks_fire` is shell. Smallest honest answer: the recorder is a CLI and the
   carried KBD skills name it at each boundary. Upstream the three boundary commands live in
   `kbd-process-orchestrator/hooks/hooks.json:47-71` and run `python3 record-progress.py`; this pack does
   **not** carry that file (`find skills -path '*kbd*' -name hooks.json` → 0), so the invocation is skill
   text, and the spec must name which skill files change. A general Node lifecycle dispatcher is a larger change and is
   **not** proposed here.
3. **Secret-pattern rejection and the 256 KiB bound** (A-3: untrusted hook/event input reaching an
   append-only file). Port upstream's patterns; do not invent new ones.

## 5. Open questions

1. **(Operator) OKF version.** Move pk to v0.2 upstream (a pk change, needs go-ahead), or set this pack's
   `index.md` to `0.1` until then? Recommendation: declare `0.1` now — it is what the only writer emits —
   and track v0.2 as a pk follow-up. Not silently decided.
2. **(Operator) pk PR #12 is unmerged**, so goal 1 is evidenced but not landed, and the pin is stale.
3. **`PK_BIN` / PATH resolution on Windows.** `spawnExecutable('pk')` relies on `lookupOnPath`; whether it
   resolves `pk.exe` through `PATHEXT` is untested here. A spec scenario, observed on `windows-latest`.
4. **Project-only scope.** Nothing in the flow runs `pk snapshot`, and `ingest` seeds only the project
   scope, so `--scope shared|global` context is empty by construction. Recommend `pk context --scope
   project` only, with `PK_KB_DIR` unset (project root detection already works).
5. **The `prometheus` CLI is a prerequisite of the upstream contract.** `canonical_validate` refuses any
   event that canonical KBD state does not confirm, and gets that state from `prometheus kbd status --json`.
   With the CLI absent upstream exits 2. For this pack: is a missing `prometheus` CLI a `degraded` record, or
   a refusal? A record that skips canonical validation is weaker evidence; a refusal means no progress
   memory on a machine without the CLI. Undecided — a spec decision, and a Windows availability check.
6. **`hooks/dispatch` "exactly six ported ids"** fails if this phase adds a seventh harness hook. Under the
   design above it adds **none** — the recorder is a CLI, not a harness hook — so the scenario stands.

## 6. Review

Round 1, liter-llm gateway: critic `MiniMax-M3`, judge `k3` — endpoint-reported, so `cross_model_check` is
**verified-distinct**. Verdict **PASS**: 0 CRITICAL, 7 WARNING, 8 SUGGESTION (13 rulings + 3 additional; 1
critic finding REJECTED as factually wrong). Every WARNING was checked against source before it was accepted,
and all seven were right: an unenumerated port surface, two claims citing evidence that was not in the
packet, the `queued` read path, `PK_BIN`, the exit-code contract, and an unevidenced `#[cfg(unix)]` claim.
The fixes above were made **after** the PASS and are therefore **unreviewed**. The critic's JSON was
malformed; the judge's rulings quote each finding, so nothing was lost, but the critic file does not parse.

## 7. Research budget

Caps: 8 queries/tier, 20 min. Used: tier 1 = 4, tier 2 = 2, tier 3 = 6, tier 4 = 0. No cap reached.
