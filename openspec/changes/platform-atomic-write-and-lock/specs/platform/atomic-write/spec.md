## ADDED Requirements

### Requirement: Atomic replacement
`atomicWrite(path, content)` SHALL write to a temporary file in the same directory as `path` and then rename it over `path`, creating missing parent directories, so that a reader never observes a partially written file.

#### Scenario: Successful write
- **WHEN** `atomicWrite` completes
- **THEN** `path` holds exactly `content` and no temporary file remains in the directory

#### Scenario: A bystander file is never truncated
- **WHEN** a file already exists at the temporary path `atomicWrite` would use
- **THEN** that file is left exactly as it was — the temporary file is created exclusively, so a collision can never overwrite it

#### Scenario: A colliding temporary name is retried, not fatal
- **WHEN** the first candidate temporary name is already taken
- **THEN** `atomicWrite` tries a fresh random name and completes, because a random-suffix collision is a freak transient event, not a caller error

#### Scenario: Repeated collisions are bounded
- **WHEN** every candidate name is taken
- **THEN** `atomicWrite` gives up after a fixed number of attempts and rethrows `EEXIST` rather than looping

#### Scenario: Missing parent directories
- **WHEN** `atomicWrite` targets `<dir>/a/b/file.json` and neither `a` nor `b` exists
- **THEN** both are created, the file holds exactly `content`, and no temporary file remains

#### Scenario: Failure leaves the original intact
- **WHEN** the rename fails with an error that is not retried
- **THEN** the previous content of `path` is unchanged, the temporary file is removed, and the error is rethrown

### Requirement: Bounded rename retry on Windows
On `win32` only, when the rename fails with `EPERM`, `EBUSY` or `EACCES`, `atomicWrite` SHALL retry a fixed, small number of times with increasing delay and SHALL rethrow the last error when the attempts are exhausted. On every other platform, and for every other error code, it SHALL NOT retry.

#### Scenario: Transient sharing violation
- **WHEN** on `win32` the rename fails twice with `EBUSY` and then succeeds
- **THEN** `atomicWrite` resolves and the rename was attempted three times

#### Scenario: Attempts exhausted
- **WHEN** on `win32` every rename attempt fails with `EPERM`
- **THEN** `atomicWrite` rejects with that `EPERM` after exactly the configured number of attempts and removes the temporary file

#### Scenario: No retry elsewhere
- **WHEN** on `linux` or `darwin` the rename fails with `EBUSY`
- **THEN** it is attempted once and the error is rethrown

#### Scenario: No retry for other errors
- **WHEN** on `win32` the rename fails with `ENOSPC`
- **THEN** it is attempted once and the error is rethrown

#### Scenario: Real held-open destination
- **WHEN** on `win32` another handle holds the destination open without delete sharing and releases it shortly after
- **THEN** `atomicWrite` eventually succeeds

### Requirement: The rules build writes atomically through the platform module
`rules/build.mjs` SHALL use `atomicWrite` from `lib/platform/` and SHALL define no write helper of its own.

#### Scenario: No private writer
- **WHEN** `rules/build.mjs` is inspected
- **THEN** it contains no `renameSync` call
