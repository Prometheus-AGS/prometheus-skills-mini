## ADDED Requirements

### Requirement: Location helpers
`lib/platform/paths.mjs` SHALL provide `homeDir()`, `tempDir()`, `stateDir(...parts)` and `join(...parts)` built on `node:os` and `node:path`, and SHALL accept injected home and temp roots so that tests never touch the real home directory.

#### Scenario: Home directory
- **WHEN** `homeDir()` is called with no injected root
- **THEN** it returns `os.homedir()`

#### Scenario: Injected roots
- **WHEN** the helpers are created with home root `H` and temp root `T`
- **THEN** `stateDir("a","b")` is `path.join(H, ".prometheus", "a", "b")` and `tempDir()` is `T`

#### Scenario: Native separators
- **WHEN** `join("a","b")` runs on `win32`
- **THEN** the result uses the platform separator and contains no hardcoded `/`

### Requirement: No environment or literal locations
No module in this repository other than `lib/platform/paths.mjs` SHALL read a home or temp location from the environment or from a literal.

#### Scenario: Constraint stays clean
- **WHEN** the blocking constraint `no-home-or-tmp-literals` runs
- **THEN** it finds no `$HOME`, `process.env.HOME` or `/tmp/` in any `.mjs` under `lib/`, `scripts/`, `hooks/` or `rules/`
