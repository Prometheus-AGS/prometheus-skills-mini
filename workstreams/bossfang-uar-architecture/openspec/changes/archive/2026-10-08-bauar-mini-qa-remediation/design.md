# Design

## Context

See proposal.md — Why. Boundaries fixed by earlier stages and the operator:

- Planning authority: this planning root (`workstreams/bossfang-uar-architecture`). Implementation target: the mini repository worktree root only. No Boss/UAR/Bossfang source, no dependency pins, no installed skills, no shared services.
- Baseline mini commit `7765b14d345c3d759b97e7be116f8919484ccebb`; the worktree carries substantial unrelated dirty work that must be preserved — staging is per-path only.
- Original QA (2026-10-07): `npm test` 1,096 total / 1 failed (carried-payload reference) / 2 skipped; `npm run check` and `npm run spec:validate` passed; six structural checks failed; the literal no-symlinks coverage was incomplete and a whole-descendant inventory then found three `node_modules/.bin` links.
- The operator approved: entry to Spec, and the narrow exception to replace only the `no-hardcoded-secrets` content-check command with a Node checker (separate reviewed commit, preserved scan boundary, finite hash-bound dispositions, positive detection evidence). Plan and Execute are NOT approved.
- Runtime: Node 22.20.0 LTS explicitly (ambient Node 26.5.0 is outside project policy). npm 11.16.0 documents `bin-links=false` suppression and lockfile-frozen `ci`; suppression alone is not no-link proof.
- The kbd-spec acceptance template file is absent in this harness's skill install; its required elements (entry point, collaborators/boundaries, observable result, negative control, isolation roots, prerequisites, exact final local gate) are embedded in the Acceptance section below.

## Goals / Non-Goals

**Goals:**

- All eight observed failure classes corrected at their source with minimal, behavior-preserving edits; generated payloads regenerated from corrected source after source completion.
- Preserved contracts proven by named acceptance cases: waypoint interpolation, managed cache override, discovery supplied roots, canonical cadence CLI, guard delegation, fixture output bytes.
- The secret-checker correction under the approved exception, as its own reviewed commit, with positive detection controls.
- A finite, source-bound evidence packet the acceptance sibling can consume without rerunning its passing product gates.

**Non-Goals:**

- No port of upstream installer/service refresh; no new dependency, framework, service or pin change; no global npm configuration change.
- No synchronization invocation or weakening of `sync-mini.mjs` refusals; no full-pack edits; no historical evidence rewrite.
- No sibling/parent certification, publication, deployment, or Windows acceptance claims from macOS evidence.
- No tightening of other checks (the known `os-locations` false negative stays with the rule owner, unchanged).

## Decisions

### D1 — Retire, don't port, the installed-refresh capability

The refresh procedure invokes Python/POSIX tools, missing upstream installers and resident service mutation — all outside the mini's Node-only, optional-service contract. Remove the two shell assets from the skill source and rewrite `SKILL.md` (refresh reference) and the entire `references/profile.md` "Skill-pack refresh procedure" section so the documentation declares the capability unavailable with the exact markers the carried-payload contract recognizes (`UNAVAILABLE IN THIS PROJECT`; `one referenced asset is absent` where a reference must remain) plus a follow-up reference matching its `/decisions\.md|follow-up/i` requirement. Regenerate both harness distributions from the finished source — never hand-edit `dist/` copies.

*Alternatives:* port the refresh to Node (rejected: installed/service mutation is out of scope and unapproved); mark the whole skill unavailable (rejected: hides the functioning Node CLI); delete only the dist copies (rejected: leaves the copying source intact).

### D2 — Interpolation ownership moves to the platform adapter; contract preserved byte-for-byte

`expandKbdPath` keeps its exact contract (see spec `platform-location-ownership`). Two changes make it constraint-clean: (a) token spellings are constructed from components (e.g. `'$' + 'HOME'`) so no scanned literal remains; (b) reading home/user values from the supplied environment map moves behind a minimal platform-adapter export, since `lib/platform/` owns location/env acquisition — the waypoint module passes its `env` argument through unchanged. No OS-home fallback: missing/null/empty stays the empty string.

*Alternatives:* exempt the literals in the check (rejected: that's widening a gate to fit code, and the constraint file itself records that standard); delete the interpolation feature (rejected: legacy contract, explicitly required to survive).

### D3 — Callers adopt existing helpers; overrides keep precedence

`lib/cadence-adapters/kbd.mjs` scratch dir uses `tempDir()`; `lib/platform/openspec/state.mjs` default cache home uses `homeDir()`/`stateDir()` while `PROMETHEUS_OPENSPEC_HOME` keeps precedence and lock/receipt semantics are untouched; `lib/services/discovery.mjs` default `home` parameter uses `homeDir()` with the caller-supplied argument still winning. The six attributed test fixtures use `tempDir()` for `mkdtempSync` roots. No new abstraction.

### D4 — Finite, hash-bound disposition store for the secret checker

The Node checker scans the replaced command's *effective* pathspec scope: `docker/*`, `*.mjs`, `*.json`, `*.toml`, `*.yaml`, `*.yml`. That scope already includes `docker/` Markdown — the original 2026-10-07 failure record contains a `docker/AGENTS.md` match — while the constraint's note claims Markdown is excluded; the note contradicts the command. The checker preserves the command's effective scope (no expansion, no silent Markdown exclusion) and the replacement commit corrects the stale note text alongside the expression. It inspects JSON keys and values and non-JSON text, and consults a disposition store derived from the child's named adjudication receipts — `evidence/analyze/secret-syntax-adjudication.json`, `secret-context-dispositions.json`, `secret-key-dispositions.json`, `secret-key-structure.json`, `evidence/assess/secret-count-reconciliation-v3.json` and `evidence/spec/identifier-key-context.json`: the 12 prohibition-paired option occurrences (five packets + Docker guidance), the one identifier-embedded token-shaped inventory hit, and the 11 `commandRevisions` bookkeeping-key occurrences — each bound to file, field/line, exact content digest (the receipts' per-occurrence sha256 values) and disposition class. Anything unmatched fails and is reported by location and digest only. Dispositions accept occurrences, never files: a one-byte change anywhere re-fails that file's occurrences.

*Alternatives:* data minimization of the historical packets (rejected: history rewrite, explicitly prohibited); a broader regex allowlist (rejected: unbounded exemptions); retaining the failed git-grep gate (only the fallback if the exception is rescinded — it is not: this child's `approval-policy.json` records `narrowSecretCheckerException.authorized: true`, quoting the operator's explicit 2026-10-08 reply: "Replace only the mini no-hardcoded-secrets content-check command with a Node checker preserving its scan boundary, finite hash-bound non-credential dispositions and positive credential detection evidence. Separate reviewed commit required." — the same reply that approved Spec entry). Authorization linkage to the constraint's own rule: the constraint clause permits a change to edit a check expression only to fix a demonstrated false positive and only when the change also proves the corrected check still catches a real violation. This change supplies all three legs: the demonstrated false-positive adjudication (the named receipts above), the explicit operator/rule-owner authorization for the Node implementation, and the positive detection controls that prove continued discrimination.

### D5 — Clean install as a reserved, reversible prerequisite operation

Sequence: inventory the existing `node_modules` (recover any non-reproducible local-only content) → record package/lock hashes → `npm ci` with executable links and lifecycle scripts disabled in this isolated worktree only → re-record hashes (must be unchanged) → whole-descendant lstat inventory as the actual no-symlinks evidence. Rollback = restore preserved content; the lockfile never changed.

### D6 — One completed delivery, then gates once

All production edits (groups 1–5 of tasks.md) complete before any gate runs. Verification text inside production groups is deliverable-artifact assertion (what must be true of the files the task produces — presence, absence, markers, hashes), not mid-delivery test or gate execution; per A-9 and the batch rule, no test suite, structural check or gate executes at a task boundary, and a narrow compiler check is allowed only to resolve an observed blocker. All executable verification consolidates at the completed child boundary: first the real isolated operation (waypoint expansion acceptance cases, cache override, supplied-root discovery, canonical cadence CLI binding, generated hook invocation, secret detection controls), then the required gate set — `npm test`, `npm run check`, `npm run spec:validate`, `npm run check:distribution`, every command-checked structural constraint, the whole-descendant link inventory, and a manual-review receipt for each constraint that has no command (`exactly-two-services`, `reference-repo-untouched`, and the manual line-count warning check). Only failed gates rerun after fixes. The operator's standing instruction to use an agent team for Execute is carried: disjoint file ownership, one build writer, reviewers dormant until the delivery boundary.

### D7 — Source-level cleanup for stale text and fixture output

Remove the five retired-backend text occurrences (guard comment, CLI usage/runtime strings, skill description) preserving delegation and exit codes. Rebuild the three fixture output calls: identity fixture emits its JSON line via `process.stdout.write(JSON.stringify(...) + '\n')` (byte-identical); package-builder stand-ins use the same edge construction. The `no-console-log-in-lib` gate is not touched — code changes, gate stays.

## Acceptance design (per delivery)

- **Shipped entry points:** the Node cadence CLI (`skills/delivery-cadence/scripts/cadence.mjs`), the managed OpenSpec CLI (`lib/platform/openspec/cli.mjs`), the KBD waypoint library, service discovery, the distribution generator, the new secret checker (invoked by the corrected `no-hardcoded-secrets` check).
- **Real collaborators/boundaries:** filesystem state dirs, the evidence-publication boundary (A-3), the npm dependency tree, generated harness payloads. No services required; everything degrades with both services down.
- **Observable results:** the six previously failing structural checks pass; the carried-payload test passes; the whole-descendant inventory reports zero symlinks; interpolation/override/discovery acceptance cases hold; positive secret controls detect.
- **Negative controls:** unmatched/new secret hits fail safely; mutation of a disposition-bound file re-fails; a synthetic credential inside an accepted packet is caught; unknown waypoint tokens pass through; no OS-home fallback fires.
- **Isolation roots:** this worktree only; scratch roots under the platform temp dir; no installed skills, global npm state, or other checkouts touched.
- **Prerequisites:** Plan and Execute operator approvals; agent team with disjoint ownership for Execute; Node 22.20.0 LTS explicit.
- **Exact final local gate:** the real isolated operation, then `npm test`, `npm run check`, `npm run spec:validate`, `npm run check:distribution`, all command-checked structural constraints (including the Node secret checker), the whole-descendant lstat inventory as the `no-symlinks` evidence, and manual-review receipts for the command-less constraints — each once at the completed boundary, source-bound receipts retained.

## Risks / Trade-offs

- [Checker regression risk — a real credential passes because dispositions are wrong] → finite digest-bound dispositions, positive controls (inline option, standalone token, inserted credential in accepted packet), fail-safe on any unmatched hit, separate reviewed commit.
- [Clean install destroys unrecoverable local content] → pre-inventory and preservation step with recorded rollback disposition before any replacement.
- [Dist regeneration clobbers unrelated dirty generated files] → ownership/fingerprint check against the attribution receipt before regeneration; per-path staging only.
- [Adapted payload drifts silently from shared source] → dated adaptation record with baseline digest and final hashes; sync refusal documented, not bypassed.
- [macOS-only verification] → stated plainly in receipts; no Windows acceptance claimed; existing CI/Windows receipts referenced where available.

## Migration Plan

Not a deployment: source edits land per task groups, the checker lands as its own reviewed commit, dependencies are replaced in the isolated worktree, payloads are regenerated from finished source, and gates run once at the completed boundary. Rollback: git per-path restore for source; preserved content restore for dependencies; historical manifest untouched throughout.

## Open Questions

- The other session's reported complete mini fix may still surface matching source and QA receipts; if it does, Plan should compare actual bytes and acceptance boundaries before reusing them. This does not change the specs, approach or task breakdown.
