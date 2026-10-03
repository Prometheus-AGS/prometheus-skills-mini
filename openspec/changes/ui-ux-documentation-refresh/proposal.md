## Why

The UI/UX routing and team-adoption implementation is merged across the full pack, mini pack and The Boss, but entrypoint documentation and documentation sites do not yet explain the shipped workflows. The Boss README still presents upstream Cherry Studio branding instead of its existing official identity.

## What Changes

- Refresh each repository README and its relevant guides/navigation/generated documentation to describe the merged implementation accurately.
- Document routing, platform selection, safe project installation, team defaults, full/mini portability, packaged helpers and remaining acceptance gaps.
- Use The Boss's real checked-in logo and product branding in its README; preserve upstream attribution, licensing and technical identifiers.
- Validate locally after all documentation edits, then create one documentation-only PR per repository.

## Capabilities

### New Capabilities

None. This documentation-only change uses skip_specs: true.

### Modified Capabilities

None. Runtime behavior, dependency pins, installed product releases and platform certification are unchanged.

## Impact

README.md, docs and Docusaurus content/navigation in the full and mini packs; README.md, documentation source metadata and generated docs index in The Boss. Existing documentation generators remain authoritative. No new runtime, service or public API.
