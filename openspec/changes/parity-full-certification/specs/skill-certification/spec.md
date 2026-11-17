## ADDED Requirements

### Requirement: Skills are validated against the Agent Skills specification
The pack SHALL provide a Node validator that checks every skill's frontmatter, and its strict mode SHALL require `license`, `metadata.version` and a comma-separated `metadata.tags`, SHALL reject a top-level `version`, and SHALL reject a description the packaged plugin cannot read.

#### Scenario: Every pack skill passes strict validation
- **WHEN** `node scripts/validate-skills.mjs --strict` runs with no directory argument
- **THEN** it exits 0 and reports no error for any skill under `skills/`

#### Scenario: A non-conforming skill is refused
- **WHEN** strict validation runs on a skill with a top-level `version`, no licence and a list of tags
- **THEN** it exits 1 and names each of the three problems

### Requirement: A skill can be certified without a shell
The `skill-certification` skill SHALL run its static levels with Node alone, SHALL start child processes without a shell, and SHALL record a tool that is missing or available only as a Windows shell shim as not exercised with the reason.

#### Scenario: Static certification writes a certificate
- **WHEN** `node skills/skill-certification/scripts/certify.mjs <skill-dir> --out <dir>` runs on a well-formed skill
- **THEN** `certificate.json` and `report.md` are written and the static level is PASS

#### Scenario: A non-Node script fails the static level
- **WHEN** a skill contains a `.sh`, `.py` or `.ps1` file
- **THEN** the static level is FAIL with a `non-node-script` finding naming the file

#### Scenario: Too few runs is not a pass
- **WHEN** recorded results hold three clean runs per case
- **THEN** the trigger level is INCOMPLETE

### Requirement: Cases and skill-level plugin manifests are never installed
A directory named `evals` or `.claude-plugin` that sits beside a `SKILL.md` SHALL be left out of both plugin packages and out of doctor's home-directory copies.

#### Scenario: Packaged skill
- **WHEN** the distribution is generated from a skill that has `evals/` and `.claude-plugin/`
- **THEN** neither directory is in the Claude or the Codex package, and a deeper folder named `evals` still ships

### Requirement: The verification method is stated at session start
A session-start hook SHALL print the VLBV boundary rule to stdout in a KBD-managed project, SHALL print nothing in mode `off`, SHALL print it everywhere in mode `always`, and SHALL never begin its output with `{`.

#### Scenario: KBD project
- **WHEN** the hook runs with a `.kbd-orchestrator` directory at or above the project directory and no setting
- **THEN** the rule is on stdout and the exit code is 0

#### Scenario: Setting precedence
- **WHEN** the environment variable, the project file and the user file disagree
- **THEN** the environment variable wins, then the project file, then the user file
