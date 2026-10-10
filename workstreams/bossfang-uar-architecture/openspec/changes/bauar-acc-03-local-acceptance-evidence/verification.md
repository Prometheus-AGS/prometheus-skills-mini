# Verification requirements — bauar-acc-03-local-acceptance-evidence

All entries below are specifications, not executed evidence. Stable canonical phase: `phase-bauar-release-acceptance`; IDs retain backend task identities. Every behavior carries the complete acceptance template. Relative scenario evidence names resolve under `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/`.

The proposed exact integration gate is:

```text
/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/local-release-acceptance.mjs" --config "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/candidate-inputs.json" --stage integration
```

The proposed exact final aggregation gate, after component adjudication and completed-product review, is:

```text
/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/local-release-acceptance.mjs" --config "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/candidate-inputs.json" --stage finalize
```

Both commands use cwd `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture`. These commands/files do not yet exist. Plan must pin executable locations and immutable config without changing dependency versions. Child environment comes from that schema-bound config: fixture-only secrets, private HOME/CODEX_HOME/XDG/TMP, no inherited external UAR override or ambient keys. Integration runs only after all parent production and packaging are complete and scenario source readiness is recorded; finalize rereads matching receipts and runs no tests. Exit0 means all mandatory results for that selected stage observed; exit1 observed failure; exit2 unavailable/incomplete inputs/evidence/isolation/review. Historical evidence never silently supplies a newly changed behavior.

No test authoring/execution or product review before the coherent production barrier. Missing prerequisites are BLOCKED, not skips. Only owned children are stopped; retain sources, candidates, caches, rollback inputs and failed evidence. No shared service or live-profile mutation. F6 files are excluded from reads/search/hash/diff/test; no wildcard repository traversal. Wider platforms/signing/installation/remote/publication remain out of scope for selected local acceptance.
## Behavior E01: Package/source integrity and public-mode refusal

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-03-local-acceptance-evidence / 1.1,1.2,2.1; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Completed phase coordinator/config/schema tree and immutable 01/02/03 manifest digests; all product candidates bound to actual package or supporting-test profile. |
| Production entry point | Existing Boss prepare-local-uar-payload.cjs / local-uar-payload.cjs / uar-payload-integrity.cjs / validate-release-package.cjs production packaging path with Plan-pinned exact validator argv |
| Real collaborators | Actual local archive, source marker, bundle inventory and existing locked/pinned packaging hooks |
| Boundary exercised | Source→archive→asar/bundled binary identity and local/public selection |
| Observable result | Unmodified completed candidate passes its existing local integrity checks; actual package UAR matches source/profile/digests |
| Negative control | Disposable copies with stale source/modified archive/local marker in public mode are refused by actual production validator; original candidate and receipts unchanged |
| Isolation | Unique phase disposable copy per corruption/control; read-only retained originals; no public network publisher, install target or shared service; coordinator owns temporary children only |
| Prerequisites | Full parent production/package complete; original pinned validators/toolchain available; no dependency/hook changes; concrete argv frozen in Plan |
| Final local gate | Exact integration command above; argv --config candidate-inputs.json --stage integration; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/e01.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Validator control is not release/publication permission or runtime effect evidence; public/platform artifacts untouched. |

## Behavior E02: Completed-production barrier, aggregation and private lifecycle

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-03-local-acceptance-evidence / 1.1,1.2,2.1; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Completed phase coordinator/config/schema tree and immutable 01/02/03 manifest digests; all product candidates bound to actual package or supporting-test profile. |
| Production entry point | Proposed coordinator integration command above launching real packaged desktop/harness/eligible regression production entry points |
| Real collaborators | Actual filesystem source/package/profile receipts, owned Electron/UAR/host/peer children, typed phase manifests |
| Boundary exercised | Input provenance, process launch, private roots, per-scenario receipt completeness and owned cleanup |
| Observable result | Required D01–D04/H01–H04/E01 receipts have actual booleans/counts/negative-control results and correct source identity; integration exit0 applies only to these runtime components |
| Negative control | Missing/changed manifest, malformed receipt, zero selected tests or child exit0 without required observations returns2 before readiness; observed failure returns1; interrupted effects retain unknown with no auto-rerun |
| Isolation | Schema-declared fresh per-child HOME/CODEX_HOME/XDG/TMP/config/queue/plugin roots; existing embedded Surreal private storage; loopback port0 peers. No live roots/service takeover; retain rollback inputs |
| Prerequisites | Approved Plan, all production complete, package and executable scenario adaptation complete, exact tools/GUI available; unresolved isolation is BLOCKED |
| Final local gate | Exact integration command above; argv --config candidate-inputs.json --stage integration; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/e02.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Coordinator entry currently proposed/unimplemented; structural/schema checks alone not runtime acceptance. Cleanup uncertainty remains explicit. |

## Behavior E03: Cumulative review, final local verdict and wider-scope disposition

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-03-local-acceptance-evidence / 2.2,2.3; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Completed phase coordinator/config/schema tree and immutable 01/02/03 manifest digests; all product candidates bound to actual package or supporting-test profile. |
| Production entry point | Completed-product finite diff/format review followed by proposed coordinator --stage finalize and release-readiness.md delivery |
| Real collaborators | Actual eligible source diffs, independent reviewer, read-only formatting tools and integration receipts for selected product artifact |
| Boundary exercised | Review independence/source identity, final evidence aggregation and operator release authority |
| Observable result | Final verdict binds all current mandatory runtime/negative/format/review receipts; local unsigned ARM64 and broader scopes/owners reported separately; finalization runs no tests and does not advance shipping/C05 |
| Negative control | Stale or missing cumulative review, invalidated input/result, unverified required reviewer independence or false wider-scope pass remains BLOCKED; new explicit operator waiver may disposition review but never becomes an executed pass |
| Isolation | Finite review-path manifest excludes F6; reviewer receives eligible artifacts only, no session secrets/chat; no writes to ordinary product sources during formatting; retained evidence only |
| Prerequisites | 02/2.1 component adjudication and 03/2.2 actual product review/format complete; verified independent reviewer or explicit new operator disposition for missing independence |
| Final local gate | Exact finalize command above; argv --config candidate-inputs.json --stage finalize; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/e03.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Spec artifact review is not product review. Default-profile runtime, signing/notarization, installer operation, Intel/Windows and remote/publication are unverified/deferred/excluded. Operator release authority is named; signing/platform owners not invented. |
