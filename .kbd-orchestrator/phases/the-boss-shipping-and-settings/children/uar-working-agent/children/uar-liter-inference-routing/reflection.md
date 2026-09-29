# Reflection — UAR liter inference routing

## Goal result

**Met for the observed Mac ARM64 inference failure.** A Boss-owned UAR agent can select a liter-llm served alias and execute it. The formerly failing existing `UAR Test` agent retained `source: gateway`, `modelId: kimi-for-coding` and returned `UAR_COMMITTED_OK` from the packaged app built from Boss commit `749a4cf4c4` and UAR commit `f7e0441e`. The local DMG path, size, checksum, build and installed result are recorded in [installed-mac-arm64.md](evidence/installed-mac-arm64.md).

**Not certified here:** Windows packaging, notarization, published installers, every model alias, API-key-backed legacy providers, nondefault UAR instances, and an actual MCP tool dispatch. The latter was statically reconciled after the boundary review found a name mismatch, but it still needs a future installed tool-use scenario. The current local DMG shares version 2.2.7 with an earlier published release but has different bytes and is not a public replacement.

## Delivered changes and decisions

- The Boss now offers explicit UAR execution source and model selection at agent creation and editing, stores it separately from its generic compatibility model, checks current gateway or bound UAR availability, and shows the effective route in new conversations. New labels are present in all current locales.
- UAR accepts a model-specific run-scoped context-window hint, preserves gateway alias spelling, avoids provider-specific request fields when a host gateway translates them, and gives MCP functions deterministic legal names.
- The Boss reads context limits from the complete pinned liter catalog, including catalog-only providers, and caps advertised hints to UAR's 2,000,000-token contract. Its tool admission and approval names now match UAR's mapping.
- OAuth-only Codex credentials are not treated as UAR API keys. An unusable inherited route requires the user to select an executable source; no OAuth token is copied into the UAR process.

## Quality and review

OpenSpec `uar-executable-model-assignment` was verified and archived after all six tasks were reconciled. One completed-boundary adversarial review found two contract defects; both were resolved in the code before the final committed-source Mac build. No unit, mock-only, per-edit, or partial gate was run. An earlier local build was superseded after the repository commit hook required a barrel import correction; the final build and installed reply are tied to the committed source.

Artifact-refiner logs were not produced for this child, so no artifact-refiner pass rate is claimed. The reviewer dispositions are in [review.md](review.md). `git diff --check` and the Boss repository's commit hooks completed; those are static and commit checks, not installed-runtime proof.

## Parent handoff

UAR PR [#314](https://github.com/Prometheus-AGS/universal-agent-runtime/pull/314) must land before Boss PR [#27](https://github.com/Prometheus-AGS/the-boss/pull/27) can package its sidecar dependency from a stable revision. The parent cadence should choose a fresh release version for the corrected Mac and Windows installers, then perform its customer-platform installed acceptance and website publication. It must not republish this local 2.2.7 DMG under the already published 2.2.7 URL without a new immutable release identity. An MCP tool-use scenario belongs at that completed release boundary.
