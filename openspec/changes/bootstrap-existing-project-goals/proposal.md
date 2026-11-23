# Add goals-first audit and update to existing project context

## Why

The operator needed goals-first instructions in existing repositories whose root instruction files had different ownership, Git ignore rules, symlink/import direction, and dirty local edits. The bootstrap initializer is not safe for this task: its broader installation path can write rules, skills, memory, UI/team configuration, and recovery files.

## What Changes

Extend the existing prometheus-context-bootstrap skill, not a new skill. Add explicit, mutually exclusive audit / preview / apply modes limited to the two named files in one existing Git root. Adopt the same public contract as Full 1.16.2 while retaining the Mini Node-only implementation and legacy initializer behavior. Update Mini distribution metadata 1.18.1 to 1.18.2 through the existing generator. No new runtime dependency, installer, CI or release workflow, and no touch to actual consumer repos for verification.

## Capabilities

- New: `existing-project-instruction-maintenance` offered by the existing context bootstrap skill.

## Impact

Inputs: exact project root, existing instruction bytes/topology/track-ignore status, approved policy and optional preview digest. Outputs: read-only audit/preview, then at most AGENTS.md and CLAUDE.md explicit edits. Unsupported topology or conflict is a no-write result. Prior authoritative KBD/test/release processes remain unchanged; this is not a signed adoption or run authorization.
