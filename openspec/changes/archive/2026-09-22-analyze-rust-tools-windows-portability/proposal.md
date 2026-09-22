## Why

The full `prometheus-skill-pack` contains multiple Rust tools and service components whose Windows compatibility, runtime footprint, trust boundaries, and fit with the mini project's deliberately narrow architecture have not been assessed consistently. A repository-backed analysis is needed before any tool is ported, excluded, containerized, or treated as optional.

## What Changes

- Inventory Rust tools and Rust workspaces in `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack`, using manifests and reachable source rather than directory names alone.
- Assess each tool against Windows MSVC compatibility hazards, host-runtime requirements, service and port constraints, shell/Python dependencies, transport, resource footprint, security boundaries, and the mini project's existing capabilities.
- Classify each tool as a near-term move candidate, candidate after bounded Windows work, container-only candidate, guidance-only source, or exclusion.
- Identify overlaps with `tools/prometheus-knowledge`, the two permitted service capabilities, and Node implementations already present or planned in mini.
- Record evidence, blockers, estimated scope, recommended sequencing, and explicit non-candidates in repository-root `TOOL_ANALYSIS.md`.
- Do not modify, vendor, build, or port any full-pack tool as part of this change.

## Capabilities

### New Capabilities

None. This change produces a decision-support document and does not alter runtime behavior.

### Modified Capabilities

None.

## Impact

The only implementation artifact is `TOOL_ANALYSIS.md` in the mini repository root. The analysis reads the full pack's Rust manifests, source, service definitions, and relevant documentation, plus the mini project's constraints and existing implementation. It introduces no dependency, service, port, API, executable, or platform behavior change.