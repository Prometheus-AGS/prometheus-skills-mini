---
title: npm scripts
sidebar_label: npm scripts
---

# npm scripts

`package.json`'s full script surface, read directly from the source:

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
    "@fission-ai/openspec": "1.10.0"
  }
}
```

The root `package.json` has exactly one dependency: the OpenSpec CLI, pinned. Everything else is
Node's own standard library — no bundler, no test framework beyond `node:test`, no YAML/JSON
schema library in the runtime path.

| Script | What it does |
|---|---|
| `npm test` | Runs the entire `node:test` suite (1,000+ tests as of the KBD/adversarial-review/ideation-mindmap/distribution port). |
| `npm run check` | Runs `rules/build.mjs --check`, which fails on drift between `rules/src/` and the generated `CLAUDE.md`/`AGENTS.md`/`.claude/rules/`/`.cursor/rules/`/`docs/skill-routing.md`, or a Layer-0 budget breach. |
| `npm run coverage` | Runs `scripts/coverage-report.mjs`, which merges `node --test --experimental-test-coverage`'s in-process report with `NODE_V8_COVERAGE` profiles from child processes — needed because tests that exercise `rules/build.mjs` via `execFileSync` are otherwise invisible to the default reporter. |
| `npm run context:bootstrap` / `context:check` | Installs or verifies the layered Prometheus agent context (`prometheus-context-bootstrap` skill) in a target project. |
| `npm run spec:validate` | Validates every OpenSpec spec and change via `scripts/spec-validate.mjs`, which resolves and spawns the OpenSpec CLI's own JavaScript entry directly (`process.execPath`), never through the Windows `.cmd` shim, so no shell is ever needed. |
| `npm run build:distribution` / `check:distribution` | Generates (or checks for drift in) the plugin packages and marketplace listings — see [Installation](/docs/getting-started/installation). |
| `npm run generate:commands` | Generates Claude Code slash-command files from `SKILL.md` frontmatter. |

## CI

`.github/workflows/ci.yml` runs a 3-OS × 2-Node matrix (`windows-latest`, `ubuntu-latest`,
`macos-latest` × Node 22, 24). The Windows legs deliberately check out with
`core.autocrlf=true` — the default most likely to break the rules build and its parsers — so the
CRLF-tolerance claims in this documentation are exercised, not assumed. Each job runs, in order:
`npm ci`, `node --test`, `node rules/build.mjs --check`, `npm run coverage`, and
`node scripts/spec-validate.mjs`.
