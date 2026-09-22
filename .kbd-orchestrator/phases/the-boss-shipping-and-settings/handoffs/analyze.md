# Analyze handoff — the-boss-shipping-and-settings

15 candidates: 9 adopt, 2 adapt, 4 build. The phase is substantially smaller than the goals
implied — the-boss already has a streaming diagnostic runner (DoctorService publishes partial
results to a shared cache key; the renderer subscribes via useSharedCacheValue), a per-platform
binary pipeline with SHA-256 verification, and a content-hash-gated startup skill installer. Goal
D-12 reduces to one check-source spawning `scripts/doctor.mjs`.

Key adopt verdicts: cand-001 (installBuiltinSkills + the dormant `namespace` parameter),
cand-003 (download-binaries.js TOOLS[] — compass emits exactly the archive+sha256 shape it wants),
cand-005 (DoctorService shared-cache publishing), cand-006 (preferences are GENERATED from
classification.json and need NO migration), cand-011 (@cherrystudio/ui settings primitives).

Build: cand-012 (the mini vendors four SOURCE submodules — separate from the-boss consuming
artifacts), cand-014 (the every-startup home push, distinct from cand-013's on-demand repair),
cand-009/build-003 (sycophancy-correction release CI from scratch).

WARNINGS carried forward:
- Every the-boss citation is outside the review packet and unverifiable from it. Spec must RE-READ
  anything it depends on in the-boss. One stale citation already occurred this phase
  (`src/main/services/skills/` does not exist).
- cand-009 is the long pole: `Know-Me-Tools/sycophancy-correction-skill` has NO workflows and 0
  releases, unlike the other three whose workflows merely have never run. Sequence first or defer.
- i18n gates CI across 13 locales on missing AND extra keys; add keys in the same change as
  components or the build fails late.
- Do not edit `preferenceSchemas.ts` — it is generated and a regeneration silently reverts edits.

Open questions for spec: which of the eleven mini checks the-boss surfaces (each needs an id in a
CLOSED union plus a catalog detail.variant); whether the first compass release succeeds (nothing
has ever run); whether `windows-11-arm` is available to these repos; `versions.toml` still
unauthored and agents may not write it.
