## ADDED Requirements

### Requirement: The compose file satisfies config.yaml's compose rules exactly
`docker/compose.yaml` SHALL define exactly three services — `surrealdb`, `surreal-memory`, `liter-llm` — publishing only `127.0.0.1:28000`, `127.0.0.1:23001` and `127.0.0.1:4000`; every volume SHALL be a named volume; every service SHALL carry a memory limit; credentials SHALL come from `docker/.env` (git-ignored) and never appear inline; images SHALL be pinned by digest or built from a vendored submodule at the commit `versions.toml` names. No other port, service, or bind mount SHALL exist.

#### Scenario: The compose file is validated on every OS
- **WHEN** `docker compose -f docker/compose.yaml config` runs on `ubuntu-latest`, `macos-latest` and `windows-latest`
- **THEN** it exits 0 and the rendered configuration shows three services, three loopback port bindings, and no bind mounts

#### Scenario: The upstream defects are absent
- **WHEN** the rendered configuration is inspected
- **THEN** no service named `redis` exists, no port `6379` is published, and no volume source begins with a host path

#### Scenario: Secrets never enter the tree
- **WHEN** every file under `docker/` that git tracks is scanned with `lib/karpathy/validate.mjs`'s `secretPattern()`
- **THEN** nothing matches, and `docker/.env` is listed in `.gitignore`

### Requirement: Docker is detected, required for services, and never installed by the pack
`lib/platform/docker.mjs` SHALL report `absent`, `daemon-down` or `ready` from `docker version --format '{{json .}}'` with a bounded timeout and no shell. `scripts/services.mjs` SHALL refuse `up` unless the state is `ready`, printing the platform's next step without executing it, and SHALL exit 0 with a degraded result when invoked by the installer. The pack SHALL NOT call `wsl.exe`, open the daemon socket, or run an installer.

#### Scenario: Daemon down is distinguished from absent
- **WHEN** an injected spawn returns a `Client` section and no `Server` section
- **THEN** the state is `daemon-down` and the message says to start Docker, not to install it

#### Scenario: The installer degrades rather than fails
- **WHEN** `node scripts/install.mjs --services` runs where Docker is `absent`
- **THEN** it exits 0, prints a degraded result naming Docker as the missing prerequisite, and everything else the installer does still completes

#### Scenario: A hung daemon does not hang the pack
- **WHEN** the injected spawn never returns
- **THEN** the probe reports `daemon-down` after its timeout

### Requirement: Service status is observed, not assumed
`scripts/services.mjs status` SHALL probe `http://localhost:23001/health` and `http://localhost:4000/v1/models` with `fetch` and bounded timeouts, SHALL report per-container memory from `docker stats --no-stream --format '{{json .}}'`, and SHALL report a service as `unreachable` rather than throwing.

#### Scenario: Both services down is a report, not an error
- **WHEN** neither endpoint answers
- **THEN** `status` exits 0 and reports both as `unreachable`

### Requirement: The proxy config example carries no secret and the two KBD aliases
`docker/liter-llm-proxy.example.toml` SHALL reproduce the live file's key structure with `${ENV_VAR}` placeholders, SHALL define aliases `kbd-judge` and `kbd-critic`, and SHALL match the secret pattern nowhere.

#### Scenario: The example is safe to commit
- **WHEN** the example is scanned with `secretPattern()`
- **THEN** nothing matches
