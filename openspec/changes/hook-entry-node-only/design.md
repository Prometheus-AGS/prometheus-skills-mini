# Design — hook-entry-node-only

## The identifier decision, and why it is load-bearing

`hooks.json` carries two different identifiers and they are not interchangeable:

| | Spelling | Where | Coverage |
|---|---|---|---|
| Matcher-level `id` | `sessionstart:kbd-control` (colon) | optional field on a matcher entry | **4 of 14** matcher entries |
| Dispatch argument | `sessionstart-kbd-control` (hyphen) | `--hook <id>` in every hook's `args` | **31 of 31** hooks |

`id` is a property of the *matcher*, and a matcher holds 1–6 hooks (the PostToolUse matcher holds 6), so
it cannot address an individual hook at all. The static import map and the manifest test therefore key
on the `--hook` argument. Verified by parsing `hooks.json`: 31 `--hook` values, all distinct.

## Static import map, not lazy import

A 1 s budget with a 59 ms measured floor affords either. The static map is chosen because it makes the
manifest test expressible: the test can assert that every id in `hooks.json` has a map entry **without
executing dispatch**. A lazy `await import()` can only be checked by running it, which means the failure
mode this change exists to prevent — an unpackaged payload — would again only surface at runtime.

## Degradation

A hook's job is to signal, not to gate. Any payload that touches surreal-memory, the liter-llm gateway
or an optional binary catches and exits 0 with a degraded result. This is designed in now rather than
retrofitted, because a hook that fails closed on a missing service would make both services mandatory,
which §P forbids ("everything must still work with both down").

## The budget

Three of the six ported hooks are declared at 1000 ms. Measured cold start on macOS, Node 26, 10 runs,
`spawnSync` wall time, median: bare `node -e 0` 46 ms; empty `.mjs` 48 ms; `.mjs` importing three
`lib/platform` modules 59 ms. That is ~6% of budget, but it is the wrong platform and the median is the
wrong statistic — a 1 s timeout punishes the tail, and Windows process creation is slower and noisier
under antivirus. The measurement on `windows-latest` records a distribution.

If the tail does not fit, the budget is ours to set and is raised, with the measurement stated. A
compiled dispatcher is not an option (C7).

## What this change does not re-implement

`lib/platform/` supplies paths, CRLF-tolerant text reading, atomic write with bounded Windows rename
retry, single-writer locking and shell-free spawning. All five are proven on `windows-latest` with named
asserting tests in Node 22 and 24. A hook that re-implements any of them is a defect, not a shortcut.

## Risk: the open question could invert this design

Everything above assumes the harness accepts exec form in a project `hooks.json`. That is unconfirmed —
the source pack's *plugin* manifest uses exec form for all 31 entries, but the 6 live *settings* entries
inspected on this machine use a shell string with no `args`, and those are different surfaces. Task 1 is
a probe. If exec form is unsupported, the fallback is a single-token command with arguments encoded
elsewhere, and this design is re-planned rather than patched.
