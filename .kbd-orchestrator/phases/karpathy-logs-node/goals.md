# Goals

> **REVISED 2026-09-21** after the assess stage, on an operator decision: the Karpathy/OKF knowledge layer
> uses the Rust `pk` CLI (vendored at `tools/prometheus-knowledge`, pinned `01a1dbe`, pk 1.8.0) rather
> than a Node-specific implementation. Goals that assumed a Node OKF writer are withdrawn below, not
> silently deleted. Rationale and the Windows caveat: `.prometheus/decisions.md`.

- **`pk` builds and runs on Windows, macOS and Linux, and that is observed, not asserted.** Today it does not build for Windows: `pk-cli/src/main.rs:1216` uses `std::os::unix::fs::PermissionsExt` with no `cfg` guard, the repo has no CI, and it has 0 releases. This goal is met when a `windows-latest` job compiles and runs `pk` — in the `pk` repository, where the fix belongs. **Changes to that repository need the operator's go-ahead before they are pushed.**
- **This pack invokes `pk` through `lib/platform/spawn.mjs`** — `spawnExecutable`, `shell: false`, argument array — and never through a shell string. `pk` is a per-call process, not a service: it must not add a third daemon, and `pk-learning-worker` is **not** started by this pack.
- **Everything degrades when `pk` is absent.** A missing binary is a degraded result with a clear message, never a failed hook (`degradeSafely`). With 0 upstream releases, "absent" is the default state on a clean machine.
- **The progress recorder — the half `pk` does not cover.** `pk` has no receipts, idempotency or replay comparison; those live in the Python `record-progress.py`, which *calls* `pk ingest`. Decide in analyze: a thin Node recorder that calls `pk`, or a `pk` subcommand. Whichever it is keeps the source pack's on-disk contract: `progress-memory-receipts/<sha256>.json`, a `wx` lock via `lib/platform/lock.mjs`, the 256 KiB payload bound and the secret-pattern rejection (A-3: a recorder that writes a secret into an append-only file cannot un-write it).
- **Receipt hashes are portable across packs, or the incompatibility is declared.** The assessment showed a naive Node hash differs from the Python one because `0.0` serialises as `0`. This stands regardless of the `pk` decision.
- **OKF: the bundle `pk` writes is the bundle this pack reads.** `pk` 1.8.0 emits OKF **v0.1** spellings (`timestamp:`, body `# Citations`); `index.md` here already declares `okf_version: "0.2"`. Either `pk` moves to v0.2 upstream or this pack reads v0.1 — but the pack no longer *writes* OKF itself, so "the writer emits only v0.2" is now a goal for `pk`, not for Node code here.
- The derived trust tier **is** D-6: *unverified* → *machine-confirmed* → *human-reviewed*. Nothing in this phase may promote a lesson to a rule automatically.
- Exit evidence: every Windows claim is observed on `windows-latest` with a named asserting test, in Node 22 and 24 for this pack's code, and in the `pk` repo's own CI for `pk`.

### Withdrawn by the revision (kept for the record)

- ~~A Node `events.jsonl` append-only writer, and `log.md` as a Node-rendered projection.~~ `pk` already writes `events.jsonl` (the two `compiled` events found in assess are its output). Whether a progress-event stream shares that file is now part of the recorder question above.
- ~~A Node OKF v0.2 writer and v0.1→v0.2 reader.~~ Moved to `pk`.
- ~~"Result states collapse to `recorded | duplicate | queued` because `pk ingest` is gone."~~ `pk ingest` is back, so the upstream states — including the ingested/accepted path — apply again.
- ~~The learning queue drained at SessionStart under a time box.~~ Upstream this is `pk-learning-worker`'s job; whether this pack drains it, leaves it, or drops it is an analyze question. It is not started as a daemon here.

## Process goals — carried from `hook-entry-node-only/reflection.md`

- **Verify the claim, not just the code** (corrective action 1). Before every judge call, run the mutation and **paste its output into the task**. Last phase 6 of 8 CRITICALs were defects in my tests or my claims, not my code; a claim of coverage without pasted evidence is an unverified claim.
- **On any accepted finding, search the whole tree for the pattern before fixing the instance** (action 2). The same URL-guard bug was found three times in three places because each fix stopped at the reported file. The fix commit names the search that was run and its hit count.
- **Plan-time path check** (action 4): for every task naming a file, name the earlier task that creates it, or the task is misordered. Three tasks named unresolvable paths last phase.
- **Every count cites the command that produced it** — this stayed PARTIAL last phase and is not yet habit.
- **RESOLVED 2026-09-21 — the review gate:** the operator supplied the liter-llm gateway key; `MiniMax-M3` and `k3` both verified live. Originally: a liter-llm gateway credential (action 3). All ten review rounds last phase were same-model-family because the gateway answers `/health` 200 but rejects every API call for a missing Authorization header. `cross_model_check` was **not** `verified-distinct` for a single artifact. Until this is fixed every verdict in this phase is weaker than the contract assumes.
