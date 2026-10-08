# Kimi Code handover — mini-pack QA remediation

Prepared 2026-10-08. This is a continuation brief, not a completion or stage-approval receipt.

## Start here

Open Kimi Code CLI from this existing isolated repository:

```text
/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini
```

The separate KBD/OpenSpec planning root is:

```text
/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture
```

The active child directory is:

```text
/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/mini-pack-qa-remediation
```

Use the repository root as your working directory for source operations, and pass the planning root explicitly to KBD/OpenSpec operations. Do not use the primary checkout at /Users/gqadonis/Projects/prometheus/prometheus-skills-mini. Its shipping-phase reminder belongs to different work. Do not create another worktree, phase or change.

Codex has stopped implementation work for this handover. This file does not launch Kimi, transfer native credentials or approvals, or claim a runtime team-task acceptance. No matching active team task was identified for this child; the handoff skill's packet fields are carried here without inventing a competing task registry. Kimi must confirm current state before continuing. Existing sibling team tasks must not be reassigned.

## Current position and authorization

- Canonical child: `bossfang-uar-authorization-and-execution::mini-pack-qa-remediation`.
- Assess COMPLETE at revision 267; Analyze COMPLETE at revision 269.
- **Spec IN_PROGRESS at revision 270**, sequence 3. Confirm against the planning root's position reminder and canonical status; revisions may change after this packet.
- Existing OpenSpec scaffold: `openspec/changes/bauar-mini-qa-remediation/` under the planning root. At handover it contains only `.openspec.yaml`; proposal, design, specifications and tasks have not been authored.
- No child implementation tasks are registered. Project-wide progress is not this child's progress.
- Mini HEAD: `7765b14d345c3d759b97e7be116f8919484ccebb`; branch: `codex/bossfang-uar-authorization-and-execution`.
- The worktree is dirty. A read-only handover snapshot returned 487 porcelain status records, including unrelated work; the older assessment recorded 1,241 entries. These are different snapshots, not proof of cleanup by this fix. Recheck ownership before editing or staging.
- **No repair production code, clean dependency install or repaired QA run has been completed in this child.**

Read [approval-policy.json](approval-policy.json). The operator approved entry to Spec and the narrow Node secret-checker command exception. Authorized stages are Assess, Analyze and Spec; **Plan approval is pending**. Production changes require the later approved Plan/Execute boundary.

The operator requires stage stops: finish Spec and stop for Plan approval, finish Plan and stop for Execute approval, finish Execute and stop for Reflection approval. Use the actual six-stage lifecycle, including Spec. Previous approvals do not authorize skipping these stops. The user previously requested an agent team for Execute; carry that instruction forward once Execute is approved, with disjoint ownership and one build writer.

The secret-checker exception is already authorized; do not ask again for the same choice. It permits replacing only the mini `no-hardcoded-secrets` content-check command with a Node checker preserving its scan boundary, finite hash-bound non-credential dispositions and positive detection evidence. It requires a separate reviewed commit. It is not a blanket waiver of secret checks.

## What this fix addresses

The desktop MCP acceptance sibling encountered mini QA failures that prevent its final evidence handoff. This child repairs the mini source, its generated skill payloads and local prerequisites; it does not reimplement Bossfang/UAR architecture.

Historical QA receipt in the sibling:
`../desktop-mcp-projection-acceptance/evidence/execute/qa/validation-result.json`, dated 2026-10-07T19:43:18Z, overall BLOCKED. Historical npm test: 1,096 total, 1,093 passed, one failed, two skipped. Historical check/spec validation passed at that boundary only.

| Observed failure | Smallest correction to specify |
| --- | --- |
| Carried-payload reference test promises absent installer/updater docs | Correct supported Cadence documentation and carried references. |
| Six tracked shell paths: two Cadence source assets, four generated copies | Remove unsupported installed-refresh assets from source; regenerate both payloads after source completion. |
| Three home/temp literal matches in waypoint source/test | Preserve interpolation behavior while moving location ownership into the existing platform adapter. |
| Eleven OS-location matches in nine files | Reuse platform path helpers in the attributed callers/fixtures; preserve explicit roots and override precedence. |
| Five obsolete backend-text matches in three bottleneck files | Remove stale text while preserving canonical delegation and CLI behavior. |
| Secret scan: originally 20 matching output lines in 19 files | Apply the explicitly approved bounded checker correction, preserving detection and history. |
| Three generated fixture output calls in two library tests | Use equivalent edge output construction without changing JSON/newline behavior. |
| Three ignored dependency executable links | Plan a recoverable isolated dependency replacement with executable links disabled, then inspect all descendants without following links. |

Counts are historical attribution, not a fresh global QA result. The seven original failed checks plus subsequently observed dependency links are distinct observations.

## Read these existing artifacts before drafting

Read these child files in full:

1. [assessment.md](assessment.md), [analysis.md](analysis.md), [goals.md](goals.md).
2. [approval-policy.json](approval-policy.json), [decision-log.md](decision-log.md), [reconciliation-2026-10-08.md](reconciliation-2026-10-08.md).
3. [library-candidates.json](library-candidates.json), [handoffs/analyze.handoff.json](handoffs/analyze.handoff.json).
4. [evidence/spec/stage-enter-receipt.json](evidence/spec/stage-enter-receipt.json) and [evidence/spec/identifier-key-context.json](evidence/spec/identifier-key-context.json).
5. [evidence/analyze/review-summary.json](evidence/analyze/review-summary.json), [evidence/analyze/candidate-validation-02.json](evidence/analyze/candidate-validation-02.json).
6. [evidence/assess/whole-worktree-symlink-inventory.json](evidence/assess/whole-worktree-symlink-inventory.json), [evidence/assess/secret-count-reconciliation-v3.json](evidence/assess/secret-count-reconciliation-v3.json).

Use the sibling's `evidence/execute/mini-structural-failure-attribution-01.json` for its 41 unique attributed paths and exact original gates.

Some Analyze statements remain historical: its pending Node-checker approval was subsequently granted in approval-policy.json. Its unresolved identifier meaning was subsequently clarified by the Spec receipt. Preserve older receipts instead of rewriting them.

## Implementation scope to carry into Spec and Plan

**Cadence source and provenance.** Correct `skills/delivery-cadence/SKILL.md` and the whole installed-refresh section in `skills/delivery-cadence/references/profile.md`, including shell checkpoint/shim instructions and missing documentation promises. Remove `scripts/refresh-skill-pack.sh` and `examples/refresh-skill-pack-shim.sh` beneath that skill. Retain its functioning Node CLI, initialization, transitions, checkpoints and reports. Explain that installed/service refresh is unavailable in the mini profile.

Preserve the historical `.prometheus/delivery-cadence-source.json`. Add a dated mini adaptation record with baseline digest, approved removals, changed documentation and final actual hashes. Do not claim byte identity with shared source after adaptation. Existing `sync-mini.mjs` refuses locally changed/removed owned files: retain and explain that refusal; do not run or weaken synchronization or modify the full pack.

**Platform callers.** Reuse `lib/platform/paths.mjs`; avoid another abstraction. Attributed production callers include `lib/kbd/waypoint.mjs`, `lib/cadence-adapters/kbd.mjs`, `lib/platform/openspec/state.mjs`, `lib/services/discovery.mjs`. Attributed fixtures include waypoint tests plus:
`lib/context-bootstrap/bootstrap.integration.test.mjs`,
`lib/ideation/dispatch.test.mjs`,
`lib/ideation/independence.test.mjs`,
`scripts/assert-independent-dispatch.test.mjs`,
`scripts/record-dispatch.test.mjs`,
`scripts/uiux-routing.integration.mjs`.

Waypoint interpolation must preserve omitted environment => process.env, both braced/unbraced forms, explicit missing/null/empty home => empty string, custom values, user substitution and unknown-token passthrough. **Do not introduce an OS-home fallback for interpolation.** A minimal platform export may resolve the existing environment contract. Preserve managed cache override precedence and metadata discovery supplied home roots.

**Stale text/fixture output.** The three bottleneck paths are `lib/kbd/bottleneck-guard.mjs`, `scripts/kbd-bottleneck-detector.mjs`, `skills/kbd-bottleneck-detector/SKILL.md`. Fixture output paths are `lib/distribution/package-builder.test.mjs` and `lib/learning/identity.test.mjs`. Reuse the distribution generator where possible; generate Claude/Codex outputs from finished source instead of hand-editing copies.

**Secret checker.** Targeted assessment reconciled 18 current matching lines and 24 raw occurrences, not actual credential count: 12 option occurrences in prohibition/examples, one token-shaped substring inside an identifier, and 11 JSON-key occurrences. Later Spec inspection establishes that all 11 keys are in `commandRevisions` or `state.commandRevisions` with numeric values. They are command-revision bookkeeping identifiers, not direct task-map IDs. Their common key SHA-256 is recorded in the Spec receipt; avoid printing raw identifiers or matches.

The checker must inspect keys and values, preserve original path scope including Docker Markdown, and accept only finite per-occurrence dispositions bound to exact location/field or line and content digest. Changed/new unmatched hits fail safely without printing values. No directory, packet, all-keys or arbitrary prohibition-string exemptions. Preserve canonical identifiers, journals, archives and original failed evidence. Require positive proof against synthetic inline credential options, standalone provider-shaped tokens and a newly inserted credential inside an otherwise accepted historical packet. This is the actual evidence-publication security boundary.

**Dependencies.** A clean install replaces dependencies, so first reserve this isolated surface and preserve recoverable local-only content. Keep lockfile/package/pins unchanged. Use scoped executable-link suppression and lifecycle scripts disabled; do not modify global npm configuration. Executable-link suppression alone does not guarantee no links. Final lstat inventory includes ignored descendants, follows no links, and excludes ancestors/external Git directories/other repositories.

## Immediate next step and subsequent completion

Resume Spec without restarting Assess/Analyze. Load the current KBD skills and managed OpenSpec schema instructions, then author proposal, design, specifications, ordered tasks and concrete acceptance criteria in the existing change. Declare the mini repository as implementation target and the separate planning root as planning authority.

Specify one coherent completed delivery covering source, provenance, checker, prerequisites and generated payloads. Define the checker correction's separate reviewed commit. Include a real isolated CLI/payload operation for preserved waypoint expansion, cache override, supplied-root discovery, canonical Cadence binding and generated hook invocation, plus secret detection controls.

Complete the required Spec artifact review and typed KBD handoff; **stop for Plan approval**. Do not mark a stage complete until its required artifacts/receipts exist. Use current schemas and revision checks; do not hand-edit generated reminders or canonical projections.

After later Plan/Execute approvals, finish all planned production work before final QA. Run the required mini compatibility, rules, specification, distribution and structural gates once at the completed child boundary, including whole-descendant links and the real operation. Rerun only failed gates after fixes. Record source-bound commands/results and actual platform coverage; macOS evidence is not Windows acceptance.

Return a finite evidence packet to the existing desktop acceptance sibling. It retains ownership of its task 10/certification; this child must not certify the sibling or parent, rerun their already passing product gates, publish or deploy. Reflection and child exit remain gated.

## Tooling and prohibitions

Use Node LTS:

```text
/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node
```

Ambient Node was observed as 26.5.0, outside this project's LTS policy. Use the explicit executable. No new dependencies, frameworks, services or pin edits are needed.

Existing managed OpenSpec entry point:
`/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/platform/openspec/cli.mjs`.

Read-only status example:

```text
/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node lib/platform/openspec/cli.mjs run --project "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture" -- status --change bauar-mini-qa-remediation --json
```

Follow local AGENTS.md bootstrap, versions.toml, decisions and subsystem gotchas. Node is the script runtime; do not author shell/Python/PowerShell scripts or use prohibited POSIX helpers. Prefer rg for searches. Preserve pre-existing work; no broad git add, reset, checkout cleanup or whole-branch merge. Generated commits require Assisted-by and must not add Signed-off-by.

No edits to Boss, UAR, Bossfang, the primary mini checkout, installed skills, shared services or dependency pins. Do not inspect/retry/reroute the excluded UAR diagnostics `tests/bauar_session_owner.rs` and `src/uar/mcp_server.rs`.

Missing bare superpowers and sycophancy-correction SKILL.md were disclosed. Use available Node-native tooling and report unavailable quality gates honestly.

## Verification limits and other-session reconciliation

Assess ended with a BLOCK review after two rounds; subsequent wording corrections were static, not a third passing review. Analyze's second review passed with two warnings, clarified afterwards without a third review. Producer identity was unknown, so cross-model review independence was not certified. Artifact reviews do not establish repaired product QA.

The other-session search found merged Cadence source-reconciliation PR #46, a different fix still carrying shell assets, without a matching complete mini QA receipt. That does not prove another fix is absent. Reuse matching actual changes/receipts if available; do not make finding that session a new prerequisite or duplicate unrelated Cadence work.

No secret values belong in output, prompt, packet, logs or committed evidence. If a genuine credential is found, preserve safe before/after hashes and failure status; never relabel it as a benign collision.

## Prompt to paste into Kimi Code CLI

```text
Continue the existing mini-pack QA remediation child in this worktree. Read kimi-code-handover-2026-10-08.md at:
/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/mini-pack-qa-remediation/kimi-code-handover-2026-10-08.md

Working repository: /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini
KBD/OpenSpec root: /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture

First read that root's .kbd-orchestrator/position-reminder.txt, then follow local AGENTS.md bootstrap and read the linked handover evidence. Confirm the current child and revisions; do not use the primary checkout's shipping-phase reminder.

Resume the existing bauar-mini-qa-remediation OpenSpec change at Spec IN_PROGRESS (handover revision 270). Assess and Analyze are already complete. Spec and the narrow Node secret-checker exception were explicitly approved; Plan and Execute are not yet approved. Complete a concrete, minimal Spec and its required review/handoff, then stop for my Plan approval. Preserve the later Plan, Execute and Reflection review stops.

Do not create another phase/worktree, implement repair code prematurely, rewrite historical evidence, alter pins/services/installed state, touch Boss/UAR/Bossfang, or broadly stage/reset the dirty worktree. Preserve the waypoint interpolation contract, retire only unsupported Cadence installed-refresh behavior, regenerate owned payloads from corrected source at the completed delivery, and keep secret dispositions finite and hash-bound with positive detection controls. Use Node 22.20.0 LTS explicitly.

After later approvals, carry the existing instruction to use an agent team for Execute, complete the whole planned repair before QA, and produce the actual mini acceptance evidence required by the sibling. Report unsupported or unavailable verification honestly. Keep the handover focused on finishing this fix.
```

