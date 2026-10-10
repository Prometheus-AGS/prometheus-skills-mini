# Decision Log — phase-bauar-release-integration-2026-10-09

Entries below are Analyze recommendations for the operator's next-stage review. They are not target/publishing authorization.

## D-001 · Scoped working-tree checkpoint intake [analyze · 2026-10-09]

**TL;DR:** Recommend isolated explicit-inventory checkpoints including additions.
**Why:** All 241 selected changes are uncommitted; 94 files are additions. Source HEAD alone is incomplete.
**Alternatives:** Source-tip cherry-pick (omits implementation); whole dirty-worktree commit (unbounded scope).
**Learn more:** [Analysis](analysis.md), cand-001 and [intake summary](evidence/intake-summary.json).

## D-002 · Accepted Bossfang baseline as local candidate [analyze · 2026-10-09]

**TL;DR:** Recommend bac04cb6 for isolated intake, explicitly disclosing 279 newer commits beyond old main.
**Why:** Selected changes rely on baseline delegation and persistence contracts. A 72-file overlay has no demonstrated old main prerequisite closure.
**Alternatives:** Backport to 16beef0f (unknown additional adaptation); wholesale primary-main merge (not authorized).
**Learn more:** [Baseline analysis](evidence/analyze/bossfang-baseline-analysis.md), cand-002/cand-003.

## D-003 · Existing local UAR profile for first bundled candidate [analyze · 2026-10-09]

**TL;DR:** Recommend native darwin-arm64 local profile after clean source checkpoint and actual payload production.
**Why:** Exact source/archive/file validation and packaging hooks already exist; old local pin must become actual current checkpoint. Public CI forbids this profile.
**Alternatives:** New packager (duplicates existing mechanism); external override as release payload (does not establish bundled provenance); relabel p1.19 source (archive bytes unchanged).
**Learn more:** [Payload analysis](analysis.md), cand-004/cand-005/cand-006.

## D-004 · Preserve operator-deferred certification [analyze · 2026-10-09]

**TL;DR:** Keep integration progress separate from later acceptance and publication.
**Why:** Operator waived/deferred broad checks; existing passes retain their own source/artifact boundaries. F6 is cancelled.
**Alternatives:** Reopen waived checks as implementation blockers (contradicts direction); claim them passed (false).
**Learn more:** [Assess limitations](assessment.md), predecessor verification disposition and Analyze handoff.
