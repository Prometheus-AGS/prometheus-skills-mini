## ADDED Requirements

### Requirement: The handoff names every the-boss change with its extension point and acceptance criteria
`docs/handoff/the-boss-integration.md` SHALL contain the ten items in the proposal (including the compass item decided in `analysis.md` Q11), each with the the-boss file and line it extends (or "new file" with its lifecycle-service location), acceptance criteria stated as observable behaviour, and the mini artifact it consumes. Every file:line it cites SHALL exist at `the-boss` commit `10aa57f76c`.

#### Scenario: The full-pack rule is a named item
- **WHEN** item 2 of the handoff is read
- **THEN** it states that the push is skipped with a visible notice when the full pack is present, and names `lib/platform/full-pack.mjs` as the detector

#### Scenario: Citations resolve
- **WHEN** the handoff's the-boss citations are checked against the local checkout at `10aa57f76c`
- **THEN** every cited path exists and every cited line range is within the file (test skips with a reason when the checkout is absent)

#### Scenario: Nothing in the handoff is implemented in the mini
- **WHEN** `git grep -l "the-boss" -- "lib/*.mjs" "scripts/*.mjs" "hooks/*.mjs"` runs (executable code only — documentation such as `lib/doctor/contract.md` cites the-boss by design)
- **THEN** there are no hits

### Requirement: The settings and doctor UI is designed before it is built
`docs/handoff/settings-doctor-design.md` SHALL be produced with the `impeccable` and `ui-ux-pro-max` skills and SHALL cover the information architecture, the health panel, the doctor with one-click repair, the degraded states (services down, Docker absent, push in progress), the copy, and tokens consistent with the-boss's settings pages, with the decisions it makes stated as decisions.

#### Scenario: The brief covers the degraded states
- **WHEN** the brief is read
- **THEN** it specifies what the section shows when both services are down, when Docker is absent, and while the home-directory push runs
