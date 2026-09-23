---
title: Docker Services
sidebar_label: Docker Services
---

# Docker Services

Exactly two services exist in this pack, and no change may add a third without an OpenSpec
proposal that says why:

| Service | Purpose | Endpoint (every platform) |
|---|---|---|
| surreal-memory + SurrealDB | agent memory: reflections, recall, mindmaps | `http://localhost:23001/mcp/sse`; SurrealDB `127.0.0.1:28000` |
| liter-llm gateway | the adversarial-review **judge** and **critic** models | `http://localhost:4000/v1` (OpenAI-compatible) |

**Windows:** Docker, via `docker/compose.yaml` — three containers. **macOS and Linux:** exactly as
the full pack runs them today (native launchd/systemd units); the same compose file also works
there. Ports, the SSE path, the namespace/database (`memory` / `main_local_384`), and the model
names (`kbd-judge`, `kbd-critic`) are identical everywhere, so client code has no platform branch —
only how the process starts differs.

## `docker/compose.yaml` (as shipped)

Project name `the-boss-prometheus`. Three services:

- **`surrealdb`** — `surrealdb/surrealdb:v3.2.4`, pinned by digest
  (`sha256:51baed8709f57f67dcf04b30e3177db846803fa9342dae2be58c6fa5f8d59843`, matching
  `versions.toml`). Bound to `127.0.0.1:${SURREAL_PORT:-28000}`, `mem_limit: 2g`, `RUST_LOG=info`,
  named volume `surreal-data`, with a `surreal isready` healthcheck.
- **`surreal-memory`** — image from `${SURREAL_MEMORY_IMAGE}` (required, no inline default — "use
  the pinned release image from The Boss manifest"). Bound to `127.0.0.1:${MEMORY_PORT:-23001}`,
  `mem_limit: 3g`, namespace `memory` / database `main_local_384`, local embeddings
  (`BAAI/bge-small-en-v1.5`) cached in the named volume `embedding-cache`, `depends_on: surrealdb`
  with `condition: service_healthy`.
- **`liter-llm`** — image from `${LITER_LLM_IMAGE}` (required). Bound to
  `127.0.0.1:${LITER_PORT:-4000}`, `mem_limit: 1g`, config mounted read-only via Compose `configs:`
  from `./liter-llm-proxy.toml`.

All three credentials/keys are required environment variables with no inline defaults
(`${SURREAL_ROOT_USERNAME:?...}` etc.) — Compose refuses to start without them, rather than
silently running with a default credential.

A companion `docker/compose.build.yaml` exists as an **optional maintainer build overlay** using
the pinned source submodules; it is explicitly not the application setup path. Installed users pull
prebuilt images — no host Rust toolchain or Linux compatibility shell is required for normal use.

## Compose rules — each traces to a real boundary or a Windows fact

- **Loopback only.** `127.0.0.1:28000:8000`, never `28000:8000`. A database and a gateway holding
  provider keys are not LAN services.
- **Secrets never inline.** Credentials and provider keys come from a git-ignored env file. No
  `--user=root --pass=root` baked into the compose file. `.env.example` ships names with no values.
- **Named volumes only.** `HOME` is not set in `cmd.exe`, and NTFS bind mounts are slow.
- **A memory limit on every service**, pinned image versions/digests.
  `RUST_LOG=info` — debug logs of a memory server would contain user content.
- **`restart: unless-stopped`.** No Windows service, no Task Scheduler, no native daemon on
  Windows.
- The pack never enters WSL or calls `wsl.exe`. Docker Desktop's backend (WSL 2, or Hyper-V on
  Windows Pro/Enterprise/Education) is Docker's own concern; the pack reaches containers over
  loopback TCP only.

## Degradation is part of the contract

- **Memory down** → the operation goes to the durable local outbox, and SessionStart flushes it
  later. The files under `.prometheus/` are the primary record; the server is the searchable
  secondary. Only an *accepted* reflection is ever written back; a rejected one never is.
- **Gateway down** → [adversarial review](/docs/review/adversarial-review) falls back to a
  fresh-context subagent (prompt = mandate + packet, nothing else) and records
  `isolation_mode=harness-native`.
- **Docker CLI missing** → `scripts/services.mjs` and `scripts/doctor.mjs` report *not
  installed* — a status, not an error.

## Lifecycle: `scripts/services.mjs`

```bash
node scripts/services.mjs status              # Docker, Compose, container status, endpoint reachability
node scripts/services.mjs pull|up|stop|restart|down|logs [service]
node scripts/services.mjs status --json        # machine-readable
node scripts/services.mjs status --directory <path>   # The Boss's generated configuration
```

`service` (when given) is one of `surrealdb`, `surreal-memory`, or `liter-llm`. Commands never
operate on another Compose project and never install Docker automatically. Database and embedding
cache data live in named volumes; stop/restart/down preserve them — there is deliberately no
volume-deletion command in the service runner. Initial memory startup downloads its embedding
model, and an unready model must never be reported as operational memory.

Without Docker or remote services, skills and local Compass JSON/SQLite continue to work.

## Judge and critic model resolution

Role → model, highest wins: explicit argument → `PROMETHEUS_KBD_<ROLE>_MODEL` →
`~/.prometheus/kbd/models.toml` `[roles]` → `.kbd-orchestrator/project.json` `model_policy` →
built-in defaults `kbd-judge` / `kbd-critic`. Gateway discovery: `LITER_LLM_BASE_URL` → first of
`http://localhost:8181/v1`, `http://localhost:4000/v1` that answers `GET /models`. Judge ≠ producer
is enforced; the critic is the collision escape hatch. A role naming a model missing from
`liter-llm-proxy.toml`'s `[[models]]` fails loudly before the review runs, not as a 404 mid-review.
Provider API keys are the user's; this pack ships none. Implemented in `lib/review/model-resolution.mjs`
(see [Adversarial Review](/docs/review/adversarial-review)).

## See also

- [Windows Constraints](/docs/platform/windows-constraints)
- [Doctor](/docs/platform/doctor) — service health as part of the standard doctor run.
- [Adversarial Review](/docs/review/adversarial-review) — the liter-llm gateway's consumer.
- [Ideation Mindmap](/docs/ideation/ideation-mindmap) — a surreal-memory consumer.
