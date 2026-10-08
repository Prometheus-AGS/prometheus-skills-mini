# Spec Delta

## Purpose

Ensures every default OS home/temp acquisition flows through the platform path adapter — including waypoint environment interpolation — so roots stay injectable, overrides keep their precedence, and no module outside the platform layer asks the OS where things live.

## ADDED Requirements

### Requirement: Production callers resolve locations through the platform adapter

The cadence KBD adapter scratch directory, the managed OpenSpec cache home default, and the service discovery default home SHALL resolve through `lib/platform/paths.mjs` helpers. No new path abstraction SHALL be introduced; the existing adapter is extended minimally where its ownership rule requires.

#### Scenario: Location constraint is clean for attributed callers

- **WHEN** the `os-locations-only-via-platform` constraint is evaluated after the repair
- **THEN** no attributed production caller reports a match, and the platform adapter remains the only module acquiring OS locations

### Requirement: Managed cache override precedence is preserved

The managed OpenSpec state cache SHALL continue to honor the `PROMETHEUS_OPENSPEC_HOME` environment override ahead of the default home-derived location, and its receipts, lock contention and timeout behaviors SHALL remain unchanged.

#### Scenario: Override wins

- **WHEN** `PROMETHEUS_OPENSPEC_HOME` is set to a supplied directory
- **THEN** lock and receipt operations resolve under that directory, not the default home location

### Requirement: Discovery supplied-home contract is preserved

Service discovery SHALL continue to accept a caller-supplied home root that takes precedence over the platform default, and SHALL continue to read metadata only — it SHALL NOT become service setup.

#### Scenario: Supplied root is used

- **WHEN** discovery is invoked with an explicit home root containing prepared metadata
- **THEN** results derive from that root and no other location is consulted

### Requirement: Waypoint interpolation contract is preserved exactly

`expandKbdPath` SHALL expand exactly the braced and unbraced `HOME` and `USER` token forms against its environment argument. An omitted environment argument SHALL mean `process.env`. A missing, null or empty home/user value SHALL expand to the empty string. Unrecognized tokens SHALL pass through byte-identical. No OS-home fallback SHALL be introduced into interpolation.

#### Scenario: Omitted environment uses the process environment

- **WHEN** interpolation runs without an environment argument and the process environment has a home value set (or unset)
- **THEN** expansion uses that value (or the empty string) exactly as before the repair

#### Scenario: Explicit environment edge cases

- **WHEN** interpolation runs with an explicit environment whose home is missing, null, empty or a custom value
- **THEN** expansion yields the empty string for missing/null/empty and the custom value otherwise, for both braced and unbraced forms

#### Scenario: User substitution and unknown-token passthrough

- **WHEN** input contains user tokens and an unrecognized token
- **THEN** user tokens substitute from the environment and the unrecognized token is returned byte-identical

### Requirement: Token spellings are constructed without scanned literals

Waypoint source and tests SHALL construct home-token spellings from components so the literal home/temp constraint passes, while expansion behavior stays byte-identical. Explanatory literal examples SHALL live in documentation, not scanned source.

#### Scenario: Literal constraint passes with behavior intact

- **WHEN** the `no-home-or-tmp-literals` constraint and the waypoint interpolation acceptance cases are both evaluated
- **THEN** the constraint reports zero matches and every interpolation acceptance case above holds

### Requirement: Attributed test fixtures inject roots through the platform adapter

The attributed integration tests and fixtures (context-bootstrap, ideation dispatch/independence, dispatch assertion, dispatch recording, UI/UX routing) SHALL obtain scratch roots from the platform temp helper rather than direct OS calls, preserving their fixture semantics.

#### Scenario: Fixtures run on injected roots

- **WHEN** the attributed fixtures execute after the repair
- **THEN** they create and clean their scratch trees under the platform-provided temp root and their assertions pass unchanged
