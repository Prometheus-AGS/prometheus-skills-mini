## ADDED Requirements

### Requirement: Windows checkout supports tracked long paths
The Windows jobs SHALL enable Git long-path support before repository checkout while preserving `core.autocrlf=true` for the same checkout.

#### Scenario: Checkout includes long evidence paths
- **WHEN** a Windows job checks out tracked evidence paths that exceed the platform's legacy path limit
- **THEN** checkout completes with `core.longpaths=true` and `core.autocrlf=true` already configured
