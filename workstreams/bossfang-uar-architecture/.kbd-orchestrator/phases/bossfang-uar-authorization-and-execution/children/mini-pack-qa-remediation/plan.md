# Plan — mini-pack QA remediation

Date: 2026-10-08. Phase: `bossfang-uar-authorization-and-execution::mini-pack-qa-remediation`.
Authority: operator instruction of 2026-10-08 authorizes Plan and Execute ("run kbd-plan skill and then execute until the phase is complete and the bugs are fixed"); recorded in `workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/mini-pack-qa-remediation/approval-policy.json`. Reflection and child exit remain the approval stop. This child exercises no publication or push: its approval policy authorizes local work only, and the generic phase-level push-authorization sentence in `constraints.md` belongs to a different phase's dated authorization and is not claimed here. No installed-skill, shared-service or dependency-pin change is authorized.

## Prior context and lessons

The child's `prior-context.md` is absent (no hook-recalled lessons); per the Assess precedent the following restored lessons constrain this plan:

- A file-extension count does not measure an interpreter dependency — the cadence shell assets were read, not executed, before retiring them (assessment §Cadence).
- Tracked-only link checks do not cover ignored dependencies — the final no-symlinks evidence is the whole-descendant lstat inventory, rerun after payload regeneration (task 6.4).
- Correcting only generated output leaves the copying source intact — dist payloads regenerate from finished source (task 6.1); no hand-edits under `dist/`.
- A security pattern ported from a grep fragment dropped alternatives (gotchas 2026-09-21) — the checker disposition store derives from the named adjudication receipts in full, and its positive controls include one value per pattern class.
- Spec-stage adversarial review catches cross-file contradictions a single-artifact read misses — the whole change set was vetted as one packet at Spec.

## Ordered changes

One OpenSpec change: **`bauar-mini-qa-remediation`** (`workstreams/bossfang-uar-architecture/openspec/changes/bauar-mini-qa-remediation/`, strict-validated, 6 capability specs, 21 tasks). No further change structures are emitted; the Spec-stage tasks.md is the ordered change list and is unchanged by this plan.

Ordering rationale (dependencies, not convenience):

1. **Group 1 — Cadence source and provenance** (cand-003 reference; library: cand-001 adapt). Source must precede any payload regeneration. Draft adaptation record first so 6.2 only completes hashes.
2. **Group 2 — Platform locations and waypoint** (library: cand-001 adapt). 2.1 export → 2.2 waypoint → 2.3 production callers → 2.4 fixtures; each depends on the previous.
3. **Group 3 — Contract text and fixtures.** Independent of groups 1–2; file-disjoint.
4. **Group 4 — Secret checker** (build_required: no adoptable candidate). Depends only on the named adjudication receipts. Rule-owner authorization is explicit and quoted from `workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/mini-pack-qa-remediation/approval-policy.json` → `narrowSecretCheckerException` (operator reply, 2026-10-08): "Replace only the mini no-hardcoded-secrets content-check command with a Node checker preserving its scan boundary, finite hash-bound non-credential dispositions and positive credential detection evidence. Separate reviewed commit required." Worker D's constraint edit is exactly that one check expression. **No commit is created during Execute.** 4.3 prepares reviewed commit-ready paths and receipts only; every commit (checker's and any repair commit) is created only after the completed-delivery adversarial review passes, through the operator-authorized post-review commit procedure. The operator's "execute until the phase is complete" instruction is the recorded authorization for that procedure, exercised strictly post-review.
5. **Group 5 — Dependency prerequisites** (library: cand-002 adopt). Inventory/preserve (5.1) → `npm ci --no-bin-links --ignore-scripts --no-audit --no-fund` (5.2) → post-install inventory (5.3). Must complete before group 6 runs any gate, since `npm test` resolves through the replaced tree.
6. **Group 6 — Regeneration and completed-delivery verification.** 6.1 regeneration of the two real payload trees — `dist/plugins/claude/prometheus-skills-mini/` and `dist/plugins/codex/prometheus-skills-mini/` via `node scripts/generate-skill-system-distribution.mjs` (single build writer) → 6.2 provenance completion → 6.3 real isolated operation → 6.4 gates once (incl. final post-regeneration lstat inventory and manual-review receipts) → 6.5a **packet assembly**: the finite evidence packet is assembled under this child's `evidence/execute/` as a reviewable artifact → completed-delivery adversarial review inspects the full diff **and** the assembled packet → post-review commits via the operator-authorized procedure → 6.5b **return transfer**: the reviewed packet is written into the `desktop-mcp-projection-acceptance` sibling's evidence location for its consumption. Acceptance for 6.5b: the packet contains baseline/final hashes, adaptation record, checker positive/negative evidence, rollback disposition, operation and gate receipts; it contains no secret values; it does not claim sibling task-10 completion, sibling or parent certification, Windows acceptance, or rerun the sibling's passing Boss/UAR gates.

## Execution ownership (agent team, per operator instruction)

Disjoint file ownership; exactly one build writer for `dist/`; reviewers dormant until the completed delivery boundary; the KBD driver (this session) retains begin/end task ownership and canonical updates.

| Worker | Owned paths (exclusive) | Tasks |
|---|---|---|
| A — cadence/provenance | `skills/delivery-cadence/**`, `.prometheus/` adaptation record | 1.1–1.3 |
| B — platform | `lib/platform/paths.mjs`, `lib/kbd/waypoint.*`, `lib/cadence-adapters/kbd.mjs`, `lib/platform/openspec/state.mjs`, `lib/services/discovery.mjs`, the six attributed fixture files | 2.1–2.4 |
| C — text/fixtures | `lib/kbd/bottleneck-guard.mjs`, `scripts/kbd-bottleneck-detector.mjs`, `skills/kbd-bottleneck-detector/SKILL.md`, `lib/distribution/package-builder.test.mjs`, `lib/learning/identity.test.mjs` | 3.1–3.2 |
| D — checker | new checker source/tests under `rules/` or `scripts/` + `lib/`, the disposition store, the single `no-hardcoded-secrets` constraint entry | 4.1–4.3 |
| E — dependencies | `node_modules/` (ignored) operations only; no source paths | 5.1–5.3 |
| Build writer (sole) | `dist/plugins/claude/prometheus-skills-mini/**`, `dist/plugins/codex/prometheus-skills-mini/**`, final receipts | 6.1–6.5 |

No two workers share a file. Worker D's constraint edit is the only `.kbd-orchestrator/constraints.md` touch and is serialized after D's implementation. Groups 1–4 may run concurrently; group 5 is independent of source edits and may run concurrently; group 6 starts only after 1–5 complete (single-writer build discipline, A-10).

## Verification model

Per A-9 and design D6: no test suite, structural check or gate executes at a task boundary; production-group verifications are deliverable-artifact assertions. All executable verification runs once at the completed boundary (6.3 operation, 6.4 gates), rerunning only failed gates after fixes. The completed-delivery adversarial review runs after 6.4 passes, before the evidence packet ships (6.5). Commits are created only after that review, via the operator-authorized post-review commit procedure.

## Group acceptance criteria

- **Group 1 done when:** no forbidden-interpreter file exists under `skills/delivery-cadence/`; refresh docs declare unavailability with the exact carried-payload markers plus a decisions/follow-up reference; the historical manifest is byte-identical; the dated adaptation record exists with final hashes pending.
- **Group 2 done when:** the platform export exists with no other adapter change; waypoint source/tests contain no scanned home literal and carry all named acceptance cases; no direct OS location call remains in the four production callers or six fixtures; override precedence (`PROMETHEUS_OPENSPEC_HOME`, supplied discovery home) is preserved in code.
- **Group 3 done when:** zero retired-backend occurrences remain in the three bottleneck files with delegation/exit codes unchanged; the three fixture output calls construct bytes edge-wise with byte-identical JSON/newline output.
- **Group 4 done when:** the checker scans the original effective scope, inspects keys and values, admits only receipt-bound finite dispositions, fails safe on unmatched/changed hits without printing content; positive and negative controls exist and are wired into the group-6 test run; the prepared commit set touches only checker paths and the one constraint entry; no commit has been created.
- **Group 5 done when:** pre-inventory and preserved content exist; `npm ci --no-bin-links --ignore-scripts --no-audit --no-fund` completed with unchanged package/lock hashes and untouched user/global npm config; post-install inventory reports zero symlinks.
- **Group 6 done when:** `check:distribution` is clean and the six shell paths are gone from source and payloads; the adaptation record carries final hashes; the real isolated operation produced every expected observable; the 6.4 gate list passed once (failed gates rerun only); the sibling evidence packet is written per the 6.5 acceptance above.

## Task model assignments

Harness: Kimi Code CLI (this session). Discovery: the Agent tool exposes `coder`/`explore`/`plan` subagent types that inherit the session model — no per-subagent model override exists in the exposed tool schema, so no override is promised. Session model is `kimi-code` (exact id not disclosed to the session). Review models route through the liter-llm gateway at `http://localhost:4000/v1` (verified reachable today by two successful judge dispatches): judge `gpt-6.1-sol`, critic `MiniMax-M3`.

| Phase path | Change ID | Backend task ID | Requirements | Provider/model | Reasoning effort | Rationale and dated evidence | Harness and route | Worker launch and handoff | Native alternative | Availability and verification | Prerequisites |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bossfang-uar-authorization-and-execution::mini-pack-qa-remediation | bauar-mini-qa-remediation | 1.1–1.3 | Moderate reasoning; doc precision; file scope small | kimi-code (session) | unsupported/unknown | Doc-editing with exact marker strings; Spec authored same scope 2026-10-08 | Kimi Code native; Agent(coder) subagent | Agent tool, cwd mini worktree, owned paths per table, result = edited files + assertion notes | same | configured/verified (this session runs on it) | none |
| …same… | bauar-mini-qa-remediation | 2.1–2.4 | High precision; legacy contract preservation; moderate scope | kimi-code (session) | unsupported/unknown | Interpolation contract has named acceptance cases in spec; mistakes are caught by group-6 gates | Kimi Code native; Agent(coder) subagent | as above | same | configured/verified | 2.1 before 2.2–2.4 |
| …same… | bauar-mini-qa-remediation | 3.1–3.2 | Low-moderate; mechanical text removal + byte-identical fixture output | kimi-code (session) | unsupported/unknown | Byte-comparison verification defined in tasks | Kimi Code native; Agent(coder) subagent | as above | same | configured/verified | none |
| …same… | bauar-mini-qa-remediation | 4.1–4.3 | Highest care; security boundary (A-3); finite dispositions | kimi-code (session) | unsupported/unknown | Dispositions bound to named receipts; positive/negative controls specified; separate reviewed commit contents | Kimi Code native; Agent(coder) subagent | as above; commit itself via operator-authorized post-review procedure | same | configured/verified | adjudication receipts exist (they do) |
| …same… | bauar-mini-qa-remediation | 5.1–5.3 | Low reasoning; careful destructive-adjacent operation | kimi-code (session) | unsupported/unknown | Inventory/preserve precede `npm ci`; rollback disposition recorded | Kimi Code native; Agent(coder) subagent | as above | same | configured/verified | isolated worktree (this one) |
| …same… | bauar-mini-qa-remediation | 6.1–6.5 | Orchestration; single build writer; gate discipline | kimi-code (session, driver) | unsupported/unknown | A-9/A-10: one writer, gates once at completed boundary | Kimi Code native; driver executes directly | driver-owned; no subagent for dist writes | same | configured/verified | groups 1–5 complete |
| …same… | bauar-mini-qa-remediation | completed-delivery review (post-6.4) | Independent judgment; find-problems mandate | gpt-6.1-sol (judge) via liter-llm gateway | n/a (gateway model) | Same route produced both Spec review rounds today; MiniMax-M3 critic is the configured alternative | liter-llm gateway REST /v1/chat/completions | dispatch-judge.mjs with diff-mode packet | MiniMax-M3 (critic role) | verified 2026-10-08 (two dispatches) | groups 1–6.4 complete |

## Carry-overs from Spec

The five static producer dispositions from the round-2 BLOCK review (`evidence/spec/review-summary.json`) are carried as unresolved-review dispositions: approval linkage now quoted in the artifacts, commit-policy wording, final inventory ordering, receipt wording, and packet-embedded approval text. They are acceptance inputs for the completed-delivery review, not closed findings.

## Open questions

None that change ordering or scope. The other-session repair may still surface; if matching bytes/receipts arrive before a group starts, compare and reuse per the reconciliation note rather than duplicating.
