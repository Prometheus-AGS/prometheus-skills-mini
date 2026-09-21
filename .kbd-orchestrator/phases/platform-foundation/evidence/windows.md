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

## What CI caught that local runs did not

`openspec validate` failed on all six jobs while passing locally at the time of the push: a
MODIFIED delta in `platform-spawn` omitted two scenarios its requirement still has. The defect
only became detectable once `ci-three-os` archived and its spec became canonical. This is the
argument for CI landing before the Windows-specific code, recorded as evidence rather than opinion.
