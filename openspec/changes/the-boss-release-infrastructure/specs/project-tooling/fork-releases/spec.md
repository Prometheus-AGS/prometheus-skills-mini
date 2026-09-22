## ADDED Requirements

### Requirement: Every Rust artifact covers the five targets the-boss ships
`the-boss` builds `electron-builder --win --x64 --arm64` plus macOS and Linux. A Rust tool it
bundles SHALL publish artifacts for FIVE targets: `x86_64-pc-windows-msvc`,
`aarch64-pc-windows-msvc`, `x86_64-apple-darwin`, `aarch64-apple-darwin` and
`x86_64-unknown-linux-gnu`. A missing target means that build of the-boss has no artifact to
download.

(Earlier drafts said “five targets” while listing five targets. Five is correct — two
Windows, two macOS, one Linux — and any other change that says four is wrong.)

Windows-on-ARM SHALL be built on a native `windows-11-arm` runner, not cross-compiled from x64.

#### Scenario: An arm64 Windows artifact exists
- **WHEN** a release of `compass` or `rust-mcp-filesystem` is published
- **THEN** its assets include an `aarch64-pc-windows-msvc` archive alongside the x64 one

#### Scenario: A release missing a target is not usable
- **WHEN** a release omits one of the five targets
- **THEN** it does not satisfy this requirement, and `the-boss-binary-shipping` may not pin it

### Requirement: Each release archive carries a verifiable digest
Every published archive SHALL be accompanied by a SHA-256 the consumer can verify, because
`the-boss`'s `download-binaries.js` requires a `sha256` per package entry. `compass-release.yml`
already emits a `.sha256` sidecar per archive; any workflow this change creates SHALL do the same.

#### Scenario: The digest verifies
- **WHEN** an archive and its digest are downloaded
- **THEN** the computed SHA-256 equals the published one

### Requirement: sycophancy-correction gains release CI before it is pinned
`Know-Me-Tools/sycophancy-correction-skill` has no `.github/workflows` and no releases. It SHALL
gain a release workflow producing the same five-target matrix with digests, and the four Windows
blockers recorded in change `sycophancy-correction-vendored` SHALL be fixed in the same effort,
before any other change pins it.

#### Scenario: The gateway default is corrected before release
- **WHEN** the released build's `skill.toml` and `config.rs` are read
- **THEN** both name `http://localhost:4000/v1`, not `:8181` — the mini has exactly one gateway

#### Scenario: A release exists before a pin is attempted
- **WHEN** `mini-vendor-submodules` task 2.4 runs
- **THEN** `gh release list` for that repository is non-empty, or the task correctly refuses to pin

### Requirement: Releases are operator-authorized
An agent MAY prepare branches, workflows and pull requests. Tagging a release, merging to a
default branch, and running a publish workflow SHALL be done by the operator (A-11). The change
records what was prepared and what awaits authorization.

#### Scenario: A prepared release waits
- **WHEN** the workflow and fixes are ready but not yet tagged
- **THEN** the change reports the exact command the operator runs, and does not run it
