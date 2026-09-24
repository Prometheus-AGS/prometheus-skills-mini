# Analysis — integration-administration

Inputs: assessment.md (review round 2 PASS), parent spec, pinned versions and explicit dual customer-platform requirement. Stack is already specified: Electron/TypeScript, Node mini, existing Rust components. No greenfield stack recommendation is needed. The candidate ledger contains nine evaluated reuse choices and three application-specific build areas.

## Research performed

Tier 1: local source inspection and GitHub fork metadata/repository/README/source queries. Tier 2: Context7 confirmed SurrealDB SDK remote/embedded contract; TOML lookup did not resolve the exact JS package and returned general Rust TOML docs, which are NOT evidence of comment preservation. Tier 3: npm metadata for smol-toml and toml-edit-js. Tier 4: operator-requested Firecrawl searches found official Docker networking/Compose docs and upstream liter-llm proxy/watch documentation; package claims were checked against its own GitHub README/source instead of third-party search hits. Research stayed under eight queries per tier and twenty minutes.

## Decisions and corrections to provisional plan

1. Reuse UAR persistence and exact SurrealDB 3.2.4 SDK; add scoped auth and selected-profile launch. No database technology replacement. Config apply remains explicit and restores previous profile on failed restart.
2. Compass check-update is rejected for source drift: it checks a marker only. Adapt doctor’s detect/Manifest/BuildGuard path into structured freshness with explicit app-owned output. Reuse inclusion/config identity and compare content on user-requested checks, including new/deleted source files; legacy manifest cannot prove current configuration and should report unknown until indexed.
3. Reuse existing Boss operation lifecycle; add durable log/state plus typed events. No queue daemon or UI-only operation truth.
4. Full pack's actual launch templates identify SurrealDB at loopback 28000 and memory at 23001; metadata paths include shared/services.manifest.json and installed ai.prometheus.* plist/unit files. Gateway launcher selects ~/.config/liter-llm/liter-llm-proxy.toml and loads private credentials separately. Discovery reads only endpoint/ownership fields and leaves secrets to explicit protected credential input/import. It never treats legacy template credentials as defaults.
5. Mixed topology needs a generated Compose subset: current depends_on and hardwired surrealdb hostname are wrong for external DB. Docker Desktop container clients use host.docker.internal when the selected endpoint is on the host; host-side UAR and Compass keep their host endpoint. Endpoint reachability must be checked from the relevant network context. Never rebind an existing host DB or take over its lifecycle. If its bind/firewall makes it unreachable from Docker, explain the needed owner action or select existing native memory; no false success.
6. Existing full-pack liter launcher does not pass --watch, so save must show restart-required when it cannot prove application. Do not silently restart it. Use provider and model catalog JSON plus live aliases.
7. Existing smol-toml handles reading but cannot preserve the external document. Adopt pinned toml-edit-js WASM for individual-path edits; source supports arrays of tables. Packaging/WASM behavior remains unverified until completed integration, explicitly part of Gate C. No hand-written TOML parser.
8. liter-llm currently has no standalone config validation command. Add a small nonstarting config-check command calling its existing ProxyConfig parser, and package its native CLI via the existing binary manager for BOTH Windows x64 and Apple Silicon. Managed images use the same source. Parser errors must not echo secrets or raw TOML. This closes an implementation dependency absent from the provisional plan.
9. Preserve feature boundaries and generated outputs. Renderer and main have 13 locale catalogs each; existing strings can be reused, all new statuses/navigation/errors require complete translations. New document fields live in existing preference storage; SQL migration only if an actual table changes.

## Sources

- SurrealDB: https://github.com/surrealdb/docs.surrealdb.com/blob/main/src/content/index/languages/rust.mdx
- Docker: https://docs.docker.com/desktop/features/networking/networking-how-tos/ and https://docs.docker.com/reference/cli/docker/compose/up/
- liter-llm: https://github.com/kreuzberg-dev/liter-llm/blob/3b426cb0d11d854d74689d6b7fa0f670231779f5/docs-site/src/content/docs/server/proxy-server.mdx (search index); live GitHub fork metadata names xberg-io/liter-llm as parent, to resolve/freeze on fetch before merging.
- TOML editors: https://github.com/squirrelchat/smol-toml and https://github.com/rainbowatcher/toml-edit-js
- Repository evidence: library-candidates.json cites exact local source paths; sources-receipt.json records inspected commits.

## Residual uncertainty and integration boundary

Exact full-pack-specific sidecar failure remains unproven. Real configured launch, service discovery and mixed container networking are integration evidence, not documentation assertions. New external config changes are explicit, backed up and revision checked. A remote gateway with no config-write interface supports inference plus deployment export; do not claim a remote apply. No secret values or private service config are in research artifacts.

## Release and process

Windows x64 and Mac Apple Silicon are equally essential. Build on independent native runners, publish each successful customer artifact immediately, and do not let lower-priority platforms block either. Keep overall goal and reflection prerequisites pending until completed implementation, evidence and installed acceptance. Assess/analyze/plan/execute/reflect must all have actual stage records, hooks and handoffs.
