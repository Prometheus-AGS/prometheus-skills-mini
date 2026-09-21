## 1. spawnNodeCli

> RED (2026-09-21): `node --test` → 76 tests, 74 pass, 1 fail —
> `ERR_MODULE_NOT_FOUND: Cannot find module .../lib/platform/spawn.mjs`, which aborts the whole file.
> Note for the implementation: `@fission-ai/openspec` declares `exports: ["."]`, so
> `require.resolve("@fission-ai/openspec/package.json")` fails with ERR_PACKAGE_PATH_NOT_EXPORTED.
> The documented fallback (resolve the main entry, walk up to the package.json whose `name` matches)
> was verified to work before writing these tests.

- [ ] 1.1 RED: write `lib/platform/spawn.test.mjs`: OpenSpec `--version` through its JS entry with `shell: false`, success with an emptied `PATH`, unknown bin rejected; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 1.2 GREEN: implement `spawnNodeCli` in `lib/platform/spawn.mjs`; if `exports` blocks `package.json`, implement the documented fallback and record it in `design.md` until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [ ] 1.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(platform): run npm CLIs through their JS entry, no shell`. Do not push.

## 2. spawnExecutable and refusal

- [ ] 2.1 RED: write tests: `git --version`; a `.cmd` and a `.bat` name refused before any spawn; an argument with spaces, quotes and `&` arriving unmodified (echoed back by a child `node -e`); run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 2.2 GREEN: implement `spawnExecutable` and the refusal until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [ ] 2.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(platform): spawn executables by name and refuse .cmd/.bat`. Do not push.

## 3. Entry point

- [ ] 3.1 RED: write a test that runs `scripts/spec-validate.mjs` against a fixture with an invalid change and asserts the non-zero exit code is forwarded; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 3.2 GREEN: implement `scripts/spec-validate.mjs` (entry point only) and the `spec:validate` npm script until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [ ] 3.3 Switch the validation step in `.github/workflows/ci.yml` to `node scripts/spec-validate.mjs` (the MODIFIED `continuous-integration` requirement); confirm no step names `node_modules/` any more.
- [ ] 3.4 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat: shell-free openspec validation entry point`. Do not push.

## 4. Verify

- [ ] 4.1 T2, now with the new entry point: `node --test`, `node rules/build.mjs --check`, `node scripts/spec-validate.mjs` all exit 0; constraint `no-shell-true` reports clean.
- [ ] 4.2 Tell the owner to re-run `/kbd-init --force` so `spec_validate_command` and the `specs-valid` constraint pick up `npm run spec:validate`.
