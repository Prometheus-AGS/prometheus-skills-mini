# Goal Control — Complete and ship The Boss UAR, service, Compass, and liter-llm administration with registered-agent catalog correctness and remote MCP identity

- owner: kbd
- tool: codex
- mode: native-goal-supervised
- native_goal_supported: true
- evaluator_mode: native-goal+continuation-prompt
- stop_guard: position-stop-gate

## Invariants

1. KBD owns the durable state in `.kbd-orchestrator/goals/integration-administration/`.
2. A host-native loop may execute work, but completion is not trusted unless
   `STATE.md`, `TASKS.md`, and the phase stopping condition agree.
3. Non-terminal KBD waypoints must continue through the KBD next command, not a
   bare backend handoff.
4. If the host loop loses context, resume from `goal.json` + `STATE.md`, not
   from conversational memory.

## Resume

- resume command: `/kbd-goal --resume integration-administration`
- state file: `.kbd-orchestrator/goals/integration-administration/STATE.md`
- stopping condition source: `goal.json`
