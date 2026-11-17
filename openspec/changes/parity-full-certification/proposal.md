# Proposal

## Why
The full pack's work of 2026-11-17 (#226–#238) gave it spec-conformant skill frontmatter, a strict validator, a VLBV session-start default, a `skill-certification` skill with eval cases, and packaging rules that keep cases and skill-level plugin manifests out of installed skills. Mini's last parity port stopped at full-pack 1.15.0 + R4. Mini had no skill validator, had never been certified, and 40 of its 105 skills failed the specification level. OpenSpec 2.1.0 was released the same day with Windows fixes and a changed install default. The owner asked for certification, parity in Node with Windows compatibility kept, and both packs on OpenSpec 2.1.0, and decided on 2026-11-17:
- recent changes only; mini's existing exclusions stay;
- version 1.16.0 → 1.17.0;
- a branch and a pull request;
- static certification levels only (no billed model runs).

## What Changes
1. **OpenSpec 2.1.0**: exact pin; Node floor 22.20.0; runner `init` passes `--scope project`; `verify` and `refresh` decide from `openspec update --dry-run --json`; `refresh-unavailable` when an update is needed and GitHub is unreachable; the 12 `openspec-*` skills regenerated.
2. **`skill-certification` skill** ported to Node: no shell script, shell-free child processes, Windows shell shims reported as not exercised, a non-Node script inside a skill is an error.
3. **Strict validator** (`scripts/validate-skills.mjs`, `lib/skills/validate.mjs`) and the frontmatter migration of 93 skills.
4. **Eval cases**: the 6 full-pack cases that need no scaffold script.
5. **Packaging**: `evals/` and `.claude-plugin/` beside a `SKILL.md` are source-only, in the package builder and in doctor's `copy-skills`.
6. **VLBV session-start hook** in Node, registered for Claude Code and Codex; `vlbv` 1.1.0.

## Exclusions
- Entity skills sync, domain plugins and installer domain selection, the runtime-only plugin, the stale hook-carrier refresh, and the `pmpo-skill-creator` rewiring: outside mini's scope or tied to the full pack's generation installer.
- Five eval cases that need a bash scaffold script.
- Top-level `disable-model-invocation`, `authors`, `triggers` and `model_routing` stay where the full pack has them.

## Capabilities
Adds skill certification and skill validation requirements; modifies distribution and hook requirements.

## Impact
Version 1.16.0 → 1.17.0. Generated distribution and rules are regenerated. Verification follows VLBV: the increment was written first and the boundary packet ran once.
