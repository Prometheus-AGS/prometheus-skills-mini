# platform/paths Specification

## Purpose
TBD - created by archiving change platform-paths-and-text. Update Purpose after archive.

## Requirements

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
No module in this repository other than `lib/platform/paths.mjs` SHALL read a home or temp location from the environment, from a literal, or from `node:os` — with one exemption: `lib/platform/paths.test.mjs` MAY call `os.homedir()` and `os.tmpdir()` solely to assert that the default helpers delegate to the real operating system, which cannot be asserted through the helpers without becoming a tautology. The exemption is named in the enforcing check, so it cannot widen silently.

#### Scenario: No literals anywhere
- **WHEN** the blocking constraint `no-home-or-tmp-literals` runs
- **THEN** it finds no `$HOME`, `process.env.HOME` or `/tmp/` in any `.mjs` under `lib/`, `scripts/`, `hooks/` or `rules/`

#### Scenario: Only the helpers reach the operating system
- **WHEN** the blocking constraint `os-locations-only-via-platform` runs
- **THEN** it finds no `os.homedir()` or `os.tmpdir()` call outside `lib/platform/paths.mjs` and the named test exemption

#### Scenario: A new direct caller is rejected
- **WHEN** any other module calls `os.tmpdir()`
- **THEN** that constraint reports the file and line
