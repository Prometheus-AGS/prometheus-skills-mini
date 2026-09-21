## ADDED Requirements

### Requirement: Hooks are registered in exec form
`hooks/hooks.json` SHALL register every hook as `{"type":"command","command":"node","args":[...]}` and SHALL NOT use a shell-string `command`. A shell string is interpreted by `sh -c` on POSIX and by PowerShell on Windows, which C1 and C3 forbid.

#### Scenario: Every entry is exec form
- **WHEN** `hooks/hooks.json` is parsed
- **THEN** every hook entry has `command` exactly `"node"` and a non-empty `args` array, and no entry's `command` contains a space, `&&`, `|`, `;` or a redirection

### Requirement: One entry point dispatches in-process by hook id
`scripts/hook-entry.mjs` SHALL be the only file named by `hooks/hooks.json`, SHALL read the hook id from its `--hook` argument, and SHALL dispatch through a static import map to `lib/hooks/<id>.mjs`. It SHALL NOT spawn a shell, a bash script or a compiled dispatcher.

#### Scenario: Dispatch reaches the payload
- **WHEN** `scripts/hook-entry.mjs --hook sessionstart-kbd-control --harness claude-code` runs
- **THEN** the module `lib/hooks/sessionstart-kbd-control.mjs` is invoked in the same process and the exit code is 0

#### Scenario: The map keys on the dispatch argument, not the matcher id
- **WHEN** the import map is inspected
- **THEN** its keys are the `--hook` values (hyphen-separated, e.g. `sessionstart-kbd-control`) and none is a matcher-level `id` (colon-separated, e.g. `sessionstart:kbd-control`)

#### Scenario: An unknown hook id is refused, not ignored
- **WHEN** `--hook` names an id absent from the map
- **THEN** it exits non-zero with a message naming the unknown id

#### Scenario: No shell is used
- **WHEN** the entry point starts any child process, if it starts one at all
- **THEN** `shell` is `false`

### Requirement: Every file the manifest names resolves
A test SHALL derive its file list from `hooks/hooks.json` itself and SHALL resolve every path that manifest names. The list SHALL NOT be hand-kept. The derivation SHALL be stated so that it cannot pass by classifying nothing as a path: the entry-point path is element 0 of each hook's `args` after expanding any harness variable, and the count of resolved paths SHALL equal the number of hook entries.

#### Scenario: Manifest and disk agree
- **WHEN** the test resolves element 0 of every hook's `args` in `hooks/hooks.json`, expanding any harness variable
- **THEN** each resolved file exists on disk and is importable
- **AND** the number of resolved paths is non-zero and equals the number of hook entries, so a derivation rule that classifies nothing fails

#### Scenario: Every dispatched id has a payload
- **WHEN** the test reads every `--hook` value in `hooks/hooks.json`
- **THEN** each has an entry in the static import map, and that entry's module file exists

#### Scenario: The test fails when a payload is unpackaged
- **WHEN** a file named by the manifest is removed
- **THEN** the test fails and names the missing file

### Requirement: A hook never fails because a dependency is absent
A hook that touches a service, an optional binary or any absent dependency SHALL exit 0 with a degraded result. A missing service SHALL NOT be a failed hook.

#### Scenario: Both services down
- **WHEN** surreal-memory and the liter-llm gateway are unreachable and a hook that would use them runs
- **THEN** it exits 0 and reports the degradation

#### Scenario: A payload throws
- **WHEN** a payload module throws
- **THEN** the entry point exits 0 for a degradation and reports it, and the throw does not propagate as a non-zero hook exit

### Requirement: The ported hooks are the six named, and no others
The manifest SHALL register exactly the 6 ported ids: `sessionstart-kbd-control`, `sessionstart-detect-project-context`, `posttool-write-position-reminder`, `subagent-fallback-checkpoint`, `taskcompleted-kbd-receipt`, `precompact-kbd-control`.

#### Scenario: Scope is exactly six
- **WHEN** the distinct `--hook` values in `hooks/hooks.json` are counted
- **THEN** there are exactly 6, and each is one of the ids named above

### Requirement: Cold start is measured on Windows against the declared budget
The three hooks declared at 1000 ms — `sessionstart-kbd-control`, `taskcompleted-kbd-receipt` and `precompact-kbd-control` — SHALL have their process cold start measured on `windows-latest` and recorded as a distribution, not a single number.

#### Scenario: All three 1 s hooks are measured
- **WHEN** the measurement runs on `windows-latest`
- **THEN** it covers all three 1000 ms hooks, including `precompact-kbd-control`, which `goals.md` does not name

#### Scenario: A distribution is recorded
- **WHEN** the measurement completes
- **THEN** it records repeated samples with at least the median and the maximum, because a 1 s timeout punishes the tail

#### Scenario: The budget is raised rather than the design changed
- **WHEN** the measured tail does not fit 1000 ms
- **THEN** the budget is raised and the measurement is stated, and a compiled dispatcher is NOT adopted (C7)
