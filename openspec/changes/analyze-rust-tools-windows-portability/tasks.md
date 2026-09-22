## 1. Establish the canonical Rust product inventory

- [x] 1.1 Enumerate root workspaces, `tools/`, `substrate/`, binary targets, `skill-system.json` imports, and `shared/services.manifest.json`; record the deduplicated product list and grouping rationale in `TOOL_ANALYSIS.md`, and verify every in-scope first-party executable or service maps to exactly one matrix row.
- [x] 1.2 Separate imported repositories, generated distributions, worktrees, internal support crates, and non-Rust tools from the canonical inventory; verify each exclusion category and any independently reusable library are named explicitly in the document.

## 2. Inspect Windows portability evidence

- [x] 2.1 For each inventory product, inspect its workspace/package manifests, binary entry point, platform-specific modules, build scripts, and CI configuration for the hazard classes in `design.md`; verify every claimed blocker or positive signal cites a repository-relative source path.
- [x] 2.2 Trace shell, Python, installer, service-manager, and transport dependencies that are required to operate each Rust product; verify the matrix distinguishes a portable Rust binary from a non-portable installation or lifecycle path.
- [x] 2.3 Record existing Windows CI, release artifact, compile, and runtime evidence without upgrading inference to verification; verify every matrix row has a Windows-readiness rating and confidence level.

## 3. Assess mini-project compatibility

- [x] 3.1 Compare each product with mini's service limit, Node-owned capabilities, optional-`pk` rule, stdio-only scaffold rule, 16 GB budget, and no-Bash/no-Python constraints; verify every matrix row has a separate mini-fit assessment.
- [x] 3.2 Identify actual trust boundaries for tools that execute code, access files, hold provider keys, persist user knowledge, or expose network services; verify the document states required isolation or why the tool is excluded rather than adding silent hardening recommendations.
- [x] 3.3 Classify every product A–E using the rubric in `design.md`, with qualitative port scope and prerequisites; verify no unclassified product remains and no class C recommendation introduces a third permitted service capability.

## 4. Produce recommendations

- [x] 4.1 Write detailed candidate sections covering value, Windows work, mini adaptation, dependencies, runtime model, and acceptance evidence required before a later move; verify every A, B, and C row links to one detailed section.
- [x] 4.2 Write explicit non-candidate sections for D and E products, including reusable guidance or library patterns worth retaining; verify exclusions are based on observed architecture or source evidence rather than generic portability concerns.
- [x] 4.3 Add a prioritized sequence that distinguishes existing baseline, immediate documentation/scaffolding opportunities, bounded Windows-port candidates, container-only services, and deferred/excluded work; verify the sequence does not imply that this analysis itself moved or certified a tool.

## 5. Review and validate

- [x] 5.1 Reconcile `TOOL_ANALYSIS.md` against `README.md`, `openspec/config.yaml`, `.prometheus/decisions.md`, and `.prometheus/gotchas.md`; verify stale roadmap claims are labeled and current binding decisions take precedence.
- [x] 5.2 Perform a fresh-context adversarial review of the inventory completeness, source citations, Windows conclusions, service-limit compliance, and recommendation consistency; resolve valid findings in the document and preserve unresolved uncertainty explicitly.
- [x] 5.3 Run `node rules/build.mjs --check` and `npx --no-install openspec validate analyze-rust-tools-windows-portability --no-interactive`; verify both exit successfully and record that no Rust build or runtime certification was performed.
- [x] 5.4 Perform the completion self-check: confirm only planning artifacts and `TOOL_ANALYSIS.md` changed, no tool was copied or modified, no new dependency/service/port was introduced, and every recommendation remains inspectable and reversible.