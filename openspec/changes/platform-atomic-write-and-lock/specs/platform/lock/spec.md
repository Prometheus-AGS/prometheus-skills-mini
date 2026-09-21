## ADDED Requirements

### Requirement: Exclusive-create lock
`acquireLock(path)` SHALL create `path` with the exclusive flag (`wx`) and return a function that releases the lock by removing it. When `path` already exists it SHALL reject with an error that names the lock file.

#### Scenario: Uncontended
- **WHEN** `acquireLock` is called and no lock file exists
- **THEN** the lock file exists until the returned release function is called, and not after

#### Scenario: Contended
- **WHEN** `acquireLock` is called while the lock file exists
- **THEN** it rejects immediately with an error whose message contains the lock path, and does not wait or retry

### Requirement: Explicit non-guarantees
The lock SHALL NOT attempt stale-lock detection, waiting, or takeover.

#### Scenario: Stale lock is not recovered
- **WHEN** a lock file is left behind by a crashed process
- **THEN** `acquireLock` rejects, and the error message tells the operator which file to remove

### Requirement: Single-writer rules build
A write run of `rules/build.mjs` SHALL hold a lock for its duration and release it on success and on failure; a `--check` run SHALL NOT take the lock.

#### Scenario: Concurrent write runs
- **WHEN** a second write run starts while the first holds the lock
- **THEN** the second exits non-zero with a message naming the lock file and writes nothing

#### Scenario: Released on failure
- **WHEN** a write run throws after acquiring the lock
- **THEN** the lock file is gone afterwards
