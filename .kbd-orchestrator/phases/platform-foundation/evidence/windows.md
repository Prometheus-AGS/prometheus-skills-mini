# Windows evidence — platform-foundation

Repository: `Prometheus-AGS/prometheus-skills-mini` (public). Prerequisite P2 met 2026-09-21.

First green matrix: **run 35581365409**, all six jobs (`windows-latest`, `ubuntu-latest`,
`macos-latest` × Node 22 and 24). Commit `fix(spec): platform-spawn MODIFIED delta must repeat
every scenario`.

| Claim | Asserting test / command | Run | Job | Result |
|---|---|---|---|---|
| The full suite passes on Windows | `node --test` (49 tests) | 35581155724, 35581365409 | windows-latest · node 22 and node 24 | **OBSERVED PASS** |
| `.gitattributes` survives a hostile checkout | `git config --global core.autocrlf true` before `actions/checkout`, then `node rules/build.mjs --check` | 35581155724, 35581365409 | windows-latest · both | **OBSERVED PASS** — 18 files current, no drift |
| CRLF parser tolerance holds on Windows | `rules/test/render.test.mjs` CRLF fixtures | 35581365409 | windows-latest · both | **OBSERVED PASS** |
| A CRLF checkout is "current", not drift | `rules/test/build-crlf.test.mjs` | 35581365409 | windows-latest · both | **OBSERVED PASS** |
| Path helpers behave on Windows | `lib/platform/paths.test.mjs` | 35581365409 | windows-latest · both | **OBSERVED PASS** |
| `npm ci` + the pinned CLI work on Windows | workflow steps | 35581365409 | windows-latest · both | **OBSERVED PASS** |
| Node 22 and 24 (LTS) both work | matrix | 35581365409 | all six jobs | **OBSERVED PASS** — the dev host runs Node 26 (Current) |

## Still NOT observed (later changes)

| Claim | Blocked on |
|---|---|
| Bounded `EPERM`/`EBUSY`/`EACCES` rename retry under a real held-open destination | `platform-atomic-write-and-lock` (change 4) |
| `wx` lock semantics on Windows | change 4 |
| `spawnNodeCli` with `shell: false` on Windows | `platform-spawn` (change 5) |
| A `.cmd`-only tool is refused | change 5 |

## Observed Windows behaviour that changed the implementation

**Run 35581577… (change 4, first push): `windows-latest` failed while all four other jobs passed.**

```
not ok 10 - a destination held open by another handle is still replaced
  error: "EPERM: operation not permitted, rename 'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\win32-atomic-...'"
  code: 'EPERM'
```

Two facts, neither obtainable on macOS:

1. **Windows really does raise `EPERM` on a rename over a held handle.** The behaviour the retry
   exists for is confirmed, not assumed. macOS and Linux replace the file happily — no failure to
   retry, which is why the retry is `win32`-only.
2. **The original retry window was too short.** 10 ms doubling over 4 retries (150 ms total) was a
   number guessed on a platform where the failure cannot occur. It is now 25 ms over 6 retries
   (~1.575 s), sized against a holder that keeps the file for a few hundred milliseconds — ordinary
   for a scanner or the indexer.

The test was also wrong in a way only Windows exposed: it released the handle with `setTimeout`,
which can never fire, because `atomicWrite` is synchronous and blocks the event loop for the whole
retry window. The holder is now a separate process.

## What CI caught that local runs did not

`openspec validate` failed on all six jobs while passing locally at the time of the push: a
MODIFIED delta in `platform-spawn` omitted two scenarios its requirement still has. The defect
only became detectable once `ci-three-os` archived and its spec became canonical. This is the
argument for CI landing before the Windows-specific code, recorded as evidence rather than opinion.
