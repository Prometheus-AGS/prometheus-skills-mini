## Context

`kbd-next-phase.mjs` previously treated every positional argument as a phase name. Because project discovery and mutation followed immediately, `--help` could create a phase and advance canonical state instead of describing the command.

## Goals / Non-Goals

**Goals:**

- Resolve both help aliases before project discovery or mutation.
- Keep normal next-phase behavior unchanged.
- Prove the complete project tree remains unchanged when help is requested.

**Non-Goals:**

- Redesign argument parsing for other KBD commands.
- Change phase-transition semantics.

## Decisions

- Handle `-h` and `--help` at the start of `main`. This is the only position that guarantees help cannot reach project discovery or mutation. Checking later was rejected because it would preserve the observed failure mode.
- Keep usage text in one constant used by the early-return path. Adding an argument-parser dependency was rejected because two exact aliases do not justify a new runtime dependency.
- Snapshot the entire scratch tree before and after each alias. Checking only the waypoint was rejected because the observed bug also created phase artifacts.

## Risks / Trade-offs

- Help text can drift from future arguments. → Update the shared usage constant when command syntax changes.
