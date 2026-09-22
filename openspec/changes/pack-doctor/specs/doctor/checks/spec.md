## ADDED Requirements

### Requirement: The doctor owns a stable check and fix contract, documented against the-boss's
Every check SHALL be an object `{ id, title, run }` where `run(ctx)` resolves to `{ status, summary, detail?, actions? }` with `status ∈ pass | warn | fail | skip`, and a check offering a repair SHALL declare `actions: [{ kind: 'fix', fixId }]` and implement `fixes[fixId](ctx)` resolving to `{ status ∈ fixed | requires_relaunch | refused, summary }`. Check ids SHALL be stable strings prefixed `mini-`.

This is the MINI’S OWN contract, not a mirror of the-boss’s. `the-boss@10aa57f76c` types `DoctorCheckRegistry` as exhaustive over a closed `DoctorCheckId` union, enforces a check’s domain against its id prefix at compile time, types `detail` as a catalog-declared `variant`, has no `summary` field and no `refused` fix status — so a mini check CANNOT be registered there, and the mini cannot emit its outcome type. `lib/doctor/contract.md` SHALL therefore document the mini’s contract, state each divergence from the-boss’s shape with the reason, and record the adapter mapping the-boss implements on its side (`summary` → `devMessage`/evidence; `refused` → `{ status: 'failed', message }`; `warn`/`fail` → an outcome whose `attribution` and `detail.variant` only the-boss can supply). A test SHALL assert every registered check conforms to the mini’s contract.

#### Scenario: The contract document names every divergence from the host
- **WHEN** `lib/doctor/contract.md` is read
- **THEN** it states, for each of `summary`, `refused`, `detail`, the id namespace and registry closure, what the mini does, what the-boss does, and how the adapter bridges them

#### Scenario: A malformed check is rejected at test time
- **WHEN** a fixture check omits `title` or returns a status outside the set
- **THEN** the contract test fails naming the check id and the field

#### Scenario: A fix is offered only where one exists
- **WHEN** the registered checks are listed
- **THEN** exactly `mini-skill-copies` declares an action, and its `fixId` resolves to an implemented fix (`mini-install-scope` declares none: there is no safe automatic repair for a copy that should not exist — the summary names the files to remove)

### Requirement: Output is one JSON object per line, then a summary
`scripts/doctor.mjs` SHALL print one JSON object per check on stdout, each on its own line, followed by one summary object `{ summary: true, pass, warn, fail, skip }`, and SHALL exit 0 when `fail` is 0 and 1 otherwise. `--human` SHALL render a table instead. Nothing else SHALL be written to stdout.

#### Scenario: A UI can parse the stream
- **WHEN** the doctor runs with every dependency absent
- **THEN** every stdout line parses as JSON, the last is the summary, no check is `fail` (absent optional dependencies are `skip` or `warn`), and the exit code is 0

#### Scenario: A real failure exits 1
- **WHEN** `mini-node-version` runs under an injected `process.versions.node` of `20.0.0`
- **THEN** that check is `fail`, the summary counts it, and the exit code is 1

### Requirement: The skill-copies check verifies and can repair the home-directory copies
`mini-skill-copies` SHALL compare every `skills/<name>/` in the pack to `<home>/.agents/skills/<name>/` and `<home>/.claude/skills/<name>/` byte for byte, using `lib/platform/paths.mjs` for the home directory, and SHALL report `fail` naming each missing or differing skill. Its fix `copy-skills` SHALL copy — never symlink — each missing or differing skill, file by file through `atomicWrite`, SHALL refuse any name containing a path separator or `..`, and SHALL never delete a file.

#### Scenario: A drifted copy is repaired idempotently
- **WHEN** a temp home has `.agents/skills/refine-ui/SKILL.md` differing by one byte and `.claude/skills/` empty
- **THEN** the check is `fail` naming `refine-ui` for both locations; `--fix copy-skills` reports `fixed`; a second run reports `pass`; a third `--fix` reports `fixed` with zero files written

#### Scenario: A hostile name is refused
- **WHEN** a fixture pack contains `skills/../evil/`
- **THEN** the fix reports `refused` and writes nothing

### Requirement: The mini never installs natively beside the full pack, and the doctor enforces it
`lib/platform/full-pack.mjs` SHALL detect a native full-pack install from any of: the `prometheus` CLI resolvable on `PATH`, `<home>/.prometheus/setup-state.json`, a `kbd-process-orchestrator` directory under `<home>/.claude/skills` or `<home>/.agents/skills`, or an `ai.prometheus.*` service unit. When the full pack is present, `mini-install-scope` SHALL `fail` if any mini skill copy exists under either home skills root, `mini-skill-copies` SHALL `skip` with the reason, and the `copy-skills` fix SHALL return `refused` and write nothing.

#### Scenario: A native mini copy beside a full install is a failure
- **WHEN** a temp home has `.prometheus/setup-state.json` and `.claude/skills/refine-ui/SKILL.md`
- **THEN** `mini-install-scope` is `fail` naming the marker and the copy, and `--fix copy-skills` returns `refused` with zero files written

Stale copies — skills a previous mini version installed and this one no longer ships — SHALL be found through an install manifest at `<home>/.prometheus-mini/installed-skills.json` (`{ "skills": […] }`), never by enumerating the home skills roots. Those roots are SHARED: on a developer machine they hold hundreds of third-party skills (612 against this pack’s 22, measured), so enumeration would report almost all of them as mini copies. Without a record of what was written, "this directory came from the mini" is not decidable from the filesystem; an absent or malformed manifest SHALL yield nothing rather than a guess.

#### Scenario: A stale copy is found through the manifest
- **WHEN** the full pack is present, `<home>/.prometheus-mini/installed-skills.json` names `retired-skill`, and `<home>/.claude/skills/retired-skill/` exists while this pack no longer ships that name
- **THEN** `mini-install-scope` is `fail` naming that directory

#### Scenario: An unrelated skill is never called a mini copy
- **WHEN** a skill this pack does not ship, and no manifest names, sits under a home skills root
- **THEN** `mini-install-scope` does not report it

#### Scenario: No full pack means the rule is silent
- **WHEN** a temp home has none of the markers
- **THEN** `mini-install-scope` is `pass` and `copy-skills` behaves as specified above

### Requirement: Optional components degrade, never fail
`mini-docker`, `mini-service-*`, `mini-pk` and `mini-sycophancy-correction` SHALL report `warn` (with the next step) when their component is absent or unreachable, and `fail` only when the component is present and broken (a spawn that exits non-zero, a health endpoint answering non-200).

**An HTTP 401 from a service declared to require a key is an exception and SHALL be `warn`, never `fail` or `pass`** (operator decision, 2026-09-22). It is not broken — it is listening and demanding a credential — but its health is unverified, because the probe never saw a healthy body. `pass` would report a verdict never established; `fail` would turn a missing OPTIONAL credential into a fault and make the doctor exit 1 on a working machine, contradicting this requirement’s own title. Only `mini-service-liter-llm` is so declared; a 401 from any other service is a plain non-200 and fails. Reviewers have read the clause above both ways — this paragraph is the resolution.

#### Scenario: An auth challenge is up-but-unverified
- **WHEN** `mini-service-liter-llm`’s health endpoint answers 401
- **THEN** the check is `warn`, its summary says the health is unverified and names the missing key, and the doctor does not exit 1

#### Scenario: A 401 from a service with no declared auth is still a failure
- **WHEN** `mini-service-surreal-memory`’s health endpoint answers 401
- **THEN** the check is `fail`

#### Scenario: No Docker is a warning with a next step
- **WHEN** `lib/platform/docker.mjs` reports `absent`
- **THEN** `mini-docker` is `warn` and its summary names the platform's install step without running it
