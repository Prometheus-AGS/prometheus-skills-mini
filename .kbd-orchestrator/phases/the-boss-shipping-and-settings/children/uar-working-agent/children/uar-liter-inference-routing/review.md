# Completed-boundary review — UAR liter inference

One cumulative review was performed after the first installed Mac inference result. No unit suite or intermediate review loop was run.

| Finding | Impact | Disposition |
|---|---|---|
| UAR began prefixing provider tool names that start with a nonletter and hashing names longer than 64 characters, while The Boss admission claim and approval policy still used the older sanitizer. | A model-visible MCP call could fail its host admission claim; deny or filesystem policy matching could disagree with the name UAR exposed. | Resolved in The Boss by mirroring UAR's exact server/tool wire-name mapping in admission, built-in policy, managed filesystem policy, and existing disabled-tool conversion. This maps the actual trust boundary, not merely the UI label. The final inference gate did not exercise an MCP tool call, so that path remains installed-runtime unverified. |
| The Boss could forward context-window hints larger than UAR's 2,000,000-token run-credential limit. | Selectable aliases backed by larger catalog windows would fail run admission before inference. | Resolved by capping Boss and liter catalog hints to UAR's accepted limit. The installed `kimi-for-coding` run exercised a 1,048,576-token catalog window; aliases above the cap were not individually run. |

The installed retry on the existing `UAR Test` agent also found a catalog projection gap outside the review packet: the complete liter catalog included the model, but its provider was absent from `providers.json`. The lookup now reads the full catalog. The final local packaged app returned `UAR_REPAIR_OK` from that agent through the configured liter gateway.

Evidence and limits are in [installed-mac-arm64.md](evidence/installed-mac-arm64.md). This review does not certify Windows packaging, all models, or MCP tool execution.
