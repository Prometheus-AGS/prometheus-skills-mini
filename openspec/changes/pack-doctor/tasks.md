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
