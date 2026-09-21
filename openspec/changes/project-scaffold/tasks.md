## 1. Manifest

> RED (2026-09-21): `node --test rules/test/scaffold.test.mjs` → tests 8, pass 1, fail 7;
> first failure `Error: ENOENT: no such file or directory, open 'package.json'`.

- [x] 1.1 Write `package.json`: `type`, `private`, `engines.node ">=22"`, scripts `test` / `check` / `coverage`, devDependency `@fission-ai/openspec` at exactly `1.10.0`; no `dependencies`.
- [x] 1.2 Run `npm install` once to produce `package-lock.json`; confirm `node_modules/` is git-ignored and untracked.
- [x] 1.3 Run `node node_modules/@fission-ai/openspec/bin/openspec.js --version` and confirm it prints `1.10.0`.

## 2. Line endings

- [x] 2.1 Write `.gitattributes`: `* text=auto eol=lf`; `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.ico`, `*.webp` as `binary`.
- [x] 2.2 Run `git add --renormalize .` and confirm `git ls-files --eol` reports `i/lf` for every text file.

## 3. Verify

> AAA audit (2026-09-21, task 3.3): all 20 pre-existing tests in `rules/test/render.test.mjs` name a
> behaviour, arrange→act→assert in order (0 act-after-assert violations), and assert one behaviour each
> (max 3 assertions). No fixes were needed. They predate git history in this repository, so they carry NO
> test-first evidence — the `project-tooling` spec's history scenario applies from this change onward only.

> Adversarial diff review (2026-09-21): round 1 BLOCK was a false positive — the packet omitted
> package-lock.json as "generated" and the judge read the absence as "not committed"; the lockfile is in
> 164a4fb. Re-reviewed with proof: PASS, verified-distinct. Two WARNINGs: the LF test filtered only
> `i/crlf` (fixed — it now asserts the positive, allowing i/none for empty files and i/-text for binary),
> and tasks 3.5/3.6 were unticked at review time (now ticked).

- [x] 3.1 Delete `node_modules/`, run `npm ci`, then `npm test`: 20 tests pass and none comes from `node_modules/`.
- [x] 3.2 Run `npm run check` and `npm run coverage`; both exit 0.
- [x] 3.3 Confirm the 20 existing tests in `rules/test/render.test.mjs` follow Arrange–Act–Assert with one behaviour each; fix any that do not. They predate history, so they carry no test-first evidence — say so in the change summary rather than implying otherwise.
- [x] 3.4 T2: `node --test`, `node rules/build.mjs --check`, `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` all exit 0.
- [x] 3.5 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `chore: add package manifest, pinned openspec and gitattributes`. Do not push.
- [x] 3.6 Tell the owner to re-run `/kbd-init --force` so KBD command fields are derived from the npm scripts.

> 3.6 done (2026-09-21): reported to the owner in the session summary. `/kbd-init --force` is now
> meaningful — before this change there were no npm scripts to derive from, so an earlier re-run was a
> verified no-op.
