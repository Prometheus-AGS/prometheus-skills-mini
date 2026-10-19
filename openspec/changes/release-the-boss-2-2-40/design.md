# Design

## Context

The Boss 2.2.39 pins mini `0c6b6e4`, UAR `d815ef72`, and liter-llm `a6047386`. Its release workflow already imports immutable UAR sidecar records, builds native installers, publishes GitHub assets, and dispatches the landing site. UAR 1.1.1 has an active qualification phase and a dirty checkout; its committed candidate alone has not passed acceptance. Mini has unrelated local knowledge files. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:** preserve all unrelated working-tree state, freeze exact revisions, disclose UAR's incomplete qualification, merge upstream without losing The Boss custom behavior, and publish two installer records and links verified against their actual bytes.

**Non-Goals:** redesign UAR or The Boss interfaces, change mini's operator-owned `versions.toml`, release additional desktop architectures, or rewrite historical release evidence.

## Decisions

- Fetch once at execution start, then freeze heads for this release. The observed heads are mini `cc690638247be95f17f3005f5c67af6b460b0b8f`, liter-llm `31c7e63236aa96914fccae2a5c25c4cda9ffa430` (2.3.0), and Cherry Studio `c23030449e999e4c8b72f7b9c5a7de526fb4ce68`. This avoids a moving release target.
- Fast-forward mini in place because its dirty knowledge files do not overlap the incoming commit set; never reset or clean it. Build UAR and The Boss in isolated worktrees to preserve their active checkouts.
- Base UAR on the committed 1.1.1 candidate, inspect qualification reports, and carry over only evidenced release-blocking source and fixture changes. The operator expressly authorized updating UAR's protected liter version pin and gitlink together. Keep Cargo.lock and provenance/catalog inputs consistent with 2.3.0.
- Merge upstream into an isolated Boss branch. For shared behavior retain Boss integration, branding, and release semantics; incorporate upstream changes where compatible. Review the full conflict resolution against the pre-merge Boss source before promoting it.
- Reuse the existing native payload and release workflows. Freeze 2.2.40 with UAR sidecar records, mini gitlink, and liter source revision; the coordinator and landing receiver publish only verified platform records.
- The operator explicitly directed release of UAR 1.1.1 despite its NOT READY qualification gate. Native compilation and payload checks establish artifact identity, not UAR behavioral acceptance. Release notes and manifests must not call the sidecar qualified.

## Risks / Trade-offs

- UAR 1.1.1 has incomplete local and published-architecture acceptance, including the parent query-time embedding-space mismatch proof because no second credentialed provider is available. The operator accepts this distribution risk; preserve the gap in release evidence.
- Upstream has diverged substantially from The Boss → isolate the merge and explicitly compare custom behavior and packaging before release.
- Mac signing or notarization credentials may be unavailable → retain the workflow's required default and stop publication if its preflight fails.

## Migration Plan

1. Record this contract, fast-forward mini, and assemble/commit the scoped UAR source in isolation with the unqualified status disclosed.
2. Publish immutable UAR sidecar records, merge upstream in Boss isolation, and freeze Boss 2.2.40 sources and integration payload.
3. Build and inspect the native installers, publish through the serialized coordinator, and verify both public assets and landing links.
4. If a gate fails, retain the last published 2.2.39 release while repairing only the failed gate; do not advertise partial 2.2.40 completion.
