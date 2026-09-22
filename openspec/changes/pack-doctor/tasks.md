Each code task is test-first. Runnable before its dependencies land: each dependent check is `skip` with a reason until then.

## 1. Contract

- [x] 1.1 Write `lib/doctor/contract.md`: the MINI’S contract (fields, statuses, `actions`, `fixes`), then a divergence table against the-boss’s `src/shared/types/doctor.ts` + `src/main/services/diagnostics/doctor/types.ts` at commit `10aa57f76c` — closed `DoctorCheckId` union and exhaustive registry, compile-time domain/id-prefix rule, typed `detail.variant`, no `summary`, no `refused` — and the adapter mapping the-boss implements. Cite file and commit for each claim; verify each against the local checkout before writing it.
- [x] 1.2 Write `lib/doctor/contract.test.mjs` first: conformance of every registered check; exactly one check declares a fix; fixture rejections.
- [x] 1.3 Write `lib/doctor/registry.mjs` (the check list) and `lib/doctor/contract.mjs` (the conformance function).

## 2. Checks

- [x] 2.0 Write `lib/platform/full-pack.test.mjs` first (each marker alone → present, naming it; none → absent; injected home and spawn), then `lib/platform/full-pack.mjs`.
- [ ] 2.1 For each group, test first then module: `lib/doctor/runtime.mjs` (`mini-node-version`, `mini-versions-toml`, `mini-submodules`), `lib/doctor/services.mjs` (`mini-docker`, `mini-service-surreal-memory`, `mini-service-liter-llm`), `lib/doctor/tools.mjs` (`mini-pk`, `mini-sycophancy-correction`), `lib/doctor/skills.mjs` (`mini-skill-copies` + `copy-skills`), `lib/doctor/kbd.mjs` (`mini-kbd-state`), `lib/doctor/scope.mjs` (`mini-install-scope`; and the `skip`/`refused` behaviour of `mini-skill-copies`/`copy-skills` when the full pack is present). Every external call is injected (spawn, fetch, home dir) so tests run with nothing installed.
- [ ] 2.2 Mutation on `copy-skills`: remove the `..` refusal and confirm the hostile-name test fails; paste the output.

## 3. Entry point and skill

- [ ] 3.1 Write `scripts/doctor.test.mjs` first (spawned, `shell: false`, temp home via env): JSON-lines parse; summary last; exit codes; `--fix copy-skills` end to end on a temp home; `--human` renders.
- [ ] 3.2 Write `scripts/doctor.mjs`; write `skills/doctor/SKILL.md`. (The `--doctor` flag on `scripts/install.mjs` is added by change `openspec-fork-submodule` task 3.2, which creates that file after this change lands.)

## 4. Close

- [ ] 4.1 Run the doctor on this host and paste the JSON lines into the task; full battery; `.prometheus/decisions.md`: the-boss's contract as the mini's, fixes limited to idempotent copies.

### Notes from 1.1–2.0

- Every citation in `contract.md` was verified by reading the cited line, mechanically (a script resolved each `file:line` and printed it). Two of my own claims were wrong on the first pass and were corrected before commit: `DoctorDomain` has TEN domains, not nine (I missed `health`), and `DoctorFixAction` is at `:393`, not `:392`. The id count (31) and the absence of any extension point in `registry.ts` (0 matches for plugin/dynamic/external/registerCheck/addCheck) were also counted mechanically rather than recalled.
- `registryConformance` refuses an EMPTY registry. Every per-check rule is satisfied vacuously by an empty array, so a conformance report over one would say “all checks conform” having examined none — the vacuous-pass class that took nine review rounds in change `review-housekeeping`. The registry is empty until task 2.1 registers the first group, so that test is legitimately RED until then.
- `detectFullPack` FAILS CLOSED on an unreadable home: it throws rather than returning `absent`. Returning absent would report a full-pack machine as clean and let the installer write into it — the binding rule failing open on precisely the side that does damage.
- The fourth marker (`ai.prometheus.*` service units) was written against observed reality, not the spec’s wording: this development machine HAS the full pack, with 14 `ai.prometheus.*` LaunchAgents in `~/Library/LaunchAgents`. macOS reads LaunchAgents, Linux reads `~/.config/systemd/user`, and Windows is excluded — the pack installs no unit there, and looking in a macOS path on Windows would be a false marker waiting to happen.
- Run against this real full-pack machine, the detector reports `present: true` with all five markers. That is the exact case the rule exists for: this box must never receive a native mini install.
- Mutation-checked, three mutants, all killed (fail=1 each): fail-closed guard removed; unit prefix filter replaced with `true`; Windows exclusion replaced with the macOS path.
