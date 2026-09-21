ANALYSIS: hook-entry-node-only
Project: prometheus-skills-mini
Date: 2026-09-21
Mode: **stack specified** (Node ≥ 22, zero runtime dependencies) — not stack discovery. No contested stack, so no elicitation.
Inputs: `assessment.md` and its handoff; `goals.md`; the previous phase's `reflection.md`; the source pack's `hooks/hooks.json` and `shared/scripts/generated/hook-dispatch-v1.sh`.
Machine contract: `library-candidates.json` (cand-101 … cand-108).
Research budget: 4 tiers, cap 8 queries/tier and 20 minutes. Used: tier 1 = 2, tier 2 = 3, tier 3 = 3, tier 4 = 0. Under cap; no partial-findings degradation.

## THE CENTRAL FINDING: scope is 6 hooks, not 31

The assessment's open question 2 was which of the 31 upstream hook ids to port. Answered by mapping every
id to its payload in `hook-dispatch-v1.sh` and classifying it against what this project actually ships.

Every one of the 31 ids is listed below with the payload its dispatch case runs. The grouped table an
earlier draft used summed to 27, not 31, and its group count contradicted the port count — review caught
the arithmetic. This inventory is generated from `hooks.json` and `hook-dispatch-v1.sh`, and the verdicts
tally **6 PORT + 22 DEFER + 3 DROP = 31**.

| # | Event | Hook id | Timeout | Upstream payload | Verdict | Why |
|---|---|---|---|---|---|---|
| 1 | `SessionStart` | `sessionstart-kbd-control` | 1000 | `kbd-harness-adapter.sh` | **PORT** | KBD lifecycle; depends only on what this project already has |
| 2 | `SessionStart` | `sessionstart-kbd-open` | 30000 | `$HOME/.local/bin/kbd-open` | **DROP** | opens an external tool from $HOME/.local/bin; not part of this pack |
| 3 | `SessionStart` | `sessionstart-detect-project-context` | 15000 | `detect-project-context.sh` | **PORT** | KBD lifecycle; depends only on what this project already has |
| 4 | `SessionStart` | `sessionstart-memory-outbox-flush` | 10000 | `memory-outbox-flush.sh` | **DEFER** | memory-bridge phase — no service client yet |
| 5 | `SessionStart` | `sessionstart-pk-health` | 8000 | `pk-health.sh` | **DROP** | pk is not a shipped service here |
| 6 | `UserPromptSubmit` | `prompt-karpathy-learning` | — | `karpathy-hook-dispatch.sh` | **DEFER** | karpathy phase — needs pk, which this project makes optional |
| 7 | `PostToolUse` | `posttool-validate-evolution-state` | — | `validate-state.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 8 | `PostToolUse` | `posttool-validate-gitops-write` | 10000 | `validate-gitops-write.sh` | **DROP** | devops skills out of scope (README 4.3) |
| 9 | `PostToolUse` | `posttool-scope-record` | 5000 | `scope-record.sh` | **DEFER** | useful, not a phase goal; python3-dependent |
| 10 | `PostToolUse` | `posttool-write-position-reminder` | 5000 | `write-position-reminder.sh` | **PORT** | KBD lifecycle; depends only on what this project already has |
| 11 | `PostToolUse` | `posttool-sycophancy-artifact` | 35000 | `sycophancy-check-artifact.sh` | **DEFER** | needs the sycophancy-correction binary, unverified on Windows |
| 12 | `PostToolUse` | `posttool-memory-writeback` | 8000 | `memory-writeback.sh` | **DEFER** | memory-bridge phase — no service client yet |
| 13 | `SubagentStop` | `subagent-assessor-checkpoint` | — | `state-checkpoint.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 14 | `SubagentStop` | `subagent-assessor-dispatch` | — | `workflow-dispatch.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 15 | `SubagentStop` | `subagent-analyst-checkpoint` | — | `state-checkpoint.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 16 | `SubagentStop` | `subagent-analyst-dispatch` | — | `workflow-dispatch.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 17 | `SubagentStop` | `subagent-planner-checkpoint` | — | `state-checkpoint.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 18 | `SubagentStop` | `subagent-planner-dispatch` | — | `workflow-dispatch.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 19 | `SubagentStop` | `subagent-executor-karpathy-learning` | — | `karpathy-hook-dispatch.sh` | **DEFER** | karpathy phase — needs pk, which this project makes optional |
| 20 | `SubagentStop` | `subagent-executor-validate-state` | — | `validate-state.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 21 | `SubagentStop` | `subagent-executor-checkpoint` | — | `state-checkpoint.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 22 | `SubagentStop` | `subagent-executor-evaluate-session` | 30000 | `evaluate-session.sh` | **DEFER** | karpathy phase — needs pk, which this project makes optional |
| 23 | `SubagentStop` | `subagent-executor-dispatch` | — | `workflow-dispatch.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 24 | `SubagentStop` | `subagent-reflector-sycophancy` | 35000 | `sycophancy-check-reflection.sh` | **DEFER** | needs the sycophancy-correction binary, unverified on Windows |
| 25 | `SubagentStop` | `subagent-reflector-log` | — | `log-reflection.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 26 | `SubagentStop` | `subagent-reflector-checkpoint` | — | `state-checkpoint.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 27 | `SubagentStop` | `subagent-reflector-dispatch` | — | `workflow-dispatch.sh` | **DEFER** | evolver phase — all four payloads are python3-dependent |
| 28 | `SubagentStop` | `subagent-fallback-checkpoint` | — | `subagent-checkpoint-fallback.sh` | **PORT** | KBD lifecycle; depends only on what this project already has |
| 29 | `Stop` | `stop-karpathy-learning` | — | `karpathy-hook-dispatch.sh` | **DEFER** | karpathy phase — needs pk, which this project makes optional |
| 30 | `TaskCompleted` | `taskcompleted-kbd-receipt` | 1000 | `kbd-task-completed-gate.sh` | **PORT** | KBD lifecycle; depends only on what this project already has |
| 31 | `PreCompact` | `precompact-kbd-control` | 1000 | `kbd-harness-adapter.sh` | **PORT** | KBD lifecycle; depends only on what this project already has |

Two facts about the manifest, established while building this table and load-bearing for the design:

1. **The `--hook` argument is the only universal hook identifier.** A matcher entry may also carry a
   matcher-level `id` (`sessionstart:kbd-control`, colon-separated), but only **4 of the 14** matcher
   entries have one — the other 10 omit the field entirely. Every one of the 31 hooks, by contrast,
   passes `--hook <id>` (hyphen-separated) in its `args`. The static import map and the
   manifest-resolution test must therefore key on the `--hook` argument, not on `id`; keying on `id`
   cannot address an individual hook at all — `id` is per-matcher, and a matcher holds 1–6 hooks (PostToolUse holds 6); in this manifest it would reach only 4 of the 31.
2. **The two id spellings differ and must not be conflated.** `sessionstart:kbd-control` (matcher) and
   `sessionstart-kbd-control` (dispatch) name the same hook. This table uses the dispatch spelling
   throughout, because that is what `hook-entry.mjs` switches on.

Verified: parsing `hooks.json` for every `--hook` argument yields 31 ids, all distinct, and each row
below matches the manifest on id, event and declared timeout.

**Port now: the 6 rows marked PORT** — `sessionstart-kbd-control`, `sessionstart-detect-project-context`,
`posttool-write-position-reminder`, `subagent-fallback-checkpoint`, `taskcompleted-kbd-receipt`,
`precompact-kbd-control`. Every one is KBD's own lifecycle and depends on nothing this project does not
already have. The other 25 (22 deferred, 3 dropped) each name their destination or the reason, so the
choice is auditable rather than implicit.

Note the shape this reveals: **three of the six carry the 1 s budget** (`sessionstart-kbd-control`,
`taskcompleted-kbd-receipt`, `precompact-kbd-control`). The budget question is not incidental to this
phase — it governs half of what is being ported.

**The python3 dependency behind 14 of the 22 DEFER verdicts is verified, not assumed.** It is the
sole stated reason for deferring the evolver-owned hooks, so it needed a command. All four payloads
were read at their canonical source paths in `prometheus-skill-pack` (not a worktree or `dist/` copy):

| Payload | python3 invocation |
|---|---|
| `skills/process/iterative-evolver/scripts/validate-state.sh` | L25 `python3 -c "import json; json.load(...)"`, L32 `MISSING=$(python3 -c` |
| `skills/process/iterative-evolver/scripts/state-checkpoint.sh` | L40 `python3 -c` |
| `skills/process/iterative-evolver/scripts/workflow-dispatch.sh` | L37 `python3 << 'DISPATCH_SCRIPT'` |
| `skills/process/iterative-evolver/scripts/log-reflection.sh` | L28 `python3 -c` |

C4 forbids a Python dependency, so each is a port, not a copy — which is why they belong to the
evolver phase rather than this one.

## BUILD-VS-ADOPT, per gap

- **Hook dispatch** — BUILD (cand-101). A switch from hook id to an imported module is ~40 lines. The
  upstream `hook-dispatch-v1.sh` is 128 lines of bash whose bulk is argument parsing, harness
  validation and a path-safety guard; in Node those are a destructure, a set membership test and
  `path.relative`. Nothing to adopt.
- **Dynamic import vs a static map** — ADOPT a **static import map** (cand-102), reject lazy
  `await import()` (cand-103). A 1 s budget with a measured 48 ms floor has room, but a static map is
  what makes the manifest-resolution test possible at all: the test can assert that every id in
  `hooks.json` has an entry, which a dynamic path cannot express without executing it.
- **Cold-start measurement** — BUILD on `node:perf_hooks` (cand-104); reject `tinybench` (cand-105) and
  `mitata` (cand-106). Both are healthy (tinybench 6.2.0 MIT 0 deps, modified 2026-09-09), but they
  measure in-process function throughput. What matters here is **process** start, which only
  `spawnSync` round-trips can measure, and `process.hrtime.bigint` already does that. A dependency
  would add nothing and would breach the zero-runtime-dependency rule.
- **stdin JSON** — BUILD (cand-107). Hooks receive JSON on stdin; `node:fs` `readFileSync(0)` reads it
  synchronously with no dependency. Must tolerate empty stdin (the orchestrator path passes none) and
  must not hang when stdin is a TTY.
- **Manifest resolution test** — BUILD (cand-108). Derive the file list **from `hooks.json`**, never a
  hand-kept list. This is the rule added after the source pack shipped a payload without its own entry
  file, breaking every hook in Node's loader before any of its code ran.

## THE OPEN QUESTION I COULD NOT CLOSE

**Does this harness accept exec form (`command` + `args`) in a project `hooks.json`?**

Evidence gathered:
- The source pack's plugin `hooks.json` uses `{"type":"command","command":"node","args":[...]}` for all
  31 entries, and its `hook-entry.mjs` header argues for exec form precisely because a shell string is
  handled by `sh -c` on POSIX and PowerShell on Windows.
- The live user settings on this machine use `{"type":"command","command":"<shell string>"}` — the same
  `type`, but **no `args`**. Inspected 6 live hook entries across `~/.claude/settings.json`,
  `settings.local.json` and `.claude/settings.json`: **0 use `args`**.
- Those are different surfaces — a plugin's bundled `hooks.json` versus a user's `settings.json` — so
  the absence is not evidence against exec form, but it is not evidence for it either.

I could not confirm it from anything I can inspect. **This is not a detail to assume.** If exec form is
unsupported in whatever surface this project ships, the whole design inverts: a shell string would put
`sh -c`/PowerShell back in the path, which C1 and C3 forbid, and the fallback would be a single-token
command with arguments encoded elsewhere. Plan's **first task must be a probe** that registers one
trivial exec-form hook and observes whether it fires — before any payload is written.

## SEQUENCING

1. **Re-review the four unreviewed fixes** (goal 1) — blocks everything, since every hook imports
   `lib/platform/`.
2. **Exec-form probe** — settle the unknown above before design depends on it.
3. `hook-entry.mjs` + the static map + the manifest test.
4. The six payloads, each with its degradation contract (exit 0 on a missing dependency).
5. Windows cold-start measurement on CI, as a distribution rather than one number. **Measure all three
   1 s hooks, not the two the goal names.** `goals.md` names `sessionstart-kbd-control` and
   `taskcompleted-kbd-receipt`; porting `precompact-kbd-control` — also declared at 1000 ms — brings a
   third hook under the same budget. Measuring only the two named would ship an unmeasured hook against
   the very budget this phase exists to test.

## TRADE-OFFS AND WHAT THIS ANALYSIS DOES NOT CLAIM

- **The 1 s budget is not yet demonstrated on Windows.** 48 ms empty / 59 ms with three platform
  imports is macOS, Node 26. Windows process creation is slower and CI runners are noisy. The median
  has ample headroom; the tail is unknown and is what a 1 s timeout actually punishes.
- **Deferring 25 hooks is a judgement, not a measurement.** Each has a named destination phase, but if
  the KBD loop turns out to need one of the deferred signals sooner, that is a re-plan, not a surprise.
- **`subagent-fallback-checkpoint` is ported without its 4 siblings.** The dispatch/checkpoint pairs it
  backstops are evolver-owned and deferred, so it will have nothing to fall back *from* until then. It
  is included because it is 15 lines and dependency-free; the alternative is a gap in SubagentStop
  coverage. Reasonable people could defer it too.
- **No Tier 4 research was run.** Tiers 1–3 answered every question that could be answered; the one
  that remains open is a property of this harness, which no amount of web search resolves.

ANALYSIS COMPLETE
