Each code task is test-first. Runnable before its dependencies land: each dependent check is `skip` with a reason until then.

## 1. Contract

- [ ] 1.1 Write `lib/doctor/contract.md` from the-boss's `src/main/services/diagnostics/doctor/types.ts` shape (fields, statuses, `actions`, `fixes`), citing the file and commit `10aa57f76c`.
- [ ] 1.2 Write `lib/doctor/contract.test.mjs` first: conformance of every registered check; exactly one check declares a fix; fixture rejections.
- [ ] 1.3 Write `lib/doctor/registry.mjs` (the check list) and `lib/doctor/contract.mjs` (the conformance function).

## 2. Checks

- [ ] 2.0 Write `lib/platform/full-pack.test.mjs` first (each marker alone → present, naming it; none → absent; injected home and spawn), then `lib/platform/full-pack.mjs`.
- [ ] 2.1 For each group, test first then module: `lib/doctor/runtime.mjs` (`mini.node-version`, `mini.versions-toml`, `mini.submodules`), `lib/doctor/services.mjs` (`mini.docker`, `mini.service.surreal-memory`, `mini.service.liter-llm`), `lib/doctor/tools.mjs` (`mini.pk`, `mini.sycophancy-correction`), `lib/doctor/skills.mjs` (`mini.skill-copies` + `copy-skills`), `lib/doctor/kbd.mjs` (`mini.kbd-state`), `lib/doctor/scope.mjs` (`mini.install-scope`; and the `skip`/`refused` behaviour of `mini.skill-copies`/`copy-skills` when the full pack is present). Every external call is injected (spawn, fetch, home dir) so tests run with nothing installed.
- [ ] 2.2 Mutation on `copy-skills`: remove the `..` refusal and confirm the hostile-name test fails; paste the output.

## 3. Entry point and skill

- [ ] 3.1 Write `scripts/doctor.test.mjs` first (spawned, `shell: false`, temp home via env): JSON-lines parse; summary last; exit codes; `--fix copy-skills` end to end on a temp home; `--human` renders.
- [ ] 3.2 Write `scripts/doctor.mjs`; write `skills/doctor/SKILL.md`. (The `--doctor` flag on `scripts/install.mjs` is added by change `openspec-fork-submodule` task 3.2, which creates that file after this change lands.)

## 4. Close

- [ ] 4.1 Run the doctor on this host and paste the JSON lines into the task; full battery; `.prometheus/decisions.md`: the-boss's contract as the mini's, fixes limited to idempotent copies.
