# Packaged profile isolation

## Purpose

Let operators launch an explicitly selected packaged Boss profile without reading or writing their ordinary configuration, data or logs.

## ADDED Requirements

### Requirement: Explicit private startup root

Boss SHALL accept an optional THE_BOSS_PROFILE_ROOT absolute existing writable directory. Explicit invalid selection MUST terminate startup before application configuration, logger or profile writes. An absent variable SHALL preserve existing startup selection and compatibility.

#### Scenario: Packaged private selection
- **GIVEN** a fresh private root and the actual packaged executable
- **WHEN** Boss starts with THE_BOSS_PROFILE_ROOT selected
- **THEN** boot configuration, application configuration, userData, sessionData, application logs, owned temporary data and supervised UAR persistence resolve beneath that root before their first use.

#### Scenario: Explicit invalid selection
- **GIVEN** a relative path, nonexistent directory, file or inaccessible selected root
- **WHEN** the actual packaged executable starts
- **THEN** startup fails with a fixed nonsecret category, selects no ordinary fallback and creates no profile or tool effect.

#### Scenario: Ordinary selection remains compatible
- **GIVEN** no private-root variable
- **WHEN** the existing startup path is resolved
- **THEN** packaged boot-map/portable/branded selection and development suffix behavior retain their existing precedence; absence is not an error.

### Requirement: Private root wins before configuration consumers

Explicit private selection SHALL take precedence over private boot-map relocation and development suffixes. Its configuration SHALL NOT redirect startup outside the selected root. Configuration/logger singletons, Electron single-instance locking and frozen path registry MUST consume the selected paths.

#### Scenario: Conflicting private boot map
- **GIVEN** a selected private root containing an executable mapping to a second disposable root
- **WHEN** packaged Boss starts
- **THEN** its resolved profile stays in the selected root, and the conflicting root receives no startup write.

### Requirement: Bundled execution remains authoritative

Private startup SHALL retain the normal packaged sidecar selection, authenticated readiness and one UAR-owned execution path. A private root MUST NOT select an external UAR override, bypass approvals or import executable authority from old transcripts.

#### Scenario: Bundle selected
- **WHEN** the actual packaged app runs with private startup and no external override
- **THEN** observed binarySource is bundle and the managed child executable/digest match that bundle's UAR payload, with app.isPackaged true and successful authenticated readiness.

### Requirement: Evidence does not disclose credentials

Acceptance SHALL record only allowlisted path/source metadata, categories, booleans and counts. Known synthetic system credential canaries MUST remain absent from ordinary logs, retained evidence and model-visible projections. Trace/screenshot/raw-stream capture MUST NOT expose them.

#### Scenario: Controlled canary through real execution
- **WHEN** the private packaged profile exercises configured model/MCP credentials and exact approval/tool execution
- **THEN** authorized transport uses its fixture credential while the retained evidence and ordinary projections contain no canary, and target effect counts remain attributable to the admitted run.
