# Design

## Context

See proposal.md for motivation. The canonical p1.19 UAR source remains ba7233875f8df3b2add68fc487d364428432c07d. The existing Boss local pin is 48bc45b59d02d4febf4ed36e352af367fef73049. Neither identifies a new intake checkpoint. Existing source inspection established a native Apple Silicon local profile with exact source/archive/file checks, while public CI forbids local selection.

## Goals / Non-Goals

**Goals:** one actual current-source darwin-arm64 sidecar archive and one local unsigned Boss directory bundle with a linked receipt.

**Non-Goals:** public artifact publishing, signed DMG/installed validation, Windows/Intel claims, new pipeline, validator rewrites, external binary substitution, test-only feature selection or dependency upgrades.

## Decisions

1. **Reuse cand-004, not a new packager.** Build the isolated UAR checkpoint with `--locked --release --target aarch64-apple-darwin --bin uar-sidecar --features server-full`. Do not enable test-probes or bauar-native-admission-gate. Record actual default/explicit feature resolution and use `UAR_SIDECAR_FEATURES=server-full` for the existing Node sidecar packager. The same target output supplies its expected binary; do not copy an old acceptance binary into that directory.
2. **Finalize source wiring before builds.** Change 01 supplies clean source checkpoints. Change 02 updates only isolated Boss `build/local-uar-source.json` revision to the actual UAR checkpoint and records its new Boss commit, preserving repository/platform/version. No source SHA is invented at Spec. Complete all source/pin production changes before Cargo or Electron builds.
3. **Use the existing directory packaging boundary.** UAR `scripts/package-boss-sidecar.mjs` emits archive/record/file manifest. Boss `scripts/prepare-local-uar-payload.cjs` checks it; `before-pack.js` stages and verifies it, and `after-pack.js` inspects the actual packaged payload and performs its existing launch-refusal probe. Use electron-builder `--mac --arm64 --dir --publish never` with localUAR enabled and the clean candidate source directory. Do not run `build:mac:arm64` blindly: its current tail invokes signed-DMG validation, a different boundary.
4. **Do not weaken validation.** `local-uar-payload.cjs`, `uar-payload-integrity.cjs`, release-profile and public import remain unchanged. Native local mode, clean exact checkout, matching archive SHA and full inventory are existing requirements. Production hooks are inseparable from bundle assembly; their receipts do not substitute for later startup/approval acceptance.
5. **Keep public/source authority separate.** Preserve `integration-sources.json`, `integration-artifacts.json`, versions.toml, dependency gitlinks and public URLs. Receipt source/build/profile values describe the real candidate only. cand-005 remains the later public four-platform route; cand-006 remains external development evidence.
6. **Receipt format links the chain.** Phase `local-delivery.json` schemaVersion 1 includes source-intake receipt digest; UAR and final Boss commits; platform/features/lockfile/dependency authority; actual command argv/cwd/tool versions; output binary/archive/file-manifest SHA256; packaged app path and bundled payload digest/source marker; hook results; status per production/build/package/runtime/certification/publication; exclusions and downstream deferred work. Never store tokens, keys, credentials or private application state.

## Scope and ordering

Change 02 depends on all three change01 checkpoints. Product edit scope is only `build/local-uar-source.json` in the isolated Boss candidate. Generated outputs are isolated UAR `target/aarch64-apple-darwin/release`, `dist/boss-sidecar`, and isolated Boss `out`, `dist`, `resources/binaries/darwin-arm64`. Coordinate build writer ownership; leave accepted source caches intact. Cargo target path must match the existing packager expectation; do not make a target-path relocation without an observed need.

Exact Plan-assigned roots/output paths are recorded before builds. Use Node 22 for orchestration and argv-array spawning, no authored shell/Python scripts or forbidden tool pipelines. Only candidate-owned generated files may be replaced. Use the existing package manager/pinned dependencies; no installation/pin change is authorized by this Spec.

## Risks / Trade-offs

[Local mode is platform limited] → label the delivery local/darwin-arm64; preserve public-mode rejection.
[The sidecar packager labels an already-built binary] → bind the actual build and lockfile to its binary digest before archive generation.
[Existing full-feature compilation can be expensive] → serialize shared outputs, preserve caches and run the needed build once after all production changes; fix only observed failures.
[Directory package lacks installed/signing acceptance] → record that limitation; keep signed-DMG validator out of this local delivery.
[Runtime integration is not yet tested on the new bundle] → retain pending/deferred status rather than reopen broad checks as a production blocker.

## Migration Plan

After source intake and local-pin checkpoint, produce the real UAR binary/archive, assemble Boss with all existing hooks, and write the linked local delivery/handoff. No external path override is used to claim bundled identity. Superseding a candidate retains its prior receipts/checkpoints; rollback reselects them without changing primary branches or public manifests. Runtime negative controls and broader acceptance are defined in verification.md for the later completed-delivery boundary, not run during production edits.

## Analyze candidate evidence retained by Plan

Reuse the selected candidates below; this is evidence from Analyze, not a new runtime verification. Exact candidate IDs map to the plan's library annotations.

### cand-004: Existing local-UAR pinned Apple Silicon packaging profile

Verdict: adapt. Gap: bundled-current-uar-provenance. Reuse existing validated-profile implementation, update only approved checkpoint/payload selection after source intake;do not rewrite validators.

- Tier 1: Boss scripts/local-uar-payload.cjs:39, before-pack.js:197, after-pack.js:10 and uar-payload-integrity.cjs:89 provide exact source/archive/file checks;local pin48bc45 still needs current checkpoint.
- Tier 2: Upstream hook/file-copy concepts support retaining existing packaging wiring;Boss pins26.15.6. [Primary source](https://github.com/electron-userland/electron-builder/blob/master/website/docs/features/hooks.md).

Risks: Native darwin-arm64 only;forbidden in release CI. UAR packaging script labels an already-built binary;build provenance must be recorded. Current-source package not built here.
