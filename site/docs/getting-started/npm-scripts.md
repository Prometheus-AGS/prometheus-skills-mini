---
title: npm scripts
sidebar_label: npm scripts
---

# npm scripts

Selected root scripts from `package.json`; inspect the file for the complete current list:

```json
{
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test",
    "check": "node rules/build.mjs --check",
    "coverage": "node scripts/coverage-report.mjs",
    "context:bootstrap": "node scripts/prometheus-context-bootstrap.mjs",
    "context:check": "node scripts/prometheus-context-bootstrap.mjs --check",
    "spec:validate": "node scripts/spec-validate.mjs",
    "build:distribution": "node scripts/generate-skill-system-distribution.mjs",
    "check:distribution": "node scripts/generate-skill-system-distribution.mjs --check",
    "generate:commands": "node scripts/generate-commands.mjs"
  },
  "devDependencies": {
    "@fission-ai/openspec": "1.14.0"
  }
}
```

The root `package.json` has exactly one dependency: the OpenSpec CLI, pinned. Everything else is
Node's own standard library — no bundler, no test framework beyond `node:test`, no YAML/JSON
schema library in the runtime path.

| Script | What it does |
|---|---|
| `npm test` | Runs the legacy `node:test` suite. Unit-inclusive results are not current acceptance evidence; select the applicable real integration entry points. |
| `npm run check` | Runs `rules/build.mjs --check`, which fails on drift between `rules/src/` and the generated `CLAUDE.md`/`AGENTS.md`/`.claude/rules/`/`.cursor/rules/`/`docs/skill-routing.md`, or a Layer-0 budget breach. |
| `npm run coverage` | Runs `scripts/coverage-report.mjs`, which merges `node --test --experimental-test-coverage`'s in-process report with `NODE_V8_COVERAGE` profiles from child processes — needed because tests that exercise `rules/build.mjs` via `execFileSync` are otherwise invisible to the default reporter. |
| `npm run context:bootstrap` / `context:check` | Installs or verifies the layered Prometheus agent context (`prometheus-context-bootstrap` skill) in a target project. |
| `npm run spec:validate` | Validates every OpenSpec spec and change via `scripts/spec-validate.mjs`, which resolves and spawns the OpenSpec CLI's own JavaScript entry directly (`process.execPath`), never through the Windows `.cmd` shim, so no shell is ever needed. |
| `npm run build:distribution` / `check:distribution` | Generates (or checks for drift in) the plugin packages and marketplace listings — see [Installation](/docs/getting-started/installation). |
| `npm run generate:commands` | Generates Claude Code slash-command files from `SKILL.md` frontmatter. |

## Local validation and publication

Finish all planned production changes in the phase before authoring or running tests, checks, generation, formatters or review. Run the applicable integration batch on the local development machine, through the real production entry point and collaborators, and record exact commands and results. Legacy coverage or unit totals do not certify a release.

Hosted test workflows must not serve as a development loop or acceptance evidence. GitHub remains a source/review host. Deterministic documentation sync and Pages packaging/deployment are separate allowed automation boundaries; neither may run tests, lint, doctors or certification.
