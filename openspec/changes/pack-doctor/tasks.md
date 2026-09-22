Each code task is test-first. Runnable before its dependencies land: each dependent check is `skip` with a reason until then.

## 1. Contract

- [x] 1.1 Write `lib/doctor/contract.md`: the MINI’S contract (fields, statuses, `actions`, `fixes`), then a divergence table against the-boss’s `src/shared/types/doctor.ts` + `src/main/services/diagnostics/doctor/types.ts` at commit `10aa57f76c` — closed `DoctorCheckId` union and exhaustive registry, compile-time domain/id-prefix rule, typed `detail.variant`, no `summary`, no `refused` — and the adapter mapping the-boss implements. Cite file and commit for each claim; verify each against the local checkout before writing it.
- [x] 1.2 Write `lib/doctor/contract.test.mjs` first: conformance of every registered check; exactly one check declares a fix; fixture rejections.
- [x] 1.3 Write `lib/doctor/registry.mjs` (the check list) and `lib/doctor/contract.mjs` (the conformance function).

## 2. Checks

- [x] 2.0 Write `lib/platform/full-pack.test.mjs` first (each marker alone → present, naming it; none → absent; injected home and spawn), then `lib/platform/full-pack.mjs`.
- [x] 2.1 For each group, test first then module: `lib/doctor/runtime.mjs` (`mini-node-version`, `mini-versions-toml`, `mini-submodules`), `lib/doctor/services.mjs` (`mini-docker`, `mini-service-surreal-memory`, `mini-service-liter-llm`), `lib/doctor/tools.mjs` (`mini-pk`, `mini-sycophancy-correction`), `lib/doctor/skills.mjs` (`mini-skill-copies` + `copy-skills`), `lib/doctor/kbd.mjs` (`mini-kbd-state`), `lib/doctor/scope.mjs` (`mini-install-scope`; and the `skip`/`refused` behaviour of `mini-skill-copies`/`copy-skills` when the full pack is present). Every external call is injected (spawn, fetch, home dir) so tests run with nothing installed.
- [x] 2.2 Mutation on `copy-skills`: remove the `..` refusal and confirm the hostile-name test fails; paste the output.

## 3. Entry point and skill

- [x] 3.1 Write `scripts/doctor.test.mjs` first (spawned, `shell: false`, temp home via env): JSON-lines parse; summary last; exit codes; `--fix copy-skills` end to end on a temp home; `--human` renders.
- [x] 3.2 Write `scripts/doctor.mjs`; write `skills/doctor/SKILL.md`. (The `--doctor` flag on `scripts/install.mjs` is added by change `openspec-fork-submodule` task 3.2, which creates that file after this change lands.)

## 4. Close

- [x] 4.1 Run the doctor on this host and paste the JSON lines into the task; full battery; `.prometheus/decisions.md`: the-boss's contract as the mini's, fixes limited to idempotent copies.

### Notes from 1.1–2.0

- Every citation in `contract.md` was verified by reading the cited line, mechanically (a script resolved each `file:line` and printed it). Two of my own claims were wrong on the first pass and were corrected before commit: `DoctorDomain` has TEN domains, not nine (I missed `health`), and `DoctorFixAction` is at `:393`, not `:392`. The id count (31) and the absence of any extension point in `registry.ts` (0 matches for plugin/dynamic/external/registerCheck/addCheck) were also counted mechanically rather than recalled.
- `registryConformance` refuses an EMPTY registry. Every per-check rule is satisfied vacuously by an empty array, so a conformance report over one would say “all checks conform” having examined none — the vacuous-pass class that took nine review rounds in change `review-housekeeping`. The registry is empty until task 2.1 registers the first group, so that test is legitimately RED until then.
- `detectFullPack` FAILS CLOSED on an unreadable home: it throws rather than returning `absent`. Returning absent would report a full-pack machine as clean and let the installer write into it — the binding rule failing open on precisely the side that does damage.
- The fourth marker (`ai.prometheus.*` service units) was written against observed reality, not the spec’s wording: this development machine HAS the full pack, with 14 `ai.prometheus.*` LaunchAgents in `~/Library/LaunchAgents`. macOS reads LaunchAgents, Linux reads `~/.config/systemd/user`, and Windows is excluded — the pack installs no unit there, and looking in a macOS path on Windows would be a false marker waiting to happen.
- Run against this real full-pack machine, the detector reports `present: true` with all five markers. That is the exact case the rule exists for: this box must never receive a native mini install.
- Mutation-checked, three mutants, all killed (fail=1 each): fail-closed guard removed; unit prefix filter replaced with `true`; Windows exclusion replaced with the macOS path.

### Notes from the skills group and 2.2

- Task 2.2 asked for ONE mutation (remove the `..` refusal). I ran five, each killed (fail=1): the whole-name validation removed; `..` alone removed from `isSafeName`; the `/` and `\\` separator checks removed; the full-pack refusal removed from the fix; and the byte comparison downgraded to a size comparison. Each half of the traversal guard is therefore independently covered, and the drift test uses a same-length edit (`one` → `ONE`) so a size comparison cannot pass it.
- The fix validates EVERY name before writing anything, so a hostile name cannot be preceded by partial writes from the safe ones. The hostile-name test asserts the home directory is still completely empty afterwards, not merely that the status was `refused`.
- A skipped `mini-skill-copies` deliberately omits `actions`: a check that is skipping because the fix is forbidden must not also offer that fix. Asserted.

### 4.1 — the doctor run on this host

```
{"id":"mini-node-version","status":"pass","summary":"Node 24.16.0"}
{"id":"mini-versions-toml","status":"skip","summary":"versions.toml has not been authored yet"}
{"id":"mini-submodules","status":"pass","summary":"1 submodule(s) are checked out"}
{"id":"mini-pk","status":"pass","summary":"pk 1.9.0"}
{"id":"mini-sycophancy-correction","status":"warn","summary":"sycophancy-correction is not installed"}
{"id":"mini-docker","status":"skip","summary":"Docker detection is not available yet"}
{"id":"mini-service-surreal-memory","status":"warn","summary":"Not reachable at http://localhost:8000/health"}
{"id":"mini-service-liter-llm","status":"pass","summary":"Up at http://localhost:4000/health"}
{"id":"mini-skill-copies","status":"skip","summary":"The full skill pack is installed here, so the mini never copies into the home directory"}
{"id":"mini-kbd-state","status":"warn","summary":"The prometheus CLI is not available; the projection reports karpathy-logs-node"}
{"id":"mini-install-scope","status":"fail","summary":"42 mini skill copy(ies) are installed natively beside the full skill pack"}
{"summary":true,"pass":4,"warn":3,"fail":1,"skip":3}
EXIT=1
```

Every status is the real state of this machine, and each one exercises a different branch: three `skip`s for dependencies that have not landed (`versions.toml`, `docker.mjs`) or a rule that forbids the action; three `warn`s for absent optional components; four `pass`es including a live probe of the running liter-llm gateway.

**The `fail` is a genuine violation, not a fixture.** 42 mini skill copies are installed under `~/.agents/skills` and `~/.claude/skills` on a machine that has the full pack. Verified it is not a name collision: `refine-ui` and `scaffold-react-vite` appear nowhere in `prometheus-skill-pack`, so they came from the mini; `artifact-refiner` and `karpathy-progress-memory` exist in BOTH (`skills/imported/`, `skills/process/`) and are actively shadowing. Not repaired — the check offers no fix by design, and A-11 puts a deletion under the user’s home with the operator. Recorded in `.prometheus/gotchas.md`.

Also verified against reality rather than assumed: liter-llm’s `/health` answers 200 while `/v1/models` answers 401, which is why the check probes `/health` and treats 401 as up-and-requires-a-key.

## 5. Review findings (diff mode)

- [x] 5.1 Round 1 BLOCK, 3 CRITICAL + 2 WARNING — all five fixed, each reproduced before fixing.
  - **CRITICAL: a static import defeated the skip-when-absent contract.** `runtime.mjs` imported `rules/lib/versions-toml.mjs` statically, so had that dependency not landed the WHOLE registry would fail to load and every check would vanish — the opposite of “runnable before its dependencies land”. Now loaded on demand.
  - **CRITICAL: `mini-pk` reported a broken binary as absent.** The resolver ran only when a resolver was injected (`ctx.resolve ? resolve('pk') : null`), so by DEFAULT a present-but-crashing pk returned `warn` with the summary “pk is not installed” — wrong status AND a false statement. My test passed only because it injected a resolver: it proved the injected path, never the default one.
  - **CRITICAL: a 401 from liter-llm was a `pass`.** I had verified 401 is that gateway’s real posture and concluded “up”. The spec says a non-200 health response is not healthy, and it is right — an auth challenge is not a healthy body, so reporting health from one is a verdict never established. Now `warn`: up, unverified.
  - **WARNING: `new URL(...).pathname` is broken on Windows**, in four modules. Demonstrated: `path.win32.resolve('/C:/proj/lib')` → `\\C:\\proj\\lib`, a drive-RELATIVE path that resolves against whatever drive the process is on. On a Windows-first project this is worse than a warning; all four now use `fileURLToPath`.
  - **WARNING: an outcome could advertise a fix id nothing implements**, rendering a dead button in the-boss’s UI. `outcomeConformance` now takes the owner’s implemented fixes and the entry point passes them.
- [x] 5.2 **Found while fixing, not by the judge:** `mini-service-surreal-memory` probed `http://localhost:8000/health` — an endpoint I invented. `.claude/rules/docker-services.md` fixes it at `http://localhost:23001/mcp/sse` for every platform, and the service was running there the whole time (23001 → 200, 28000 → 200). The check had been reporting a live service as unreachable: a false negative from an unverified constant. Now probed at the specified endpoint, with a test asserting the URL.
- [x] 5.3 Mutation-checked, six mutants. Five killed on the first pass. One **SURVIVED** — the dynamic-load skip branch, because the dependency is present so nothing exercised it, and `ctx.versionsToml ?? loader()` made an injected `null` fall through to the real module. Changed to an `in` check and added a test; both mutants now killed.
- [x] 5.4 Round 2 BLOCK, 2 CRITICAL — both fixed, both reproduced first.
  - **`mini-submodules` called a submodule healthy for being non-empty.** The spec says “present AND built where applicable: `tools/openspec/dist`”; I had implemented only “non-empty directory”. A submodule checked out but never built is a directory full of source that nothing can run, reported as healthy. Now checks the build artifact, and only for submodules this tree actually pins — so it asserts nothing about a submodule that is not there.
  - **`mini-sycophancy-correction` believed any non-empty `SYCOPHANCY_BIN`.** Reproduced: `SYCOPHANCY_BIN=/nonexistent/path/sycophancy` produced `pass: sycophancy-correction at /nonexistent/path/sycophancy` — an assertion about a file never looked at. A path the operator explicitly configured and got wrong is a FAILURE, not an absence: they believe it is set up.
  - Mutation-checked, three mutants, all killed: the built-artifact branch removed (fail=1); the built check widened to ignore which submodules are pinned (fail=2); the binary-existence check removed (fail=1).
- [x] 5.5 Round 3 BLOCK, 2 CRITICAL + 1 WARNING — all addressed, and the operator corrected me mid-fix.
  - **The vendored `pk` was not checked as built.** My first response was to WEAKEN the spec: I observed that `pk` resolves to `~/.local/bin/pk` on this machine with nothing built in the submodule, concluded the in-tree requirement would fail a working box, and edited the proposal to say pk resolvability belongs to `mini-pk` alone. **The operator stopped that edit and asked “pk needs to be in the build tree, correct?”** They were right and my reasoning was backwards: I generalised from one machine’s state to a spec change, and the binary I was pointing at is the FULL PACK’S, a different install entirely. `sycophancy-correction-vendored` sets the precedent — it resolves `tools/<name>/target/release/` explicitly for developer checkouts. The weakening was reverted and the check added.
  - **Then the operator asked whether a second pk reference was needed at all**, and chose the middle path: keep the check but **warn instead of fail**. An unbuilt vendored artifact means the tree is incompletely set up (worth saying) while a usable binary may be installed elsewhere (not broken). A missing CHECKOUT stays a `fail` — nothing can be built from it. Recorded in the proposal as an operator decision.
  - **WARNING: the proposal still said `DoctorDomain` has nine domains.** My own error, corrected in `contract.md` during task 1.1 but left uncorrected in the proposal. Now ten.
  - Mutation-checked, three mutants, all killed: the vendored pk dropped from `BUILT` (fail=1); the unbuilt `warn` downgraded to `pass` (fail=2); the missing-checkout `fail` downgraded to `warn` (fail=1). The warn/fail split is pinned in both directions.
  - **Round 3’s second CRITICAL — the 4.1 evidence being stale — is deferred to 5.6**, since the run must be re-pasted from the FINAL implementation.
