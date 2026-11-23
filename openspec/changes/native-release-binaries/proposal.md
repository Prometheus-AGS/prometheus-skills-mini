## Why

Mini's KBD and knowledge commands need native executables. A Mini release currently offers no version-bound binaries to users without Rust.

## What Changes

Produce the four pinned executables for six native targets. Pin the shared CLI to its compatible Full revision. Install an exact Mini version and target from its GitHub Release, with checksum verification and a locked source fallback. Preserve optional Compose and portable skills-only installations.

## Impact

The release workflow owns release assets and immutable version tags on main. GitHub Actions performs release production. Local process-level checks exercise installation, scope detection and refusal of corrupt assets.
