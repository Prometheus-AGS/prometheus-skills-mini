---
title: Services and recovery
sidebar_label: Services and recovery
---

# Services and recovery

Mini skills and local team/KBD files work without a service stack. Searchable
memory and provider-backed review are optional capabilities. The shipped Compose
project runs three containers: SurrealDB, surreal-memory and liter-llm.

| Capability | Repository | Default host interface |
|---|---|---|
| Durable memory database | Upstream SurrealDB, pinned in `versions.toml` | Loopback `28000` |
| Searchable memory | [surreal-memory-server](https://github.com/Prometheus-AGS/surreal-memory-server) | Loopback `23001`; MCP `/mcp/sse`, REST `/api/v1/memory` |
| Model gateway | [liter-llm](https://github.com/GQAdonis/liter-llm) | Loopback `4000/v1` |

These packages have independent versions. Image choices and dependency gitlinks
come from the approved release manifest; do not substitute arbitrary latest
images or assume every binary matches mini's package version.

## Select a service owner

| Owner | Owns | Mini's boundary |
| --- | --- | --- |
| Mini checkout | Compose configuration and the `scripts/services.mjs` lifecycle wrapper | Uses supplied container images and an existing Docker/Compose installation. |
| surreal-memory-server repository | Memory server implementation and its service interfaces | Configure an approved image or explicit external endpoint; copying a skill does not install this server. |
| liter-llm repository | Gateway implementation, model routes and provider configuration | Inference remains separate from a tool-enabled native worker. |
| Full pack installation | Its Rust/native tools, installers and global service ownership | Discovery does not compile, install, upgrade or take over those services. |
| Companion checkout | Its optional connected host, identity, sync client and registrations | Separate source and installation; no public remote or certified release is claimed here. |

Route a defect to the repository that owns the failing behavior. Team prompts,
export receipts and model policies cannot repair a server, create credentials
or install Rust tools. Choose one lifecycle owner per running service and keep
its endpoint, configuration and data selection explicit.

On any supported platform, you can use the shipped Compose stack or an explicitly
configured external stack. Windows uses Docker Desktop or Docker Engine with
Compose; mini does not enter WSL, install Docker or create a Windows native
service. macOS/Linux may reuse services installed by the full pack instead.

```bash
node scripts/services.mjs discover --json
node scripts/services.mjs status --external --json
```

Discovery reads documented full-pack markers/configuration locations and returns
candidate endpoints. A marker proves neither service readiness nor signed
installation trust. It does not import credentials or take over another owner's
service. External services are inspected separately and are not managed by the
Compose lifecycle commands.

The full pack also has knowledge/worker, Forge, execution and learning components.
Mini does not gain those native services merely by discovering its memory/gateway.
Companion is another optional repository for connected synchronization/control;
neither pack requires it. Its own release must establish installation, endpoint
compatibility and publication, independently of these three containers.

## Shipped Compose configuration

`docker/compose.yaml` uses project name `the-boss-prometheus`:

- SurrealDB is pinned to `3.3.0` by image digest in the current source. It uses
  named volume `surreal-data` and exposes container `8000` only through host
  `127.0.0.1:${SURREAL_PORT:-28000}`.
- `SURREAL_MEMORY_IMAGE` is required. Memory connects to `surrealdb:8000`, uses
  a namespace account, namespace `memory`, database `main_local_384` and local
  `BAAI/bge-small-en-v1.5` embeddings. Host `23001` maps to container `3001`;
  model downloads are cached in named volume `embedding-cache`.
- `LITER_LLM_IMAGE` is required. The gateway receives a read-only Compose config
  from `docker/liter-llm-proxy.toml` and exposes host loopback `4000`.

The full native template uses database `memory/mcp`, whereas this Compose
template selects `memory/main_local_384`. Choosing the same port does not share
or migrate those datasets. Record your actual endpoint, database and embedding
identity before switching service owners.

Each container has a memory limit and `restart: unless-stopped`. Required
database/gateway credentials come from the local ignored `.env` file, not inline
defaults. Use the shipped example for variable names and supply your own values.
Container-to-container addresses are separate from host loopback addresses.
Scope fields such as `user_id` and `agent_id` are not network authentication.

`docker/compose.build.yaml` is a maintainer source-build overlay. It is not the
normal prebuilt-image setup path and does not prove a complete collaborating
harness installation.

## Lifecycle

Once `.env`, gateway config and approved image references are supplied:

```bash
node scripts/services.mjs pull
node scripts/services.mjs up
node scripts/services.mjs status --json
node scripts/services.mjs logs surreal-memory
node scripts/services.mjs stop surreal-memory
node scripts/services.mjs restart surreal-memory
node scripts/services.mjs down
```

`up` runs prebuilt images with `--no-build`. A service argument must be
`surrealdb`, `surreal-memory` or `liter-llm`. `down` applies to the whole managed
stack; use `stop` for a single service. `--directory <path>` selects an explicit
Compose/configuration directory. Commands remain scoped to this Compose project.

Stop, restart and down preserve named volumes; the runner has no volume-deletion
command. Missing Docker/Compose prevents lifecycle operations with a diagnosed
result. The status command can still report available listener observations.

Status records HTTP reachability, response status and container observations;
its endpoint records do not certify operational memory or inference. A `401`
from a gateway proves a listener responded, not that your model credentials work.
Initial memory startup may download embeddings. Exercise a real scoped write
and recall, or a configured model request, before calling that capability usable.

## Failure and recovery

Keep the local outbox and team state when a service is unavailable. Publication
requires a resolved local project identity; otherwise the entry remains queued
with a durable `missing_project_id` diagnosis. The canonical memory request uses
the selected project as `user_id` and a derived learning scope as `agent_id`.
There is no ambient process/home fallback to another project's tenant.

If a remote attempt may have succeeded, reconcile its recorded body, target and
key before retrying. Legacy recorded attempts cannot silently be rewritten into
the new envelope. Mapped HTTP publication does not by itself prove remote
authorization or idempotency. See [agent-team memory](/docs/agent-teams/overview).

For database recovery, stop the writer, preserve the named volume and restore a
compatible backup into an isolated destination first. Preserve namespace users,
selected database and embedding configuration. Model-cache regeneration is not
a substitute for database backup or vector compatibility.

Provider routing follows [model assignment](/docs/kbd/task-model-assignments)
and [adversarial review](/docs/review/adversarial-review). Record actual inference
and explicit fallback; a native fresh-context critic is not proof of a distinct
model family. Gateway failure does not authorize calling incomplete review PASS.

Upgrade only from locally certified, approved source/images. Preserve previous
image identities and data backups for recovery. Tests use scratch homes, queues,
databases and ports, never live `23001`; hosted testing is not release evidence.

## Optional Companion connection

Companion is separate from this three-container stack. Its recovered source
has no public remote or certified release yet. Source procedures live in its
own `docs/installation.md` and `docs/control-api.md`; mini does not install or
repair its host, identity or registrations.

Headless/windowed Companion and standalone `sovereign-sync --mode daemon`
are alternative owners of the same-user Unix socket. Choose one. The stdio
`--mode mcp` sync tools connect to an existing selected host using `--socket`
or `SOVEREIGN_SYNC_SOCKET`; they have no TCP fallback or separate P2P identity.
Local control starts before optional peer transport. `--mode server` disables
P2P; explicit configuration can also set `[node] p2p_enabled = false`.

`PROMETHEUS_DATA_DIR` selects data, not socket or identity locations. Preserve
and align each selected socket, config, data and enrolled signing-key path
between host and clients. Service adoption needs an explicit full-pack manifest;
it does not change mini's `memory/main_local_384` into native `memory/mcp`, nor
replicate the memory database. Companion classifies surreal-memory local-only.

Companion's separate macOS installer accepts an approved existing headless
binary and private enrolled key and owns only `ai.prometheus.companion`.
Its connected-skill installer supports Claude Code user scope with private
ownership receipts and backups. Registration does not start a host; other
harness installers and native Windows registration are not implemented there.

Before sending, MCP `sync-push` fsyncs the exact request and socket under
`<data-root>/prometheus/companion/mcp-push-outbox/<request-id>.json` and returns
`intentPath`. Failure to preserve intent means `not-submitted`. If POST or
response decoding is uncertain, query `sync-push-receipt` with the original
`request_id` on the original host before replay. Preserve the exact ID, body,
signature and endpoint across restarts. Intent and local broadcast are not
remote peer application receipts.

## Related guides

- [Windows constraints](/docs/platform/windows-constraints)
- [Doctor](/docs/platform/doctor)
- [Full/mini comparison](/docs/reference/comparison-with-full-pack)
- [Agent teams](/docs/agent-teams/overview)
