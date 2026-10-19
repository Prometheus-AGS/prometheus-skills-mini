# Proposal

## Why

The Boss 2.2.39 ships older UAR, liter-llm, and mini skill pack revisions. The operator requests a 2.2.40 UAR-enabled customer release that also incorporates current Cherry Studio upstream while preserving The Boss behavior.

## What Changes

- Qualify UAR 1.1.1 with the GQAdonis liter-llm 2.3.0 fork, incorporating only evidenced release-blocking repairs from its dirty checkout.
- Advance the local mini checkout and The Boss's mini pointer; merge current Cherry Studio upstream into The Boss without dropping custom behavior.
- Freeze and publish UAR-enabled Mac ARM64 and Windows x64 2.2.40 installers from one source, then verify both downloads on the public landing site.
- Preserve historical release records and all unrelated local changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-release-profile`: bind the 2.2.40 customer release to the UAR-enabled profile and qualified sidecars.
- `native-desktop-publication`: define the two-target 2.2.40 native publication and frozen-source contract.
- `desktop-download-catalog`: require the current public catalog to expose the two verified 2.2.40 installers.

## Impact

The mini repository owns this cross-repository release contract and its local checkout update; UAR owns its liter-llm gitlink, version policy, lockfile, and qualification; The Boss owns upstream integration, release pins, packaging, and publication. No new public application API is planned.
