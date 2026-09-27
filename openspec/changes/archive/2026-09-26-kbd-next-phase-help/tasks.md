## 1. Read-only help path

- [x] 1.1 Add `-h` and `--help` handling before all project discovery and mutation in `scripts/kbd-next-phase.mjs`, and add a spawned entry-point regression scenario in `scripts/kbd-next-phase.test.mjs` that verifies usage, exit 0, and an unchanged artifact tree.
- [x] 1.2 At the completed change boundary, run `node --test scripts/kbd-next-phase.test.mjs` as the targeted production-entry-point gate and validate the OpenSpec change.
