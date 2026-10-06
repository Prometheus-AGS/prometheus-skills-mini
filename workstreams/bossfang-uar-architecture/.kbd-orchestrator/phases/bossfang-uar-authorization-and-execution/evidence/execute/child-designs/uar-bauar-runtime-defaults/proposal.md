# Application-owned MCP configuration

## Why

The operator explicitly selected no external receiver or identity provider and requested removal of runtime defaults because the application supplies configuration.

## What Changes

Empty the shipped root mcp.json server map. Preserve explicit application catalog/grant inputs and developer .mcp.json. No other configuration or runtime source changes.

## Capabilities

### New Capabilities
- application-owned-mcp-defaults: ship no implicit runtime server presets.

## Impact

Only the isolated UAR root mcp.json changes. This intentionally removes Tavily, Surreal Memory and Kreuzberg presets. Existing application configuration remains operator/application-owned. Runtime acceptance is deferred with parent 04/9–10.
