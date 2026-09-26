# Goals — the-boss-shipping-and-settings › uar-working-agent › non-uar-customer-release

- Feature-gate UAR completely out of the customer release while preserving a reversible path to re-enable it.
- Build and publish working Windows x64, Windows ARM64, macOS Apple Silicon, and macOS Intel installers; publish no Linux artifacts in this release.
- Publish immutable GitHub Release downloads and update `the-boss.know-me.tools` for every completed platform.
- Return a verified release handoff to `integration-administration` before the UAR sidecar repair child begins.
