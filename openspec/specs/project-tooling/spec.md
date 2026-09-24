# project-tooling Specification

## Purpose
TBD - created by archiving change project-scaffold. Update Purpose after archive.

## Requirements

### Requirement: Supported Node.js range
The project SHALL declare Node.js 22 or newer as its only supported runtime in `package.json` `engines.node`, and SHALL declare `"type": "module"` and `"private": true`.

#### Scenario: Manifest declares the runtime
- **WHEN** `package.json` is read
- **THEN** `engines.node` is `>=22`, `type` is `module`, and `private` is `true`

### Requirement: npm scripts
The project SHALL provide npm scripts `test` (`node --test`), `check` (`node rules/build.mjs --check`) and `coverage`, and each SHALL be a single command with no shell chaining. `coverage` SHALL report line coverage for every source file the test runner instruments, SHALL additionally report it for each file listed as a child-process target (which the default reporter cannot see), and SHALL exit non-zero when a listed target falls below its threshold.

#### Scenario: Tests run through npm
- **WHEN** `npm test` runs in a clean checkout after `npm ci`
- **THEN** it exits 0 and reports the same tests as `node --test`, and no test file under `node_modules/` is executed

#### Scenario: No chained commands
- **WHEN** the `scripts` values are inspected
- **THEN** none contains `&&`, `||` or `;`

### Requirement: Pinned OpenSpec CLI
The project SHALL depend on `@fission-ai/openspec` as a devDependency pinned to an exact version with a committed `package-lock.json`, and SHALL have no runtime dependencies.

#### Scenario: Exact pin
- **WHEN** `package.json` is read
- **THEN** `devDependencies["@fission-ai/openspec"]` is exactly `1.10.0` with no range operator, and `dependencies` is absent or empty

#### Scenario: CLI is runnable without a global install
- **WHEN** `node node_modules/@fission-ai/openspec/bin/openspec.js --version` runs after `npm ci`
- **THEN** it prints `1.10.0` and exits 0

### Requirement: Line-ending normalisation
The repository SHALL contain a `.gitattributes` that normalises text to LF on commit and checkout (`* text=auto eol=lf`) and marks image types as binary.

#### Scenario: Text is stored as LF
- **WHEN** `git ls-files --eol` is run over tracked text files
- **THEN** every one reports `i/lf`

#### Scenario: Hostile autocrlf does not rewrite sources
- **WHEN** the repository is checked out with `core.autocrlf=true`
- **THEN** working-tree text files are LF

### Requirement: Completed-behavior integration conventions
New acceptance tests SHALL use node:test with node:assert/strict and SHALL exercise completed production entry points across real collaborating boundaries. Production implementation SHALL be coherent before tests are authored or run. Unit, module-local, mocked-only and per-edit tests SHALL NOT count as completion evidence. Existing legacy tests MAY remain; their presence does not authorize test-first implementation. Arrange, Act and Assert order SHALL remain reviewable.
#### Scenario: Completed production behavior
- **WHEN** a change adds behavior
- **THEN** its production path is implemented before its integration acceptance scenario is authored and run
#### Scenario: Evidence records the actual boundary
- **WHEN** a completed change is reported
- **THEN** tasks.md records the real integration command and result without requiring fabricated RED history
#### Scenario: Structure is reviewable
- **WHEN** an integration test is reviewed
- **THEN** arrangement, action and assertions appear in that order and exercise actual collaborators
#### Scenario: No test framework is installed
- **WHEN** package.json is read
- **THEN** it lists no additional test runner or assertion library
