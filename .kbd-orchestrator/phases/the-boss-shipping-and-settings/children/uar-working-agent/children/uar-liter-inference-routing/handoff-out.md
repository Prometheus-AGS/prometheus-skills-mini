# Child handoff — UAR liter inference routing

The observed UAR agent failure is fixed for the installed Mac ARM64 liter-llm path. Source is pushed as [UAR PR #314](https://github.com/Prometheus-AGS/universal-agent-runtime/pull/314) and [Boss PR #27](https://github.com/Prometheus-AGS/the-boss/pull/27). The OpenSpec change is verified and archived. The local committed-source DMG is `/Users/gqadonis/.claude/worktrees/uar-liter-inference-routing/dist/The-Boss-2.2.7-mac-arm64.dmg`, SHA-256 `ad10eb1deb2d51aeb2fd5deefda3e3ec53b60ec949ed4d5741d401358c8772d4`; it is not published or notarized.

The parent should merge UAR before Boss, assign a new release version, build and install on Windows x64 and Mac ARM64, exercise a real MCP tool call, and publish through the cadence release boundary. See [reflection.md](reflection.md) for the precise proof and limitations.
