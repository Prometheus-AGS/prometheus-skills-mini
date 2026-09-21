# continuous-integration Specification

## Purpose
TBD - created by archiving change ci-three-os. Update Purpose after archive.

## Requirements

### Requirement: Verified platforms and runtimes
Continuous integration SHALL run on `windows-latest`, `ubuntu-latest` and `macos-latest`, each on Node.js 22 and 24, with `fail-fast` disabled so that one failing leg does not cancel the others.

#### Scenario: Full matrix
- **WHEN** the workflow is triggered by a push or a pull request
- **THEN** six jobs run, one per operating system and Node version

#### Scenario: One failure does not hide the rest
- **WHEN** the `windows-latest` Node 22 job fails
- **THEN** the other five jobs still run to completion

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

### Requirement: Hostile line-ending configuration on Windows
The Windows jobs SHALL set `core.autocrlf` to `true` before checkout, so the repository's line-ending rules are tested against the default most likely to break them.

#### Scenario: Checkout under autocrlf
- **WHEN** the Windows job checks out the repository with `core.autocrlf=true`
- **THEN** `node rules/build.mjs --check` still exits 0

### Requirement: Least privilege
The workflow SHALL request read-only repository permissions and SHALL use no secrets.

#### Scenario: Permissions
- **WHEN** the workflow file is read
- **THEN** `permissions` grants only `contents: read` and no `secrets.` reference appears
