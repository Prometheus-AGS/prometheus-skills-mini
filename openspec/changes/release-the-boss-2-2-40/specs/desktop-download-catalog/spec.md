# Spec Delta

## ADDED Requirements

### Requirement: The live catalog exposes verified 2.2.40 downloads
After both installers are public, the landing site SHALL show Mac ARM64 and Windows x64 downloads for The Boss 2.2.40, each linked to bytes matching the published release manifest.

#### Scenario: Both platform publications complete
- **WHEN** the two immutable installer records have been verified and synchronized
- **THEN** the live site shows version 2.2.40 with resolving Mac ARM64 and Windows x64 links

#### Scenario: A platform publication fails
- **WHEN** either installer is missing or its public bytes fail size or checksum verification
- **THEN** the site does not present a partial 2.2.40 release as complete
