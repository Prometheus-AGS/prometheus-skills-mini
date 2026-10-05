# Mini service operations

The canonical mini operations page is
[Services and recovery](../site/docs/services/docker-services.md), published at
`/docs/services/docker-services` in the mini site.

Mini ships three Compose containers for optional memory/database and model
gateway capabilities. It can discover an existing full installation without
taking over its services. Local skills and team files remain usable without
either stack. Full native knowledge/execution/learning services and Companion's
optional connected control are separate installations.

The mini repository owns the Compose configuration and lifecycle wrapper;
surreal-memory-server owns memory service behavior, liter-llm owns gateway
behavior, and the full pack owns its native installers and Rust tools. Mini
does not install Rust, native harnesses or global services by copying skills
or discovering an endpoint. Assign each running service one explicit lifecycle
owner. See the canonical page's [ownership table](../site/docs/services/docker-services.md#select-a-service-owner).

Use the canonical page for repository ownership, exact interfaces, selected
dataset, credentials, lifecycle, image pinning and recovery. Full native memory
uses `memory/mcp`; mini Compose defaults to `memory/main_local_384`. Treat a
service-owner change as an explicit data selection, not automatic migration.

Release proof records actual approved source/image identities and real
functional operations. Discovery markers, a registered service, an open port
or a successful build alone do not prove a usable release.

Companion's recovered source describes a separate same-user Unix host and
stdio sync client, not a fourth mini Compose container. Choose one socket owner
and preserve its enrolled key, socket/config/data selections, pre-POST MCP
intent outbox and receipts. Its optional Claude registration and macOS service
installer belong to Companion. No public remote or certified Companion release
exists yet; consult that checkout's `docs/installation.md` and
`docs/control-api.md` before any approved deployment.
