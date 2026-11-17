# Tasks

## 1. OpenSpec 2.1.0
- [x] 1.1 Pin 2.1.0 (package.json, lockfile, config/spec-engines.json, runner PINNED_VERSION and minimum); Node floor 22.20.0 in the runner, doctor, rules and versions.toml.
- [x] 1.2 Runner: `init --scope project`; dry-run based `verify` and `refresh`; `refresh-unavailable`.
- [x] 1.3 Regenerate the 12 `openspec-*` skills in `.agents/skills` and `.claude/skills`.

## 2. Certification and validation
- [x] 2.1 Baseline certification of the 105 skills with the full pack's certifier (static levels).
- [x] 2.2 Port `skill-certification` to `skills/skill-certification/` in Node, with integration tests.
- [x] 2.3 `scripts/validate-skills.mjs`, `lib/skills/validate.mjs`, npm scripts, tests.
- [x] 2.4 Migrate skill frontmatter; record the fields that stay top-level.
- [x] 2.5 Port the eval cases that need no scaffold script; record the rest.

## 3. Packaging and hook
- [x] 3.1 `evals/` and `.claude-plugin/` beside a `SKILL.md` are source-only (package builder, doctor).
- [x] 3.2 `sessionstart-vlbv` hook module, registration, tests; `vlbv` 1.1.0 and the two routes.

## 4. Docs and version
- [x] 4.1 COMPARE.md, site comparison, OpenSpec 2.1 notes, CHANGELOG, release note.
- [x] 4.2 Version 1.17.0; regenerate rules and distribution.

## 5. Boundary
- [x] 5.1 B4 boundary packet once; certify all skills again with the ported certifier.
