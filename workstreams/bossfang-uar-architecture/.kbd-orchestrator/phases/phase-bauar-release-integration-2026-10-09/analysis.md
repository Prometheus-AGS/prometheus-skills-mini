# Analyze — phase-bauar-release-integration-2026-10-09

Date: 2026-10-09. Mode: stack specified. Boundary: Analyze only; stop for operator review before Spec. Recommendations below do not approve release branches, product mutations, publication or certification.

## Recommended route

Reuse the existing Git intake and UAR packaging mechanisms. Capture the exact phase changes, including additions, into isolated integration candidates. Use the observed UAR and Boss target heads as candidate bases; use Bossfang's explicitly accepted `bac04cb6` baseline rather than attempting an unproven backport to its older `main`. Produce a current-source **local Apple Silicon bundled candidate** through The Boss's existing local-UAR profile. Keep public multi-platform artifact replacement as a separate release boundary.

No new library, framework, service, identity provider, MCP preset or agent loop is justified by the assessed gaps. No product changes were made in Analyze. Spec should express these intake and provenance contracts; Plan should fix exact refs, ownership and implementation order. This is a route to an integrated candidate, not a statement that the main release is ready.

## Evidence and scope

The [Assess inventory](evidence/intake-summary.json) binds 241 allowed paths: UAR 126, Boss 43 and Bossfang 72. All selected deltas are uncommitted and unstaged; 94 paths are additions. UAR's126 and Boss's43 candidate target paths match their accepted bases. Bossfang has 39 baseline differences, 18 missing files and 21 differing files. These are static byte comparisons, not reproduced merge conflicts. Source hashes were stable at Assess; future integration must recapture changed inputs instead of assuming this snapshot remains current.

| Repository | Recommended isolated candidate base | Rationale and cost |
| --- | --- | --- |
| UAR | Observed target a7cb972992d4f83db6585449ea81af0fe4a1c990 | All126 owned target paths match accepted base; source HEAD 8bff32de alone contains none of these phase changes. |
| The Boss | Observed target 822ed9990bd7626bbf76b04eeae184739c0f0655 | All43 owned paths match accepted e2ae2ce2 base; retain the two target-only commits. |
| Bossfang | Accepted source base bac04cb6b2c144520e28234ad77f00d4cf0f5b23 | Includes required pre-existing delegation infrastructure;279 commits beyond observed old main 16beef0f. This is an explicit baseline selection, not a phase-only backport. |

Primary checkouts are observed targets only. Create future integration branches/worktrees from approved bases; preserve source worktrees and unrelated target changes. Do not advance old Bossfang main as a side effect of selecting the newer local candidate.

The [prior context](prior-context.md) supplies applicable lessons: working-tree deltas must be captured, implementation and certification must remain separate, and MCP credentials remain application/server configured. These are local predecessor records; external memory recall was unavailable. No external recall knowledge-gap entry was returned. The current local gaps are branch intake and payload applicability; optional learning prompts are `/learn-goal scoped Git release intake` and `/learn-goal source-to-binary provenance`. Neither was invoked.

## Candidate evaluation and transfer contract

**cand-001 — adapt existing Git snapshot/patch intake.** The selected implementation cannot be transferred by merging or cherry-picking current source HEADs: its changes are not committed. Transfer input must include every approved modification, addition and deletion, with accepted-base identity, source content hashes and file modes. A plain tracked-file diff must not be treated as the complete94-addition handoff. Prefer a scoped checkpoint assembled in an isolated intake checkout from the explicit inventory, leaving the original index/worktree untouched. Record exact checkpoint commits and the final diff before any merge.

Git supports binary/full-index patches; three-way apply depends on recorded blob identities being available and may leave conflicts. It is an application mechanism, not proof of dependency compatibility. Do not use automatic ours/theirs resolution to hide baseline differences. The installed Git is2.54.0; current official documentation and local version were checked, without applying any patch. [Git diff](https://git-scm.com/docs/git-diff), [Git apply](https://git-scm.com/docs/git-apply).

**cand-002 — adapt the accepted Bossfang baseline for local intake.** Narrow contract inspection found the phase relies on already-existing full-run client/types, router siblings and projection persistence. For example, `drivers/uar_run/mod.rs` declares baseline binding/diagnostic helpers; `uar_delegation.rs` declares an unchanged errors helper; the selected harness uses `UarRunControl` and `UarDelegatedRunProjection`. Baseline `a2a.rs` supplies projection load/upsert/admission transactions missing from the old target. See [the worker's path-bound analysis](evidence/analyze/bossfang-baseline-analysis.md).

**cand-003 — reject an assumed self-contained old-main backport for this intake.** Copying72 files does not establish prerequisite closure on16beef0f. Adjacent baseline task-queue changes include a `TaskQueueCaps` argument and pagination, so a synthetic backport can pull in further contracts. The minimum complete backport remains unknown; no compilation or merge was performed. This is a choice to avoid unproven adaptation work, not a claim that backporting is impossible. If the operator specifically requires the old baseline, Spec must make backport discovery explicit instead of labeling the overlay a release candidate.

Keep the transferred contracts grouped: strict exact approval producer and owned callers; Bossfang job orchestration with UAR authoritative execution; observation that cannot create work; application-owned MCP grants and empty shipped defaults; unsupported/unknown restart outcomes without automatic replay. These are preserved archived requirements, not newly verified behavior.

## Payload route: reuse what exists

**cand-004 — adapt the existing local-UAR profile.** Static inspection establishes that The Boss already has the route needed for a bounded local bundled candidate:

- [local-uar-payload.cjs](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/local-uar-payload.cjs:39) requires native darwin-arm64, non-CI execution, a clean checkout at the exact local pin, matching record identity, archive SHA256 and per-file inventory/hash checks. It stages the payload before packaging.
- [before-pack.js](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/before-pack.js:197) runs the local staging path then bundled-binary verification; [after-pack.js](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/after-pack.js:10) invokes packaged inventory verification and a launch-refusal probe.
- [uar-payload-integrity.cjs](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/uar-payload-integrity.cjs:89) binds local source and file hashes and rejects a local marker in public mode. [release-profile.cjs](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/release-profile.cjs:5) rejects the local profile in release CI.

The local pin currently names 48bc45b59d02d4febf4ed36e352af367fef73049, not the incoming current checkpoint. Updating that pin after approved source checkpointing, producing a real archive, and selecting the existing local profile are the expected adaptations. Do not change the validators or claim the existing external override binary is already the resulting bundled payload.

UAR's [package-boss-sidecar.mjs](/Users/gqadonis/.claude/worktrees/bauar-uar/scripts/package-boss-sidecar.mjs:1) packages an already-built platform binary, model files, policies, license and runtime libraries; it emits source/features/file hashes and an archive record. It does not itself build the binary or prove which source produced it. Therefore bind the build invocation, clean frozen source, explicit feature set, output binary and archive in one delivery receipt. Its default features are server-full; the retained public manifest declares a different feature selection. Plan must explicitly select the current harness-compatible build profile rather than infer equivalence from version 1.0.0.

The actual Boss payload location remains its existing `app.asar.unpacked/resources/binaries/<platform>` layout. No resource-path rewrite is needed. Context7 confirmed upstream file-copy and hook concepts; the project pins electron-builder26.15.6 and its actual hook implementation is the direct evidence for this route. Current upstream docs are not a version-specific packaging test. [Application contents](https://github.com/electron-userland/electron-builder/blob/master/website/docs/contents.md), [Build hooks](https://github.com/electron-userland/electron-builder/blob/master/website/docs/features/hooks.md).

**cand-005 — reference the existing canonical public artifact intake for the later release.** [import-uar-sidecar-payloads.cjs](/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/import-uar-sidecar-payloads.cjs:111) already requires immutable GitHub release records matching source/version/platform and all four release-profile platforms. This is reusable when public artifact production/publication is authorized. It cannot import unpublished local archives as-is. Do not weaken this distinction or invent URLs. A local macOS candidate does not certify Windows, Intel macOS, signing or installed release behavior.

**cand-006 — reference external current-UAR override for development only.** The retained packaged startup used an external current-UAR binary; its success does not demonstrate bundled-current provenance. The canonical p1.19 payload still names ba7233875f8df3b2add68fc487d364428432c07d. Keep those receipts at their actual boundaries. A source-pointer edit alone cannot replace archive bytes. See [payload comparison](evidence/intake-comparison.payload.json).

## Inputs for Spec and Plan

Specify a finite transfer manifest and checkpoint receipts across the three repositories; preserve target-only work and independently identify the accepted Bossfang baseline ancestry. Specify local bundled-current provenance using the existing profile and validators, with no public release claim. Treat later public four-platform artifacts and acceptance as explicit downstream work.

Plan should sequence complete source intake, compatible caller/provider checkpointing and payload production before product verification. No test was run at this stage. The operator's implementation-first/testing-later instruction remains effective: deferred broad regression, cumulative independent review and predecessor formatting waiver are not reopened as implementation blockers. At the later completed delivery boundary, record any acceptance actually authorized and performed; unrun checks stay unrun.

No new security hardening, provider, endpoint, service or dependency is proposed. This phase integrates the already-selected real-boundary contracts. F6 remains cancelled, with no reproduction or technical no-vulnerability verdict; its excluded files were not inspected.

## Open choices and verification limits

The recommendation needs the normal Analyze-to-Spec review: newer Bossfang baseline for the isolated local candidate, and local darwin-arm64 bundled-current mode as the first delivery. Exact future branch names/commits and simultaneous writer ownership belong to Plan/Execute. These are review inputs, not reasons to stop research incomplete.

Research used 2 Tier1 GitHub repository queries and 4 Tier2 Context7 calls (two resolves, two documentation queries), bounded by 8 per tier and 20 minutes. Official-page openings verified links as Tier2 support; no broad Tier4 comparison was needed. Tier3 registry research was unnecessary because no new dependency or upgrade is proposed. Maintenance metrics, coverage percentages and package-upgrade fitness are deliberately unclaimed. The [research receipt](evidence/analyze/research-receipt.json) records results and failed electron.build HTML fetch adaptation to upstream GitHub docs.

Independent adversarial vet is **operator-deferred**, not passed, consistent with the predecessor/successor verification disposition. The Analyze skill normally requests artifact vet; the direct user waiver governs. Local schema validation, evidence-link inspection and sycophancy screening are recorded separately. Flat-installed skill reference paths were missing; the installed orchestrator copies supplied the research pipeline/schema/template. Node-only dispatch replaced shell/Python lifecycle examples; unsupported hooks were skipped, with no external memory writeback claimed. Superpowers remains unavailable; no install was performed. There is no evolver bridge file.

All implementation compatibility and packaged runtime conclusions above are static unless explicitly attributed to retained prior receipts. No product build/test, source transfer, commit, merge, dependency change, service action or publication occurred in Analyze. Shipping/C05 state remains independent.
