Each code task is test-first. Blocked until `versions.toml` names the two pins.

## 0. Gate — versions.toml (operator-authored)

- [ ] 0.1 Before any task below: `node --test rules/test/versions-toml.test.mjs` reports the test **passing**, not `todo` — i.e. the operator has authored `versions.toml` and it agrees with the tree. If it is `todo`, stop and hand the phase back to the operator; do not proceed with a pin this file does not name.

## 1. Submodules

- [ ] 1.1 `git submodule add https://github.com/GQAdonis/liter-llm.git tools/liter-llm` at `c5c6caac`; `git submodule add https://github.com/Prometheus-AGS/surreal-memory-server.git tools/surreal-memory-server` at `452dab1`; commit gitlinks.
- [ ] 1.2 Exempt both from the no-shell gate in `constraints.md` in its own commit; paste the gate output before and after.

## 2. Detection

- [ ] 2.1 Write `lib/platform/docker.test.mjs` first: absent (spawn error), daemon-down (Client only), ready (both), timeout → daemon-down; `composeAvailable()`; the spawn is `shell: false` with an args array; no `wsl` string anywhere in the module (scan).
- [ ] 2.2 Write `lib/platform/docker.mjs`.

## 3. Compose and config

- [ ] 3.1 Write `docker/compose.test.mjs` first (spawned `docker compose config`, skipped with reason where Docker is absent): three services; three loopback bindings; no `redis`; no `6379`; no bind mounts; `mem_limit` on each; the secret scan over tracked files in `docker/`.
- [ ] 3.2 Write `docker/compose.yaml`, `docker/.env.example`, `docker/liter-llm-proxy.example.toml` (from the key structure of the live file; values are `${…}` placeholders), `docker/README.md` (embedding-model volume, first-start cost, offline behaviour), and add `docker/.env` to `.gitignore`.
- [ ] 3.3 Resolve the SurrealDB digest (`docker manifest inspect surrealdb/surrealdb:v3.0.5`) and record it for `versions.toml`'s operator update; pin `image:` by digest.

## 4. Service commands and installer

- [ ] 4.1 Write `scripts/services.test.mjs` first (spawned, `shell: false`, injected docker state via env for the unit path): `up` refuses when not ready with the platform message; `status` reports `unreachable` for closed ports and exits 0; `logs` passes through; every compose invocation is `docker compose -f docker/compose.yaml …` with an args array.
- [ ] 4.2 Write `scripts/services.mjs` (under 500 lines; split `lib/services/` if needed).
- [ ] 4.3 Extend `scripts/install.mjs` with `--services`; extend `scripts/install.test.mjs`: degraded exit 0 when Docker absent.

## 5. Real bring-up

- [ ] 5.1 On this macOS host: `node scripts/services.mjs up`, wait for health, `status` (paste memory per container), `down`. Record build time and peak memory in `docker/README.md`.
- [ ] 5.2 CI: `ci.yml` gains a step `docker compose -f docker/compose.yaml config` on all legs, and on `ubuntu-latest` only three **separate** steps — `node scripts/services.mjs up`, `node scripts/services.mjs status`, `node scripts/services.mjs down` (the last with `if: always()`) — each with `timeout-minutes`; no `&&`, `||` or `;` (the project command policy). Windows bring-up recorded as self-reported until observed on a real Windows machine.

## 6. Close

- [ ] 6.1 Full battery; `.prometheus/decisions.md`: fresh compose, submodules-as-build-contexts with the image-publishing exit, detect-and-require; `.prometheus/gotchas.md` for anything the bring-up teaches.
