# Proposal

## Why
The operator authorized minor release 1.15.0 after installed-admission parity, Windows CI repair and the Zod security update merged. Package metadata is 1.14.0 while generated marketplace/plugin declarations remain 1.13.2.

## What Changes
Set package and distribution source versions to 1.15.0, regenerate both marketplaces and plugin manifests, update the current README heading, and add release notes. Preserve minimumActiveVersion, dependency pins and historical receipts.

## Capabilities
No requirement changes; skip_specs applies to release metadata and documentation.

## Impact
Release metadata, generated declarations and documentation only. Verify distribution parity, version alignment, npm audit and the pinned OpenSpec validator; independent review and complete CI must pass before merge. Tag the merged main commit v1.15.0 and publish a GitHub release with the reviewed notes. Follow the existing source-release convention (GitHub-generated source archives, no invented binaries or installers). No global installation or unrelated cleanup.
