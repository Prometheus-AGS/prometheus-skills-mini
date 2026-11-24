# The Boss service stack

For a standalone Mini checkout, start with [native, Docker and endpoint selection](../docs/native-releases.md#service-installation). For a Boss-owned stack, keep its configuration and lifecycle with The Boss.

`compose.yaml` runs the three containers used by the two Prometheus services:
SurrealDB plus surreal-memory, and the liter-llm gateway. Only loopback ports
28000, 23001, and 4000 are published by default. SurrealDB is pinned to 4.0.1. The Boss Compose stack keeps its existing project volume. Set `SURREAL_DATA_VOLUME` to select a separately restored or new named volume. The provider-managed Docker install uses `surreal-data-v4`. Both start with experimental in-place 3.x migration disabled. Before moving an existing installation, take and verify a database export and a separate offline copy of the old data. Restore into a fresh 4.0.1 store and check the namespace, users, and memory records before switching clients. A rollback to 3.x requires its original data or a restore into a new 3.x datastore. [SurrealDB 3.x-to-4.x migration guide](https://surrealdb.com/docs/operate/upgrading/3x-to-4x).

The Boss Settings → Prometheus creates the private `.env` and
`liter-llm-proxy.toml`, supplies exact release image references, provisions
separate namespace credentials, and starts the services. Existing external
endpoints can be used without starting or managing these containers.

Installed users pull prebuilt images. To package a release locally with the maintainer overlay, set `MINI_IMAGE_ARCH` to `amd64` or `arm64`, `MINI_IMAGE_VERSION` to the pack tag, and `MINI_IMAGE_CONTEXTS` to a new absolute directory. From the repo root, run:

```sh
python3 docker/service-images/package.py prepare --tag "$MINI_IMAGE_VERSION" \
  --arch "$MINI_IMAGE_ARCH" --assets "$HOME/.cache/prometheus-mini/releases/$MINI_IMAGE_VERSION" \
  --out "$MINI_IMAGE_CONTEXTS"
docker compose -f docker/compose.yaml -f docker/compose.build.yaml build
```

The generated Dockerfiles copy the verified Linux release executables. The overlay tags its outputs under `prometheus-mini-local`.

Database and embedding cache data live in named volumes. Stop, restart, and
down preserve them. There is deliberately no volume-deletion command in the
service runner. Initial memory startup downloads its embedding model; an
unready model must not be reported as operational memory.

`node scripts/services.mjs status` reports Docker, Compose, container status,
and endpoint reachability. Other actions are `pull`, `up`, `stop`, `restart`,
`down`, and `logs`; an optional service is `surrealdb`, `surreal-memory`, or
`liter-llm`. `--directory <path>` selects The Boss's generated configuration.
`--json` returns a machine-readable result. Commands never operate on another
Compose project and never install Docker automatically.

Without Docker or remote services, skills and local Compass JSON/SQLite
continue to work. Docker Desktop/Engine setup is exposed by The Boss with
clear unavailable/stopped/ready status, rather than hiding missing services.

For a standalone Mini installation, use `npm run services -- plan` to select a provider per service. Mini discovers compatible Boss endpoints and keeps its own containers in a separate Compose project. [Service installation](../docs/native-releases.md#service-installation)
