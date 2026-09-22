# Windows evidence — `karpathy-progress-recorder`

Task 11.3. Every claim below is a real GitHub Actions run on `windows-latest`, Node 22 and Node 24, not a
self-report. A claim with no run stays labelled self-reported; none do here.

## Runs

- **`35701850871`** (commit `fed5caf`, section-11 evidence commit) — both `windows-latest` legs (node 22
  and node 24) **failed**. The only failure on each: `PATHEXT resolves a bare pk on PATH to pk.exe, with
  no PK_BIN override` (`lib/karpathy/transport.test.mjs`). Root cause: the test built a throwaway `env`
  object with a modified `PATH` and passed it as `deliverToPk`'s `env` parameter, but `deliverToPk` never
  forwards `env` to `spawnExecutable`'s options — `spawnExecutable`'s default `lookupOnPath` always reads
  the real `process.env.PATH` of the running process, which the test never touched. The fixture `pk.exe`
  was never actually on the searched `PATH`; the assertion compared `'pk executable unavailable'` to
  itself and failed. A genuine test bug, not an implementation bug — see commit `6965da7`.
- **`35702142645`** (commit `6965da7`, the fix) — **all six legs green** (`ubuntu-latest`/`macos-latest`/
  `windows-latest` × node 22/24), including `Measure hook cold start against the 1 s budget` on both
  Windows legs. This is the run the claims below are drawn from.

## Windows claims, each with its asserting test and both Node versions' result

| Claim | Asserting test | `windows-latest` · node 22 | `windows-latest` · node 24 |
|---|---|---|---|
| PATHEXT resolves a bare `pk` to `pk.exe` on real `PATH`, no shell | `lib/karpathy/transport.test.mjs` → `PATHEXT resolves a bare pk on PATH to pk.exe, with no PK_BIN override` | `ok 156` | `✔ (1077.5ms)` |
| A CRLF waypoint projection still parses | `lib/karpathy/canonical-state.test.mjs` → `a waypoint written with CRLF still parses` | `ok 59` | `✔ (3.2ms)` |
| A CRLF `--input` event still parses | `lib/karpathy/event.test.mjs` → `CRLF input parses` | `ok 79` | `✔ (0.3ms)` |
| A CRLF session log still finds its marker and is appended to with LF | `lib/karpathy/session-log.test.mjs` → `a CRLF log still finds its marker and is appended to with LF` | `ok 134` | `✔ (6.0ms)` |
| The session-log lock uses the source pack's exact name | `lib/karpathy/session-log.test.mjs` → `the lock is the source pack name: session-log.md.karpathy-progress.lock` | `ok 135` | `✔ (4.1ms)` |
| The session-log lock releases even when the append throws | `lib/karpathy/session-log.test.mjs` → `the lock is released even when the append throws` | `ok 136` | `✔ (3.6ms)` |
| A receipt write is atomic — no partial file ever visible under the target name | `lib/karpathy/receipt.test.mjs` → `the write is atomic: no partial file is ever visible under the target name` | `ok 103` | `✔ (3.3ms)` |
| A refused event (secret) exits 2 and leaves the tree unchanged | `scripts/record-progress.test.mjs` → `exit 2 for a secret, and the tree is unchanged` | `ok 349` | `✔ (83.6ms)` |
| The crash seams exit exactly 74 and 75 | `scripts/record-progress.test.mjs` → `the crash seams exit 74 and 75` | `ok 350` | `✔ (191.0ms)` |
| An absent project root exits 2 cleanly, not a crash | `scripts/record-progress.test.mjs` → `a project root that cannot be found is a clean exit 2, not a crash` | `ok 354` | `✔ (78.1ms)` |

Also observed passing on both Windows legs of `35702142645`, pre-existing coverage this change did not
add but that shares the same CRLF/lock/atomic-write machinery (`lib/platform/`, `rules/build.mjs`): `readText
converts CRLF to LF`, `a CRLF config file parses identically to an LF one`, `a CRLF manifest parses
identically to an LF one`, `a CRLF checkout is reported as current, not as drift`, `the build still detects
real content drift inside a CRLF checkout`, `splitFrontmatter tolerates CRLF line endings`, `routingLayer0
tolerates CRLF line endings`, `budgetErrors counts CRLF lines the same as LF lines`, `parseConf tolerates
CRLF line endings`.

## Full-suite totals, `windows-latest`, run `35702142645`

Both Node versions: `node --test` passed with the same shape as the local macOS run — 1 `todo` (task 1.2,
operator-supplied Python hash vectors, documented blocker, not a failure) and 1 `skipped` entry
(`a receipt whose directory cannot be created is a typed error`, `{ skip: process.platform === 'win32' }`
in `lib/karpathy/receipt.test.mjs` — a POSIX-permissions scenario that does not apply on Windows, an
explicit skip reason, never a silent early return). Zero unexplained failures. `node rules/build.mjs
--check`, `npm run coverage`, `node scripts/spec-validate.mjs`, and `node --test hooks/hooks.test.mjs` all
passed on both Windows legs. `scripts/hook-cold-start.mjs` (the 1-second hook budget measurement,
Windows-only in the workflow) passed on both.

## What this closes

The only prior Windows evidence for this repository predates `karpathy-progress-recorder` (hook-entry
change, `hook-entry-node-only` phase). This is the first real Windows CI evidence for the karpathy
progress recorder specifically, and it caught one genuine defect on the first real run — exactly the
scenario `A-9`/`A-6` exist to guard against: a claim "verified" only by a same-OS proxy is not the same as
a claim verified on the platform it's about.
