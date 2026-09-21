## ADDED Requirements

### Requirement: The refiner runs on Node alone
Every executable part of the ported refiner SHALL be Node. No `.sh` or `.py` file SHALL be created, and no code path SHALL invoke `python3`, `jq`, `sed`, `awk`, `grep`, `date -u`, `mktemp`, `curl`, `chmod`, `uuidgen` or `realpath`.

#### Scenario: No script files are added
- **WHEN** the files this change adds are listed
- **THEN** none has a `.sh`, `.bash` or `.py` extension

#### Scenario: No POSIX tool is invoked
- **WHEN** `lib/refiner/` and the carried agent and skill files are scanned for those command names, matching only fenced code blocks and command lines in Markdown and never narrative text
- **THEN** there is no match

#### Scenario: The scan distinguishes code from prose
- **WHEN** the scan runs against a fixture containing the word `grep` in narrative text and `grep` inside a fenced code block
- **THEN** it matches only the fenced occurrence — a scan that matches neither, or both, fails this scenario

#### Scenario: Identifiers and timestamps come from Node
- **WHEN** the state lifecycle generates a refinement id or a timestamp
- **THEN** it uses `crypto.randomUUID()` and `toISOString()`, not `uuid.uuid4()` via `python3` or `date -u`

### Requirement: State lifecycle in Node
`lib/refiner/` SHALL provide init, checkpoint, finalize and provider resolution, replacing `state-init.sh`, `state-checkpoint.sh`, `state-finalize.sh` and `state-resolve-provider.sh`.

#### Scenario: A new artifact initialises
- **WHEN** state is initialised for an artifact name with no existing state
- **THEN** fresh state is written with a generated refinement id, and the write is atomic

#### Scenario: Existing state resumes rather than being destroyed
- **WHEN** state is initialised for an artifact name whose state exists and is not finalized
- **THEN** it resumes from the last checkpoint and the prior state is not truncated

#### Scenario: A finalized artifact starts a new cycle
- **WHEN** state is initialised for an artifact whose state is finalized
- **THEN** a new cycle is created seeded from the prior state, and the prior refinement id is recorded

#### Scenario: The home directory is never read directly
- **WHEN** provider resolution consults the global config
- **THEN** it obtains the home directory from `lib/platform/paths.mjs` and no code path in `lib/refiner/` calls `os.homedir()` or reads `process.env.HOME` / `USERPROFILE`

#### Scenario: Provider resolution keeps its waterfall order
- **WHEN** more than one provider config source is present
- **THEN** the environment variable wins over the project-local config, which wins over the global config

### Requirement: Validation replaces the python3 blocks
The validation path SHALL check the artifact manifest and constraints in Node, replacing both `python3` blocks in `agents/artifact-validator.md`.

#### Scenario: A manifest missing a required field fails
- **WHEN** `artifact_manifest.json` omits a field its schema requires
- **THEN** validation fails and names every missing field

#### Scenario: A manifest naming an absent file fails
- **WHEN** a variant names a file that is not present in `dist/`
- **THEN** validation fails and names the missing file

#### Scenario: A zero-byte referenced file fails
- **WHEN** a file named by the manifest exists but is empty
- **THEN** validation fails and names it

#### Scenario: A valid manifest passes
- **WHEN** the manifest satisfies its schema and every referenced file exists and is non-empty
- **THEN** validation passes

### Requirement: Every script the carried payload names is present
The `.mjs` the carried skills and agents depend on SHALL be carried into this project. Reviewing or editing a file this project does not contain is not a change to this project.

#### Scenario: The carried .mjs are present
- **WHEN** the carried skills and agents are scanned for the `.mjs` paths they name
- **THEN** each resolves in this project, or its naming skill declares itself unavailable

#### Scenario: The health-probe fix has a target
- **WHEN** the Windows hazard in `scripts/lib/model-routing.mjs` is fixed
- **THEN** that file exists in this project, so the fix and its test have something to act on

### Requirement: The refiner degrades rather than blocking
The refiner SHALL exit 0 with a degraded result when an optional dependency or service is absent. An absent service SHALL NOT fail a refinement or a gate.

#### Scenario: Both services down
- **WHEN** surreal-memory and the liter-llm gateway are unreachable
- **THEN** the refiner still runs, reports the degradation, and does not fail

#### Scenario: The health probe is a Node fetch, not a shell script
- **WHEN** an endpoint's health is probed
- **THEN** the probe is performed in Node against the configured `health_probe` URL, and no `.sh` file is resolved or executed

#### Scenario: A failed probe degrades for the importers, and does not throw
- **WHEN** the health probe reports unhealthy or unreachable and `resolvePhase` is called by `scripts/lib/openai-client.mjs` or `scripts/model-routing-probe.mjs`
- **THEN** it returns a decision carrying `healthy: false` and a reason, and does not throw — the caller sees the unhealthy state in the return value

#### Scenario: No third service is introduced
- **WHEN** the ported configuration is inspected
- **THEN** it names only surreal-memory and the liter-llm gateway, and adds no other daemon or port

### Requirement: Unported sub-skills declare themselves unavailable
A carried sub-skill whose implementation is not ported SHALL state that it is unavailable on this project. It SHALL NOT appear functional and fail when invoked.

#### Scenario: Any skill whose implementation is not ported is invoked
- **WHEN** any carried sub-skill whose implementation is not ported is invoked — identified by the property, never by a name prefix
- **THEN** it reports that it is unavailable in this project and names the follow-up change, rather than attempting to run a script that is not present

#### Scenario: A refine-* skill is covered too
- **WHEN** `refine-mcp-ui` is invoked, whose upstream text runs `bash scripts/scaffold-react-vite-mcp-ui.sh`
- **THEN** it reports that it is unavailable, exactly as the five `scaffold-*` skills do — a `refine-*` name does not exempt it

#### Scenario: No carried file names a script this project does not have
- **WHEN** the carried skills and agents are scanned for every script path they instruct an agent to run, **of any extension** — `.sh`, `.mjs`, `.py` or otherwise
- **THEN** every such path resolves in this project, or the skill naming it declares itself unavailable

#### Scenario: An .mjs-only skill is covered by the same rule
- **WHEN** a skill names only a `.mjs` script — `convert-htmx-pdf`, `convert-htmx-react`, `convert-md-to-htmx`, `design-svg-logo`, `rebrand-artifact` or `refine-moodboard` — and that script is not present in this project
- **THEN** it declares itself unavailable exactly as a `.sh`-naming skill does; a scan restricted to `.sh` would pass it while it is just as broken on invocation

### Requirement: The QA gate contract matches what runs
`execution.md` SHALL name the gate that actually runs. When a change completes, `/refine-validate` SHALL run before the adversarial review, and its result SHALL be recorded.

#### Scenario: The gate runs and is recorded
- **WHEN** a change reaches implementation-complete after this change is archived
- **THEN** `/refine-validate` runs, writes its log under `.refiner/artifacts/<change-id>/`, and the adversarial review follows it

#### Scenario: A skipped gate is declared, never silent
- **WHEN** the gate is skipped for any reason
- **THEN** the skip and its reason are recorded before the change is archived
