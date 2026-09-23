# The Boss service stack

`compose.yaml` runs the three containers used by the two Prometheus services:
SurrealDB plus surreal-memory, and the liter-llm gateway. Only loopback ports
28000, 23001, and 4000 are published by default. SurrealDB is pinned to 3.2.4.

The Boss Settings → Prometheus creates the private `.env` and
`liter-llm-proxy.toml`, supplies exact release image references, provisions
separate namespace credentials, and starts the services. Existing external
endpoints can be used without starting or managing these containers.

Installed users pull prebuilt images. `compose.build.yaml` is an optional
maintainer build overlay using the pinned source submodules; it is not the
application setup path. No host Rust toolchain or Linux compatibility shell
is required.

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
