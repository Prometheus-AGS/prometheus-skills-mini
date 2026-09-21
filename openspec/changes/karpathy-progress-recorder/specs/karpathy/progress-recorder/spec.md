## ADDED Requirements

### Requirement: The recorder runs on Node alone
The recorder SHALL be `scripts/record-progress.mjs`, an entry point that parses arguments and calls `lib/karpathy/`. No `.sh` or `.py` file SHALL be created, and `lib/karpathy/` SHALL import no other capability — what it shares comes from `lib/platform/`.

#### Scenario: No script files are added
- **WHEN** the files this change adds are listed
- **THEN** none has a `.sh`, `.bash`, `.ps1` or `.py` extension

#### Scenario: The entry point holds no logic
- **WHEN** `scripts/record-progress.mjs` is read
- **THEN** it parses arguments, calls `lib/karpathy/`, prints one JSON line and exits — and defines no validation, hashing or file-writing function of its own

#### Scenario: No cross-capability import
- **WHEN** the import statements under `lib/karpathy/` are listed
- **THEN** every relative import resolves inside `lib/karpathy/` or `lib/platform/`

### Requirement: Neither `pk` nor the `prometheus` CLI is required
The recorder SHALL complete with both binaries absent. A missing, failing or timed-out `pk` SHALL yield the result `degraded`. Canonical KBD state SHALL be read from `prometheus kbd status --json` when that executable resolves, and otherwise from `.kbd-orchestrator/current-waypoint.json`; the receipt SHALL record which source was used.

#### Scenario: Both binaries absent
- **WHEN** a hook boundary is recorded on a machine where neither `pk` nor `prometheus` resolves
- **THEN** the exit code is 0, the result is `degraded`, a receipt exists with `complete: false`, and the receipt's `canonicalState` is `projection`

#### Scenario: The projection supplies identity
- **WHEN** canonical state is read from `current-waypoint.json`
- **THEN** `projectId`, `runId` and the active phase come from that file, and never from `project.json`, whose `projectId` is a different value

#### Scenario: No identity at all is a refusal, not a degradation
- **WHEN** neither source yields a project id, a run id and an active phase
- **THEN** the exit code is 2, stderr names what is missing, and no receipt and no session-log line are written

#### Scenario: Canonical disagreement is refused when it can be checked
- **WHEN** the CLI resolves and its state has a different `runId` from the event, or does not contain the event's phase, or — for a `change` or `task` boundary — its change, or — for a `task` boundary — its task, or reports a status for that subject that differs from the event's `status`
- **THEN** each of the five cases exits 2 and nothing is written, as `canonical_validate` does (`record-progress.py:283-313`)

#### Scenario: A CLI that resolves but fails is treated as absent
- **WHEN** the CLI resolves and exits non-zero, times out, or prints something that is not JSON
- **THEN** canonical state is read from the projection, and the receipt's `canonicalState` is `projection` — a broken CLI is not allowed to be worse than a missing one

#### Scenario: canonicalState is this pack's extension, and harmless to the source pack
- **WHEN** the source pack's recorder reads a receipt written here
- **THEN** it finds every key it reads (`eventSha256`, `eventIdentitySha256`, `event`, `memory`, `complete`, `sessionLogAppended`), and `canonicalState` is one additional key it does not read

### Requirement: Event input is validated as the source pack validates it
Before any write, the recorder SHALL apply every check of the source pack's `validate_event` (`record-progress.py:207-280`), and SHALL refuse the event on the first failure:

- the field set is closed: `schemaVersion`, `eventId`, `observedAt`, `runId`, `boundary`, `status`, `phaseId`, `changeId`, `taskId`, `taskClass`, `elapsedHours`, `touchedFiles`, `verification`, `commitSha`, `blocker`, `exactNextWork`; any other key is refused;
- `schemaVersion` is `1`;
- `eventId` is a string of at most 128 characters matching `^[A-Za-z0-9._:-]{8,128}$`;
- `observedAt` is a string of at most 64 characters matching `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$` and naming a real instant. This is deliberately **narrower** than upstream's `datetime.fromisoformat`, which also accepts a date alone or a space separator; every timestamp either pack *writes* matches it, and `Date.parse` alone would be wider than upstream, accepting strings upstream refuses;
- `runId` is a non-empty string of at most 200 characters, `phaseId` of at most 160, and `changeId` and `taskId` are `null` or strings of at most 200;
- `boundary` is one of `task`, `change`, `phase`; `status` is one of `in_progress`, `complete`, `blocked`, `cancelled`; `taskClass` is one of `product`, `research`, `evidence`, `integration`, `release`;
- a `task` or `change` boundary carries a `changeId`, and a `task` boundary carries a `taskId`;
- `elapsedHours` is a number, not a boolean, in 0–1000;
- `touchedFiles` is an array of at most 500 unique entries, each a non-empty string of at most 1 000 characters that is not absolute under POSIX **or** Windows rules and has no `..` segment under either separator;
- `verification` is an array of at most 100 records, each with exactly the keys `command` (non-empty string, at most 2 000), `exitCode` (integer 0–255) and `summary` (string, at most 4 000);
- `commitSha` is `null` or matches `^[0-9a-fA-F]{7,64}$`;
- `blocker` and `exactNextWork` are `null` or strings of at most 4 000 characters;
- the event measures at most 256 000 bytes — as upstream measures it: the UTF-8 length of the sorted-key JSON with the default `, ` and `: ` separators;
- that same serialisation does not match the source pack's secret pattern, **all seven top-level alternatives of it**, case-insensitively: a credential assignment (`api[_-]?key`, `access[_-]?token`, `password` or `secret`, then `:` or `=`, then a value); `bearer` followed by 12 or more token characters; a PEM private-key header; a GitHub (`gh[pousr]_` + 20), Slack (`xox[baprs]-` + 10) or AWS (`AKIA` + 16) token; an `sk-` key of 16 or more characters, with or without `proj-`.

One rule is added to upstream's, and it is stated as an addition: an `elapsedHours` greater than 0 and less than 0.0001 SHALL be refused, because Python and JavaScript write different tokens for it and `eventSha256` would not port.

#### Scenario: Each alternative of the secret pattern is refused
- **WHEN** an event carries, in any string field, one value per alternative — a credential assignment, a bearer token, a PEM private-key header, a GitHub token, a Slack token, an AWS key id, an `sk-` key
- **THEN** each of the seven events exits 2, and neither the receipt directory nor `session-log.md` changes

#### Scenario: Removing an alternative is detected
- **WHEN** the validator is run with any one alternative of the pattern deleted
- **THEN** the scenario above fails for exactly the value that alternative covered

#### Scenario: Test values are not token-shaped literals in the repository
- **WHEN** the test files are scanned with the same pattern
- **THEN** there is no match — each value is assembled at run time, so no commit carries a string a secret scanner would flag

#### Scenario: A timestamp is judged by shape, not by what Date.parse tolerates
- **WHEN** `observedAt` is `Sep 21 2026`, or `2026-09-21`, or `2026-02-30T00:00:00Z`
- **THEN** each is refused, while `2026-09-21T18:02:59.291123Z` (as Python writes it) and `2026-09-21T18:02:59.291Z` (as Node writes it) are accepted

#### Scenario: An unknown field is refused
- **WHEN** an event carries a key outside the closed set
- **THEN** the exit code is 2 and the message names the key

#### Scenario: A boundary without its subject is refused
- **WHEN** a `task` boundary has no `taskId`, or a `change` boundary has no `changeId`
- **THEN** the exit code is 2

#### Scenario: An unsafe touched file is refused under both path conventions
- **WHEN** `touchedFiles` contains `/etc/passwd`, `C:\Windows\x`, `\\server\share\x`, `../x` or `..\x`
- **THEN** each is refused on every operating system, not only on the one whose convention it uses

#### Scenario: Per-field limits are upstream's, not a blanket limit
- **WHEN** `runId` is 201 characters, or `phaseId` 161, or `eventId` 129, or a `touchedFiles` entry 1 001, or a verification `command` 2 001
- **THEN** each is refused, although each is far below 4 000 characters

#### Scenario: The size bound is the one upstream enforces, not the one it names
- **WHEN** one event measures 256 000 bytes by that rule and another 256 001
- **THEN** the first is accepted and the second refused — upstream's message says "256 KiB" but its check is `256_000`, and an event accepted by one pack must be accepted by the other

#### Scenario: A value whose token does not port is refused
- **WHEN** `elapsedHours` is `0.00001`
- **THEN** the exit code is 2 and the message says the value cannot be hashed portably

#### Scenario: The portability of ordinary decimals is recorded, not assumed
- **WHEN** the Python hash vectors of `tasks.md` 1.2 are absent
- **THEN** the vector test is reported as `todo`, and the phase evidence labels the hash rule "verified for one integer-valued float only"

### Requirement: Receipts keep the source pack's on-disk contract
A receipt SHALL be written to `.prometheus/progress-memory-receipts/<sha256(eventId)>.json` by atomic write, under a per-event `wx` lock from `lib/platform/lock.mjs`, whose file is the receipt path with the suffix `.lock` — the name the source pack uses, and an exclusive-create lock like its own, so the two packs exclude each other on one project root. It SHALL carry `eventSha256` — SHA-256 of the event without `observedAt`, keys sorted, separators `,` and `:`, non-ASCII unescaped — and `eventIdentitySha256` over `schemaVersion`, `eventId`, `runId`, `boundary`, `status`, `phaseId`, `changeId`, `taskId`. `elapsedHours` SHALL be serialised as Python writes a float: an integer value gains `.0`.

#### Scenario: The recorded Python hashes are reproduced
- **WHEN** both hashes are computed for the event inside the recorded receipt `dea37563…json`
- **THEN** `eventSha256` equals `760d332edc72460e98ad7c22627bf9db9b902d7bf4cf473f752017fd30a10a13` and `eventIdentitySha256` equals `be2c1c523097e921da9a538f10ec9f6b7d00317bafa41062384e398f5b775e7c`

#### Scenario: The float rule is what makes the first hash match
- **WHEN** the same event is hashed with `elapsedHours` serialised by `JSON.stringify`
- **THEN** the result is `ca79e321903cc10e8bf23597e19e8ea8f241dafbf476b1fb6527b7878f3ca47e`, not the recorded value — so removing the rule fails the scenario above

#### Scenario: A hook event id is derived as upstream derives it
- **WHEN** an event is built for a boundary
- **THEN** `eventId` is `kpm-` plus the first 32 hex characters of SHA-256 over project id, run id, boundary, phase id, change id, task id and `complete`, joined by a NUL byte, with an absent value as the empty string

#### Scenario: The receipt is written before and after delivery
- **WHEN** a new event is recorded
- **THEN** a receipt with `complete: false` exists before the `pk` call starts, and is replaced by the final receipt after it

#### Scenario: A crash between the two writes is recoverable
- **WHEN** the process exits with 74 at the `KPM_TEST_CRASH_BEFORE_MEMORY` seam, or with 75 at the `KPM_TEST_CRASH_AFTER_PK` seam, and the same boundary is recorded again
- **THEN** the second run finishes the delivery from the receipt's event snapshot and appends no second session-log record

### Requirement: Replay is idempotent and detects collisions
When a receipt already exists for an `eventId`, the recorder SHALL compare `eventIdentitySha256` for a hook event (`--from-hook`) and `eventSha256` for an event given by `--input`. A mismatch SHALL exit 2. A match SHALL return `duplicate` without writing, unless the receipt is incomplete or its memory status is `degraded`, in which case delivery SHALL be retried from the receipt's own event snapshot.

#### Scenario: A repeated boundary is a duplicate
- **WHEN** the same hook boundary is recorded twice with `pk` succeeding
- **THEN** the second result is `duplicate`, exit 0, and `session-log.md` holds one record for the event

#### Scenario: A different payload under the same id is a collision
- **WHEN** an `--input` event carries an existing `eventId` and a different `exactNextWork`
- **THEN** the exit code is 2 and the receipt is unchanged

#### Scenario: A source-pack receipt marked queued is read, not retried
- **WHEN** the existing receipt is `complete: true` with `memory.status: "queued"`, as the source pack writes
- **THEN** the result is `duplicate` and `pk` is not invoked

#### Scenario: This pack never emits queued
- **WHEN** every result the recorder can produce is enumerated
- **THEN** the set is exactly `recorded`, `duplicate`, `degraded`

### Requirement: The session log is appended once per event
The recorder SHALL append the markdown record to `.prometheus/session-log.md` under the lock file `.prometheus/session-log.md.karpathy-progress.lock` — the source pack's name — held across the marker check and the append, using an append-mode write, and SHALL skip the append when the marker `<!-- karpathy-progress-event:<eventId> -->` is already present. It SHALL NOT rewrite the file.

#### Scenario: One record per event
- **WHEN** an event is recorded and then replayed after a crash at seam 74
- **THEN** the marker appears exactly once

#### Scenario: Existing content is never rewritten
- **WHEN** a record is appended to a log that already has content
- **THEN** the file's previous bytes are an exact prefix of its new bytes

#### Scenario: A CRLF log is appended to without corrupting it
- **WHEN** the existing log uses CRLF line endings
- **THEN** the marker is still found on replay, and the appended record is written with LF

### Requirement: `pk` is invoked as an optional, bounded, shell-free transport
Delivery SHALL run `pk ingest --scope project --source karpathy-progress-memory:<eventId>` with the record on stdin, through `lib/platform/spawn.mjs` with `shell: false`. The executable SHALL be `PK_BIN` when set, else `pk` resolved on `PATH`. The timeout SHALL be `KPM_PK_TIMEOUT_SECONDS`, default 5, and a value outside 0.1–10 SHALL exit 2. Exit 0 from `pk` is `accepted`; every other outcome is `degraded`.

#### Scenario: PK_BIN outside PATH is honoured
- **WHEN** `PK_BIN` names an executable in a directory that is not on `PATH`
- **THEN** that executable is the one spawned

#### Scenario: A pk that fails is a degraded record, not a failed run
- **WHEN** `pk` exits non-zero, as it does with no LLM reachable
- **THEN** the result is `degraded`, the exit code is 0, and the receipt is `complete: false`

#### Scenario: A pk that hangs is bounded
- **WHEN** `pk` does not exit within the timeout
- **THEN** it is terminated, and the result is `degraded`

#### Scenario: The recorder never sits inside a one-second hook
- **WHEN** `hooks/hooks.json` is read
- **THEN** no entry with a timeout of 1000 ms or less reaches `lib/karpathy/`

### Requirement: Degraded receipts can be flushed
`--flush-degraded` SHALL retry delivery for each receipt that is incomplete or degraded, oldest first, up to `--limit` receipts (default 25), and SHALL report how many were delivered, how many remain degraded, and how many were left unvisited.

#### Scenario: A degraded record is delivered once pk works
- **WHEN** a boundary was recorded as `degraded` and `--flush-degraded` later runs with a working `pk`
- **THEN** that receipt becomes `complete: true`, and no second session-log record is appended

#### Scenario: A flush with pk still absent changes nothing and succeeds
- **WHEN** `--flush-degraded` runs and `pk` does not resolve
- **THEN** the exit code is 0, every visited receipt is still degraded, and the report says so

### Requirement: Results and exit codes are a stable contract
The recorder SHALL print one JSON object on stdout carrying `status` and `eventId`, and SHALL exit 0 for `recorded`, `duplicate` and `degraded`, and 2 for a validation, collision, identity or I/O error, with the reason on stderr. A refusal message SHALL NOT contain the text the secret pattern matched, and SHALL identify an unsafe `touchedFiles` entry by its index rather than by its value: field checks run before the secret scan, so an echoed path could carry a secret the scan never reached.

#### Scenario: Degraded exits zero
- **WHEN** the result is `degraded`
- **THEN** the exit code is 0

#### Scenario: A refusal names its reason without echoing the match
- **WHEN** an event is refused for matching the secret pattern
- **THEN** stderr states that the event appears to contain a secret and does not contain the matched text

#### Scenario: An unsafe path is named by position
- **WHEN** the third `touchedFiles` entry is absolute and also contains a credential assignment
- **THEN** stderr names index 2 and contains neither the path nor the credential

### Requirement: The recorder ships with its skill, and lifecycle wiring is declared rather than implied
The change SHALL carry the source pack's `karpathy-progress-memory` skill document together with `references/progress-event.schema.json`, which that document cites — with every invocation rewritten to `node scripts/record-progress.mjs`: `--from-hook --boundary <task|change|phase>`, `--input <file|->`, and `--flush-degraded`. This repository carries no KBD lifecycle skill yet, so the skill document SHALL state that nothing invokes the recorder automatically until the KBD skills are ported, and SHALL name that as the follow-up. No harness hook SHALL be added.

#### Scenario: hooks/dispatch is unchanged
- **WHEN** this change is complete
- **THEN** the set of `--hook` ids in `hooks/hooks.json` is exactly `sessionstart-kbd-control`, `sessionstart-detect-project-context`, `posttool-write-position-reminder`, `subagent-fallback-checkpoint`, `taskcompleted-kbd-receipt`, `precompact-kbd-control`

#### Scenario: The skill names only what exists
- **WHEN** the carried-payload test resolves every script path the skill document names
- **THEN** each one exists in this repository, and none ends in `.py` or `.sh`

#### Scenario: The missing wiring is stated, not hidden
- **WHEN** the skill document is read
- **THEN** it says that no KBD skill in this repository fires the recorder yet, and names the follow-up

### Requirement: Windows behaviour is observed, not asserted
Every scenario above that is not conditional on a platform SHALL run on `windows-latest`, `ubuntu-latest` and `macos-latest` under Node 22 and Node 24; a scenario whose WHEN names a platform SHALL run there and SHALL be reported elsewhere as skipped with its reason, never passed silently; and the phase evidence SHALL name the asserting test and the run for each Windows claim.

#### Scenario: An executable is resolved through PATHEXT
- **WHEN** on Windows a copy of the Node executable named `pk.exe` sits in a directory on `PATH` and `PK_BIN` is unset
- **THEN** the recorder spawns it by the bare name `pk`
