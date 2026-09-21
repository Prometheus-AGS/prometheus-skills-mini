## ADDED Requirements

### Requirement: pk is the only writer of the knowledge bundle, and it is optional
The knowledge bundle under `.prometheus/knowledge/` SHALL be written only by the `pk` CLI. No module under `lib/` or `scripts/` SHALL write a file beneath that directory. With `pk` absent the pack SHALL still record receipts and the session log, and SHALL NOT report the missing bundle as a failure.

#### Scenario: No Node code writes the bundle
- **WHEN** `lib/` and `scripts/` are scanned for a write whose path includes `.prometheus/knowledge` or `knowledge/wiki`
- **THEN** there is no match in executable code, comments excluded

#### Scenario: The scan can fail
- **WHEN** the same scan runs against a fixture module that writes `.prometheus/knowledge/wiki/x.md`
- **THEN** it reports that module

### Requirement: The binding constraints describe what is built
`openspec/config.yaml` SHALL state that `pk` writes the bundle in OKF v0.2, and SHALL NOT describe a Node OKF writer, a Node-rendered `log.md`, or `events.jsonl` as this pack's append-only truth. Each withdrawn clause SHALL be replaced by a statement of what superseded it.

#### Scenario: The withdrawn clauses are gone
- **WHEN** `openspec/config.yaml` is read
- **THEN**, with runs of whitespace collapsed (the clauses wrap across lines), it does not contain "the Node implementation", "log.md is rendered from it", "Never append to log.md", or "events.jsonl is the append-only truth"

#### Scenario: The replacement is stated
- **WHEN** `openspec/config.yaml` is read
- **THEN** it names `pk` as the bundle's writer, names OKF v0.2, and says receipts and the session log do not depend on `pk`

### Requirement: The declared OKF version is the version the pinned writer emits
`.prometheus/index.md` SHALL declare `okf_version: "0.2"` and carry no other frontmatter. The phase SHALL NOT be reported complete while the pinned `pk` commit predates `pk`'s `okf-v02-writer` change.

#### Scenario: The root index declares 0.2 and nothing else
- **WHEN** `.prometheus/index.md` is parsed
- **THEN** its frontmatter has exactly one key, `okf_version`, with the value `"0.2"`

#### Scenario: A pin that predates the writer change blocks completion
- **WHEN** the phase evidence is written
- **THEN** it records the pinned commit and whether `pk`'s `okf-v02-writer` is an ancestor of it, and marks the OKF goal NOT MET if it is not
