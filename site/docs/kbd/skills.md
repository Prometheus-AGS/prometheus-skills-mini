---
title: KBD Skills
sidebar_label: Skills
---

# KBD Skills

All 24 skills in this family, with descriptions drawn directly from each `SKILL.md`'s frontmatter.

## Lifecycle stages

| Skill | Description |
|---|---|
| `kbd-init` | Use once per project, before any other KBD command — auto-discovers project identity, stack, and constraints from existing context files (`AGENTS.md`, `CLAUDE.md`, `README.md`, `package.json`, `Cargo.toml`, `pyproject.toml`, etc.) and generates `.kbd-orchestrator/project.json` and `.kbd-orchestrator/constraints.md`. |
| `kbd-assess` | Use when starting or resuming the KBD lifecycle for a project — inspects the current codebase against the active phase's goals and produces a structured gap report at `.kbd-orchestrator/phases/<phase>/assessment.md`. Project-agnostic: reads `AGENTS.md`, spec files, and the codebase itself. Also reads `progress.json` to account for cross-tool work done since the last session. |
| `kbd-analyze` | Use to run the Analyze stage (between Assess and Spec) — research the engineering landscape (existing open-source libraries, frameworks, skeletons that fit the assessed gaps, plus stack discovery when none is specified) and write the candidate set that the Spec and Plan stages consume. |
| `kbd-spec` | Use to run the Spec stage (between Analyze and Plan) — turn an assessment and analysis into concrete, ordered changes (native-kbd `spec.md` + `tasks.json` + `verification.md`, or OpenSpec proposals). |
| `kbd-plan` | Use to create a prioritized, ordered change list for the current KBD project phase. Project-agnostic — reads the assessment and project constraints to produce an ordered change list, auto-detecting OpenSpec availability and emitting the appropriate change format. |
| `kbd-execute` | Use to select an execution backend for the active KBD phase, write canonical phase execution state, dispatch the phase, and maintain KBD as the source of truth. Supports multi-tool handoff via the `progress.json` protocol. |
| `kbd-apply` | KBD-owned spec-apply driver. Wraps a spec backend (openspec; native-kbd as the always-available fallback) and drives it ONE task at a time, so KBD stays the source of truth — every task boundary fires KBD hooks, emits a plain-text position signal, and syncs `progress.json` and the waypoint. |
| `kbd-reflect` | Use to generate the phase reflection report after all changes in a KBD phase are complete — goal achievement, delivered changes, artifact quality summary, technical debt, lessons captured, and recommended focus for the next phase. Seeds the next phase's planning inputs. |

## Status and control

| Skill | Description |
|---|---|
| `kbd-status` | Use to show current KBD process status — active phase, change inventory, goal completion, and next recommended action. Reads `progress.json` to surface work completed by all tools (Antigravity, Roo, Cursor, Cline, Codex, etc.). |
| `kbd-audit` | Use for a read-only causal audit of the active KBD run — exact position, lifecycle history, plan revision, ownership, blockers, and uncommitted work — without mutating anything. |
| `kbd-pause` | Use to gracefully pause the active KBD run, checkpoint its exact position, and prevent every harness from steering execution until an operator resumes it. Operator intent always outranks agent continuation. |
| `kbd-resume` | Use to resume a paused KBD run after validating its checkpoint and plan revision. A normal assistant response is never a resume signal — resuming requires this explicit skill. |
| `kbd-cancel` | Use to gracefully cancel the active KBD run while preserving its checkpoint and immutable audit history. Requires a non-empty cancellation reason. Cancellation is terminal. |
| `kbd-goal-check` | Use after each execution turn within a goal-driven KBD phase to evaluate whether the active phase's stopping condition has been met, without the implementer agent grading its own work — returns PASS (with evidence) or CONTINUE (with the next action). Implements the maker-is-not-evaluator pattern for harnesses whose loop is a queue rather than a condition-based loop. |

## Phase and child hierarchy

| Skill | Description |
|---|---|
| `kbd-new-phase` | Manually create a new top-level KBD phase. Accepts `<name> [goals…]` and initialises the phase directory, waypoint, `project.json` `activePhase`, and fires `phase:before`. Use when no prior reflection exists, when pivoting away from `/kbd-next-phase`'s suggestion, or when initialising state by hand. |
| `kbd-next-phase` | Continue to the next KBD phase, automatically seeded from the previous phase's reflection. Reads the "Recommended Next Phase" section of `reflection.md`, initializes the new phase directory with `goals.md` and a skeleton `progress.json`, updates `current-waypoint.json` to point to `/kbd-assess`, and updates `project.json` `activePhase`. |
| `kbd-new-child` | Create a child phase inside the currently-active node (arbitrary depth). Mirrors `/kbd-new-phase` but writes into `phases/<parent>/children/<child>/`, appends the new child to `childPhases[]`, moves `childPointer` to it, and fires `child:before`. Use to split a parent phase into scoped sub-processes. |
| `kbd-next-child` | Advance `childPointer` to the next entry in `childPhases[]`, or jump to a named child directly. Fires `child:after` for the closing child and `child:before` for the new active child. Refuses to advance past the last child (suggesting `/kbd-reflect` + `/kbd-next-phase` instead). |
| `kbd-child-exit` | Exit the active KBD child loop: write its handoff-out, roll its progress up to the parent node, pop the position path, and return control to the parent. The `--enter` companion descends into a selected child so new children nest under it. |

## Maintenance and evolution

| Skill | Description |
|---|---|
| `kbd-bottleneck-detector` | Evaluate or repair canonical KBD task, phase, and ZeeSpec boundaries. Use when progress receipts, projections, or build gates may be stale, or when the user mentions "bottleneck detector". Do NOT use for creating or advancing phases. |
| `kbd-memory-recall` | Query surreal-memory for prior similar KBD work and write a markdown digest at `.kbd-orchestrator/phases/<phase>/prior-context.md`. Used as planning input before `/kbd-assess`. Degrades gracefully when the memory endpoint is unreachable. |
| `kbd-inject-agent-rules` | Idempotently inject the agent-rules or UI/UX-routing managed pack into a target project's `CLAUDE.md` and/or `AGENTS.md`. Re-runnable — overwrites only the selected fenced region; everything else is byte-preserved. Supports `--refresh` to re-validate cached source URLs, and `--dry-run` for a target-file diff preview. |
| `kbd-evolve` | Use for domain-landscape-first evolution of a KBD project — when the roadmap is empty, exhausted, or you want to recalibrate against external reality rather than follow internal plans. Surveys the external landscape of the project's problem domain, scores improvement opportunities, and produces a ranked evolution brief a new phase can consume as its seed. |

## `kbd-process-orchestrator` (parent)

`skills/kbd-process-orchestrator/SKILL.md`: coordinates the full KBD lifecycle for any project —
Assess, Analyze, Plan, Execute, Reflect — at every granularity level (global phases, spec-backed
changes, and artifact-level QA). This is the coordination and reference document for the sub-skills
above; it documents the `progress.json` schema, the waypoint contract, and the hook taxonomy. It
has no executable logic of its own.

## `kbd-doctor`

Not a separate ported skill in this pack — its check is already covered by
`lib/doctor/kbd.mjs`, invoked through the [`doctor`](/docs/platform/doctor) skill. The full pack's
`kbd-doctor` was a 4-line exec into a Rust binary this pack does not ship; no shim was ported for
it.
