## Purpose

Defines how the public The Boss website presents the current supported desktop installers without inheriting stale or unsupported platform downloads.

## ADDED Requirements

### Requirement: Current release declares its supported platform set
Release metadata consumed by the landing site SHALL declare the supported platform set for that release. The `2.2.1` set SHALL contain both Windows architectures and both macOS architectures and SHALL exclude Linux.

#### Scenario: Release data is synchronized
- **WHEN** the landing-site synchronizer reads the completed `2.2.1` release entry
- **THEN** it generates exactly four current-release download rows and does not carry forward an older Linux row

### Requirement: Download presentation matches published assets
Each displayed download SHALL use the version, platform, architecture, URL, size, and checksum from the verified GitHub Release manifest.

#### Scenario: Customer chooses a platform download
- **WHEN** the live site displays a `2.2.1` installer
- **THEN** its link resolves to the matching GitHub Release asset and its recorded metadata matches the downloaded bytes

### Requirement: Site publication follows release publication
The website SHALL be updated only after the corresponding release assets and aggregate manifest exist. A failed or missing target SHALL NOT be advertised as current.

#### Scenario: Release asset is unavailable
- **WHEN** a target artifact is absent or its URL does not resolve during synchronization
- **THEN** site publication fails rather than displaying an unavailable current download

### Requirement: Live deployment is verified
Completion SHALL require the deployed `the-boss.know-me.tools` page to show the current version and resolving links for all four supported targets.

#### Scenario: Deployment completes
- **WHEN** the landing-site deployment reports success
- **THEN** a live check confirms version `2.2.1` and successful responses for the Windows x64, Windows ARM64, Apple Silicon, and Mac Intel links
