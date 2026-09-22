## Context

See `proposal.md` for motivation. The source repository contains first-party workspaces, imported repositories, generated distributions, worktrees, and Rust embedded below both `tools/` and `substrate/`; a directory-only inventory would double-count or miss executable components. The mini project permits only two resident service capabilities, keeps `pk` optional, and otherwise treats Rust as guidance/scaffolding rather than a mandatory host runtime.

## Goals / Non-Goals

**Goals:**

- Produce a reproducible inventory of relevant Rust executables, libraries that directly enable them, and their service/runtime roles.
- Distinguish source evidence from inference and from claims verified by CI or target-specific compilation.
- Apply one consistent Windows and mini-fit rubric to every candidate.
- Recommend whether to move, adapt, containerize, mine for guidance, or exclude each tool.
- Make recommendations specific enough to seed later OpenSpec changes without performing those changes now.

**Non-Goals:**

- Building, cross-compiling, patching, vendoring, or running source-pack Rust tools.
- Adding a Rust toolchain, dependency, service, port, or installer to mini.
- Reassessing non-Rust skills except where they are required to operate a Rust tool.
- Treating a successful compile as proof of safe Windows runtime behavior.
- Recommending a third resident service contrary to mini's binding constraints.

## Decisions

### 1. Inventory executable products, not every crate independently

Start from workspace manifests, binary targets, service manifests, tool directories, and substrate packages. Group internal support crates under the user-facing executable or service they enable, while listing independently reusable libraries separately when they could support a mini scaffold.

**Alternative considered:** one row per `Cargo.toml`. Rejected because large workspaces would dominate the report with internal crates and obscure actual deployable capabilities.

### 2. Use a two-axis assessment

Each product receives both:

1. **Windows readiness** — observed CI/runtime support, likely bounded port, substantial platform rewrite, or inherently Unix-bound.
2. **Mini fit** — direct fit, optional CLI fit, permitted container service, guidance-only value, or architectural conflict.

A Windows-portable tool is not automatically a move candidate. Resident ports, HTTP daemons beyond the allowed two capabilities, Bash-dependent installers, and duplicate functionality remain exclusions even if the Rust compiles.

### 3. Require evidence by hazard class

Inspect manifests and reachable source for:

- `cfg(unix)`/`cfg(windows)` and unguarded `std::os::unix` APIs;
- `nix`, `libc`, Unix sockets, signals, permissions, symlinks, and process groups;
- `sh -c`, Bash launchers, Python helpers, executable-bit assumptions, and POSIX paths;
- hardcoded home/temp paths, path-separator parsing, CRLF handling, and `.exe`/PATHEXT behavior;
- transport and listening ports;
- filesystem writes, secrets, code execution, tenant or tool-execution boundaries;
- heavyweight dependencies and likely build/runtime footprint;
- existing Windows CI, target declarations, tests, and releases.

Source hits are leads, not conclusions: each blocker cited in the report must name the manifest or source path and explain reachability.

### 4. Use five recommendation classes

- **A — move/adapt now:** bounded work, no architectural conflict, and clear mini value. A product already present in mini that meets these criteria is recorded as **A (baseline satisfied)**; this means preserve the newer mini baseline rather than move the source-pack copy again.
- **B — candidate after Windows hardening:** valuable and compatible in principle, but needs target-specific source/test work.
- **C — container-only permitted service:** belongs only inside one of mini's two allowed service capabilities.
- **D — guidance/library extraction only:** useful patterns or crates, but moving the executable would add prohibited runtime surface or duplicate Node.
- **E — exclude:** conflicts with mini scope, requires a third service/port, is Unix-centric by design, or has insufficient value relative to cost.

The report will include confidence (`high`, `medium`, `low`) separately from class so uncertainty is visible.

### 5. Treat existing mini ownership as decisive

`tools/prometheus-knowledge` is already vendored and has observed Windows CI recorded in `.prometheus/decisions.md`; it is assessed as **A (baseline satisfied)** rather than a new import candidate. The qualifier records that the move criterion is already met and authorizes no additional copy or import. Node implementations already present or explicitly planned in mini are not replaced by Rust merely because a full-pack binary exists.

### 6. Deliver a decision matrix plus prioritized roadmap

`TOOL_ANALYSIS.md` will contain:

- scope and methodology;
- repository inventory and grouping rules;
- a table covering every identified product;
- detailed evidence for candidates and exclusions;
- trust-boundary and resource implications;
- recommended sequence and prerequisites;
- claims not verified by this analysis.

## Risks / Trade-offs

- **[Risk] Static inspection misses target-specific build-script or runtime failures.** → Mark compile/runtime claims unverified unless source-pack CI evidence exists; recommend Windows CI as a prerequisite before any move.
- **[Risk] Vendored imports and worktrees inflate or duplicate inventory.** → Derive canonical products from root workspaces, `tools/`, `substrate/`, `skill-system.json`, and `shared/services.manifest.json`; record exclusions and deduplication explicitly.
- **[Risk] A technically portable tool violates mini's service constraint.** → Keep Windows readiness and mini fit as separate axes; the latter governs recommendation class.
- **[Risk] Source patterns are falsely attributed to production paths.** → Trace each cited pattern to a binary target or reachable module and label uncertain reachability.
- **[Risk] Effort estimates appear more precise than evidence permits.** → Use qualitative bands with named work, not person-day estimates.
- **[Trade-off] No builds means faster, non-invasive analysis but lower confidence.** → The report becomes a candidate shortlist; each selected tool requires its own later build-and-runtime certification change.