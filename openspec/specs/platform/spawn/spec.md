# platform/spawn Specification

## Purpose
TBD - created by archiving change platform-spawn. Update Purpose after archive.

## Requirements

### Requirement: Node CLIs run without a shell
`spawnNodeCli(packageName, binName, args)` SHALL resolve the JavaScript file named by `binName` in the installed package's `package.json` `bin` field and SHALL start it as `process.execPath <file> ...args` with `shell: false`.

#### Scenario: OpenSpec by its JavaScript entry
- **WHEN** `spawnNodeCli("@fission-ai/openspec", "openspec", ["--version"])` runs
- **THEN** the child is the current Node executable, its first argument is a path ending in `bin/openspec.js`, `shell` is `false`, and the output is `1.10.0`

#### Scenario: Works with no global install
- **WHEN** no `openspec` executable is on `PATH`
- **THEN** the call still succeeds

#### Scenario: Unknown bin
- **WHEN** `binName` is not a key of the package's `bin` field
- **THEN** it rejects with an error naming the package and the available bins

### Requirement: Real executables run by name
`spawnExecutable(name, args)` SHALL start a real executable by name with `shell: false` and an argument array.

#### Scenario: git
- **WHEN** `spawnExecutable("git", ["--version"])` runs
- **THEN** it resolves with exit code 0 and `shell` was `false`

### Requirement: Script-only tools are refused
Neither function SHALL start a `.cmd` or `.bat` file, enable a shell, or accept a command string. A request that could only be satisfied that way SHALL be rejected with an error that states that Node cannot run `.cmd`/`.bat` files without a shell and names `spawnNodeCli` as the alternative.

#### Scenario: A bare name that resolves to a script
- **WHEN** `spawnExecutable("tsc", [])` is called on a system where `tsc` resolves through `PATHEXT` to `tsc.cmd`
- **THEN** it is refused before spawning, and the error names both the spelling used and the file it resolved to

#### Scenario: A .cmd path
- **WHEN** `spawnExecutable("tool.cmd", [])` is called
- **THEN** it rejects before spawning anything, with that explanation

#### Scenario: Arguments are never concatenated
- **WHEN** an argument contains spaces, quotes or `&`
- **THEN** it reaches the child as one unmodified argument

#### Scenario: Constraint stays clean
- **WHEN** the blocking constraint `no-shell-true` runs
- **THEN** it finds nothing

### Requirement: Shell-free spec validation entry point
`scripts/spec-validate.mjs` SHALL run `openspec validate --all --no-interactive` through `spawnNodeCli`, forward the child's output, and exit with the child's exit code. It SHALL contain no logic beyond that. An npm script `spec:validate` SHALL invoke it. (The CI step that uses it is specified by this change's MODIFIED delta to `continuous-integration`.)

#### Scenario: Exit code is forwarded
- **WHEN** OpenSpec validation fails
- **THEN** `node scripts/spec-validate.mjs` exits with the same non-zero code

#### Scenario: npm script
- **WHEN** `npm run spec:validate` runs
- **THEN** it behaves exactly as `node scripts/spec-validate.mjs`
