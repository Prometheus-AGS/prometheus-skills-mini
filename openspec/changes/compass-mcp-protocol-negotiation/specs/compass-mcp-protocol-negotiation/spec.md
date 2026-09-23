## Purpose

Allow The Boss and other supported MCP clients to negotiate Compass sessions without removing the newer discovery lifecycle.

## ADDED Requirements

### Requirement: Legacy initialization interoperability
Compass SHALL support initialization for 2025-11-25, 2025-06-18 and 2025-03-26 through stdio and Streamable HTTP, return the negotiated version, and serve tools/list afterward.

#### Scenario: The Boss connects
- **WHEN** The Boss's SDK initiates a stdio session with 2025-11-25
- **THEN** initialization succeeds and tools/list returns the Compass catalog

#### Scenario: Legacy HTTP session
- **WHEN** an authenticated supported legacy client initializes without a protocol-version header
- **THEN** a session is established and subsequent tools/list succeeds with valid SSE framing

### Requirement: Preserve discovery behavior and HTTP protection
Compass SHALL preserve 2026-07-28 discovery, reject initialize for that revision, retain authentication and host protections, and list the supported revisions in unsupported-version HTTP errors.

#### Scenario: Discovery revision requests initialize
- **WHEN** a client requests initialize with 2026-07-28
- **THEN** Compass returns method-not-found directing it to server/discover

#### Scenario: Existing discovery lifecycle
- **WHEN** a conforming 2026-07-28 client discovers and lists tools
- **THEN** discovery and tools/list succeed

#### Scenario: Unauthorized HTTP request
- **WHEN** a client omits the required API credential
- **THEN** the request remains unauthorized regardless of protocol revision
