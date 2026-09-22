---
type: Gotcha Log
title: Gotchas
description: Learned constraints about this repo's tools and services; grep for a subsystem before the first edit in it.
tags: [gotchas, surreal-memory, kbd, adversarial-review]
generated: { by: claude-code/claude-fable-5-1, at: "2026-09-21T03:40:00Z" }
status: stable
sources:
  - id: pm-mirror
    resource: /postmortems/2026-09-20-surreal-memory-mirror-write-failed.md
    title: Postmortem — mirror write failed while surreal-memory reported healthy
  - id: assess-review
    resource: ../.kbd-orchestrator/phases/platform-foundation/review/assess/findings.json
    title: Adversarial review findings, assess stage
---

# Gotchas

Append-only and dated. Grep this for a subsystem before the first edit in it. Mark entries superseded; never
delete them.

## surreal-memory

- **2026-09-20 · `/health` 200 does not mean writes work.** Entity writes go through the MLX embedding
  executor and normally take 1.7–5.4 s; after any restart, 12 s+. The installed `kbd-memory-log` mirror
  aborts at 3 s, and an aborted request makes the server restart its executor (reproduced). Never abort an
  in-flight write; hand it to the outbox instead. Full evidence:
  `postmortems/2026-09-20-surreal-memory-mirror-write-failed.md`.
- **2026-09-20 · Startup takes 23 s to several minutes** before the REST API listens. A client that connects
  in that window times out; this is what an MCP "connection timed out" at session start usually is.
- **2026-09-20 · Another agent session may be reinstalling the launch agents.** Check
  `log show --predicate 'process == "launchd" AND eventMessage CONTAINS "surreal"'` for `removing service`
  and the `initiated by` chain before concluding that a service crashed.

## kbd (installed bash originals)

- **2026-09-20 · `kbd-memory-log` names entities from `.project // .projectId` in `project.json`,** keys the
  `kbd-init` template never writes. Without `projectId`, every lifecycle event is filed under `unknown/`.
  `projectId` was added to this repo's `project.json` by hand.

## adversarial-review (installed)

- **2026-09-21 · Artifact-mode packets carry a file tree built with `find -maxdepth 2`.** The judge cannot see
  anything deeper, and reports files it cannot see as nonexistent — a false CRITICAL. Everything under
  `lib/<capability>/` will sit at depth 3. Check a "file does not exist" finding against the disk before
  revising the artifact. First seen: `phases/platform-foundation/review/assess/findings.json`.
- **2026-09-21 · The anti-theater gate silently skips:** `check-findings-sycophancy.sh` prints
  "sycophancy.sh lib not found — gate skipped" and exits 0. The judge's report is not being screened.
- **2026-09-21 · `prometheus kbd status --json` is not read-only.** It creates `.prometheus/project.json` (a runtime
  `projectId` + repository fingerprint). Harmless and not an OKF concept file, but it means two files named
  `project.json` exist; always write the full path `.kbd-orchestrator/project.json`.

## hooks and packaging

- **2026-09-21 · A `hooks.json` that names a file the payload does not contain breaks EVERY hook, silently to
  our code.** Observed in the source pack: all 31 hook entries ran
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/hook-entry.mjs`, the distribution generator copied two other scripts by
  a hand-kept list, and `hook-entry.mjs` was never packaged — every Stop printed `Cannot find module`. The
  failure is in Node's loader, so nothing inside a hook can catch it. Prevention is at packaging time only:
  derive the file list from `hooks.json` and test that each path resolves in the built payload. Fixed upstream
  on branch `fix/package-hook-entry`. This repo's installer copies instead of symlinking, which makes the
  same drift easier — see the rule in `.claude/rules/node-scripts.md`.
- **2026-09-21 · Replaying a real hook is not side-effect free.** Running the pack's `stop-karpathy-learning`
  hook by hand wrote a session record into the wiki of whatever directory was cwd, and its learning worker
  left a stale `index.lock` behind. Replay hooks in a throwaway directory, never in a working tree.
- **2026-09-21 · `build-review-packet.sh --target spec` cannot see OpenSpec changes.** It looks only for
  `.kbd-orchestrator/changes/<id>/{spec.md,tasks.json,verification.md}` (the native-kbd layout) and exits 2
  with "no artifacts found" under the `openspec` backend — this project's default. Workaround used here:
  assemble the packet in the same schema from `openspec/changes/<id>/{specs/**,design.md,tasks.md}` and pass it
  to `dispatch-judge.sh --packet`. The Node port of adversarial-review must support both layouts.
- **2026-09-21 · A diff-mode review packet scoped to one change reports earlier changes' files as missing.**
  Twice in this phase a judge returned a false CRITICAL — "the lockfile was never committed", then "npm ci
  will fail, there is no manifest" — because the diff covered only the change under review, so files added by
  an earlier archived change were invisible. Both were disproved against the repository (`git cat-file -e
  HEAD:<path>`, and a clean `git clone` of HEAD running the full command sequence). Fix for the Node port:
  a diff packet must carry a manifest of the files the change DEPENDS ON but does not touch — at minimum
  `git ls-tree HEAD` for the paths named in its spec — or judges will keep inventing missing-file findings.
- **2026-09-21 · A test fixture copied from a real OpenSpec change breaks when that change is archived.**
  `rules/test/spec-validate.test.mjs` copied `openspec/changes/windows-evidence` to build an invalid
  change; archiving it moved the directory and the test failed with ENOENT. CI had been green because it
  ran before the archive. Build fixtures from literals, never from repository state that a later stage
  moves. The same trap applies to any test that reads `openspec/changes/*` or `phases/*` by name.
- **2026-09-21 · `kbd-validate-progress.sh --mark-implementation-complete` rewrites `progress.json` and
  drops the per-stage flags.** `assessment_complete` and `plan_complete`, set by the assess and plan
  stages, are absent after any change is marked implementation-complete; only the `completion` block and
  the `changes` array survive. Do not read those flags to decide whether a stage ran — read
  `handoffs/<stage>.handoff.json`, which is what the stage gate itself uses. The canonical phase status
  lives in the runtime (`prometheus kbd status --json` → `phases.<id>.status`), not in `progress.json`.
- **2026-09-21 · A hand-assembled review packet inherits stale fields from whatever packet it was cloned
  from.** Two CRITICALs in one stage came from my own packet, not the artifact: a `file_tree` filtered so
  it hid `.claude/` (the judge then reported a cited file as nonexistent), and a `goals` field still
  holding the previous phase's goals. When assembling by hand, rebuild `file_tree`, `goals` and
  `producer_model` from the current phase every time — or better, finish `scripts/build-review-packet.mjs`.
- **2026-09-21 · `git ls-files -s`, counting mode `120000`, is a portable symlink check.** `constraints.md`
  says no portable one-line check exists for `no-symlinks`; it does, it needs no `find`, and it works
  identically on Windows. Worth adopting as the constraint's `check:`.

## 2026-09-21 — "existing" is a claim about THIS repo, not the upstream one

Writing the `artifact-refiner-node` spec, I described 19 `.mjs` as "existing" and specced a Windows
*review* of them. They exist in the upstream submodule; this project has two `.mjs` under `scripts/`.
Nothing carried them. The spec therefore had tasks editing absent files, and a RED test whose expected
failure (`model-routing.mjs:36`) was unreachable.

One false premise produced both round-2 CRITICALs: the second was a `.sh`-only scan that let six
`.mjs`-only skills through, which only looks like a separate defect until you notice both come from
treating upstream state as local state.

**Check:** when porting from another repository, every "existing"/"already there" claim names which
repository. A file path in a task is a claim that the path resolves *here* — verify with the filesystem,
not with a grep of the source repo.

## 2026-09-21 — a naive forbidden-tool grep flags its own documentation

Checking `lib/refiner/` for `python3|jq|date -u` matched three lines — all of them **prose**: a
comment saying "those scripts shell out to python3", and two test names ("not uuid.uuid4 via python3",
"not \`date -u\` output"). Zero were invocations.

This is the "content checks must read code, not text" pattern from
`platform-foundation/reflection.md` (3 false positives there), and the reason change 2's spec scenario
says the scan matches "only fenced code blocks and command lines ... never narrative text".

**The check that works:** strip block comments, line comments, and single/double/backtick string
literals, THEN match. Verified: 2 files scanned, 0 hits, while the naive grep reported 3.

Tasks 5.4 and 6.2 need this, and so does any future constraint of the same shape. A check that cannot
tell an invocation from a description of one will either be ignored or quietly narrowed until it
matches nothing.

## 2026-09-21 — a task edited a file a LATER task carries

`artifact-refiner-node` task 3.3 said "rewrite those two blocks in the carried
`agents/artifact-validator.md`". That file is carried by task **5.1**, two sections later, so 3.3 could
not run in section order — the file does not exist in this project until the carry.

Third instance of one class this phase: a path in a task is a claim that it resolves **when that task
runs**, not merely that it exists somewhere. The spec review caught the first two (an `execution.md`
that `/kbd-execute` had not written yet, and an "upstream submodule" that is a separate repository).

**Fix applied:** 3.3 renumbered to 5.1b, immediately after the carry, rather than executed out of order
or quietly skipped.

**Check for the next plan:** for every task naming a file, ask which earlier task creates it. If none
does, either the task is misordered or a carry step is missing.

## 2026-09-21 — the carried-payload test found a dangling reference UPSTREAM

`skills/refine-ui/SKILL.md` instructs an agent to use
`assets/templates/react-components-shadcn-ui-template.ts`. That file does not exist in this project —
and **does not exist in the upstream source pack either**, verified against
`prometheus-skill-pack/skills/imported/artifact-refiner`.

So it is a defect in the source, not a carry omission. Nobody had noticed because nothing checked: the
skill reads fine, and the reference only fails when an agent tries to open the file mid-task.

Two things worth keeping from this:

1. **An extension-agnostic reference check finds more than the `.sh` problem it was written for.** The
   requirement was scoped that way because a `.sh`-only scan would pass a broken `.mjs` skill; it also
   caught a `.ts` asset nobody was looking for.
2. **My first scan missed it.** I searched for script extensions (`sh|mjs|json|py|js`) and this is a
   `.ts` template. The test, which ran over the whole payload, caught what my targeted grep did not —
   the argument for deriving a list mechanically rather than enumerating what you expect to find.

Worth reporting upstream; not fixed here, because this project does not own that repository.

## 2026-09-21 — importing a CLI silently truncated a test file

`scripts/model-routing-probe.mjs` is a CLI: its module body runs on import, prints a routing table and
ends with `process.exit(0)`. It has no `import.meta.url === argv[1]` guard, which is the pattern
`scripts/hook-entry.mjs` uses for exactly this reason.

A test that imported it to check the module still loads **terminated the test process mid-run**. The
runner reported `tests 1 / pass 1 / fail 0` — green, and nine tests never executed. Nothing failed;
the file just stopped.

**The symptom to recognise:** a test file whose reported count is far below its `test()` count. Check
with `grep -c '^test('` against the runner's total. I caught it because 1 did not match 9.

**Fix:** spawn a CLI, never import it. The carried `.mjs` came from a repo where these files are only
ever run, so several may have top-level effects; `openai-client.mjs` is a library and imports cleanly.

Worth reporting upstream as a missing entry guard, though it is harmless when the file is only executed.

## 2026-09-21 — /kbd-new-phase wrote the files but did not register the phase canonically

After `/kbd-new-phase karpathy-logs-node`, `current-waypoint.json` and `project.json` both named the
new phase — but `prometheus kbd status --json` did not list it at all, `activePath.phaseId` still
pointed at `hook-entry-node-only`, and `position-reminder.txt` (a runtime projection) still reported
the OLD phase as the position.

The skill's step list flips the waypoint and `project.json` but never calls
`prometheus kbd phase create` / `phase activate`, so in runtime-authority mode the new phase does not
exist canonically. Anything reading the projection — including the position reminder the skills tell
agents to read FIRST every turn — reports the previous phase.

**Fix applied:** `phase create --id <name> --title <…>` then
`phase activate --id <name> --exact-next-work <…>`. The projection refreshed immediately and
`phaseDefinitionOrder` gained the phase.

**Check:** after any `/kbd-new-phase`, confirm `prometheus kbd status --json | .activePath.phaseId`
matches `current-waypoint.json .phase` before starting the next stage. Two sources of truth that
disagree is worse than one that is stale.

## 2026-09-21 — porting `pk` to Windows one CI failure at a time

Three pushes each fixed the single defect the previous CI run revealed (an unguarded `std::os::unix` import,
jemalloc on MSVC, `fsync` on a directory). The operator stopped the fourth. Two faults caused it, neither of
them bad luck: each hazard class was checked only *after* CI failed on it, and `cargo test --workspace`
**stops at the first failing test binary**, so the platform could reveal only one problem per push.

Worse, a test hid the real error. It ran the worker to completion and then joined a thread blocked in
`accept()`; a worker that exited without connecting made the test **hang instead of fail**, on a job with no
`timeout-minutes` — up to six hours of a runner, zero output.

**What the compiler could not see** (all found by one up-front audit, none by CI): `dirs::home_dir()` on
Windows calls `SHGetKnownFolderPath` and reads **no environment variable**, so a test that injects `HOME`
silently tests nothing there; a path validator that splits on `/` only lets `..\\..\\evil` through on Windows; a
frontmatter parser that trims `\n` leaves `\r` in the body and changes the content hash per checkout.

**Check:** before the first push of any port, sweep *every* hazard class across the whole workspace, and
make CI report everything at once — `--no-fail-fast`, a job timeout, and no test that can block forever.
Verify a sub-agent's proposed fix against the dependency's source before planning on it: one proposed
`.env("USERPROFILE")`, which `dirs` does not read either. And mutation-check CI steps like tests — a
"no `~` directory was created" assertion could never fail, because `pk context` creates nothing.

## 2026-09-21 — a security pattern was ported from a grep fragment: one alternative of seven

The spec for the progress recorder defined "the source pack's secret pattern" as
`(api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*\S+`. Upstream's `SECRET`
(`record-progress.py:22-27`) is a seven-alternative disjunction that also covers bearer tokens, PEM
private keys, GitHub, Slack and AWS tokens, and `sk-` keys. The draft also carried four of
`validate_event`'s checks out of roughly twenty, and design.md called that "all ported from upstream".

**Cause:** the recorder was read through `grep -n` with `head`, which showed line 23 of a regex that
continues to line 27, and `validate_event` was never read whole. CLAUDE.md §0.5 already says "read named
documents in full, not by grep"; a 671-line source file being ported *is* a named document. The one
scenario (`password = …`) could not detect the omission, and the review-packet builder's own secret
scanner had the identical one-alternative defect.

**Caught by:** the spec-stage adversarial review (critic MiniMax-M3, judge k3), round 1, as the only
CRITICAL. Not by me.

**Check:** before specifying a port of any function, read that function top to bottom and list its
checks. For a pattern, print the whole definition (`sed -n 'A,Bp'`), never a grep hit. A scenario for a
disjunction needs one value per alternative, and a mutation that deletes each alternative in turn.

**And count with a command.** The fix itself first said "five alternatives" — repeated from the critic's
text and from how the regex is laid out across lines. Splitting on top-level `|` gives seven. The judge
caught that in round 2.

## 2026-09-22 — `npm run coverage` on `windows-latest` is flaky, independent of `node --test`

CI run `35702985390` (`karpathy-progress-recorder`, task 1.2 closure): `windows-latest · node 24` failed
on the `Run npm run coverage` step — `node --test` itself reported 361 tests, 360 pass, 0 fail, 1 skip
(clean), but the coverage reporter then threw `Error [ERR_OPERATION_FAILED]: Operation failed: coverage
file is empty: C:\Users\RUNNER~1\...\coverage-1568-....json`, and `scripts/coverage-report.mjs:29`'s
`execFileSync` surfaced that as a non-zero exit. The same commit's `windows-latest · node 22` leg, running
the identical `npm run coverage` script seconds apart, passed cleanly.

**Cause:** Node's `--experimental-test-coverage` writes per-worker coverage files to a temp directory,
then a separate reporting pass reads them back; on Windows this file can still be empty/not yet flushed
when the read happens — a known class of race in the instrumentation, not in this repository's code or
tests. It is orthogonal to test correctness: the test run it wraps was fully green.

**Caught by:** re-running only the failed job (`gh run rerun <id> --failed`) without touching source —
all six legs green on the rerun, same commit, same code. That is the confirming evidence this was
instrumentation flake and not a real regression: nothing changed except letting the same steps run again.

**Check:** before treating a `windows-latest` CI failure as a real defect, check whether the failing step
is `node --test` itself (a real result) or `npm run coverage`/another post-processing step wrapping it (a
tool that can fail independently of the tests it measured). Read the actual test summary line in the log
before concluding anything regressed — `tests N / pass N / fail 0` above a later, unrelated stack trace
means the tests passed and something downstream of them did not. A single flaky rerun is normal; a rerun
that fails the same way twice is a real defect and should not be waved off as flake.

## 2026-09-22 — the orchestrator's assess hooks are not child-phase-aware

`kbd_hooks_fire assess before <child>` ran the builtin `kbd-memory-recall` hook, which wrote
`prior-context.md` to `.kbd-orchestrator/phases/<child>/` — a flat path keyed by the child's id — not to
`phases/<parent>/children/<child>/`, where `/kbd-new-child` put `goals.md` and where the stage artifacts
live. The file was a stub (memory endpoint unreachable), so nothing was lost; on a reachable endpoint the
recalled context would have landed where no stage reads it. The `prometheus kbd stage` commands, by
contrast, key on the phase id and project correctly.

**Check:** after firing any `<stage> before` hook for a child phase, `ls .kbd-orchestrator/phases/` for a
stray directory named after the child; move its contents into the nested child directory before the stage
reads them. The adversarial-review packet builder takes the nested path (`--phase parent/children/child`)
and works; the handoff writer takes the directory explicitly and works.

## 2026-09-22 — the orchestrator's `task:after` hook cannot see a child phase, and shells out to python3

Firing `kbd_hooks_fire task after <change> N T` during `/kbd-execute` of the CHILD phase
`the-boss-integration-prep` failed twice with
`karpathy-progress-memory: canonical task status is 'in_progress'/'pending', event reports 'complete'`
(exit 2), while `prometheus kbd status --json` showed the child's tasks 1.1 and 1.2 as `complete` and the
active path already advanced. Two separate defects:

1. **Child-unaware.** The builtin `karpathy-progress-task-boundary` hook derives its canonical lookup from
   the top-level phase (its log is `phases/karpathy-logs-node/hooks.log.jsonl`), so it reads the PARENT's
   task state for a task that exists only in the child. The same class as the
   `prior-context.md`-to-a-flat-path entry above. Hook ordering also matters: fire `task:after` **after**
   `prometheus kbd task transition ... --status complete`, never before, or the check is guaranteed to
   disagree with itself.
2. **It runs Python.** `hooks/hooks.json:47` is
   `python3 "$KBD_ORCHESTRATOR_ROOT/../karpathy-progress-memory/scripts/record-progress.py" --from-hook
   --boundary task` — the installed source-pack hook, not this repository's `scripts/record-progress.mjs`.
   On a machine without `python3` it fails the same way; on this one it fails on the state mismatch first.
   It is an installed-orchestrator hook, outside this repo's `hooks/hooks.json` (six ids, all Node), so it
   is not ours to fix here — but it is exactly what the Node recorder replaced, and the
   `the-boss-integration-prep` handoff should name it.

**Check:** a non-zero `kbd_hooks_fire` during a child phase is not evidence that the transition failed.
Verify with `prometheus kbd status --json` → `phases.<child>.changes.<id>.tasks.<id>.status` before
reacting. Never re-run a transition on the strength of a hook's complaint.

## 2026-09-22 — adversarial-review packets review the working tree, not the change

`build-review-packet.sh` (~line 236) builds its diff with `git diff HEAD -- .`, which shows only
UNCOMMITTED changes. In diff mode the target is a *change* whose work is spread across several
commits, so the judge sees whatever happens to be unstaged at that moment — and nothing at all if
you commit before reviewing. Rounds 1 and 2 of `review-housekeeping` reviewed ~6 KB of working-tree
edits against a 55 KB change and reported BLOCK both times on that sliver; round 3, rebuilt on the
cumulative range, immediately found two CRITICALs in code the earlier rounds had never been shown.

**Until the skill is fixed:** after building the packet, overwrite `.diff` with
`git diff <first-commit>~1..HEAD`, excluding `.kbd-orchestrator/phases/*/review/*` so the judge is
not primed by the previous judge’s findings. Record the basis in the packet.

The skill’s own docs say diff mode “reviews the cumulative Git diff since the last accepted local
review receipt”, so this is a script/contract mismatch, not intended behaviour. Belongs upstream in
`~/.claude/skills/adversarial-review`.

## 2026-09-22 — the-boss DoctorCheckRegistry is closed; mini checks cannot be registered into it

Read at `the-boss@10aa57f76c`, `src/shared/types/doctor.ts` and `src/main/services/diagnostics/doctor/types.ts`:

- `DOCTOR_CHECK_IDS` is a hardcoded `as const` array of 31 ids; `DoctorCheckId` is `(typeof DOCTOR_CHECK_IDS)[number]`.
- `DoctorCheckRegistry = { readonly [Id in DoctorCheckId]: DoctorCheckDefinition<Id> }` — exhaustive and closed. The comment says it outright: “a catalog entry without an implementation (or vice versa) is a compile error”.
- `DoctorDomain` is a closed union of 9 domains; there is no `mini`. `DomainOfId` enforces at compile time that a check’s domain equals its id prefix, and ids are `domain-thing`, never `domain.thing`.
- `detail` is not free text: `DoctorDetail = { variant: DoctorCheckCatalog[Id][details][number], params? }` — a typed, per-check, catalog-declared key (for i18n).
- There is NO extension point: no plugin, dynamic or external check registration anywhere in `registry.ts`.

**Consequences for the mini.** A mini check cannot be “registered in `DoctorCheckRegistry`” from outside the-boss’s compile unit, and `mini.*` ids are invalid on three counts (unknown domain, wrong separator, absent from the closed union). Mirroring the type “field for field” is also not possible in the intended direction: the mini cannot produce `DoctorDetailVariant` values, because they are declared inside the-boss’s catalog per check.

Two further mismatches with the `pack-doctor` proposal’s sketch:
- There is no `summary` field. Outcomes are `pass` (optional `detail`), `skip` (required `detail`), `warn`/`fail` (required `attribution` + `detail` + `actions`).
- A fix returns `{ status: fixed | requires_relaunch }` or `{ status: failed, message }`. **There is no `refused`**, which `pack-doctor` requires for `copy-skills` on a full-pack machine.

`the-boss-handoff`’s proposal already names the correct mechanism — the-boss **spawns `scripts/doctor.mjs` and maps its JSON lines** to its own check results. That is an adapter on the-boss side, which is where the closed union lives. The mini therefore owns a STABLE JSON LINE FORMAT, not a mirror of a TypeScript type it cannot satisfy.

## 2026-09-22 — this development machine violates the mini’s own install-scope rule

`node scripts/doctor.mjs` on this box reports `mini-install-scope: fail` — **42 mini skill copies installed natively beside a full skill-pack install**. This is not a test fixture; it is the real machine, and the first time the rule has been checked mechanically.

Verified it is a true finding, not a name collision: `refine-ui` and `scaffold-react-vite` exist under `~/.agents/skills/` and `~/.claude/skills/` and appear NOWHERE in `prometheus-skill-pack` (searched to depth 4). They came from the mini. Meanwhile the full pack is unambiguously installed — `prometheus` on PATH, `~/.prometheus/setup-state.json`, `kbd-process-orchestrator` under both skills roots, and 14 `ai.prometheus.*` LaunchAgents.

Some names (`artifact-refiner`, `karpathy-progress-memory`) DO exist in both packs, at `skills/imported/` and `skills/process/` respectively. Those are the shadowing cases the rule exists to prevent: whichever copy a tool finds first wins, silently.

**Not repaired.** `mini-install-scope` deliberately offers no fix (deleting a user’s files is not an idempotent copy, and which copy is authoritative is not mechanically decidable), and A-11 puts an irreversible deletion under the user’s home with the operator. The doctor names every directory; the decision is the operator’s.
