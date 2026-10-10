## Global constraints and decisions

- Selected delivery: unsigned local darwin-arm64 only. Operator remains release authority. Signing/notarization, installed operation, Intel/Windows are deferred/unverified; production remote receiver/IdP/custody is excluded; publication/merge/release/cache promotion and shipping/C05 are unauthorized. These scopes do not block the selected local target.
- MCP credentials come from application/server configuration; empty shipped defaults remain. No caller JWT forwarding theory or authentication redesign.
- Strict exact approval IDs and owned caller cutover; approvals/effects remain bound to the same execution. Restart unsupported/unknown requires reconciliation, never automatic replay or a durable-recovery claim.
- F6 stays cancelled. Never read/search/hash/diff/test its two excluded files; no wildcard UAR status/diff/source traversal. Select exact eligible paths first. No archived history rewrite.
- Keep all candidates, refs, caches, old packages, archives and rollback inputs. Stop only owned children; no live-profile mutation, installed-cache modification or service takeover.
- Complete ALL production tasks before builds, executable scenario authoring, runtime checks or product review. No unit/mock/per-edit gate or per-task reviewer; artifact validation now is not product evidence. One writer per target/build directory; serialize dependency mutation.
- Node argument arrays, shell:false, no ambient credential inheritance or coordinator HOME/CODEX_HOME mutation. Modules ≤500 lines and separated by capability. No forbidden shell/Python scripts, authored symlinks or executable-bit reliance.
- Existing locked/pinned packaging operations are authorized in the isolated candidate, with unchanged hooks/versions. No general installation/update/download authorization is inferred; missing required locked inputs are BLOCKED.
- Source completion, build/package completion, scenario source readiness, actual runtime acceptance, independent review and release authority remain separate. Old waived certification cannot satisfy the new local gate.
- Current planner is GPT-6, exact deployed variant/connection unavailable. Template Claude/Qwen registry is explicitly unverified; it does not override the user's Codex invocation. Expected sycophancy-correction SKILL.md is absent; its MCP is available. Superpowers writing-plans is available at the installed plugin and used; its TDD/per-task reviews conflict with A-9 and are replaced by the complete-delivery gate.


### 03/1.1 — coherent acceptance coordinator

**Owner:** evidence; cwd workstream. Create B/acceptance/local-release-acceptance.mjs (thin parse/print/exit), lib/inputs.mjs, processes.mjs, receipts.mjs, stages.mjs, config.schema.json and receipt.schema.json. Formal JSON schemas draft2020-12,v1; keep ≤500lines/module. Reuse Node/platform patterns, not new dependency installation.

**Interfaces:** inputs.loadConfig(path,{phase,stage})→validated config; processes.runOwned({program,args,cwd,env,budgetMs,outputPolicy})→{exitCode,signal,startedAt,endedAt,observations,cleanup}; receipts.writeReceipt(path,value)→atomic persisted typed record; receipts.readComponent(path,expectedBinding)→verified receipt; stages.runIntegration(config) and stages.finalize(config)→{exitCode,receipt}. Errors map to fixed categories without body/key/canary logging.

Schemas require execution key, production declaration/barrier, frozen source/profile/path digests, actual package/host bindings at runtime seal, Node versions, scenario inventory, private output roots, budget and component receipt references. Receipt includes owner task key, source/config/package/profile hashes, sanitized argv/cwd/env class, timestamps, PASS|FAIL|BLOCKED|OUT_OF_SCOPE|CANCELLED, actual observations/counts, paired negative status, evidence paths and cleanup. No success derived solely from exit0.

Private child env is an allowlist: fixture-only credentials, unique per-attempt HOME/CODEX_HOME/XDG/TMP/queue/plugin/store roots; no inherited external sidecar override or real provider secrets. Compiler/build children retain only established tool/cache paths required by locked builds; runtime children do not inherit those credentials. Use fresh owned loopback port0 peers, embedded private Surreal persistence, explicit PID/resource ledger and owned 10s graceful cleanup followed by owned forced stop. Unknown descendant cleanup remains BLOCKED; never kill shared processes by broad name.

Coordinator supervision budgets are phase tooling only; preserve existing product timeout policy. Main routine finalization launches no app/test/build. Runtime integration stages consume declared component inputs and can reuse a PASS receipt only when exact source/profile/scenario/package binding is unchanged and that scope actually passed. A resumed run executes only missing/failed/invalidated components; an interrupted product execution is reconciled, never resubmitted to manufacture evidence.


Read your change design.md, tasks.md and verification.md in full. No executable tests, builds or product review before the lead confirms all five production tasks complete. Do not commit. Do not spawn agents. You are not alone in the codebase; preserve others edits. Return the full report to /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/dispatch/evidence-report.md; summary to lead. Canonical driver alone begins/ends tasks; never edit backend checkboxes or runtime projections.
