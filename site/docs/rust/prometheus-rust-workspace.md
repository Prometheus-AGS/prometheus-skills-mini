---
title: Rust Workspace Guidance
sidebar_label: Rust Workspace
---

# Prometheus Rust Workspace

`skills/prometheus-rust-workspace/SKILL.md`: routes Rust and Cargo work to the minimum relevant
installed skills and enforces phase-gated, serialized Cargo verification. Use when working with
`.rs` files, `Cargo.toml`, `Cargo.lock`, compiler or Clippy diagnostics, Rust architecture, async
Rust, unsafe Rust, Rust MCP servers, or Rust reviews. **Do not** use it for non-Rust code or tasks
that do not touch a Cargo workspace.

## Guidance, never a dependency

Per this pack's own constraint (C7 in the original port analysis): Rust toolkit skills are guidance
and scaffolding only. Nothing in this pack requires a Rust toolchain or a Rust binary on the
Windows host — the two Rust services (`liter-llm`, `surreal-memory`) arrive as Docker containers,
never as something compiled on the host. Any MCP server this pack's skills scaffold is **stdio
only**, logs to stderr, and avoids unix-only APIs (`nix`, `libc`, unix sockets, `sh -c`).

## What this skill routes to

This house router is the mini's substitute for the full pack's much larger Rust skill family
(`mcp-server`, `rust-cli`, `workspace-structure`, `error-handling`, `async-patterns`,
`performance`, `actor-model`, `prometheus-rust-auditor`, `axum-patterns`). Per
`docs/skill-routing.md`, Rust-specific routing in this repo currently points at externally
installed skills (`rust-best-practices`, `rust-async-patterns`, `rust-mcp-server-generator`) rather
than re-vendoring a duplicate set inside this pack.

## Vendored Rust tools

Three Rust tools are vendored as git submodules under `tools/` and used strictly as build contexts
or optional CLIs — never as something a contributor compiles by hand as part of the normal
workflow:

- `tools/prometheus-knowledge` (`pk`) — see [Karpathy Progress Memory](/docs/karpathy/progress-memory).
- `tools/liter-llm` — see [Docker Services](/docs/services/docker-services).
- `tools/surreal-memory-server` — see [Docker Services](/docs/services/docker-services).

## See also

- [Windows Constraints](/docs/platform/windows-constraints) — the rules a scaffolded Rust MCP server must follow.
- [Docker Services](/docs/services/docker-services) — where the two Rust services actually run.
