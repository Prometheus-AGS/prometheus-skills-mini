## ADDED Requirements

### Requirement: Supported Node.js range
The project SHALL declare Node.js 22 or newer as its only supported runtime in `package.json` `engines.node`, and SHALL declare `"type": "module"` and `"private": true`.

#### Scenario: Manifest declares the runtime
- **WHEN** `package.json` is read
- **THEN** `engines.node` is `>=22`, `type` is `module`, and `private` is `true`

### Requirement: npm scripts
The project SHALL provide npm scripts `test` (`node --test`), `check` (`node rules/build.mjs --check`) and `coverage` (`node --test --experimental-test-coverage`), and each SHALL be a single command with no shell chaining.

#### Scenario: Tests run through npm
- **WHEN** `npm test` runs in a clean checkout after `npm ci`
- **THEN** it exits 0 and reports the same tests as `node --test`, and no test file under `node_modules/` is executed

#### Scenario: No chained commands
- **WHEN** the `scripts` values are inspected
- **THEN** none contains `&&`, `||` or `;`

### Requirement: Testing conventions
Tests SHALL use `node:test` with `node:assert/strict` and no other framework. Each test SHALL be structured as Arrange, then Act, then Assert, in that order, with one behaviour per test and a name that states the behaviour; marker comments are optional. Behaviour SHALL be added test-first, and the evidence SHALL be in history: for every change that adds or alters behaviour, a commit containing the failing test precedes the commit that makes it pass, and the change's `tasks.md` records the failing output under its RED task.

#### Scenario: Test-first is visible in history
- **WHEN** `git log --reverse` is read for a change that added behaviour
- **THEN** the commit that introduces the test file comes before the commit that introduces or changes the implementation it tests

#### Scenario: RED output is recorded
- **WHEN** a completed change's `tasks.md` is read
- **THEN** each RED task carries the failing assertion or error message it produced

#### Scenario: Structure is reviewable
- **WHEN** a test is reviewed
- **THEN** its arrangement, its single action and its assertions appear in that order, and it asserts one behaviour

#### Scenario: No test framework is installed
- **WHEN** `package.json` is read
- **THEN** it lists no test runner or assertion library

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
