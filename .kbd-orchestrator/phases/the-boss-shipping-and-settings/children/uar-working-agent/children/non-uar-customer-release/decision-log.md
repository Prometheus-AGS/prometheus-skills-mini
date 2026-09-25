# Decision log — non-uar-customer-release

## D-001 · Release UAR exclusion is a build capability, not a user preference

**Stage:** analyze  
**Date:** 2026-09-25

The release uses one immutable build capability consumed by application bundles and packaging scripts. Persisted UAR data remains readable, while new selection, execution, administration, provisioning, and payload inclusion are disabled.

## D-002 · Release version is 2.2.1

**Stage:** analyze  
**Date:** 2026-09-25

`v2.2.0` is already a published immutable GitHub Release. The first available patch release is `2.2.1`.

## D-003 · Four desktop targets, no Linux carry-forward

**Stage:** analyze  
**Date:** 2026-09-25

The release targets Windows x64, Windows ARM64, macOS Apple Silicon, and macOS Intel. The landing site removes inherited Linux downloads for this release.

## D-004 · Native installer builds are the integration gate

**Stage:** analyze  
**Date:** 2026-09-25

Production code is completed first. The final gate is the local Apple Silicon build plus all four native installer jobs, installed-image/package validators, GitHub asset verification, and live site link verification.

## D-005 · Parent restoration requires a release receipt

**Stage:** analyze  
**Date:** 2026-09-25

The child exits only after one structured receipt binds the source commit to all four published assets and the deployed landing page. The parent resumes at `integration-administration` task 4.5 before the UAR repair child starts.
