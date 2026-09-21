# platform/text Specification

## Purpose
TBD - created by archiving change platform-paths-and-text. Update Purpose after archive.

## Requirements

### Requirement: One text reader
`lib/platform/text.mjs` SHALL provide `readText(path)`, which reads UTF-8 and returns content with every CRLF replaced by LF. Every parser in this repository SHALL read files through it.

#### Scenario: CRLF input
- **WHEN** `readText` reads a file containing `a\r\nb\r\n`
- **THEN** it returns `a\nb\n`

#### Scenario: LF input is unchanged
- **WHEN** `readText` reads a file containing `a\nb\n`
- **THEN** it returns the same string

#### Scenario: The rules build uses it
- **WHEN** `rules/build.mjs` is inspected
- **THEN** it imports `readText` from `lib/platform/text.mjs` and defines no reader of its own

### Requirement: Parsers tolerate CRLF directly
`parseConf`, `splitFrontmatter`, `routingLayer0` and the line counter in `rules/lib/render.mjs` SHALL produce the same result for CRLF input as for the LF equivalent, without relying on the caller to normalise.

#### Scenario: Frontmatter with CRLF
- **WHEN** `splitFrontmatter` receives a rule file whose line endings are CRLF
- **THEN** it returns the same `front` and `body` as for the LF file, instead of throwing that `paths:` frontmatter is missing

#### Scenario: Routing table with CRLF
- **WHEN** `routingLayer0` receives a CRLF routing document
- **THEN** its output equals the output for the LF document

### Requirement: The rules build is line-ending independent
`node rules/build.mjs --check` SHALL exit 0 when `rules/src/` and the generated targets have CRLF line endings on disk.

#### Scenario: CRLF working tree
- **WHEN** a copy of the repository has every file under `rules/src/` and every generated target converted to CRLF
- **THEN** `node rules/build.mjs --check` run in that copy exits 0
