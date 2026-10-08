# Assessment — mini-pack QA remediation

Project: prometheus-skills-mini. Date: 2026-10-07.
Active phase: `bossfang-uar-authorization-and-execution::mini-pack-qa-remediation`.
Assessment boundary: isolated planning worktree; canonical Assess entered at revision 266, zero implementation changes defined. This document records gaps, not an approved implementation plan.

## Conclusion

The acceptance sibling is blocked by **seven failed mini QA checks and one previously incomplete symlink check**. The new read-only inventory establishes three symlinks in ignored npm dependencies, so that eighth item is now an observed literal constraint violation. No mini repair has been implemented, and no new test/build gate has run in Assess.

The failures need distinct treatment: remove or truthfully retire unsupported payloads, preserve behavior while restoring platform boundaries, correct stale references and fixture output, and classify secret-pattern matches without exposing values or destroying history. Changing a checker requires demonstrated false-positive evidence and proof that it still catches real violations; the current evidence does not authorize a blanket exemption.

This child supplies repairs and receipts to `desktop-mcp-projection-acceptance`; it cannot certify that sibling, its parent, an installed application, or a release.

## Baseline, authority and cross-tool progress

The mini baseline is commit `7765b14d345c3d759b97e7be116f8919484ccebb`, branch `codex/bossfang-uar-authorization-and-execution`. The read-only [mini baseline](evidence/assess/mini-baseline.json) captures 1,241 dirty status entries, including existing planning/evidence; the count is not attribution to this child. It records version and lockfile hashes. Do not stage the whole worktree or treat existing edits as disposable.

The prior sibling's [QA result](../desktop-mcp-projection-acceptance/evidence/execute/qa/validation-result.json), dated 19:43 UTC, records:
- `npm test`: 1,096 total, 1,093 passing, one failing, two skipped;
- `npm run check` and `npm run spec:validate`: passed at their recorded boundaries;
- six failed structural commands, the compatibility test failure, and incomplete literal symlink coverage;
- two artifact schemas and integrity for its 36-file finite evidence packet: passed **then**, not freshly revalidated here.

The sibling remains Execute with task 10 unfinished and nine of ten tasks complete. Its [team findings](../desktop-mcp-projection-acceptance/evidence/execute/review/team-acceptance/findings.json) support its local A1–A6 acceptance and flag the mini QA blockers. That review is neither a formal cross-model review nor proof of these proposed repairs. New child progress has no implementation tasks or completed changes. Run-level completion embedded in projections belongs to the wider run and is not a child verdict.

Canonical creation/activation receipts are under [evidence/create](evidence/create/actual-create-receipt.json). A wrapper failed after parent activation committed; [reconciliation](evidence/create/precreation-wrapper-error-reconciliation.json) records that fact and the decision not to replay the activation. No generated KBD projection was hand-edited.

Authority: [mini AGENTS.md](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/AGENTS.md), [versions.toml](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/versions.toml), [workstream constraints](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/constraints.md), the active OpenSpec lifecycle configuration, this child's [goals](goals.md) and [handoff in](handoff-in.md). Operator-authored pins are immutable in this child.

## Implementation and specification alignment

| Area | Status | Evidence and gap |
|---|---|---|
| Node cadence CLI and adapters | PARTIAL | Node CLI exists, but the skill also advertises an upstream installed-refresh procedure that depends on forbidden interpreters and missing installers. This is a packaging/documentation incompatibility; it does not establish a defect in cadence state transitions. |
| Platform locations | PARTIAL | The platform location adapter exists and owns home/temp resolution. Several production callers and integration fixtures still use OS functions directly; waypoint expansion also has scanned home-token literals. Preserve injected roots and legacy expansion semantics. |
| Canonical KBD bottleneck guard | PARTIAL | Canonical guard delegation exists; obsolete backend terminology remains in comments, CLI usage and skill text. This is stale contract text, not evidence of a second backend being executed. |
| Distribution | PARTIAL | Both generated plugin packages exist; recursive copy carries the unsupported shell files from source. Repair source and regenerate owned outputs together; editing dist alone would leave the cause intact. |
| Secret/evidence hygiene | PARTIAL | Original scanner failed. Current bounded classification distinguishes substring hits from credential claims, but some historical command-like matches remain unclassified. Sensitive values must not be published. |
| Library-output fixtures | PARTIAL | Three scanned output calls are inside generated executable fixtures in two library test files. They violate the literal scan; this is not proof production libraries print unsolicited output. |
| Symlink-free prerequisites | NOT COMPLIANT | Whole descendant inventory finds three ignored npm bin links. Tracked-only coverage cannot satisfy the literal rule. |
| Repair QA and handoff | MISSING | No approved repair plan, repaired delivery, new passing QA or completed return handoff exists. |

The [platform location specification](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/openspec/specs/platform/paths/spec.md) requires location acquisition through `lib/platform/paths.mjs`, with injected home/temp roots available for tests. The inspected [adapter](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/platform/paths.mjs) already exports location helpers; this is a caller-compliance gap, not evidence a new dependency is needed. Some reported locations are integration scripts/tests; the rule explicitly allows only the platform adapter and its named test to acquire locations directly.

The [package builder](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/distribution/package-builder.mjs) copies skill trees recursively, refuses symlinks, and materializes both harness packages. Its `generateDistribution` stages output, compares in check mode, and replaces owned outputs in generation mode. A repair must account for existing dirty generated files and source revision binding before regeneration. The package manifest exposes Node commands for distribution generation/checking; none was executed in this assessment.

## Prior lessons and knowledge gaps

The actual before-hook invocation is recorded in [its receipt](evidence/assess/actual-before-hook-receipt.json). The exact checked child path, `workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/mini-pack-qa-remediation/prior-context.md`, is absent. Other phases have files with the same basename; they are not this child's hook output. Consequently there are no hook-recalled lessons or enumerated `## Knowledge gaps` entries to quote; absence is not evidence that the project has no knowledge gaps.

The following were restored manually from the project's records, not represented as recalled memory:
- [gotchas](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/.prometheus/gotchas.md): “`git ls-files -s`, counting mode `120000`, is a portable symlink check.” It covers tracked Git entries, so the assessment adds an explicitly broader lstat inventory rather than treating that tracked check as whole-repository proof.
- [decisions](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/.prometheus/decisions.md), artifact-refiner triage: “A file-extension count does not measure an interpreter dependency.” The cadence shell source was read for invoked runtimes and missing inputs, without executing it.
- The packaging lesson in gotchas records a hook target omitted from generated packages. Here the source-to-output closure matters: deleting only an emitted shell file would not repair the generator's source payload.

Open questions to resolve in Analyze:
1. What is the smallest truthful treatment of the upstream installed-refresh feature while retaining the functioning Node cadence capability?
2. How should waypoint expansion preserve explicit environment inputs and legacy tokens while default home resolution stays in the platform adapter?
3. Which historical scanner hits are demonstrable false positives, which need safe evidence minimization, and how can any approved corrected check retain positive detection evidence without changing history?
4. How can locked local prerequisites be installed without bin symlinks, with no dependency deletion shortcut, pin change or installed-environment change?
5. Which final receipt set and source/output freeze allow the acceptance sibling to consume repair evidence without rerunning its passing product gates?

These are repository inspection/design questions, not invented knowledge-memory entries. No learning workflow, provider configuration or service installation was started.

## Observed failure inventory and impact

Counts below belong to the **original recorded structural scan**, not a new scan of the assessment's growing artifacts. Its secret check reports matching output lines; individual substring occurrences are a different unit. Original failure attribution is retained in [the historical attribution receipt](../desktop-mcp-projection-acceptance/evidence/execute/mini-structural-failure-attribution-01.json).

| Priority | Check | Observed evidence | Impact and required Analyze decision |
|---|---|---|---|
| P1 | tests-pass | One carried-payload reference test failed. [Its implementation](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/skills/carried-payload.test.mjs) checks that named script paths resolve unless the document explicitly declares an unavailable asset/capability. | Shipping documentation promises unavailable upstream installers. Determine a truthful narrow treatment, not a test exemption for functional documentation. |
| P1 | no-shell-or-python-files | Six tracked shell paths: two delivery-cadence source files and two copies of each across Claude/Codex packages. | Violates the Node-only payload contract. Review reachability and whether to retire this unsupported feature rather than port installed/service mutation into this child. |
| P1 | os-locations-only-via-platform | Eleven matches across nine files, including production cadence, managed OpenSpec state and service-discovery callers, plus integration fixtures. | Default runtime locations bypass the required adapter; tests need stable injected roots preserved. No new helper layer is justified before examining existing exports. |
| P1 | no-symlinks | Prior source-only scan inspected 6,508 entries. New whole descendant scan finds three npm bin links. | Literal compliance is unmet even though packages themselves use copies. Resolve prerequisites separately from source payload and verify the actual final tree. |
| P1 | no-hardcoded-secrets | Twenty original matching output lines across nineteen files, not twenty individual occurrences or proven credentials. See count reconciliation below. | QA remains failed; incorrect credential attribution or deletion of history would create another failure. Resolve each class with safe proof. |
| P2 | no-home-or-tmp-literals | Three waypoint source/test matches. | Literal scan includes comments and fixtures. Preserve supported expansion behavior; comment-only cleanup cannot establish production location compliance. |
| P2 | no-zeespec | Five matches in three bottleneck-related files. | Stale text conflicts with the OpenSpec-only contract. Actual guard delegation is canonical; no obsolete backend implementation was observed. |
| P2 | no-console-log-in-lib | Three matches in two fixture-producing test files. | Literal constraint applies even to fixtures. Preserve their generated program output and integration semantics when changing fixture construction. |

### Cadence compatibility: observed unsupported dependency chain

[Delivery-cadence skill](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/skills/delivery-cadence/SKILL.md) advertises the shell refresh asset. Its [profile](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/skills/delivery-cadence/references/profile.md) describes upstream updater/installer scripts and launchd service refresh. The two shell source files were inspected, not executed: the workflow invokes Python and POSIX tools, missing upstream installer entrypoints, and resident install/service mutation. Those operations do not match the mini's Node-only, optional-service contract or this child's boundaries.

The Node cadence CLI is separate. Declaring the entire skill unavailable merely to skip the failing carried-payload check would incorrectly hide an existing capability. A pre-existing two-document proposal is in the sibling's evidence; it has **not** been applied and does not alone address all six emitted shell paths. Analyze must determine supported scope before Plan authorizes changes.

### Location and fixture evidence

Inspected production examples, supported by the full bodies and hashes in the review packet's `source_evidence` entries—not by its intentionally depth-two directory tree alone:
- [cadence KBD adapter](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/cadence-adapters/kbd.mjs) uses direct OS temp resolution for reconciliation scratch data; canonical task ownership must stay authoritative.
- [managed OpenSpec state](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/platform/openspec/state.mjs) resolves its cache from an explicit override or direct OS home; preserve override precedence and receipts/locks.
- [service discovery](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/services/discovery.mjs) defaults an injected home argument from the OS; discovery reads metadata and must not become service setup.
- [waypoint source](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/waypoint.mjs) expands path tokens against an environment argument. The legacy expansion contract cannot be removed simply to clear a literal match.

The [distribution fixture test](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/distribution/package-builder.test.mjs) writes minimal executable hook/lifecycle programs containing output calls. The [learning identity integration test](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/learning/identity.test.mjs) writes a fake runtime program that prints JSON consumed by the resolver. These are fixture-text occurrences; actual library console side effects were not reproduced. Existing Windows skip/executable-bit behavior in the identity fixture is outside the present reported output-match repair; no Windows acceptance is inferred.

### Secret-pattern classification and trust boundary

The initial [value-only classification receipt](evidence/assess/secret-pattern-location-classification.json) emits JSON pointers, categories, lengths and hashes without matched values. It omitted JSON property names; its twelve no-current-match statuses must not be interpreted as whole-file absence. The corrected [count reconciliation](evidence/assess/secret-count-reconciliation-v3.json) supersedes the first count-reconciliation attempt and enumerates all nineteen original locations, raw matching-line numbers, hashes, original line counts and current key/value occurrence counts. All earlier receipts remain as audit history. The v3 labels distinguish 13 value-only-classifier occurrences (including two plaintext guidance occurrences), 11 parsed JSON-key occurrences, 11 parsed JSON-value occurrences, and two non-JSON text occurrences. Thus raw occurrences total 24; matching output lines total 18. The earlier `currentIndividualPatternMatches` label referred only to the value-only classifier, not a whole-file total, and is superseded.

Observed classes:
- Five tracked historical review packets contain two command-option-like matches each in evidence content/reference fields. The classification alone does not establish whether these are examples, filenames or credential values. They require safe targeted adjudication in Analyze.
- A tracked integration inventory has a provider-token-pattern substring embedded in a branch identifier beginning with a task prefix. Context supports a substring false positive; it does not prove the general scanner is adequate.
- `docker/AGENTS.md` has two command-syntax matches. The original command includes `docker/*`, including Markdown, although its explanatory note says Markdown is excluded. The command/note contradiction must be resolved explicitly, not by pretending the command originally passed.
- Eleven prior-child evidence files retain one raw matching line each, in JSON property names omitted by the value-only classifier. Their hashes equal the original attribution hashes. Those key matches are not evidence of credential values, and still need safe adjudication. The twelfth file, obsolete-task2-blocker-reconciliation.json, has changed since attribution and has zero current raw matches; this child did not make that earlier change.

The original result is **20 matching lines across 19 files**. Eighteen files retain their attribution hashes and collectively have 18 matching lines: five packet lines, one inventory line, one Docker guidance line, and eleven child-evidence lines. The sole changed file therefore accounts for the remaining two original lines. Current targeted inspection has **18 matching lines and 24 individual raw pattern occurrences**: ten option occurrences in five packet lines, one inventory occurrence, two Docker occurrences in one line, and eleven JSON-key occurrences. This reconstruction uses unchanged hashes plus the original aggregate; it does not invent a retained original per-line log or rerun the global gate.

The real security boundary is publishing evidence that may contain authentication material. Values stay private; receipts must retain enough hashes, paths and dispositions to audit minimization. No credentials were validated against a server. No universal claim that all matches are false positives is supported.

### Literal symlink result

[Whole-worktree inventory](evidence/assess/whole-worktree-symlink-inventory.json): 10,552 descendant entries, 1,745 directories, zero errors, three symlinks under ignored `node_modules/.bin`. The Node lstat walk included ignored dependencies and vendored directories, did not follow symlinks and read no file contents or symlink targets.

Its boundary is the mini worktree's descendant entries. It excludes ancestors and the external Git common directory behind the worktree indirection file. It does not certify other repositories, external managed caches or installed skill directories. No symlink was removed and no dependency command was run in Assess.

## Health, coverage and verification limits

**Current repaired delivery health: UNKNOWN; original QA: FAIL.** Existing successful checks are historical evidence, not acceptance for a repair that does not yet exist. No build, tests, packaging, new structural gate or product operation ran in Assess; static reads and the inventory above are fact-finding.

Relevant tests and integration scripts exist, including carried-payload resolution, waypoint expansion, package materialization, identity resolution and the reported location callers. This inspection does not establish a coverage percentage or all-platform acceptance. Coverage is **PARTIAL/UNQUANTIFIED**. Later Plan must define real-path checks for changed behavior at the completed repair boundary, then execute required failed QA commands once; passing Boss/UAR gates are outside this child's repair.

Managed OpenSpec refresh passed using latest verified CLI 1.14.1 before creation; subsequent managed list is recorded. Refresh reported no authored-path changes. Refresh/list are not spec validation, archive, delivery acceptance or installation changes. The mini package's pinned dev dependency remains as authored.

The actual cached model preflight reports two dispatchable models and a configured existing gateway. Cache freshness is not a fresh transport or independence proof. Exact producing provider/connection/model identity is unavailable; it must not be guessed from a route label. Formal artifact review and its actual disposition are recorded separately under `review/assess/`.

Skills that expect Bash were adapted to existing repository Node ports. `superpowers` and the `sycophancy-correction` skill file are unavailable in the current catalog. The callable sycophancy MCP detector is available: the actual detect-only assessment screen scored 0.018 and flagged only low-severity length/visible-effort risk. No correction was mandatory. Its response is retained in `sycophancy/assess-screen.json`. The initial invocation omitted the tool's required target and failed; the corrected invocation succeeded. Screening occurred after the draft was first saved, before this final assessment version and review packet. This deviates from the prompt's before-first-write ordering and is recorded, not presented as compliance with it. A manual S-02/S-03/S-06 check separates observation from inference and assigns no positive architecture verdict without evidence. The adversarial findings screen will record its actual disposition.

No product source, dependency pins, shared-service configuration or resident skills were changed in this assessment. Protected UAR diagnostics remain excluded; no retry or alternate access was attempted. A prior diagnostic source-line exposure was already disclosed in sibling evidence, so this statement is limited to the present child and does not claim a disclosure-free entire session.

## Goal progress and handover conditions

| Child goal | Status at Assess |
|---|---|
| Resolve compatibility and six structural failures | NOT MET — observed and classified; no repairs approved or applied. |
| Close literal no-symlinks gap | PARTIAL — coverage gap resolved by broader observation, actual three-link violation remains. |
| Preserve history, safe evidence and source-bound receipts | PARTIAL — baseline, original failures and bounded new receipts preserved; repair receipts await implementation. |
| Return passing repair evidence to acceptance sibling | NOT MET — no repaired QA or sibling task completion. |
| Full staged lifecycle with approvals and scope limits | PARTIAL — child creation and Assess entered; remaining handovers require operator approval, including Spec mandated by the project lifecycle. |

Analyze should settle the five questions above, assess the existing proposal and select the smallest corrections. No approved production write scope exists yet. This handover does not waive failed constraints, adopt new dependencies, publish, or complete the parent.

## Assessment review disposition

Round 1 of the isolated gateway artifact review returned one CRITICAL counting inconsistency. It was addressed by separating raw matching lines, parsed value occurrences and JSON-key occurrences, correcting the incomplete value-only classification, and preserving an exact nineteen-location reconciliation. The round-1 findings screen actually passed at score 0. Review independence remains unverified-producer-unknown. Re-vet results are retained separately; no cross-model guarantee is asserted.

## Unresolved review findings and explicit adaptations

The second and final permitted artifact-review round retained one CRITICAL terminology finding and two WARNINGs. The findings record remains BLOCK; it has not been overwritten or called a pass. After that round, v3 replaces the ambiguous value-only count label with explicit units, this document scopes the missing context path to this child, and the source claims expressly reference the packet's full source bodies. These final corrections are **static producer revisions, not a third reviewed verdict**. Carry the critical disposition and two warnings into Analyze, where terminology and source traceability remain acceptance inputs. Do not use this stage as final local certification.

The [kbd-assess instruction](/Users/gqadonis/.codex/skills/kbd-assess/SKILL.md) says: “CRITICAL findings → revise assessment.md and re-vet (max 2 rounds, then accept with an ‘Unresolved review findings’ section appended).” This assessment uses that bounded artifact-mode handover; it does not waive the failed mini constraints or a later delivery review. Both gateway rounds record `cross_model_check: unverified-producer-unknown`; reviewer distinctness cannot be certified.

The draft assessment screen was called after the first draft write rather than before it. An invalid first invocation was corrected using the actual tool schema; the corrected detector and subsequent revised-text detector both returned score 0.018 with only a low-severity length warning. Responses are retained, not claimed as model-independent review.

This child's own stage-entry receipt initially contained a redundant complete runtime state snapshot. Its duplicate body was minimized to the actual command, exit code, revision, active path, local-commit status and full-response hash. The minimization receipt records before/after file hashes and omitted field names. Canonical state and journal history remain authoritative and unchanged by that minimization; no prior QA failure receipt was edited.
