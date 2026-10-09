# Proposal

## Why

The Boss currently bundles a published UAR from ba7233875f8df3b2add68fc487d364428432c07d, while retained current-UAR startup acceptance used an external binary. The integrated source needs an actual bundled local candidate with traceable build and archive identity.

## What Changes

- Reuse UAR's existing sidecar packager and The Boss's existing pinned local-UAR profile on native darwin-arm64.
- Set the isolated Boss local UAR source pin to the clean integrated UAR checkpoint; retain existing dependency authority and package validators.
- Produce a current-source binary, payload archive, file inventory and local Boss application bundle with one linked delivery receipt.
- Preserve the distinction between local bundled-current, external development override, published canonical artifacts and later release certification.

## Capabilities

### New Capabilities

- `local-uar-bundle-provenance`: A local Apple Silicon Boss bundle whose UAR payload is bound to the selected integrated source, actual build and archive.

### Modified Capabilities

None. Existing authorization/harness requirements and the public artifact intake contract remain intact.

## Impact

scope: isolated Boss `build/local-uar-source.json`; generated UAR `target/<target>/release` and `dist/boss-sidecar`; isolated Boss generated binaries/app outputs; phase evidence. Depend on bauar-int-01-scoped-source-intake. Reuse cand-004; cand-005/cand-006 are downstream/development references.

No validator rewrite, source relabeling of p1.19 archives, new packager, remote receiver, signing/Windows claim, public artifact URL, publication or shared release-branch mutation. Complete coherent source and pin changes before build/package execution; broader acceptance remains operator-deferred.

Evidence: [Analyze](../../../.kbd-orchestrator/phases/phase-bauar-release-integration-2026-10-09/analysis.md), existing `scripts/local-uar-payload.cjs`, `scripts/package-boss-sidecar.mjs` and packaging hooks inspected there.
