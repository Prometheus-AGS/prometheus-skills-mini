# Windows evidence — hook-entry-node-only

Every Windows behaviour this change claims, with the asserting test on **both** supported Node
versions. Test lines are verbatim from the job logs; none is paraphrased.

- **Run:** [35601170970](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35601170970) — all six jobs green
- **Suite:** node 22 `2026-09-21T12:43:54.5649049Z # pass 148` / `2026-09-21T12:43:54.5649320Z # fail 0`; node 24 `2026-09-21T12:43:55.7962688Z ℹ pass 148` / `2026-09-21T12:43:55.7962876Z ℹ fail 0`
- **Repository:** `Prometheus-AGS/prometheus-skills-mini` (public)

The two jobs print different formats — node 22's step emits TAP (`ok N - <name>`), node 24's emits the
spec reporter (`✔ <name>`). Both name the test, which is what the evidence requires.

## Per-claim evidence

| Claim | `node 22`, verbatim | `node 24`, verbatim |
|---|---|---|
| Exec-form manifest: every hook registered without a shell string | `ok 8 - every hook is registered in exec form, never a shell string` | `✔ every hook is registered in exec form, never a shell string (0.6371ms)` |
| Every file the manifest names resolves on Windows paths | `ok 2 - every file the manifest names resolves on disk` | `✔ every file the manifest names resolves on disk (0.9068ms)` |
| Entry points import on Windows (file:// URL, not a bare D:\ path) | `ok 3 - every entry point named by the manifest is importable` | `✔ every entry point named by the manifest is importable (2.9328ms)` |
| Manifest and import map cannot drift apart | `ok 5 - every payload the manifest dispatches exists on disk` | `✔ every payload the manifest dispatches exists on disk (0.9031ms)` |
| Scope is exactly the six ported ids | `ok 7 - the manifest registers exactly the six ported hook ids` | `✔ the manifest registers exactly the six ported hook ids (1.4045ms)` |
| A hook degrades rather than failing when a service is absent | `ok 39 - degradeSafely converts a thrown error into a degraded result` | `✔ degradeSafely converts a thrown error into a degraded result (2.2613ms)` |
| The position reminder writes atomically on Windows | `ok 49 - posttool-write-position-reminder writes the reminder atomically` | `✔ posttool-write-position-reminder writes the reminder atomically (4.0749ms)` |
| No temporary file is left behind by the atomic write | `ok 50 - posttool-write-position-reminder leaves no temporary file behind` | `✔ posttool-write-position-reminder leaves no temporary file behind (29.5066ms)` |
| Dispatch keys on --hook, never the colon-spelled matcher id | `ok 143 - every import-map key is a dispatch id, never a colon-spelled matcher id` | `✔ every import-map key is a dispatch id, never a colon-spelled matcher id (0.3794ms)` |
| An unknown hook id is refused, not silently ignored | `ok 141 - an unknown hook id exits non-zero and names the id` | `✔ an unknown hook id exits non-zero and names the id (71.1719ms)` |

## Cold start against the 1 s budget

Measured, not asserted. Full distribution and verbatim logs in [`cold-start.md`](cold-start.md).

| Node | median | max | budget | headroom |
|---|---|---|---|---|
| 22 | 54 ms | 59.2 ms | 1000 ms | ~17x |
| 24 | 58 ms | 87.2 ms | 1000 ms | ~11x |

The **max** is the number that matters: a timeout fires on the slow run, not the typical one.

## What CI found that this machine could not

**A Windows-only defect in the manifest test.** The first run (35600976641) failed **both** Windows
jobs while all four Unix jobs passed:

```
Only URLs with a scheme in: file, data, and node are supported by the default ESM loader.
On Windows, absolute paths must be valid file:// URLs. Received protocol 'd:'
```

`import(file)` with an absolute path parses as a path on POSIX but as a URL with scheme `d:` on
Windows. Fixed with `pathToFileURL()`; it was the only bare-path dynamic import in the codebase.

This was undiscoverable on the development host, and it would have broken the manifest check — the
very test that exists to catch an unpackaged payload — on every Windows run.

## Scope of these claims

Observed on `windows-latest` GitHub-hosted runners under `core.autocrlf=true`, set **before** checkout
so the line-ending work is tested against the default most likely to break it. Node 22 and 24 only;
the development host runs Node 26, which CI does not cover. The exec-form probe (`exec-form-probe.md`)
was observed on **Claude Code / macOS** and is not re-observed here: this run proves the manifest and
payloads work on Windows, not that another harness fires them.
