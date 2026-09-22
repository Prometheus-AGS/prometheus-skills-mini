## ADDED Requirements

### Requirement: versions.toml is the version authority, and the tree cannot drift from it silently
`versions.toml` at the repository root SHALL be authored by the operator, never by an agent. It SHALL name, for every submodule under `tools/`, the commit the parent repository's gitlink pins; the Node engine floor; and every container image the pack starts, each either by digest or marked as built from a submodule. A library module `rules/lib/versions-toml.mjs` SHALL parse the file and compare it to the tree, returning named disagreements, and a test consuming it SHALL fail on any disagreement; while the file is absent the test SHALL report `todo` with the reason, never pass vacuously.

#### Scenario: A submodule pin that disagrees with the gitlink fails
- **WHEN** `versions.toml` names `tools/prometheus-knowledge = "abb6745"` and `git ls-tree HEAD tools/prometheus-knowledge` reports a different commit
- **THEN** `rules/test/versions-toml.test.mjs` fails naming the path, the file's commit and the tree's commit

#### Scenario: The file is absent
- **WHEN** `versions.toml` does not exist
- **THEN** the test is reported `todo` with the reason "operator has not authored versions.toml", and no other test in the suite depends on it

#### Scenario: An image without a digest must say why
- **WHEN** an `[images]` entry has neither `digest` nor `built_from_submodule = true`
- **THEN** the test fails naming the entry

### Requirement: The review inputs and the completed analysis change are tracked and archived
`COMPARE.md`, `TOOL_ANALYSIS.md` and the change `analyze-rust-tools-windows-portability` SHALL be committed unmodified, and the change SHALL be archived with the OpenSpec CLI so that `openspec list` shows only open changes.

#### Scenario: The assessment's citations resolve from a clean clone
- **WHEN** the repository is cloned at HEAD
- **THEN** `COMPARE.md` and `TOOL_ANALYSIS.md` exist at the root and `openspec/changes/archive/` contains `analyze-rust-tools-windows-portability`
