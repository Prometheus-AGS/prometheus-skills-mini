# Reconciliation parity — review handoff

Both implementations and their generated payloads are complete locally. **New feature/version changes are uncommitted.** Nothing was pushed or released. GitHub handoffs: [mini #51](https://github.com/Prometheus-AGS/prometheus-skills-mini/issues/51), [full #172](https://github.com/Prometheus-AGS/prometheus-skill-system/issues/172).

| Pack | Directory | Release change |
| --- | --- | --- |
| Mini | `/Users/gqadonis/Projects/prometheus/prometheus-skills-mini` | 1.12.0 → **1.12.1** |
| Full | `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack` | 1.12.1 → **1.12.2** |
| Full process plugin | full pack `skills/process` | 1.7.2 → **1.7.3** |

Mini pulled main 4840903→7012649. Full merged origin/main into its current branch at 0084d1bebedb2d646ab8466c8edfd93aa51b99e3, preserving its three prior local commits. This pull-integration merge is the only new full-pack commit; the feature/version work remains uncommitted. The existing full position reminder and knowledge-store lock remain excluded from the feature patch.

## Changes

`kbd-apply reconcile [<phase>] [--repair] [--json]` now has shared behavior: active/nested or explicit phase, active/archived backend artifacts, canonical task identity mapping, task and phase counters, explicit incomplete-scan errors and exit codes 0/1/2. Default scans do not invoke live runtime projection writes or lifecycle effects. The installed runtime reads a temporary copy of the named canonical store, whose live source is checked for stability.

Repair is limited to active, unambiguous backend-complete/canonical-incomplete tasks. It preserves cancelled/completed/archived history, uses existing transitions and guards, stops dependent operations on failure and rescans actual state. Legacy count repair remains separate from runtime-owned projections. Full repair guard IDs and explicit hook-root preservation were corrected after reproduced integration failures.

Apply/Reflect guidance and bounded OpenSpec changes are in both repositories. Existing generators updated Claude/Codex payloads. The full version matrix synchronized its coupled metadata, including Cargo package versions without Rust implementation changes. Mini's stale package-lock root 1.11.3 was synchronized to 1.12.1 without dependency changes.

## Verification

**4/4 named integration groups passed**, using real commands, filesystem backends, the installed canonical runtime and disposable storage/signing identity. Coverage includes all three backends, nested/explicit selection, archives, invalid/missing/ambiguous artifacts, mapped task IDs, successful/repeated repair, cancelled tasks, inactive refusal, stale counters, ledger-ahead state, unavailable authority and an actually rejected signer transition. Generated entry points executed archived scans.

The original two backend groups passed and were not rerun. The final corrected canonical groups passed in 47.442 seconds (mini 21.085; full 26.263). Initial failure history is retained in the integration receipt, including the false paused-runtime fixture assumption.

Relevant distribution, OpenSpec and release-metadata checks passed. Mini generated 100 skills; its driver is 430 lines. Full generated 213 skills; 24 module copies across flat/nested Claude/Codex layouts match source. Exact commands/results are in [mini checks](mini-checks.json), the mini OpenSpec integration receipt, and [full delivery receipt](/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/openspec/changes/reconcile-kbd-task-state/delivery.json).

Windows execution was not exercised. No new dependency upgrade or service startup is part of this update. The aborted full fixture selected default production hooks before the explicit-root fix: no local hook/memory receipt was found, but external effects remain unknown because buffered stderr was lost. That uncertainty is explicitly tracked in full issue #172; it is not reported as verified absence of effects.

## Review files and continuation

- [Mini exact patch](mini.diff)
- [Full exact patch](/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/.context/reconcile-handoff/full.diff)
- [BAUAR read-only scan](bauar-reconcile.json): exit 0, revision 420, 431 inspected project/canonical files unchanged.
- [BAUAR reflection](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-integration-2026-10-09/reflection.md)
- [Complete BAUAR status](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-integration-2026-10-09/status.md)

BAUAR Reflect and phase completion are now complete at revision 424, with both phase guards passing. Phase implementation is **2/2**, all **11/11 tasks** archived. Runtime acceptance, broad testing/review and certification remain operator-deferred and unpassed; F6 remains cancelled. No next phase or shipping/C05 advancement occurred.

Review/check in the skill-pack changes when ready. Installed immutable plugin caches were not edited; the new mini source command was used for BAUAR. Another session can use the filed issues for independent Windows validation, review and bounded hook-incident investigation without duplicating the completed implementation.

Detailed integration evidence: [integration-results.json](../../openspec/changes/reconcile-kbd-task-state/evidence/integration-results.json). Mini patch SHA256: f7a88231498917d88daa9cb8bfd24c2c34b21d42e6e27bb0bfb85ad23796902d. Full patch SHA256: 852b499d1a62e7a968f9758bf8ec4e4d89724e329661b566bdee5fab80e37965. Review artifacts are separate from the product patches. Full local Git exclude was extended only for /.context/reconcile-handoff/; no tracked ignore rule changed.
