# Design — docker-services

## Why the compose file is written fresh

`config.yaml:34-37` is the specification. `tools/liter-llm/docker-compose.yml:1-7` defines only Redis on `6379`; `tools/surreal-memory-server/docker-compose.yaml` bind-mounts the host's HuggingFace cache. Each violates one rule. The Dockerfiles are sound (`liter-llm`: distroless, digest-pinned, `EXPOSE 4000`; `surreal-memory`: non-root, `EXPOSE 3001`, `/health`), so they are the build inputs and nothing else is copied.

## Submodules as build contexts, and their exit

Two more submodules is a real cost — the tree gains two Rust workspaces it never compiles on the host. They exist only so `build:` has a context at a pinned commit. When either fork publishes an image, the corresponding service becomes `image: <name>@sha256:<digest>` and the submodule is removed; `versions.toml` records which state each service is in.

## The embedding model

Upstream mounts `~/.cache/huggingface/hub` so the model is shared with other tooling. Here it lives in a named volume: first start downloads `BAAI/bge-small-en-v1.5` into the volume; offline first start fails with a clear message from the container, which `services.mjs logs` shows. Documented in `docker/README.md`.

## Detection without a dependency

`docker version --format '{{json .}}'` returns `{Client:{…},Server:{…}}` when the daemon answers and `{Client:{…}}` plus a non-zero exit when it does not. That is the entire state machine: spawn error → `absent`; no `Server` → `daemon-down`; both → `ready`. The named-pipe/Unix-socket difference that `dockerode` would have to handle never arises.
