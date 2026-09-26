# Task 5.3 Windows x64 release — acceptance pending

The Windows x64 UAR-enabled installer was rebuilt from The Boss `1cda4e55535b42dfab8f064d7bbc16d82e0807fa` after the UAR sidecar port and administration changes. It was uploaded directly to GitHub Releases, merged into release metadata and deployed to the public landing site.

- Build run: <https://github.com/Prometheus-AGS/the-boss/actions/runs/36238739959>
- Installer: <https://github.com/Prometheus-AGS/the-boss/releases/download/v2.2.3/The-Boss-2.2.3-win-x64-setup.exe>
- Size: `454356807` bytes
- SHA-256: `6688b21b33e51a1250c50b2ceb43b898f3375d8aed66b7fe8b12b8dc5056d5f1`
- Signing: unsigned
- Immutable record: <https://github.com/Prometheus-AGS/the-boss/releases/download/v2.2.3/release-platform-v2.2.3-uar-enabled-win32-x64-1cda4e55535b42dfab8f064d7bbc16d82e0807fa.json>
- Serialized repository publication: <https://github.com/Prometheus-AGS/the-boss/actions/runs/36240168378>
- The Boss publication commit: `19fc2a7ad658b30b18911e0d240c59c71e876e1e`
- Landing publication: <https://github.com/Know-Me-Tools/boss-landing-spot/actions/runs/36240211268>
- Landing commit after both customer platforms: `fb6201f3a20c2ff47617b20240f1950d2b6a0be6`
- Live site: <https://the-boss.know-me.tools>

The public asset followed GitHub redirects to HTTP 200 with the recorded content length. The deployed site bundle contains the exact Windows URL and checksum. The build packages UAR source `92620d40419d5b55af94e2aef0a0db886aa9aadc`, whose preferred-port contract starts at 1906 and advances one port at a time until it binds.

This task remains open because the plan requires operator-confirmed installed Windows acceptance. Publication and a successful installer build do not establish that the packaged sidecar launches on the operator's Windows machine.
