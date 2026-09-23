# Operator intent (verbatim, 2026-09-22)

1. "Next, we want `the-boss` to support the universal agent runtime as an `agent runtime` like codex,
   minimax, claude code, etc. with its own configuration/settings, sidecar configuration as an embedded
   binary downloaded from a github releases setup for universal agent runtime that uses CI/CD on main
   branch to create versions for all supported platforms (windows arm/x64, macos arm/x64, linux, etc.)."
2. "In considering the universal agent runtime, that should support AG-UI as the protocol with full
   support for A2UI and its agent definitions standards, content management algorithm selection, skill
   selection algorithms, and ALL the features it provides, which may mean a slightly different subsystem
   but use deep research and adversarial review to determine the best course for all these runtimes to
   live together in the second child phase."
3. "Because we have the surreal memory server AND an instance of SurrealDB in docker, that surrealdb
   instance can be shared as a remote source by compass, UAR, and everything that needs surrealdb."

## Context the reviewer needs

- `the-boss` is an Electron app (a Cherry Studio fork). Its agent runtimes today are `claude-code`
  (Claude Agent SDK spawning the `claude` CLI), `pi` (an in-process library) and `dsh` (a Bun child
  process). Every runtime's output is converted to AI SDK v6 `UIMessageChunk` parts; the host owns model
  credentials, the system prompt, skills, memory, every MCP connection, every approval decision, and
  message persistence.
- The Universal Agent Runtime (UAR) is a Rust/Axum server with its own agent loop, 300+ providers, skill
  selection, context compaction, RAG, AG-UI streaming and A2UI v0.9.1 surfaces. It ships a sidecar
  binary (`uar-sidecar`) that binds a random loopback port and prints `READY:{port}`.
- The mini skill pack's rules require everything to keep working when the Docker services
  (surreal-memory + SurrealDB, liter-llm) are down.
