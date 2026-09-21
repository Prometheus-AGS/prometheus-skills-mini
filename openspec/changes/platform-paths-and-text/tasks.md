## 1. Paths

- [ ] 1.1 RED: write `lib/platform/paths.test.mjs` covering the three paths scenarios with injected roots; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 1.2 GREEN: implement `lib/platform/paths.mjs` until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [ ] 1.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(platform): add path helpers`. Do not push.

## 2. Text reader

- [ ] 2.1 RED: write `lib/platform/text.test.mjs` for CRLF and LF input; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 2.2 GREEN: implement `lib/platform/text.mjs` `readText` until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [ ] 2.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(platform): add CRLF-normalising text reader`. Do not push.

## 3. Parsers

- [ ] 3.1 RED: write CRLF fixtures in `rules/test/render.test.mjs` for `splitFrontmatter`, `routingLayer0`, `parseConf` and the line counter — the `splitFrontmatter` one must fail with the "has no `paths:` frontmatter" error; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 3.2 GREEN: fix EVERY one of the four — `parseConf`, `splitFrontmatter`, `routingLayer0`, the line counter — whose CRLF fixture fails. `splitFrontmatter` is known to fail today; the other three passed a direct probe but are not trusted until their fixtures say so. Change nothing in `rules/lib/render.mjs` that a failing fixture does not require.
- [ ] 3.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `fix(rules): tolerate CRLF in splitFrontmatter`. Do not push.

## 4. First consumer

- [ ] 4.1 Replace the private `readText` in `rules/build.mjs` with the import from `lib/platform/text.mjs`; behaviour on LF sources must be byte-identical (`node rules/build.mjs --check` exits 0 with no rewrite).
- [ ] 4.2 RED: write a test that copies `rules/` and the generated targets into `tempDir()`, converts them to CRLF, and runs the check there; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 4.3 GREEN: make it pass; remove the temp copy in a `finally`.
- [ ] 4.4 T2: `node --test`, `node rules/build.mjs --check`, `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` all exit 0; the constraint `no-home-or-tmp-literals` reports clean.
- [ ] 4.5 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `refactor(rules): read through lib/platform/text`. Do not push.
