# Windows cold start against the 1 s budget — change 1, task 5.3

**Run:** [35601170970](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35601170970) — all six jobs green
**Method:** `scripts/hook-cold-start.mjs`, 20 `spawnSync` round trips per hook, wall time via
`process.hrtime.bigint()`. Process start is what the harness timeout bounds, so a process round trip is
what is measured — in-process benchmark libraries cannot see it, which is why `tinybench` and `mitata`
were rejected in analyze.

## Measured — verbatim from the job logs

**`windows-latest · node v22.23.2`**
```
platform=win32 node=v22.23.2 samples=20
hook | min | median | p95 | max | budget | verdict
sessionstart-kbd-control | 51.5 | 54 | 58.3 | 58.3 | 1000 | within
taskcompleted-kbd-receipt | 51.9 | 55.2 | 59.2 | 59.2 | 1000 | within
precompact-kbd-control | 51 | 53 | 56.8 | 56.8 | 1000 | within
```

**`windows-latest · node v24.20.0`**
```
platform=win32 node=v24.20.0 samples=20
hook | min | median | p95 | max | budget | verdict
sessionstart-kbd-control | 55.9 | 58.6 | 71.7 | 71.7 | 1000 | within
taskcompleted-kbd-receipt | 56.4 | 58 | 87.2 | 87.2 | 1000 | within
precompact-kbd-control | 54.3 | 56.9 | 58.7 | 58.7 | 1000 | within
```

## Verdict

**All three 1000 ms hooks fit, on both supported Node versions.** The worst single sample observed
anywhere is **87.2 ms** (`taskcompleted-kbd-receipt`, node 24) — **8.7% of budget**, leaving ~11x
headroom. The budget is not raised; no compiled dispatcher is needed, which C7 forbids anyway.

`goals.md` names only `sessionstart-kbd-control` and `taskcompleted-kbd-receipt`. Porting
`precompact-kbd-control` brought a third hook under the same 1000 ms declaration, so it is measured
too — measuring only the two named would have shipped an unmeasured hook against the budget this phase
exists to test.

## What the numbers say that a median would not

The **max** is the number checked, because a timeout fires on the slow run, not the typical one. The
gap between p95 and max on node 24 (71.7 vs 58.6 median for `sessionstart-kbd-control`; 87.2 vs 58.0
for `taskcompleted-kbd-receipt`) is the tail this measurement exists to expose — roughly 1.5x the
median. On a shared CI runner with antivirus active that is the realistic worst case, and it still
leaves an order of magnitude of headroom.

Windows is **~1.4x slower than macOS** (54 ms vs 39 ms median), which is the expected direction and
smaller than feared. Node 24 is slightly slower than node 22 here and has a longer tail.

## Scope of this claim

Measured on `windows-latest` GitHub-hosted runners, 20 samples per hook, one run. It is not a
statement about every Windows machine: a developer laptop with aggressive real-time scanning could be
slower. The headroom is large enough (11x) that this is recorded as a non-risk rather than a
monitored one, but the claim is "fits with 11x headroom on CI runners", not "fits everywhere".
