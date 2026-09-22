## ADDED Requirements

### Requirement: The mini vendors its tools as source, pinned to released commits
The repository SHALL vendor `compass`, `rust-mcp-filesystem`, `openspec` and
`sycophancy-correction` as git submodules under `tools/`. Each gitlink SHALL point at a commit that
is reachable on the submodule's remote and that carries a published release tag. `.gitmodules`
SHALL use `https://` URLs so a clone succeeds without SSH credentials.

A submodule pinned to a commit that exists only locally is a defect: every other clone and every CI
run would fail to fetch it.

#### Scenario: Every pinned commit is fetchable
- **WHEN** the repository is cloned fresh and `git submodule update --init` runs
- **THEN** every submodule under `tools/` checks out at the pinned commit, with no fetch failure

#### Scenario: A pin without a release is refused
- **WHEN** a submodule is pinned to a commit that carries no release tag on its remote
- **THEN** the change is not complete; the pin waits for the release rather than tracking a branch tip

### Requirement: Vendored submodules are named by the version authority
Every gitlink under `tools/` SHALL be named in `versions.toml`. This is already enforced by
`rules/lib/versions-toml.mjs` `compareToTree`, whose completeness check reports any `tools/` gitlink
the file does not name; adding the four submodules extends that existing obligation rather than
creating a new mechanism.

#### Scenario: A new submodule that versions.toml does not name is reported
- **WHEN** a submodule is added under `tools/` and `versions.toml` does not name it
- **THEN** `rules/test/versions-toml.test.mjs` fails naming that path
