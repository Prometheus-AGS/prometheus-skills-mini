# Decision log — phase-bauar-release-acceptance

### D-001 · Reuse existing testing stack [Analyze · 2026-10-09]
TL;DR: Adapt installed Playwright/Electron, Boss approval fixtures, Bossfang real harness gate and finite UAR targets.
Why: Their source already exercises the required collaborating components; the missing work is acceptance coordination and actual bundled launch.
Alternatives: Spectron rejected as deprecated; new testing service/framework adds scope without solving launch isolation.
Learn more: [analysis](analysis.md), [candidate contract](library-candidates.json).

### D-002 · Propose explicit private packaged startup roots [Analyze · 2026-10-09]
TL;DR: Spec should define the smallest early Boss configuration/profile/log-root contract.
Why: The old packaged helper edits live boot configuration and inspected packaged startup overrides a simple profile argument.
Alternatives: An available isolated OS user could test the unchanged app, but that environment is not established. HOME alone is not sufficient evidence.
Status: Architecture proposal for operator review, not an implemented API.

### D-003 · Propose unsigned local acceptance scope [Analyze · 2026-10-09]
TL;DR: Finish macOS ARM64 local workflows and finite deferred regression/review first.
Why: The retained artifact is an unsigned local app; a wider target has not been selected.
Alternatives: Signed/installed macOS and full platform matrix require selected owners/hosts and authority.
Status: Unanswered scope question retained; no publication authorization inferred.

### D-004 · Keep execution contracts and evidence boundaries [Analyze · 2026-10-09]
TL;DR: UAR owns the delegated loop; Bossfang owns jobs/attempt reconciliation; restart is unsupported/unknown without replay.
Why: Preserve the operator-selected behavior and distinguish supporting test-feature regression from production bundled acceptance.
Limits: F6 cancelled, production remote certification excluded, prior passes and formatting debt retained at their actual boundaries.

