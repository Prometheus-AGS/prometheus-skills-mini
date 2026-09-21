## ADDED Requirements

### Requirement: Verified platforms and runtimes
Continuous integration SHALL run on `windows-latest`, `ubuntu-latest` and `macos-latest`, each on Node.js 22 and 24, with `fail-fast` disabled so that one failing leg does not cancel the others.

#### Scenario: Full matrix
- **WHEN** the workflow is triggered by a push or a pull request
- **THEN** six jobs run, one per operating system and Node version

#### Scenario: One failure does not hide the rest
- **WHEN** the `windows-latest` Node 22 job fails
- **THEN** the other five jobs still run to completion

### Requirement: Verification commands
Each job SHALL run, in order: `npm ci`; `node --test`; `node rules/build.mjs --check`; and OpenSpec validation of all specs and changes through the pinned CLI's JavaScript entry. No step SHALL rely on a `.cmd` shim or on a globally installed CLI.

#### Scenario: Validation uses the pinned CLI
- **WHEN** the validation step runs on `windows-latest`
- **THEN** it invokes `node` with a path under `node_modules/@fission-ai/openspec/`, not `openspec` or `npx`

#### Scenario: Any failing command fails the job
- **WHEN** any of the four commands exits non-zero
- **THEN** the job fails

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
