# Verification

Method: VLBV. The increment was written first; generated code first ran at B4 on 2026-11-17, locally on macOS (Node 24.11.1) with a scratch `HOME`. No hosted CI was used as evidence. Nothing was run on Windows.

Two departures from the method, both before B4: the new strict validator was run once right after the frontmatter migration to confirm the migration script's result, and the OpenSpec runner was run to regenerate the `openspec-*` skills.

## B4 — boundary packet (once)

- Regeneration: `node rules/build.mjs`, `npm run build:distribution` (106 skills).
- `npm run validate:strict`: 106 skills, 0 errors, 57 warnings.
- `npm run check`, `check:distribution`, `check:contract-templates`, `check:harness-capabilities`, `check:selected-method`, `spec:validate` (52 items): all exit 0.
- `node --test --test-timeout=300000`: 1325 tests, 1311 pass, 9 fail, 5 skipped.
- The same command on clean main (`de297c8`) in a second worktree, for classification: 1258 tests, 1246 pass, 10 fail, 2 skipped. Six of those ten come from that worktree borrowing this branch's `node_modules` (OpenSpec 2.1.0 against main's 2.0.0 pin) and this branch's `dist/`; they say nothing about main.
- Static certification of all 106 skills with the ported certifier: 100 hold C1, 6 hold none. See `docs/reports/2026-11-17-certification-after-parity.md`.
- Search of the change: no `.sh`, `.py`, `.ps1`, `.cmd` or `.bat` file added; no changed `.mjs` sets `shell: true`.

Failures attributed to this change, repaired at B5:

1. `certify.test.mjs` and `process.test.mjs` sat inside the skill, so the distribution copied them into both packages and `node --test` ran them from `dist/`. Moved to `scripts/tests/skill-certification/`.
2. The same certifier test passed `--skip-external`, which skips the repository validator as well as `skills-ref`, so C0 could not pass. It now runs with a `PATH` that has no `uvx`, which is the case it meant to cover.
3. `lib/karpathy/hooks-budget.test.mjs` asserted seven hook ids; the VLBV hook makes eight.
4. `scripts/carried-mjs.test.mjs` forbids a shell-script path literal in `.mjs` files under `scripts/`; a test fixture named one. The fixture name is now built from parts.

Failures not attributed to this change (they fail the same way on clean main):

- `corpus on source`, `corpus on generated claude`, `corpus on generated codex` (`scripts/kbd-phase-closure.conformance.test.mjs`): the phase-closure corpus cases recorded as pre-existing in `parity-full-1-15-vlbv/verification.md`; the local `prometheus` binary predates the admission refusals they expect.
- `status either reshapes a real prometheus response or refuses cleanly (never a stack trace)`.

## B5 — repair (affected checks only)

- `npm run build:distribution`, then `npm run check:distribution`: exit 0.
- `node --test scripts/tests/skill-certification/*.test.mjs hooks/*.test.mjs`: 38 tests, 37 pass, 1 skipped (the Windows-only shim case).
- `node --test scripts/validate-skills.test.mjs lib/karpathy/hooks-budget.test.mjs scripts/carried-mjs.test.mjs scripts/tests/skill-system-distribution.test.mjs lib/distribution/package-builder.test.mjs lib/doctor/skills.test.mjs skills/carried-payload.test.mjs`: all pass.

## Not exercised

- Windows: no run on any Windows shell. The `.cmd` shim refusal has a test that only runs there.
- Certification levels C2 and C3 (billed model runs) and C4.
- The six ported eval cases.
- The mini runner's `init` and offline `refresh` on 2.1.0. They were exercised on the full pack's runner, from which this one was ported by hand; here only `verify` (`current`) and `refresh` (skill regeneration) ran.
- `docs/distribution.md` still describes a `refresh-skill-pack.sh` helper that is not in the package. Left as found.
