## ADDED Requirements

### Requirement: Application owns runtime MCP configuration
The shipped runtime configuration SHALL contain no MCP server presets and SHALL preserve explicitly supplied application configuration and separate developer tooling configuration.

#### Scenario: Empty shipped map
- **WHEN** the shipped root mcp.json is loaded
- **THEN** its mcpServers map has no entries

#### Scenario: Explicit application configuration
- **WHEN** an application supplies a server through the existing configuration interface
- **THEN** the empty shipped map does not replace that explicit configuration

#### Scenario: Separate developer configuration
- **WHEN** shipped runtime presets are removed
- **THEN** developer .mcp.json and application credential storage are unchanged
