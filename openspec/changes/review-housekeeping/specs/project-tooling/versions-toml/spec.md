## ADDED Requirements

### Requirement: versions.toml is the version authority, and the tree cannot drift from it silently
`versions.toml` at the repository root SHALL be authored by the operator, never by an agent. It SHALL name, for every submodule under `tools/`, the commit the parent repository's gitlink pins; the Node engine floor; and every container image the pack starts, each either by digest or marked as built from a submodule. **Image completeness — that every service in `docker/compose.yaml` has an `[images]` entry — is checked by change `docker-services`, which is the change that creates that file; this change checks only the shape and internal consistency of the entries `versions.toml` declares, because there is no compose file to compare against yet.** A library module `rules/lib/versions-toml.mjs` SHALL parse the file and compare it to the tree, returning named disagreements, and a test consuming it SHALL fail on any disagreement; while the file is absent the test SHALL report `todo` with the reason, never pass vacuously.

#### Scenario: A submodule pin that disagrees with the gitlink fails
- **WHEN** `versions.toml` names `tools/prometheus-knowledge = "abb6745"` and `git ls-tree HEAD tools/prometheus-knowledge` reports a different commit
- **THEN** `rules/test/versions-toml.test.mjs` fails naming the path, the file's commit and the tree's commit

#### Scenario: The file is absent
- **WHEN** `versions.toml` does not exist
- **THEN** the test is reported `todo` with the reason "operator has not authored versions.toml", and no other test in the suite depends on it

#### Scenario: An image without a digest must say why
- **WHEN** an `[images]` entry has neither `digest` nor `built_from_submodule = true`
- **THEN** the test fails naming the entry

#### Scenario: A pin that is not a commit sha cannot match anything
- **WHEN** a `[submodules]` value is empty or is not 7–40 hex digits
- **THEN** the test fails naming the path and the value, rather than prefix-matching every commit

#### Scenario: Submodule completeness is scoped to tools/
- **WHEN** `HEAD` has a gitlink under `tools/` that `[submodules]` does not name
- **THEN** the test fails naming that path; a gitlink outside `tools/` is not reported

#### Scenario: A duplicate key is a parse error, not a silent overwrite
- **WHEN** a table declares the same key twice
- **THEN** parsing raises rather than keeping the last value

### Requirement: The review inputs and the completed analysis change are tracked and archived
`COMPARE.md`, `TOOL_ANALYSIS.md` and the change `analyze-rust-tools-windows-portability` SHALL be committed unmodified, and that change SHALL be archived with the OpenSpec CLI, through `spawnNodeCli`, so that it no longer appears among the active changes and none of its files remain tracked under `openspec/changes/<id>/`. This requirement is scoped to that one change: the PARENT phase's completed changes (`karpathy-progress-recorder`, `okf-v02-via-pk`) are archived by that phase's own reflect stage and are out of scope here.

#### Scenario: The assessment's citations resolve from a clean clone
- **WHEN** the repository is cloned at HEAD
- **THEN** `COMPARE.md` and `TOOL_ANALYSIS.md` exist at the root and `openspec/changes/archive/` contains `analyze-rust-tools-windows-portability`

#### Scenario: The archive moves the change rather than copying it
- **WHEN** `git ls-tree -r HEAD` is read after the archive
- **THEN** no path under `openspec/changes/analyze-rust-tools-windows-portability/` is tracked, and the change's files appear only under the dated directory in `openspec/changes/archive/`
