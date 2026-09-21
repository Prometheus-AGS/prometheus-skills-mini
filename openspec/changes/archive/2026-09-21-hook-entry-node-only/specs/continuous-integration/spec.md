## MODIFIED Requirements

### Requirement: Verification commands
Each job SHALL run, in order: `npm ci`; `node --test`; `node rules/build.mjs --check`; OpenSpec validation of all specs and changes through the project's shell-free entry point, `node scripts/spec-validate.mjs`; and the hook-manifest resolution check. No step SHALL invoke a project tool through a globally installed CLI, through `npx`, or through a `.cmd` shim that this project's own code would have to spawn. The workflow runner's own package manager (`npm`, invoked by GitHub's shell and by `actions/setup-node` caching) is outside that rule: it is the harness starting the job, not this project's code starting a child process. The `windows-latest` jobs SHALL additionally measure hook cold start and record the distribution.

#### Scenario: Validation uses the pinned CLI
- **WHEN** the validation step runs on `windows-latest`
- **THEN** it reaches the pinned OpenSpec CLI through `spawnNodeCli`, which starts `process.execPath` with the CLI's JavaScript entry and `shell: false` — never `openspec`, `npx`, or a `.cmd` shim

#### Scenario: The project's own tools never go through a shim
- **WHEN** the workflow's `run:` steps are inspected
- **THEN** none invokes `npx`, a bare `openspec`, or any project tool by a name that resolves to a `.cmd` shim

#### Scenario: Any failing command fails the job
- **WHEN** any of the commands exits non-zero
- **THEN** the job fails

#### Scenario: Validation goes through the entry point
- **WHEN** `.github/workflows/ci.yml` is read
- **THEN** the validation step is `node scripts/spec-validate.mjs`, and no step names a path under `node_modules/` directly

#### Scenario: The hook manifest is checked on every job
- **WHEN** a job runs on any of the three operating systems
- **THEN** the hook-manifest resolution check runs, and it fails the job when a file named by `hooks/hooks.json` is absent or unimportable

#### Scenario: Windows measures hook cold start
- **WHEN** a job runs on `windows-latest`
- **THEN** it measures process cold start for the three hooks declared at 1000 ms and records repeated samples with at least the median and the maximum
