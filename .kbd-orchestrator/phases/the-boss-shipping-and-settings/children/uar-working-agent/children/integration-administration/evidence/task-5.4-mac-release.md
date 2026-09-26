# Task 5.4 Apple Silicon release

The Apple Silicon UAR-enabled application was built locally and through the native release runner. The local DMG mounted, its application signature was accepted, and installed Gate D-Mac exercised the packaged UAR sidecar and all twelve administration panels. The notarized customer DMG was then uploaded directly to GitHub Releases, merged into repository and landing metadata, and deployed through the connected Lovable project.

## Local installed gate

The local command was `pnpm build:mac:arm64:release:uar`. The base `build:mac:arm64` script disables UAR, so the release variant is the applicable form of the operator-requested local build for this UAR-enabled release.

- Local DMG: `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar-consolidation/dist/The-Boss-2.2.2-mac-arm64.dmg`
- Size: `497428180` bytes
- SHA-256: `71ddc127894c09e3375da35684bd068a0a9d965dc71c4026f82908a37d6a1132`
- Image verification: passed
- Application signature assessment: accepted
- Installed Gate D-Mac: accepted
- UAR: version `1.0.0`; 12/12 administration panels rendered; 0 unavailable adapters; authority and owner isolation operational

## Native customer artifact and publication

- Build run: <https://github.com/Prometheus-AGS/the-boss/actions/runs/36230158747>
- DMG: <https://github.com/Prometheus-AGS/the-boss/releases/download/v2.2.2/The-Boss-2.2.2-mac-arm64.dmg>
- Size: `598413475` bytes
- SHA-256: `c2cf4d6bc0c4d87178eb82beecbf8d8f69cff191e97ec0ac8834ceaa0ce93d0b`
- Signing: Developer ID, notarized
- Immutable record: <https://github.com/Prometheus-AGS/the-boss/releases/download/v2.2.2/release-platform-v2.2.2-uar-enabled-darwin-arm64-6bed52493bd3b2e097318b18cd9c11e259aa8799.json>
- Serialized repository publication: <https://github.com/Prometheus-AGS/the-boss/actions/runs/36231565511>
- Repository commit: `4c55a198352fed379b24d8548206c56b86ea8839`
- Landing publication: <https://github.com/Know-Me-Tools/boss-landing-spot/actions/runs/36231619715>
- Landing commit: `51a88ea9be550f87c1f6196d84314b9a2ea8c910`
- Live site: <https://the-boss.know-me.tools>

Independent public verification streamed all `598413475` bytes and computed the expected SHA-256. The live site serves the exact GitHub Release URL and its deployed bundle contains the final Apple Silicon and Windows x64 checksums.
