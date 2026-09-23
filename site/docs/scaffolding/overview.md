---
title: Scaffolding
sidebar_label: Overview
---

# Scaffolding

Five skills that turn a refined artifact into a buildable project, or layer an agent-UI host onto
one.

| Skill | Description |
|---|---|
| `scaffold-react-vite` | Convert a refined React TSX artifact into a buildable Vite 8 + React 19 + TypeScript + Tailwind v4 + shadcn-on-Base-UI project with kebab-case file names and feature-based clean architecture. Optionally wrap the project in a self-contained Rust + Axum binary that embeds the `dist` via `rust-embed` and serves the SPA from a single executable. |
| `scaffold-react-vite-a2ui` | Layer an A2UI rendering host onto a scaffolded Vite/React project. Adds a zustand store that reduces the A2UI message stream into surface state, a hook and component that render it via the upstream `@a2ui/react` renderer, and a mock message source so the app runs without an agent. The mock source is development-only; production needs a real message transport. |
| `scaffold-react-vite-agui` | Layer an AG-UI agent host onto a scaffolded Vite/React project. Adds a zustand store that consumes the AG-UI event stream, a hook and panel that render it, and a Vite dev-server SSE endpoint backed by a mock agent. The mock endpoint is development-only; production needs a real backend implementing the same contract. |
| `scaffold-react-vite-tauri` | Wrap a scaffolded Vite/React project in a Tauri 2 shell. Tauri 2 supports desktop (macOS/Windows/Linux) + mobile (iOS + Android) from the same source. The Vite dist is served by Tauri's WebView; the React app's responsive primitives (`useBreakpoint`, `ResponsiveShell`) drive form-factor switching automatically. |
| `scaffold-flutter-a2ui` | Layer an A2UI rendering host onto a Flutter project, with a parity test asserting the same output as the web and MCP-UI hosts. Use for mobile agent UI, cross-platform A2UI rendering, or Flutter surfaces driven by agent output. |

These are guidance/scaffolding skills — they generate project structure and code, and the actual
scaffolders run via Node tooling per this pack's own constitution (no shell-script scaffolders).

## See also

- [Artifact Refinement](/docs/artifact-refinement/overview) — the upstream step that produces the TSX artifact these skills scaffold.
- [Rust Workspace Guidance](/docs/rust/prometheus-rust-workspace) — the Rust-toolkit guidance that `scaffold-react-vite`'s optional Axum wrapper draws on.
