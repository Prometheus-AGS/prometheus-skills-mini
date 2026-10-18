## ADDED Requirements

### Requirement: Handoff targets a supported harness

`kbd-handoff` SHALL require `--to <harness>` and SHALL accept only `claude-code`, `codex`, `opencode` and `kimi-code` (aliases `claude` and `kimi`). Any other value SHALL exit non-zero with the supported list and write nothing.

#### Scenario: Unknown harness

- **WHEN** the operator runs `kbd-handoff --to emacs`
- **THEN** the command exits non-zero, names the supported harnesses and writes no packet.

### Requirement: Handoff is read-only on canonical KBD state

The command SHALL NOT edit `progress.json`, the waypoint or any runtime state and SHALL issue no lease command. It SHALL read `prometheus kbd status --json` when the CLI runs (bounded by a timeout, stdin closed) and otherwise the projection files: `current-waypoint.json`, `position-reminder.txt`, the phase `progress.json`, and `plan.md` / `execution.md` when present.

#### Scenario: CLI unavailable

- **WHEN** the `prometheus` CLI cannot be started
- **THEN** the packet is built from the projection files and states that boundary obligations were not checked.

### Requirement: Handoff refuses unsafe positions

The command SHALL exit non-zero with remediation when the selected phase does not exist, or when the runtime reports a blocking boundary obligation: an open task, or a change or phase the runtime already marks complete or does not know (an interrupted close). The active phase path and the active, unfinished change are expected to be open. A change or phase outside the active position that is started and not finished is carried work and SHALL produce a warning, not refusal. The remediation SHALL name `prometheus kbd guard evaluate --boundary <change|task> --edge after --subject <subject> --json --repair-projections`. Dirty or unpushed worktrees SHALL produce warnings, not refusal.

#### Scenario: Carried work in an earlier open phase

- **WHEN** the only open obligation is for a pending change in another phase
- **THEN** the packet is written and lists that change under open prerequisites.

#### Scenario: Open boundary obligation

- **WHEN** the runtime lists an open `change:<id>` obligation for a change it marks complete
- **THEN** the command exits non-zero, prints the repair command for that subject and writes no packet.

### Requirement: Target harness readiness is checked

When the project has an agent team, the command SHALL check that each role has a native definition in the target harness's directory (`.claude/agents/`, `.codex/agents/`, `.opencode/agents/`, `.kimi-code/agents/`). It SHALL check that the target harness's installed `kbd-*` skills resolve and SHALL report each broken link by path.

#### Scenario: Broken skill link

- **WHEN** an installed `kbd-*` skill entry for the target harness is a symlink whose target is missing
- **THEN** the packet and the console list that path as broken under open prerequisites.

### Requirement: One packet with a sidecar

Unless `--dry-run` is given, the command SHALL write exactly one Markdown packet at `.kbd-orchestrator/phases/<phase>/harness-handoffs/<harness>-<UTC timestamp>.md` and a `.json` sidecar beside it, never under `handoffs/`. The packet SHALL contain position (phase, stage, implementation N/T from `completion.implementation`, next change/task), repository state, files to read in order, operator gates and decisions when the plan lists them, task execution rules, a never-do list from the project's `AGENTS.md`, open prerequisites and the exact start prompt. The command SHALL emit `Starting kbd-handoff — <phase> to <harness>` and `Completed kbd-handoff — <phase> packet <path>` and print the start prompt.

#### Scenario: Dry run

- **WHEN** the operator runs with `--dry-run`
- **THEN** the packet is printed, the start prompt is printed and no file is created.
