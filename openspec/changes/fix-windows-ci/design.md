# Design

## Context
See proposal.md. Work occurs in an isolated worktree from main 993a633. The original checkout's 18 modified files are preserved with a SHA-256 snapshot outside the repo. Baseline Windows logs are the reproduction, not a claimed local Windows run.

## Goals / Non-Goals
Restore successful Windows CI without weakening its matrix or skipping affected integration tests. Do not change runtime APIs, canonical state, dependency pins or unrelated phases.

## Decisions
- Node's Windows recursive mkdir returns a namespaced path (node_file.cc calls ToNamespacedPath). Convert the walking path to the same representation before comparing; preserve the existing permission and ownership boundary. Do not increase timeouts to mask the loop.
- Windows fd 0 is a FIFO, not a POSIX socket. Use the existing async idle/byte-bounded reader for Windows FIFOs; synchronous reads of these handles discard payloads in the baseline. POSIX FIFOs and regular files retain EOF reads.
- Hash expectations use the actual git common directory's canonical path, not a canonical parent plus a basename. Retain the assertion that both real worktrees share an identity. Add path diagnostics to assertion failures if needed; no production identity change without evidence.
- Existing full-path generator and hook tests remain the regression checks. Add a closed regular-file input case, preserve open/closed/empty stream cases, and regenerate distribution before the final boundary.

## Risks / Trade-offs
Windows pipe payloads now share the socket's 500 ms idle and 16 MiB bound. Local macOS results cannot certify Windows: both hosted Windows jobs must pass. Newly exposed later CI step failures remain in this repair's scope if required for green Windows CI.

## Migration Plan
No data migration. Ship regenerated packages with the repair. Rollback is a normal revert. All production wiring and packaging complete before running acceptance checks; failed gates alone are rerun after repairs.
