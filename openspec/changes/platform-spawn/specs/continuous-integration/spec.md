## MODIFIED Requirements

### Requirement: Verification commands
Each job SHALL run, in order: `npm ci`; `node --test`; `node rules/build.mjs --check`; and OpenSpec validation of all specs and changes through the project's shell-free entry point, `node scripts/spec-validate.mjs`. No step SHALL rely on a `.cmd` shim or on a globally installed CLI, and no step SHALL name a path under `node_modules/` directly.

#### Scenario: Validation uses the entry point
- **WHEN** the validation step runs on `windows-latest`
- **THEN** it is `node scripts/spec-validate.mjs`, which starts the pinned OpenSpec CLI through `spawnNodeCli` with `shell: false`

#### Scenario: Any failing command fails the job
- **WHEN** any of the four commands exits non-zero
- **THEN** the job fails
