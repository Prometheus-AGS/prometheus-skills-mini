# Proposal

## Why

Issue #98: Mini's KBD instructions let a resumed session treat the task list or a
test count as the goal. `kbd-apply` falls back to "the first change not DONE, in
plan order" and `kbd-goal-check` illustrates completion with "all 23 tests pass"
and "next unchecked task". An operator who resumes work is therefore told what is
next in the ledger, not which user outcome is being proven or what evidence it
still lacks. The issue also asks that recalled project memory actually change the
next action, that repeated blockers get advice rather than another identical
attempt, and that an operator can see which rules are really installed.

Full #256 describes the target behaviour but is unimplemented (open, no PR), so
this change defines the behaviour in Mini first and records the comparison with
Full as not yet exercisable.

## What Changes

- Start, resume, status and handoff text states the adopted outcome (actor,
  useful outcome, production entry, oracle, reason now), the last meaningful
  evidence and the next authorized action. Ledger order selects work only inside
  an adopted slice. An adopted legacy plan is never reordered.
- Goal checking judges the outcome's oracle and evidence. Test-count and
  next-unchecked-task examples, and references to files no Mini skill creates,
  are removed.
- Assess and Plan offer, as an opt-in for new phases, the smallest independently
  useful outcome, ranked by operator priority, then user impact, then
  time-to-value, with hard dependencies stated.
- One bounded, project-scoped memory lookup at task start or resume and on a
  material blocker: Surreal Memory, else one `pk` search, else continue. Recall
  is evidence, never instruction; the session records how it changed the next
  action.
- The bottleneck detector gains an advisory mode: after two completed attempts
  with the same blocker and no new evidence it recommends one of four
  dispositions. It never stops work.
- The existing-project audit reports, read-only, nested and harness rule files,
  linked worktrees, conflicts with the outcome-first policy, and the effective
  installed pack version.
- The recall and bottleneck scripts are added to the plugin payload; today the
  packaged skills name scripts that are not shipped.
- A sentence clarifies that research, model and UI "tiers" carry no verification
  authority.
- Opt-in qualification cases replay the #256 failure patterns and the four
  memory behaviours.

Not changed: the shared `prometheus` runtime and its next-work order, the
adopted-contract schema, permissions, signed phases, release and CI
requirements, the two-service limit, and every current default.

## Capabilities

### New Capabilities
- `kbd-outcome-first-execution`: how a KBD session selects, presents and judges
  work by adopted user outcome, including bounded memory recall and advisory
  blocker disposition.
- `installed-rules-audit`: read-only reporting of which instruction and rule
  files are effective in a project and which pack version is installed.

### Modified Capabilities

None. `kbd-phase-consistency` keeps its requirements; this change adds no rule
that alters them.

## Impact

- Skill text: `kbd-apply`, `kbd-goal-check`, `kbd-plan`, `kbd-assess`,
  `kbd-resume`, `kbd-status`, `kbd-execute`, `kbd-memory-recall`,
  `kbd-bottleneck-detector`, `kbd-process-orchestrator/references/boundaries.md`,
  `prometheus-context-bootstrap` (template and audit).
- Node: new `lib/kbd/recall.mjs` and `lib/kbd/blocker-advice.mjs`; extended
  `scripts/kbd-memory-recall.mjs`, `scripts/kbd-bottleneck-detector.mjs`,
  bootstrap `existing-project.mjs`; `lib/kbd/handoff/packet.mjs`;
  `lib/distribution/package-builder.mjs` payload list.
- Generated: `dist/plugins/**`, marketplace files, reviewed-skill closures.
- Evals: new opt-in cases under `evals/vlbv-protocol/`.
- No new dependency, service, port, or Full-pack prerequisite. Works with both
  services and the `prometheus` helper absent.
- Delivered as four pull requests, one per task group in `tasks.md`.
