## 1. Manifest

> RED (2026-09-21): `node --test rules/test/scaffold.test.mjs` → tests 8, pass 1, fail 7;
> first failure `Error: ENOENT: no such file or directory, open 'package.json'`.

- [ ] 1.1 Write `package.json`: `type`, `private`, `engines.node ">=22"`, scripts `test` / `check` / `coverage`, devDependency `@fission-ai/openspec` at exactly `1.10.0`; no `dependencies`.
- [ ] 1.2 Run `npm install` once to produce `package-lock.json`; confirm `node_modules/` is git-ignored and untracked.
- [ ] 1.3 Run `node node_modules/@fission-ai/openspec/bin/openspec.js --version` and confirm it prints `1.10.0`.

## 2. Line endings

- [ ] 2.1 Write `.gitattributes`: `* text=auto eol=lf`; `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.ico`, `*.webp` as `binary`.
- [ ] 2.2 Run `git add --renormalize .` and confirm `git ls-files --eol` reports `i/lf` for every text file.

## 3. Verify

- [ ] 3.1 Delete `node_modules/`, run `npm ci`, then `npm test`: 20 tests pass and none comes from `node_modules/`.
- [ ] 3.2 Run `npm run check` and `npm run coverage`; both exit 0.
- [ ] 3.3 Confirm the 20 existing tests in `rules/test/render.test.mjs` follow Arrange–Act–Assert with one behaviour each; fix any that do not. They predate history, so they carry no test-first evidence — say so in the change summary rather than implying otherwise.
- [ ] 3.4 T2: `node --test`, `node rules/build.mjs --check`, `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` all exit 0.
- [ ] 3.5 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `chore: add package manifest, pinned openspec and gitattributes`. Do not push.
- [ ] 3.6 Tell the owner to re-run `/kbd-init --force` so KBD command fields are derived from the npm scripts.
