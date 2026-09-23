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
Compass SHALL preserve 2026-07-28 discovery, reject initialize for that revision, retain authentication and host protections, list the supported revisions in unsupported-version HTTP errors, and bound simultaneous legacy HTTP sessions.

#### Scenario: Discovery revision requests initialize
- **WHEN** a client requests initialize with 2026-07-28
- **THEN** Compass returns method-not-found directing it to server/discover

#### Scenario: Existing discovery lifecycle
- **WHEN** a conforming 2026-07-28 client discovers and lists tools
- **THEN** discovery and tools/list succeed

#### Scenario: Unauthorized HTTP request
- **WHEN** a client omits the required API credential
- **THEN** the request remains unauthorized regardless of protocol revision

#### Scenario: Legacy session capacity
- **WHEN** 64 legacy HTTP sessions remain active and another client initializes
- **THEN** Compass returns HTTP 429 with MCP error `-32024` without allocating more session state

### Requirement: Windows release storage profile
The official Compass Windows binary SHALL support JSON, SQLite and SurrealDB remote storage. It SHALL leave embedded SurrealKV and RocksDB disabled and SHALL interoperate with the SurrealDB 3.2.4 service supplied by surreal-memory-server.

#### Scenario: Release feature compilation
- **WHEN** Compass is built for Windows with the official release feature profile
- **THEN** the binary links with JSON, SQLite and SurrealDB remote capabilities enabled

#### Scenario: Shared remote database round trip
- **WHEN** Compass publishes a graph to the shared SurrealDB 3.2.4 endpoint and searches it through the remote engine
- **THEN** the search returns records written by that update without requiring an embedded Compass database
