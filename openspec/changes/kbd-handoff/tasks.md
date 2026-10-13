## 1. Production path

- [x] 1.1 Add `lib/kbd/handoff/` (harness registry, read-only state reader, readiness checks, packet renderer) and the `scripts/kbd-handoff.mjs` entry point.
- [x] 1.2 Add `skills/kbd-handoff/SKILL.md`, list it on the KBD skills page, ship the entry point in plugin packages and regenerate them.

## 2. Completed delivery boundary

- [x] 2.1 Entry-level `node:test` scenarios: refusal on open boundary obligations, dry run writes nothing, packet sections, unknown harness rejected, broken skill symlink reported. Then `node --test`, `node rules/build.mjs --check`, `openspec validate kbd-handoff` and the distribution check.
