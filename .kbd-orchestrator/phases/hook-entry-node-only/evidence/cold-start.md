# Windows cold start against the 1 s budget — change 1, task 5.3

**Run:** [35602464300](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35602464300) — all six jobs green
**Method:** `scripts/hook-cold-start.mjs`, 20 `spawnSync` round trips per hook, wall time via
`process.hrtime.bigint()`. Process start is what the harness timeout bounds, so a process round trip is
what is measured — in-process benchmark libraries cannot see it, which is why `tinybench` and `mitata`
were rejected in analyze.

**Every sample is proven live.** Adversarial review pointed out that exit status alone could not
distinguish "fast" from "did nothing" — the entry point exits 0 on every degradation, so a no-op
dispatch would have made these numbers look *better* while measuring nothing. The harness now runs
against a fixture project with a PAUSE file and asserts each control hook's advisory on stderr, plus a
dispatch-reachability probe for `taskcompleted-kbd-receipt`, which prints nothing. Mutation-verified:
forcing the self-invocation guard false fails with "dispatch is not reachable" instead of reporting
fast timings.

## Measured — verbatim from the job logs

**`windows-latest · node v22.23.2`**
```
platform=win32 node=v22.23.2 samples=20
hook | min | median | p95 | max | budget | verdict
sessionstart-kbd-control | 55.5 | 57.9 | 61.9 | 61.9 | 1000 | within
taskcompleted-kbd-receipt | 54.2 | 55.7 | 61.4 | 61.4 | 1000 | within
precompact-kbd-control | 56.6 | 58.1 | 64.1 | 64.1 | 1000 | within
```

**`windows-latest · node v24.20.0`**
```
platform=win32 node=v24.20.0 samples=20
hook | min | median | p95 | max | budget | verdict
sessionstart-kbd-control | 53 | 54.3 | 58 | 58 | 1000 | within
taskcompleted-kbd-receipt | 51.3 | 52.5 | 56.9 | 56.9 | 1000 | within
precompact-kbd-control | 51.9 | 53.4 | 58.9 | 58.9 | 1000 | within
```

## Verdict

**All three 1000 ms hooks fit, on both supported Node versions.** Worst single sample observed
anywhere: **64.1 ms** (`precompact-kbd-control`, node 22) — **6.4% of budget**, ~15x headroom. The
budget is not raised; no compiled dispatcher is needed, which C7 forbids anyway.

`goals.md` names only `sessionstart-kbd-control` and `taskcompleted-kbd-receipt`. Porting
`precompact-kbd-control` brought a third hook under the same 1000 ms declaration, so it is measured
too — measuring only the two named would have shipped an unmeasured hook against the budget this phase
exists to test.

## What the numbers say that a median would not

The **max** is the number checked, because a timeout fires on the slow run, not the typical one. The
p95-to-max spread here is tight (about 1.1x the median), tighter than the first run measured before the
liveness check was added. Windows is roughly **1.4x slower than macOS** (55 ms vs 40 ms median), the
expected direction and smaller than feared.

## Scope of this claim

Measured on `windows-latest` GitHub-hosted runners, 20 samples per hook, one run. It is not a
statement about every Windows machine: a developer laptop with aggressive real-time scanning could be
slower. The headroom is large enough (~15x) that this is recorded as a non-risk rather than a monitored
one, but the claim is "fits with ~15x headroom on CI runners", not "fits everywhere".
