# Delivery assumptions

The grill-me/grilling decision frontier is already settled by the operator's approved A1 plan and subsequent instructions. No new architecture or publication permission is inferred.

- Target client: The Boss's installed SDK 1.27.1 requests 2025-11-25; directly checked in its installed sources.
- SDK choice: operator explicitly requested rmcp 3.4.0; registry metadata, tagged changelog, pinned source and full-workspace compilation confirm the version is usable here.
- Compatibility scope: three legacy revisions plus retained 2026-07-28 discovery; actual protocol tests exercise this boundary.
- HTTP boundary: authentication/host checks remain; malformed present headers cannot masquerade as absence. Legacy session count remains uncapped, with SDK inactivity expiry; documented.
- Rust instructions: operator explicitly scoped both instruction files to integration repositories and active worktrees. All 30 paths verified.
- Unrelated golden failures: operator instructed leaving these alone; fixture files unchanged.
- Delivery: A1 permits push, PR and merge on green CI. Tagging and publish workflows need separate authorization and are outside this work.
- Windows: no native Windows execution has occurred locally; native CI is the evidence gate. A2 release/bundling remains deferred.

No permission question is required: these decisions were already explicitly supplied. Remaining unknowns are execution evidence, not user preferences.
