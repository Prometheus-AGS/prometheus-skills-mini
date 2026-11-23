## ADDED Requirements

### Requirement: Immutable native releases
A Mini main version bump SHALL produce versioned executables for pk, prometheus, liter-llm and surreal-memory-server on x86_64 and ARM64 macOS, Windows and Linux glibc. A tag or manual release SHALL resolve to a main commit matching the declared version.

#### Scenario: Matrix completes
- **WHEN** every source-pinned build provides its artifact
- **THEN** publication binds a complete SHA-256 inventory to the immutable version tag

### Requirement: Verified installation
The native installer SHALL prefer the current pack version and host, verify the checksum before replacing an owned binary, and compile the pinned revision when the target asset is absent.

#### Scenario: Damaged download
- **WHEN** an advertised executable has an incorrect digest
- **THEN** the installation fails and any previous binary remains in place
