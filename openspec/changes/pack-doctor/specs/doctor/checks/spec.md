## ADDED Requirements

### Requirement: The doctor's checks use the-boss's check and fix contract
Every check SHALL be an object `{ id, title, run }` where `run(ctx)` resolves to `{ status, summary, detail?, actions? }` with `status ∈ pass | warn | fail | skip`, and a check offering a repair SHALL declare `actions: [{ kind: 'fix', fixId }]` and implement `fixes[fixId](ctx)` resolving to `{ status ∈ fixed | requires_relaunch | refused, summary }`. Check ids SHALL be stable strings prefixed `mini.`. The contract SHALL be written in `lib/doctor/contract.md` and a test SHALL assert every registered check conforms to it.

#### Scenario: A malformed check is rejected at test time
- **WHEN** a fixture check omits `title` or returns a status outside the set
- **THEN** the contract test fails naming the check id and the field

#### Scenario: A fix is offered only where one exists
- **WHEN** the registered checks are listed
- **THEN** exactly `mini.skill-copies` declares an action, and its `fixId` resolves to an implemented fix

### Requirement: Output is one JSON object per line, then a summary
`scripts/doctor.mjs` SHALL print one JSON object per check on stdout, each on its own line, followed by one summary object `{ summary: true, pass, warn, fail, skip }`, and SHALL exit 0 when `fail` is 0 and 1 otherwise. `--human` SHALL render a table instead. Nothing else SHALL be written to stdout.

#### Scenario: A UI can parse the stream
- **WHEN** the doctor runs with every dependency absent
- **THEN** every stdout line parses as JSON, the last is the summary, no check is `fail` (absent optional dependencies are `skip` or `warn`), and the exit code is 0

#### Scenario: A real failure exits 1
- **WHEN** `mini.node-version` runs under an injected `process.versions.node` of `20.0.0`
- **THEN** that check is `fail`, the summary counts it, and the exit code is 1

### Requirement: The skill-copies check verifies and can repair the home-directory copies
`mini.skill-copies` SHALL compare every `skills/<name>/` in the pack to `<home>/.agents/skills/<name>/` and `<home>/.claude/skills/<name>/` byte for byte, using `lib/platform/paths.mjs` for the home directory, and SHALL report `fail` naming each missing or differing skill. Its fix `copy-skills` SHALL copy — never symlink — each missing or differing skill, file by file through `atomicWrite`, SHALL refuse any name containing a path separator or `..`, and SHALL never delete a file.

#### Scenario: A drifted copy is repaired idempotently
- **WHEN** a temp home has `.agents/skills/refine-ui/SKILL.md` differing by one byte and `.claude/skills/` empty
- **THEN** the check is `fail` naming `refine-ui` for both locations; `--fix copy-skills` reports `fixed`; a second run reports `pass`; a third `--fix` reports `fixed` with zero files written

#### Scenario: A hostile name is refused
- **WHEN** a fixture pack contains `skills/../evil/`
- **THEN** the fix reports `refused` and writes nothing

### Requirement: Optional components degrade, never fail
`mini.docker`, `mini.service.*`, `mini.pk` and `mini.sycophancy-correction` SHALL report `warn` (with the next step) when their component is absent or unreachable, and `fail` only when the component is present and broken (a spawn that exits non-zero, a health endpoint answering non-200).

#### Scenario: No Docker is a warning with a next step
- **WHEN** `lib/platform/docker.mjs` reports `absent`
- **THEN** `mini.docker` is `warn` and its summary names the platform's install step without running it
