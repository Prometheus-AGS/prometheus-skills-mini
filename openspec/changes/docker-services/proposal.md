## Why

`openspec/config.yaml:23-37` binds the two permitted services — `surreal-memory` backed by SurrealDB, and the `liter-llm` gateway — to `docker/compose.yaml` with loopback-only ports, a git-ignored env file, named volumes, memory limits and pinned images. The README describes the directory. It does not exist, no installer exists, and Docker is not detected anywhere. Neither upstream compose file can be imported: `liter-llm`'s defines only Redis on `6379` (a third port), and `surreal-memory-server`'s bind-mounts `${HOME}/.cache/huggingface/hub` (forbidden). The skill pack ships no redacted proxy config — its `liter-llm-proxy.toml` is a live secret-bearing file.

The mini also has neither service's source: their Dockerfiles live only in the skill pack's submodules. Until either fork publishes an image (unconfirmed — the packages API needs a scope this session lacked), the mini must `build:` from vendored sources.

## What Changes

- Add submodules `tools/liter-llm` (`GQAdonis/liter-llm` @ `c5c6caac`) and `tools/surreal-memory-server` (`Prometheus-AGS/surreal-memory-server` @ `452dab1`), pinned by `versions.toml`, exempted from the no-shell gate, used only as `build:` contexts — nothing under them runs on the host.
- Add `docker/compose.yaml`, written fresh: `surrealdb` from `surrealdb/surrealdb:v3.0.5` (digest-pinned once resolved) with a named volume, `127.0.0.1:28000:8000`; `surreal-memory` built from `tools/surreal-memory-server/Dockerfile`, `127.0.0.1:23001:3001`, a named volume for the embedding-model cache, `depends_on: surrealdb: condition: service_healthy`; `liter-llm` built from `tools/liter-llm/docker/Dockerfile`, `127.0.0.1:4000:4000`; `mem_limit` on all three; credentials from `docker/.env` (git-ignored) with `docker/.env.example` committed; no Redis, no other port.
- Add `docker/liter-llm-proxy.example.toml`: the key structure of the live file (`[general]`, `[security]`, `[[models]]`, `[[aliases]]`, `[mcp]`) with `${ENV_VAR}` placeholders, the two aliases `kbd-judge` and `kbd-critic`, and no secret. A test asserts the example matches the secret pattern nowhere.
- Add `lib/platform/docker.mjs`: `dockerState()` → `{ state: 'absent' | 'daemon-down' | 'ready', client, server }` from `spawnExecutable('docker', ['version', '--format', '{{json .}}'], { timeout })`; `composeAvailable()` from `docker compose version`. No `wsl.exe`, no socket access, no dependency.
- Add `scripts/services.mjs`: `up | down | status | logs` over `docker compose -f docker/compose.yaml`, refusing to run when `dockerState()` is not `ready` and printing the platform's next step (install Docker Desktop / start the daemon) without performing it; `status` also probes `http://localhost:23001/health` and `http://localhost:4000/v1/models` with `fetch` and bounded timeouts.
- Extend `scripts/install.mjs` (from `openspec-fork-submodule`): `--services` runs `services.mjs up` when Docker is ready and reports a degraded, exit-0 result when it is not.
- `.gitignore`: `docker/.env`.

## Capabilities

### New Capabilities
- `services/docker`: the compose contract, Docker detection, the service commands, and what holds when Docker is absent.

### Modified Capabilities
<!-- none -->

## Impact

- New: two submodules, `docker/{compose.yaml,.env.example,liter-llm-proxy.example.toml}`, `lib/platform/docker.mjs`, `scripts/services.mjs`, tests; `scripts/install.mjs` extended; `constraints.md` exemptions (own commit); `.gitignore`.
- **Blocked until `versions.toml` exists** (pins) and, for the first real bring-up, until Docker is available on a test host — this macOS host has Docker; `windows-latest` runners have Docker Engine but only for Linux containers, which these are, so the compose file can be *validated* (`docker compose config`) on all three OSes in CI and *started* on Linux; starting on Windows is recorded as self-reported until observed on a real Windows machine.
- Security (A-3): the env file and the proxy config carry provider keys and the gateway master key — a real trust boundary. Loopback-only binds, git-ignored env, no secret in any committed file, and a test that scans `docker/` with the existing secret pattern.
- Resource: first `up` builds two Rust services inside Docker — minutes and gigabytes, once per machine. `services.mjs status` reports memory per container so the 16 GB target is measured, not estimated.

## Non-goals

- Installing Docker (analysis Q2: detect and require; the-boss may offer a consent-gated action).
- Native (non-Docker) service installation on macOS/Linux — the same compose file works there; launchd/systemd units are the source pack's and are not carried.
- Publishing images — an operator follow-up in each fork; when done, `compose.yaml` switches to `image:` + digest and the two submodules are dropped.
