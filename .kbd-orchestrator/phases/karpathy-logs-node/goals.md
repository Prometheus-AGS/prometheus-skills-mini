# Goals

- `.prometheus/events.jsonl` is the append-only source of truth for progress events — one `appendFile` per event, crash-safe, never rewritten. The recorder reads `.kbd-orchestrator/` state directly and does **not** shell out to `prometheus kbd status --json` (C7: no Rust binary on the path).
- `.prometheus/log.md` is a **projection**, not the log: rendered from `events.jsonl`, date-grouped, newest first, written atomically through `lib/platform/atomic-write.mjs`. The source pack's append-only `session-log.md` is read for migration and no longer written.
- Idempotency through receipts: `progress-memory-receipts/<sha256>.json` with a `.lock` acquired by `fs.open(path, 'wx')` — `lib/platform/lock.mjs`, never Python's `O_EXCL`. Result states collapse to `recorded | duplicate | queued` because `pk ingest` is gone (prometheus-knowledge is not one of the two kept services).
- The learning queue lives under `os.homedir()` via `lib/platform/paths.mjs`, never `$HOME`, and is drained at SessionStart **under a time box** rather than by a daemon.
- `.prometheus/` is a conformant **OKF v0.2** bundle: `index.md` carrying `okf_version: "0.2"`, plus `decisions/`, `gotchas/`, `postmortems/` and `knowledge/**` as concept files with the v0.2 field families (`type`, `generated{by,at}`, `verified[]`, `status`, `stale_after`, `sources[]`). `events.jsonl` and the receipts are outside OKF and conformance ignores them.
- **The reader accepts v0.1 and v0.2; the writer emits only v0.2.** The two renames are `timestamp` → `generated.at` and the body `# Citations` list → `sources` frontmatter. `pk` emits 0.1 today, so migration is a real path, not a hypothetical one.
- The derived trust tier **is** D-6: *unverified* → *machine-confirmed* → *human-reviewed*, computed from `verified[]`. A lesson may become a rule only at *human-reviewed*, and nothing in this phase may promote one automatically.
- The source pack's **256 KiB payload bound and secret-pattern rejection are kept** — a recorder that writes a secret into an append-only file cannot un-write it (A-3: the tool-execution boundary is real here).
- Exit evidence: every claim this phase makes about Windows is observed on `windows-latest` CI with a named asserting test, in both Node 22 and 24.

## Process goals — carried from `hook-entry-node-only/reflection.md`

- **Verify the claim, not just the code** (corrective action 1). Before every judge call, run the mutation and **paste its output into the task**. Last phase 6 of 8 CRITICALs were defects in my tests or my claims, not my code; a claim of coverage without pasted evidence is an unverified claim.
- **On any accepted finding, search the whole tree for the pattern before fixing the instance** (action 2). The same URL-guard bug was found three times in three places because each fix stopped at the reported file. The fix commit names the search that was run and its hit count.
- **Plan-time path check** (action 4): for every task naming a file, name the earlier task that creates it, or the task is misordered. Three tasks named unresolvable paths last phase.
- **Every count cites the command that produced it** — this stayed PARTIAL last phase and is not yet habit.
- **OPERATOR, BLOCKING THE REVIEW GATE:** a liter-llm gateway credential (action 3). All ten review rounds last phase were same-model-family because the gateway answers `/health` 200 but rejects every API call for a missing Authorization header. `cross_model_check` was **not** `verified-distinct` for a single artifact. Until this is fixed every verdict in this phase is weaker than the contract assumes.
