Each code task is test-first: write the `node:test` file, run it and see it fail, then write the module. A task that names a file either creates it or names the task that did. Cheap checks only while implementing (`node --check`, the one test file); the full battery runs in §11.

## 1. Fixtures — before any code

- [x] 1.1 Create `lib/karpathy/fixtures/golden-receipt.json` as a copy of `.prometheus/progress-memory-receipts/dea375631f620b20970cb0d952d42dcb74503eceeaabc07482278b8f6a073676.json`. Tests read the fixture, never the live directory.
- [ ] 1.2 Ask the operator for Python hash vectors: with the exact command in `lib/karpathy/fixtures/README.md`, for `elapsedHours` in `0`, `0.0`, `1`, `1.0`, `0.5`, `0.25`, `1.5`, `12.75`, `0.0001`, `999.999`, `1000`, `1000.0` (integer and float forms are different inputs to Python — see design.md), the `eventSha256` that the source pack's `event_sha256` produces for the 1.1 event with that value. Commit their output as `lib/karpathy/fixtures/python-hash-vectors.json` with the exact command they ran. **This repository never runs Python, and a vector produced by the code under test proves nothing.** Until the file exists, §2's vector test is marked `todo` and the hash claim stays "verified for one integer-valued float only".

## 2. Hashing — `lib/karpathy/hash.mjs`

- [x] 2.1 Write `lib/karpathy/hash.test.mjs`: both recorded hashes of the 1.1 fixture are reproduced; serialising `elapsedHours` with `JSON.stringify` yields `ca79e321…` and therefore does not match; key order of the input does not change either hash; a non-ASCII string is hashed unescaped; every vector in 1.2 matches (or `todo`).
- [x] 2.2 Write `lib/karpathy/hash.mjs`: sorted-key compact serialisation; for `elapsedHours` only, the raw numeric token when the event came from text and Python's float form when it was built here; `eventSha256` (drops `observedAt`), `eventIdentitySha256` (the eight named fields, absent as `null`).
- [x] 2.3 Mutation: remove the float rule and confirm 2.1's first test fails; paste the output into the evidence file (11.3).

## 3. Validation — `lib/karpathy/validate.mjs`

- [x] 3.0 **Read `record-progress.py:20-31` and `:199-282` in full before writing anything.** The first draft of this spec ported one of the secret pattern's seven alternatives and four of `validate_event`'s checks, because it was written from grep fragments.
- [x] 3.1 Write `lib/karpathy/validate.test.mjs`, one test per bullet of the spec's validation requirement: the closed field set; `schemaVersion`; the `eventId` format and its 128 limit; `observedAt` by the spec's shape rule, including `Sep 21 2026`, a bare date and `2026-02-30T…` refused and both packs' own timestamp forms accepted; (observed: Node parses `2026-02-30T00:00:00Z` as March 2 and `Sep 21 2026` as a date, so `Date.parse` alone accepts both — check the calendar fields against the month length directly, and do **not** compare the UTC date prefix, which an offset such as `-05:00` legitimately changes); the per-field limits, each tested at limit and limit + 1 and named here by field so none is dropped — `eventId` 128, `observedAt` 64, `runId` 200, `phaseId` 160, `changeId` 200, `taskId` 200, a `touchedFiles` entry 1 000, a verification `command` 2 000, a verification `summary` 4 000, `blocker` 4 000, `exactNextWork` 4 000; the three closed sets; the boundary-requires-subject rules; `elapsedHours` of `-1`, `1000.5`, `true`, `"1"` and `0.00001` refused, `0` and `1000` accepted; `touchedFiles` uniqueness, the 500 cap, and POSIX-absolute, drive-absolute, UNC and `..` entries under both separators, each refused on every OS; `verification` record shape; `commitSha`; 256 000 accepted and 256 001 refused on the default-separator serialisation.
- [x] 3.1b Secret pattern: seven values, one per alternative (the credential assignment counts once; GitHub, Slack and AWS are three), **assembled at run time** from fragments so no token-shaped literal is committed; assert each is refused, and that the test files themselves do not match the pattern. Mutation: delete each alternative in turn and confirm exactly its value gets through.
- [x] 3.1c Refusal messages: the matched secret text is absent; an unsafe `touchedFiles` entry is named by index, and neither its path nor a credential inside it appears.
- [x] 3.2 Write `lib/karpathy/validate.mjs` as a pure function returning a list of reasons. Absolute-path detection uses `path.win32.isAbsolute` and `path.posix.isAbsolute` together, never the host's `path`.

## 4. Canonical state — `lib/karpathy/canonical-state.mjs`

- [ ] 4.1 Write `lib/karpathy/canonical-state.test.mjs` with an injected `spawn` and a temp root: CLI present → `source: "cli"`; CLI absent → `source: "projection"` read from `current-waypoint.json`; `projectId` never read from `project.json` (fixture gives the two files different ids); neither source → a typed error naming what is missing; CLI present and any of the five disagreements of `canonical_validate` (`:283-313`) → a typed error: a different `runId`, an unknown phase, an unknown change, an unknown task, a different status; CLI resolves but exits non-zero, times out or prints non-JSON → `source: "projection"`; projection mode skips the agreement check.
- [ ] 4.2 Write `lib/karpathy/canonical-state.mjs`. The CLI is reached through `lib/platform/spawn.mjs` `spawnExecutable`.

## 5. Events — `lib/karpathy/event.mjs`

- [ ] 5.1 Write `lib/karpathy/event.test.mjs`: the hook event id equals `kpm-` + the first 32 hex of SHA-256 over the seven NUL-joined parts, an absent part as the empty string, and reproduces the 1.1 fixture's `eventId` `kpm-d6f1c4a3b56523b3673b20a41c84abe3` from that fixture's event fields plus project id `78f44ea7-639e-4a07-a792-01eeb9d2a48a` (the receipt does not carry the project id; it is the waypoint's), while the `project.json` id `prometheus-skills-mini` produces a different event id; `KBD_TASK_CLASS` lower-cased, default `product`; `KBD_TASK_ELAPSED_HOURS` non-numeric refused; `--input -` reads stdin, and CRLF input parses.
- [ ] 5.2 Write `lib/karpathy/event.mjs`. `git rev-parse HEAD` and the touched-file list go through `spawnExecutable('git', …)`; a repository with no commits yields `commitSha: null`, not an error.

## 6. Receipts — `lib/karpathy/receipt.mjs`

- [ ] 6.1 Write `lib/karpathy/receipt.test.mjs`: the path is `<root>/.prometheus/progress-memory-receipts/<sha256(eventId)>.json` and equals the 1.1 fixture's file name for its `eventId`; writes are atomic (`lib/platform/atomic-write.mjs`); the 1.1 fixture, which is `complete: true` + `memory.status: "queued"`, is read without error; an unreadable receipt is a typed error, never treated as absent.
- [ ] 6.2 Write `lib/karpathy/receipt.mjs`, including `canonicalState` in what it writes.

## 7. Session log — `lib/karpathy/session-log.mjs`

- [ ] 7.1 Write `lib/karpathy/session-log.test.mjs`: one marker per event across a replay; the previous bytes are an exact prefix after an append; a CRLF log still finds its marker and is appended with LF; the append happens under `lib/platform/lock.mjs` `acquireLock` on `.prometheus/session-log.md.karpathy-progress.lock` (the source pack's name), held across the marker check and the append, and released when the write throws.
- [ ] 7.2 Write `lib/karpathy/session-log.mjs` using an append-mode write. It does not import `lib/refiner/`.

## 8. Transport — `lib/karpathy/transport.mjs`

- [ ] 8.1 Write `lib/karpathy/transport.test.mjs` with an injected `spawn`: the argv is exactly `ingest --scope project --source karpathy-progress-memory:<eventId>`, the record arrives on stdin, `shell` is `false`; `PK_BIN` replaces the program; exit 0 → `accepted` with `receiptSha256` of stdout; non-zero, `ENOENT` and a timeout each → `degraded` with a reason; `KPM_PK_TIMEOUT_SECONDS` of `0.05`, `11` and `abc` each refused; default 5.
- [ ] 8.2 One test with a **real** process and no injection: `PK_BIN` set to `process.execPath`, which exits non-zero for these arguments → `degraded`, exit 0. This is the only place a real child is spawned.
- [ ] 8.3 Write `lib/karpathy/transport.mjs`.

## 9. Orchestration and entry point

- [ ] 9.1 Write `lib/karpathy/record.test.mjs` against a temp root with injected transport and state: new event → `recorded`; replay → `duplicate`, one marker; `--input` collision → typed error, receipt unchanged; degraded then replay with working transport → `recorded`, still one marker; the receipt exists with `complete: false` *before* the transport is called (assert inside the injected transport); seams `KPM_TEST_CRASH_BEFORE_MEMORY` and `KPM_TEST_CRASH_AFTER_PK` recover on the next run; the set of reachable statuses is exactly `recorded | duplicate | degraded`.
- [ ] 9.2 Flush: `--flush-degraded` delivers a degraded receipt, leaves a `queued`+`complete` one alone, honours `--limit`, and with no transport exits 0 reporting every visited receipt still degraded.
- [ ] 9.3 Write `lib/karpathy/record.mjs`.
- [ ] 9.4 Write `scripts/record-progress.test.mjs` (spawned, `shell: false`): exit 0 for `degraded` with no `pk` on `PATH`; exit 2 and an unchanged tree for a secret; exit 74 and 75 at the seams; stdout is one JSON line; the self-invocation guard uses `realpathSync(fileURLToPath(import.meta.url))`, so `scripts/carried-mjs.test.mjs`'s URL-concatenation scan stays green.
- [ ] 9.5 Write `scripts/record-progress.mjs`: arguments, one call into `lib/karpathy/record.mjs`, one JSON line, exit code. No logic.
- [ ] 9.6 Add a test that no `hooks/hooks.json` entry with `timeout <= 1000` dispatches to a module that imports `lib/karpathy/`, and that the manifest still declares six ids.

## 10. The skill document

- [ ] 10.1 Carry `prometheus-skill-pack/skills/process/karpathy-progress-memory/SKILL.md` to `skills/karpathy-progress-memory/SKILL.md`. Carry `references/progress-event.schema.json` beside it, which the document cites, and add a test that the schema's `properties` agree with the validator's closed field set. Rewrite every invocation to `node scripts/record-progress.mjs …`; remove the outbox and `pk-learning-worker` sections; state that no KBD skill here fires the recorder yet and name the follow-up (the phase that ports the KBD skills).
- [ ] 10.2 Run `node --test skills/carried-payload.test.mjs`: every script the new skill names resolves, and no fenced block invokes `python3`.

## 11. Evidence and close

- [ ] 11.1 Add `lib/karpathy/*.test.mjs` and `scripts/record-progress.test.mjs` to `.github/workflows/ci.yml` only if the workflow lists test files explicitly; if it runs `node --test` over the tree, change nothing.
- [ ] 11.2 Full battery, once: `node --test`, `node rules/build.mjs --check`, `npx --no-install openspec validate --all --no-interactive`, the constraint gate. Count tests with `grep -c '^test('` against the runner's total.
- [ ] 11.3 After the operator pushes: record in `.kbd-orchestrator/phases/karpathy-logs-node/evidence/windows.md`, for Node 22 and 24 on `windows-latest`, the asserting test and run for each Windows claim — the PATHEXT resolution, the CRLF session log, the lock, atomic receipts, exit codes. A claim with no run stays labelled self-reported.
- [ ] 11.4 The PATHEXT scenario is Windows-only: copy `process.execPath` to a temp directory as `pk.exe`, put it on `PATH`, and assert the transport's program resolves. Skip with an explicit reason elsewhere — never with a silent early `return`.
- [ ] 11.5 Record in `.prometheus/decisions.md`: the receipt-as-outbox decision, the `256_000` versus "256 KiB" upstream inconsistency, `canonicalState` as this pack's receipt extension, the stderr rule that departs from upstream (index, not path), and that `queued` is read but never emitted. Update `README.md` §5.3's superseded note to point at this capability.
