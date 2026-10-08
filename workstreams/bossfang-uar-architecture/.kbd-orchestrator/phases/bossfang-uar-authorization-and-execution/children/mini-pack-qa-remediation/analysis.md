# Analysis — mini-pack QA remediation

Date: 2026-10-08. Phase: `bossfang-uar-authorization-and-execution::mini-pack-qa-remediation`.
Boundary: Analyze, entered at canonical revision 268. No production repair, install, test suite or packaging build has run in this stage.

## Decision

Use existing Node capabilities and make a bounded mini-only repair. No additional dependency, framework, daemon or provider is needed. Retire the unsupported installed-refresh procedure from the mini payload; retain the functioning Cadence CLI. Reuse the existing platform path adapter and distribution generator. Propose a narrow Node secret checker for the demonstrated collisions, contingent on explicit operator/rule-owner approval to depart from the mandated git-grep content-check command. The existing check-expression exception alone is not treated as authority for that departure. Positive detection evidence and a separate reviewed commit remain required.

The operator first reported that another session already fixed the mini, then explicitly directed this session to continue fixing these failures. [Reconciliation](reconciliation-2026-10-08.md) records the bounded search: the merged Cadence source-reconciliation repair was found, but complete matching QA acceptance was not identified. That is not proof no such repair exists. Do not merge that unrelated branch wholesale or reproduce its nested-source work. If matching repairs become available, compare actual bytes and acceptance boundaries before reusing them.

## Baseline and lessons

The assessment baseline is mini commit `7765b14d345c3d759b97e7be116f8919484ccebb`, with substantial pre-existing dirty work. [Assessment](assessment.md) records seven failed checks and the subsequently observed three dependency executable links. Counts remain historical; no current global gate has been rerun.

The exact child `prior-context.md` and `evolver-bridge.json` were absent at Analyze entry; zero hook commands were matched. There are no hook-recalled knowledge-gap entries to quote or turn into learning tasks. The manually restored lessons still apply: extension counts do not reveal interpreter dependencies, tracked-link checks do not cover ignored dependencies, and correcting only generated output leaves the copying source intact.

The assessment's last review was BLOCK after the permitted two rounds. Its ambiguous count terminology was corrected statically, with no third passing review. This analysis uses explicit units: original 20 matching output lines across 19 files; targeted current assessment evidence 18 matching lines and 24 raw occurrences. Review independence was unverified because the producing model identity was unavailable. None of that constitutes repaired QA.

## Candidate and reuse findings

| Candidate | Verdict | Evidence | Limit |
|---|---|---|---|
| Existing `lib/platform/paths.mjs` | Adapt callers | Exports home, temp, state and join helpers; roots can be injected. | Preserve explicit inputs, empty/missing expansion behavior and cache-override precedence. |
| Existing distribution generator | Adopt | Recursively copies source skills into both harness outputs and rejects links. | Output replacement must wait until source completion and an ownership/fingerprint check. |
| Existing npm clean install | Adopt conditionally | Versioned npm source documents executable-link suppression and frozen lockfile installation. | Clean install removes the existing dependency directory; use only this isolated worktree after Plan approval and retain rollback. |
| Merged Cadence nested-source repair | Reference | [PR #46](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/46), source `ba1f5885d08598e2bbd39de652ff0800d8c13d94`. | Different function; changed-file inventory still includes shell payloads and provides no matching full QA receipt. |

The authoritative Node floor is unchanged. Ambient commands initially resolved Node 26.5.0, outside the project's LTS requirement; the failed metadata inspection exposed that deviation. Subsequent Node inspections explicitly used the observed Node 22.20.0 LTS executable. No dependency or runtime was upgraded.

The ambient npm version probe returned 11.16.0; read-only registry metadata reports its Node requirement as ^20.17.0 or >=22.9.0 and license Artistic-2.0. Numeric semantic-version comparison puts 22.20.0 above 22.9.0 (20 > 9 in the minor component), so those stated requirements are compatible. This is an inspected candidate, not a new pin. [npm v11.16.0 configuration source](https://github.com/npm/cli/blob/v11.16.0/workspaces/config/lib/definitions/definitions.js) defines executable-link suppression; [the same version's clean-install documentation](https://github.com/npm/cli/blob/v11.16.0/docs/lib/content/commands/npm-ci.md) explains lockfile preservation and dependency replacement. Disabling executable links is not a guarantee against every dependency-created link.

Context7 resolved /npm/cli and returned clean-install documentation; its separate executable-links query returned no match. Versioned official source filled that gap. The initially opened generated v11 docs displayed a different patch version and were not treated as exact local-version evidence. Registry/repository metadata was queried without installation.

## Architectural corrections for Spec and Plan

### 1. Supported Cadence payload

Affected source is the Cadence skill entry, its profile page, and the two installed-refresh shell assets. The carried-reference test checks documentation promises; marking the entire skill unavailable would hide functioning Node behavior.

Remove the unsupported refresh assets from the mini source and explain that installed/service refresh is unavailable in this mini profile, with a follow-up reference. Replace the profile page's entire installed-refresh section, including its Bash checkpoint example, shim instructions and absent installer/updater promises; clean the skill entry's refresh link at the same time. Preserve init, state transitions, checkpoints and report behavior. Do not port upstream installer/service mutation here. Regenerate Claude and Codex payloads from the corrected source after all repairs are wired; do not hand-delete only their copied assets.

Provenance requires special handling. Existing `.prometheus/delivery-cadence-source.json` claims a shared payload digest and includes the removed files. Preserve that historical manifest under append-only policy and add a dated mini adaptation record naming the baseline digest, approved removals, changed documentation and final actual hashes. The final handoff must distinguish shared-source baseline from adapted mini payload. The existing sync command refuses locally removed/changed files; document that refusal and the explicit reconciliation required before a future shared-payload sync. Do not invoke it or relax its ownership refusal in this repair. This avoids silently claiming byte-identical shared payloads or broadening synchronization scope.

### 2. Location ownership and compatibility

Use `homeDir` and `tempDir` at observed callers in the cadence adapter, managed OpenSpec cache resolver, service metadata discovery and the nine-file reported integration surface. Do not create another path abstraction. Preserve explicit cache override and supplied home roots; discovery continues to read metadata only.

Waypoint expansion is a legacy string substitution contract. Keep both token forms, explicit environment overrides, user substitutions, unknown-token passthrough and missing-home behavior. Omitted environment input must continue to mean process.env; an absent or null home value expands to the empty string, and an explicit empty home also stays empty. Do not introduce an OS-home fallback in this interpolation contract. Build token spellings from component names rather than retaining scanned literals. Move legacy environment-home value resolution into the existing platform adapter with a minimal dedicated export if required by its ownership rule; retain supplied inputs and the empty fallback exactly. This extends the same platform responsibility, not a new path abstraction. Spec must name acceptance cases for omitted input with home set and unset, explicit missing/empty/custom home, user substitution and unknown tokens. Relocate explanatory literal examples into documentation where appropriate.

### 3. Stale backend text and library fixtures

Remove the five obsolete backend-text occurrences in the three reported bottleneck files. Preserve canonical guard delegation and CLI outcomes. Change the three generated-fixture output calls in the two library tests to equivalent edge-output construction, retaining JSON/newline behavior. Keep the existing output checker unchanged. No unrelated fixture portability changes or backend refactor are justified.

### 4. Secret evidence and checker correction

New static receipts [syntax](evidence/analyze/secret-syntax-adjudication.json), [context](evidence/analyze/secret-context-dispositions.json), [key classification](evidence/analyze/secret-key-dispositions.json) and [key structure](evidence/analyze/secret-key-structure.json) contain hashes/counts or Boolean assertions, never matched values or excerpts.

The 12 option occurrences in five historical packets and Docker guidance are paired with prohibition text and a known literal example. The token-shaped inventory hit is preceded by an identifier character. All eleven JSON-key hits are also embedded inside identifiers. The first syntax classifier left these unresolved; later context assertions refine the interpretation without overwriting that receipt. A structural probe did NOT establish that all eleven keys are direct task-map IDs; do not claim that stronger fact.

Recommended correction, pending explicit operator/rule-owner approval of the content-check command-policy exception: retain the original full scan boundary and detection intent, but use a Node checker with reviewed, finite, hash-bound dispositions for these demonstrated non-credential occurrences. Match each benign occurrence by location/field or line, exact content digest and disposition. Never exempt entire directories, historical packets, all JSON keys, or arbitrary strings containing a prohibition. New or changed unmatched hits remain failures and are reported without values. Credential checks must examine both keys and values; an actual credential can be placed in either.

The workstream command policy presently specifies git-grep content checks. Its exception authorizes demonstrated false-positive check-expression corrections, but does not explicitly authorize replacing the implementation with Node. Spec/Plan must obtain and record that narrow rule-owner decision before registering or implementing a replacement. If refused, retain the failed secret gate and propose an authorized alternative; do not rewrite history or waive it to force closure.

Spec/Plan must bind every disposition to the inspected source and classify the eleven identifier-key meanings before accepting them. Any genuinely sensitive occurrence requires reversible evidence minimization with before/after hashes and retained failure status; it cannot be silently called a false positive. The checker change belongs in its own commit and tasks, with proof it still rejects synthetic inline credential options, standalone provider tokens, and a newly inserted credential inside an otherwise accepted historical packet. Those are tests of this real evidence-publication boundary, not a generic scanning rewrite.

Resolve the command/note mismatch explicitly: the old Docker wildcard includes Markdown while its note says otherwise. The proposed checker preserves scope and adjudicates the observed guidance, rather than silently excluding all Markdown. Canonical identifiers, journals, archives and old failure receipts remain unchanged.

### 5. Local prerequisites without executable links

After an approved Plan, reserve the isolated dependency/output surface, inventory existing entries and preserve recoverable local-only dependency material. Use the existing lockfile with a clean install and executable links disabled, lifecycle scripts disabled, and audit/network side effects bounded to installation needs. Invoke package JavaScript entries directly; no shell shim is required for managed OpenSpec. Do not alter global npm configuration, pins or another session's dependencies.

This is a reversible prerequisite operation, not permission to delete an unknown dependency tree. Inspect any non-reproducible local additions before replacement. Capture lock/package hashes before and after. Finish with the whole-descendant lstat inventory used in Assess, including ignored dependencies and without following links. Report ancestors/external Git data as outside that boundary; do not call executable-link suppression alone complete no-link evidence.

## Completed-delivery acceptance design

One implementation delivery covers these interdependent source, provenance, checker, prerequisites and generated payload changes. Finish it before production QA or packaging verification. Plan should reserve one build writer and separate disjoint implementation ownership if using the previously requested team. Reviewers remain dormant until the completed delivery boundary.

Run a real CLI/payload operation in an isolated fixture covering preserved waypoint expansion, managed cache override, metadata discovery with supplied roots, canonical Cadence binding and generated hook invocation. It must not install services or mutate shared/installed state. This supplies behavior evidence beyond matching a static pattern.

Then run the required mini gates once at the completed child boundary, including its compatibility suite, rule-generation consistency, spec validation, distribution consistency, every structural constraint and whole-descendant link inspection. The only proposed check-expression correction is the separately evidenced secret false-positive repair, contingent on the rule-owner decision above. Preserve old failed receipts and record fresh source-bound results. Repeat only a failed gate after its correction. macOS results do not establish Windows acceptance; use existing Windows CI/receipts if available or state the limitation.

A finite handoff includes baseline/final hashes, owned source/output paths, adaptation record, positive/negative checker evidence, prerequisite rollback disposition, operation receipts, gate receipts and completed-delivery adversarial review. The sibling consumes that evidence without repeating its already passing Boss/UAR product gates. It retains ownership of task 10 and its own certification. Parent completion/publication are outside this child.

## Open questions and limits

- Explicit operator/rule-owner approval is still required before replacing the mandated git-grep content-check command with the proposed Node checker. Analyze does not grant that approval.
- Source and exact QA receipt for the other session's reported complete mini fix remain unidentified. Reuse can shorten execution if they arrive.
- Eleven identifier-key hits still need precise semantic disposition; current probes establish structure and counts, not all identifier meanings.
- The adapted Cadence payload intentionally differs from upstream. The dated provenance record and future sync refusal must be visible.
- No clean install, positive checker proof, real operation, product test suite or generated-package check has run in Analyze.
- Estimate: 2–4 working hours for remaining specification/planning, implementation and completed-boundary verification, excluding operator handover waits. Historical-evidence adjudication or failed acceptance may extend this range.

Research was bounded to the specified Node stack. External tiers stop after npm fit was established; no broad comparison or new dependency is justified. The prior tier-1 search preceded an operator interruption; the resumed focused documentation/registry research remains a separate bounded working interval. Budget use and source links are recorded in the candidate contract. Missing bare superpowers and sycophancy-correction SKILL.md remain disclosed; Node-native review tooling and the available sycophancy MCP are used rather than executing prohibited upstream shell procedures.

## Artifact-review reconciliation

Round 1 reported two CRITICAL findings. The command-policy finding is resolved in this recommendation by making the Node checker explicitly contingent on rule-owner authorization; no implementation may rely solely on the existing false-positive exception. The runtime finding states that Node 22.20.0 is below 22.9.0. That comparison is incorrect under numeric semantic-version ordering; the explicit tuple comparison is recorded in evidence/analyze/runtime-version-comparison.json. Round 1 remains an immutable BLOCK report, not an accepted fact or erased history. Revised artifacts are submitted for the second permitted round. Producer model identity remains unknown, so independence cannot be certified.

The second permitted review returned PASS with two WARNINGs: incomplete specificity about removing shell-refresh documentation, and ambiguity in legacy waypoint defaults. Final producer clarification explicitly removes the entire refresh-procedure section and preserves process.env/empty interpolation semantics without an OS-home fallback. No third review was run; carry both original warnings, their dispositions and unknown producer identity into Spec. The passing artifact review is not completed-delivery QA.
