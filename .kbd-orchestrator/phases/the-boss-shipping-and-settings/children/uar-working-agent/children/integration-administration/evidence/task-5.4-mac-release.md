# Task 5.4 Apple Silicon release

The Apple Silicon UAR-enabled application was rebuilt locally and through the native release runner after the port-control changes. The local DMG mounted, its bundle signature was accepted, and the application launched its packaged UAR sidecar while another UAR process already occupied port 1906. The packaged sidecar advanced to 1907, proving the preferred-port fallback through the actual application package.

## Local installed gate

The local command was `pnpm build:mac:arm64:release:uar`. The base `build:mac:arm64` script disables UAR, so the release variant is the applicable form of the operator-requested local build for this UAR-enabled release.

- Source commit: `62d0db938b328ad48a113ba781b721cce981c440`
- Local DMG: `/Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar-consolidation/dist/The-Boss-2.2.3-mac-arm64.dmg`
- Size: `497414361` bytes
- SHA-256: `349b88f737f7be99304bc0855017dcce8c819799f95dea57b025d6d4c22e7d04`
- Image verification: passed
- Application signature assessment: accepted
- Installed Gate D-Mac: accepted
- Port conflict: unrelated UAR process retained `127.0.0.1:1906`; packaged UAR listened on `127.0.0.1:1907`
- Shutdown: application and packaged sidecar exited cleanly; image detached

## Native customer artifact and publication

- Build run: <https://github.com/Prometheus-AGS/the-boss/actions/runs/36238739959>
- DMG: <https://github.com/Prometheus-AGS/the-boss/releases/download/v2.2.3/The-Boss-2.2.3-mac-arm64.dmg>
- Size: `598433996` bytes
- SHA-256: `6bab9898d19b716996238be17abb31959d9fd4d72003f20f5124e55a95a91fb9`
- Signing: Developer ID, notarized
- Immutable record: <https://github.com/Prometheus-AGS/the-boss/releases/download/v2.2.3/release-platform-v2.2.3-uar-enabled-darwin-arm64-1cda4e55535b42dfab8f064d7bbc16d82e0807fa.json>
- Serialized repository publication: <https://github.com/Prometheus-AGS/the-boss/actions/runs/36240171262>
- The Boss publication commit: `19fc2a7ad658b30b18911e0d240c59c71e876e1e`
- Landing publication: <https://github.com/Know-Me-Tools/boss-landing-spot/actions/runs/36240281446>
- Landing commit: `fb6201f3a20c2ff47617b20240f1950d2b6a0be6`
- Live site: <https://the-boss.know-me.tools>

GitHub reports the exact recorded size and SHA-256 for the public asset. The deployed site bundle contains the exact Apple Silicon URL and checksum. Gate D-Mac therefore remains accepted for 2.2.3.
