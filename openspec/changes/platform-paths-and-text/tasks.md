## 1. Paths

> RED (2026-09-21): `node --test` → tests 37, pass 35, fail 2;
> `ERR_MODULE_NOT_FOUND: Cannot find module .../lib/platform/paths.mjs` and `.../text.mjs`.

- [x] 1.1 RED: write `lib/platform/paths.test.mjs` covering the three paths scenarios with injected roots; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [x] 1.2 GREEN: implement `lib/platform/paths.mjs` until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [x] 1.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(platform): add path helpers`. Do not push.

## 2. Text reader

- [x] 2.1 RED: write `lib/platform/text.test.mjs` for CRLF and LF input; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [x] 2.2 GREEN: implement `lib/platform/text.mjs` `readText` until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [x] 2.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(platform): add CRLF-normalising text reader`. Do not push.

## 3. Parsers

> RED (2026-09-21): `node --test rules/test/render.test.mjs` → tests 23, pass 22, fail 1. Only
> `splitFrontmatter tolerates CRLF line endings` fails, with the predicted
> `tech/rust has no \`paths:\` frontmatter` — confirming parseConf, routingLayer0 and the line counter
> were already tolerant, as the direct probe in analysis suggested.

- [x] 3.1 RED: write CRLF fixtures in `rules/test/render.test.mjs` for `splitFrontmatter`, `routingLayer0`, `parseConf` and the line counter — the `splitFrontmatter` one must fail with the "has no `paths:` frontmatter" error; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [x] 3.2 GREEN: fix EVERY one of the four — `parseConf`, `splitFrontmatter`, `routingLayer0`, the line counter — whose CRLF fixture fails. `splitFrontmatter` is known to fail today; the other three passed a direct probe but are not trusted until their fixtures say so. Change nothing in `rules/lib/render.mjs` that a failing fixture does not require.
- [x] 3.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `fix(rules): tolerate CRLF in splitFrontmatter`. Do not push.

## 4. First consumer

- [x] 4.1 Replace the private `readText` in `rules/build.mjs` with the import from `lib/platform/text.mjs`; behaviour on LF sources must be byte-identical (`node rules/build.mjs --check` exits 0 with no rewrite).
- [x] 4.2 RED: write a test that copies `rules/` and the generated targets into `tempDir()`, converts them to CRLF, and runs the check there; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [x] 4.3 GREEN: make it pass; remove the temp copy in a `finally`.
- [x] 4.4 T2: `node --test`, `node rules/build.mjs --check`, `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` all exit 0; the constraint `no-home-or-tmp-literals` reports clean.
- [x] 4.5 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `refactor(rules): read through lib/platform/text`. Do not push.

> GREEN (2026-09-21): full suite 49/49. `splitFrontmatter` now accepts `\r?\n`; the other three parsers
> were already tolerant and are now asserted. `rules/build.mjs` imports `lib/platform/text.mjs` as its
> first consumer and its dead `readFileSync` import was removed.
>
> HONEST LIMIT of the end-to-end CRLF test: `build.mjs` normalises through `readText` before any parser or
> comparison, so an all-CRLF tree is invisible to it BY CONSTRUCTION. Reverting the `splitFrontmatter` fix
> left that test green, so it was rewritten to assert what it genuinely proves — a CRLF checkout reports
> "current" rather than spurious drift, and real content drift is still caught inside a CRLF tree. Both were
> verified to fail when their premise is removed. Parser tolerance is discriminated by the UNIT test in
> `render.test.mjs` (22/23 when the fix is reverted).
>
> Creating `lib/` activated a nested-rules entry configured earlier, so `lib/AGENTS.md` is now generated
> (18 targets, was 17) — harnesses without path-scoped rules get the Node rules when they open `lib/`.
