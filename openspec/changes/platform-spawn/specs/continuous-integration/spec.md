## MODIFIED Requirements

### Requirement: Verification commands
Each job SHALL run, in order: `npm ci`; `node --test`; `node rules/build.mjs --check`; and OpenSpec validation of all specs and changes through the project's shell-free entry point, `node scripts/spec-validate.mjs`. No step SHALL invoke a project tool through a globally installed CLI, through `npx`, or through a `.cmd` shim that this project's own code would have to spawn. The workflow runner's own package manager (`npm`, invoked by GitHub's shell and by `actions/setup-node` caching) is outside that rule: it is the harness starting the job, not this project's code starting a child process.

#### Scenario: Validation uses the pinned CLI
- **WHEN** the validation step runs on `windows-latest`
- **THEN** it reaches the pinned OpenSpec CLI through `spawnNodeCli`, which starts `process.execPath` with the CLI's JavaScript entry and `shell: false` — never `openspec`, `npx`, or a `.cmd` shim

#### Scenario: The project's own tools never go through a shim
- **WHEN** the workflow's `run:` steps are inspected
- **THEN** none invokes `npx`, a bare `openspec`, or any project tool by a name that resolves to a `.cmd` shim

#### Scenario: Any failing command fails the job
- **WHEN** any of the four commands exits non-zero
- **THEN** the job fails

#### Scenario: Validation goes through the entry point
- **WHEN** `.github/workflows/ci.yml` is read
- **THEN** the validation step is `node scripts/spec-validate.mjs`, and no step names a path under `node_modules/` directly
