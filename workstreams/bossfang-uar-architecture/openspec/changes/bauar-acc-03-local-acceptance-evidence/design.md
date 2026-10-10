# Design

## Context

See [proposal](proposal.md) and [evidence contract](specs/local-acceptance-evidence/spec.md). Previous delivery is an unsigned local app with current UAR, not successful current-bundle runtime acceptance. Source-bound historical passes and separate skill-pack 4/4 results cannot close this phase.

## Goals / Non-Goals

**Goals:** one finite inspectable local acceptance invocation; truthful incomplete/failure outcomes; actual product boundaries; independent completed-product review and explicit local scope/owner disposition.

**Non-Goals:** service orchestration daemon, hosted CI, release automation, installed cache updates, package upgrades, general secret scanner or durable recovery implementation.

## Decisions

1. Proposed entry point (does not exist yet): `/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/local-release-acceptance.mjs" --config "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/candidate-inputs.json"`. Append --stage integration for the one runtime batch, or --stage finalize for a read-only source-bound receipt aggregation after product review. finalize performs no runtime test, launch or compilation; integration exit0 establishes only its selected runtime components, never final readiness. Interrupted aggregation does not rerun passed components. Cwd is the isolated workstream `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture`. Thin entry plus capability modules under phase acceptance/lib, each ≤500 lines. Node 22.20.0 coordinator; Node 24.11.1 is the proposed source-bound child pin selected from the successful predecessor build, compatible with Boss engines >=24.11.1 <24.16.0; it is not an existing patch-level harness assertion (that gate checks major24 only). Record and verify actual process.version before admission. This child is selected for Boss/Playwright/Bossfang. No shell-string invocation or inherited command wrappers. Use argument arrays and explicit environment maps; never mutate coordinator HOME/CODEX_HOME.
2. Config schema v1 binds phase ID, approved plan/handoff identity, production manifest/task dispositions, source revisions and finite touched-input digests, package path/asar/marker/bundledUar digests, UAR target/features, explicit Node/Playwright/Cargo executables, harness-inputs digest, scenario IDs, retained output root and bounded child budgets. Do not traverse whole UAR repo or access F6 files. Missing/changed input is exit2 before effects; a missing locked dependency is BLOCKED, no automatic install.
3. Per-scenario receipt schema v1: stable ID and owning backend task; source/config/package/profile digests; exact sanitized argv/cwd/environment class; start/end; exit/status PASS|FAIL|BLOCKED|OUT_OF_SCOPE|CANCELLED; observed booleans/counts; paired negative control result; bounded evidence paths and cleanup outcome. No plaintext credential, request/model body or fixture canary in config/receipts. Hash files only after fixed allowlist selection; no secrets duplicated into receipts. Root receipt aggregates scenario IDs and completeness, never exit codes alone.
4. Private resources: fresh unique phase-owned launch R, separate scratch HOME/CODEX_HOME/XDG/TMP/queue/plugin roots for each child, root override for Electron, UAR storage in selected profile; harness embedded Surreal unique persistence; transient peers bind loopback port0, record actual assigned endpoints. No shared Surreal/memory/LLM takeover. Child environment contains fixture credentials only, never ambient provider secrets. Live profile guard is finite selected-file metadata/digest comparison, not a recursive content capture; private paths/effect inventory is mandatory. No claim that third-party system/keychain writes are universally sandboxed.
5. One production barrier covers 01 root implementation, 02 manifests and 03 coordinator/config/schema production. Build/package after it, then author/adapt executable acceptance cases, then one consolidated batch. Packaging writes are serialized; save a retained old candidate beforehand. One Cargo writer per shared target; never parallel dependency mutation. Required stopped/unknown cleanup outcomes fail or block according to whether behavior is observed or evidence unavailable.
6. Package controls use existing production integrity/preparation/public-mode validators on disposable candidate copies (original archive/.app/source pins unchanged). A copy whose marker/source is stale or archive digest fails must be refused. Public-mode rejection is a validator invocation only, with no publish/install route. Plan pins exact existing validator argv/environment before execution.
7. Required final components: packaged desktop cases in 01 verification, real harness cases and finite eligible UAR batch in 02 verification, package controls, safe evidence checks, scoped formatting and cumulative completed-product review. Review manifest enumerates eligible BAUAR product paths/base→candidate boundaries and new files in all three products; pairs callers; no whole-repo diff/read or F6. Retain global formatting debt without running product format/lint commands that write the tree. Scope-limited checks only.
8. Fresh-context independent review uses available configured reviewer; exact source/diff/input digests bind receipt. Unknown producer/reviewer identity means distinct-model independence unverified. A completed artifact review now cannot satisfy product review. If independence required for local verdict cannot be established, readiness says review BLOCKED pending a genuinely independent reviewer or explicit operator waiver; do not silently reuse prior waiver for this new scope.
9. Return 0 only if selected mandatory runtime, negative-control, formatting and required product-review results PASS. Return1 for observed failed expectation; return2 for unavailable/incomplete prerequisites/evidence/review. Wider scope OUT_OF_SCOPE is not mandatory for selected local verdict. Interrupted owned cleanup and unresolved side effect dispositions remain visible; coordinator never reruns a job to repair missing evidence. Fix failures in coherent batches; rerun only failed/invalidated component gates, accumulating a fresh root receipt bound to current inputs.

## Release scope and accountable authority

| Scope | Disposition for proposed phase | Accountable authority / action |
| --- | --- | --- |
| Unsigned local macOS ARM64 bundle | Selected proposal; ratified through explicit Plan approval | Workstream lead coordinates; assigned Boss/Bossfang/UAR owners implement named tasks; operator reviews readiness |
| Code signing/notarization | Deferred, no credentials/owner selected | Operator must later select signing owner and target; not a local gate prerequisite |
| Installed operation / distribution installer | Deferred | Operator selects installation/release owner and disposable native environment later |
| Intel macOS | Deferred / unverified | Operator selects native host/owner in later scope |
| Windows | Deferred / unverified | Operator selects native host/owner in later scope; source portability is not execution evidence |
| Remote multi-user receiver / IdP / custody | Excluded by operator | Application/configuration authority; no receiver selected or certified |
| Publication, merge, shipping/C05 | Unauthorized by this phase | Operator remains release authority; separate concrete release approval required |

This resolves Analyze's scope/ownership warning into explicit proposed dispositions. It does not pretend a signing/platform person has accepted work. User's Spec invocation approves drafting, not Plan or publication.

## Risks / Trade-offs

- Historical passing gates → accept only explicit source-compatible retained evidence for unchanged scopes; new private packaged operation must actually run.
- Stronger completeness aggregation may expose a zero-test or missing observation → classify exit2; never fill an invented receipt.
- Per-case time budgets → preserve unresolved outcomes and terminate only owned children. Plan pins practical finite limits using existing gate budgets, not new production timeouts.
- Global debt → inventory/leave unchanged; do not expand formatting or skill-package repair.

## Migration Plan

Additive phase tooling and evidence. No product migration, service restart or installation. Retain before/after candidate copies; corrected receipts never rewrite earlier failed evidence. Implementation/review/build/package/runtime/publication states stay separate in final handoff.

## Acceptance

See [verification](verification.md) and sibling verification documents. Plan assigns owners and concrete machine executable paths before Execute. No remaining question changes the selected architecture; broader release selection is explicitly deferred.

## Plan reuse evidence

Plan references the existing Analyze candidates without reopening its research budget. 
- library: cand-005; ADOPT: Node LTS built-in orchestration. Use built-ins through existing orchestration conventions; no new dependency or service. Evidence: [POSIX HOME affects Node home lookup, not proof of all Electron application paths.](https://nodejs.org/download/release/v22.20.0/docs/api/os.html#oshomedir); [Explicit argv/environment child process API.](https://nodejs.org/download/release/v22.20.0/docs/api/child_process.html#child_processspawncommand-args-options); [Node LTS required for workstream orchestration; product child runtime constraints separately observed.](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/versions.toml). Risks retained: Boss/Bossfang child tools require already-installed Node24; coordinator Node22 alone cannot run all children. No blanket inherited credentials or raw subprocess output in published receipts.

See [Plan](../../../.kbd-orchestrator/phases/phase-bauar-release-acceptance/plan.md). Proposed commands/runtime/input records remain unexecuted; task timing and source boundaries are governed by the full-production barrier.
