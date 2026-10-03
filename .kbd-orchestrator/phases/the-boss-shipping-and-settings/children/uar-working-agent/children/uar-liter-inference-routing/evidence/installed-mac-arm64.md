# Installed Apple Silicon UAR inference receipt

Recorded 2026-09-28 in the isolated The Boss profile at `/tmp/the-boss-uar-inference-20260928`. This is a local delivery receipt, not a public release or Windows acceptance.

| Boundary | Observed result |
|---|---|
| Boss source | Committed source `749a4cf4c4958969f60b4ca7fe6c99fd123a0fa7`. The final local package was rebuilt after that commit. |
| UAR source | `f7e0441e4547ea94c583592504bf8a80870835bb`; the packaged `.uar-local-payload.json` and `payload-manifest.json` both record this commit. |
| UAR build | `cargo build --release --locked --no-default-features --features server-full --bin uar-sidecar --target aarch64-apple-darwin` exited 0. Seven unrelated compiler warnings remained. |
| Sidecar package | `node scripts/package-boss-sidecar.mjs darwin-arm64 aarch64-apple-darwin` packaged 12 files from the exact UAR commit. |
| Boss build | `pnpm build:mac:arm64` exited 0 with `THE_BOSS_LOCAL_UAR_SOURCE_DIR` set to the UAR worktree. Its validator accepted the local UAR payload and disk image; signing succeeded. Local notarization was disabled. |
| DMG | `/Users/gqadonis/.claude/worktrees/uar-liter-inference-routing/dist/The-Boss-2.2.7-mac-arm64.dmg`; 611,390,328 bytes; SHA-256 `ad10eb1deb2d51aeb2fd5deefda3e3ec53b60ec949ed4d5741d401358c8772d4`. This committed-source build supersedes the earlier local DMGs. |
| Installed app launch | The packaged `dist/mac-arm64/The Boss.app` launched with an isolated profile. Its packaged UAR sidecar listened on `127.0.0.1:1908`. |
| Gateway and model | The profile's direct liter-llm endpoint was restored to `http://127.0.0.1:4000`. The new conversation showed `kimi-for-coding | liter-llm`. |
| Real inference | A fresh `UAR Gateway Validation` conversation sent `Reply with exactly UAR_GATEWAY_OK.` and displayed the completed assistant reply `UAR_GATEWAY_OK`, with no error in the current view. |
| Existing-agent repair | The first `UAR Test` task on the prior build failed with `context requires 6037 tokens but the input allowance is 3733`. The pinned liter catalog contained `kimi-for-coding` at 1,048,576 tokens, but its provider was absent from the separate provider list. The final build reads the full catalog's limit. A fresh task under that same existing agent sent `Reply with exactly UAR_REPAIR_OK.` and displayed `UAR_REPAIR_OK` without an error. The stored assignment remained `source: gateway`, `modelId: kimi-for-coding`; the conversation displayed `kimi-for-coding | liter-llm`. |
| Committed-source launch and inference | After the final source commit, the rebuilt packaged app launched in the same isolated profile. Another fresh `UAR Test` task sent `Reply with exactly UAR_COMMITTED_OK.` and displayed `UAR_COMMITTED_OK` without an error. |
| Package validation | Final `pnpm build:mac:arm64` exited 0. Its validator mounted the DMG, verified the included app and helpers satisfy their macOS signing requirements, and reported `Validated darwin-arm64 installer and uar-enabled-local application image`. Notarization remained disabled for this local build. |

The failing installed gate first exposed UAR's 8,192-token fallback for the external alias, then a provider-specific `thinking` field rejected by liter-llm, then UUID-prefixed MCP function names rejected by the selected model. A temporary local gateway proxy recorded only model identity, tool names and top-level request fields; it forwarded the request to liter-llm without logging prompts or credentials. The proxy was stopped and the profile's original direct gateway endpoint restored before the successful run. Existing conversations from earlier sidecar versions returned stale-run HTTP 404; the accepted run used a new conversation.

The cumulative review found that The Boss's MCP admission and approval policy still computed its previous unbounded tool names after UAR began prefixing names and hashing long names. The Boss now mirrors UAR's exact provider-name mapping for claims, built-in policy lookup and managed-filesystem policy, while retaining the existing disabled-tool representation. It also caps advertised context hints at UAR's 2,000,000-token run-credential limit. These changes were compiled into the final package; an MCP tool call was not exercised in this inference gate.

This receipt proves Apple Silicon packaged-app inference for a new and an existing Boss-owned UAR agent through one liter alias. It does not establish a notarized DMG, a Windows build, an API-key-backed legacy provider, a nondefault UAR instance, every model alias, or release-site publication.
