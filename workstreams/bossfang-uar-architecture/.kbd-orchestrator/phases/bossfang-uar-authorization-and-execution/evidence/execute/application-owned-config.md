# Application-owned configuration decision and migration

Recorded 2026-10-06 for amended parent 04/5–7. The operator selected no remote receiver, identity provider or new credential custodian: “None. Remove all of the defaults there for now, since the application has them.” This is a product scope decision, not evidence about a deployed receiver.

| Surface | Disposition |
| --- | --- |
| UAR root mcp.json: Tavily HTTP preset | Removed in the isolated UAR worktree |
| UAR root mcp.json: Surreal Memory HTTP preset | Removed in the isolated UAR worktree |
| UAR root mcp.json: Kreuzberg stdio preset | Removed in the isolated UAR worktree |
| Explicit application server catalog and run grants | Existing authority retained; no API change in the defaults task |
| Developer .mcp.json | Separate tooling configuration; no edit |
| Application credential storage and sidecar custody | Existing application owners retained; no new vault, acquisition adapter, plaintext fallback or daemon selected |
| Independently configured remote receivers | Must enforce their own resource/identity boundary; no deployment certification from this phase |

The exact deletion and before/after hashes are in [default-removal-result.json](default-removal-result.json). The remaining shipped map is empty. Applications that relied on a removed preset must supply their existing explicit server configuration. Do not move a removed preset to a different automatic default. No application connection or stored credential was deleted or read by this task.

The source inventory in [boss-projection-prerequisites.md](boss-projection-prerequisites.md) distinguishes application MCP snapshots, transport OAuth/dynamic headers and sidecar-held credentials from finite per-run snapshots. This task neither replaces that custody nor claims that all those secret paths are certified. The UAR source remains at the accepted Rust baseline; its only product configuration delta here is mcp.json. Existing application behavior through the loader/catalog/grant APIs remains untested at this boundary and belongs to parent04/9–10. The configuration child explicitly contains those acceptance scenarios.

Parent04/5–6 are decision/inventory tasks. Their completion records this selected scope and source inventory only. Parent04/7 remains pending runtime acceptance; parent04/8 common authorization reconciliation and 04/9–10 gates are not discharged by empty configuration. D0 remains blocked and was not retried.
