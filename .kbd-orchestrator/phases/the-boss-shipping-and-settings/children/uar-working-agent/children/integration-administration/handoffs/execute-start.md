# Execution starting point

> SUPERSEDED / EXECUTION HOLD — 2026-09-24 revision2. The operator explicitly requested review of the expanded plan BEFORE execution. Read the new plan.md and revision2 handoffs. The text below is historical context only; its earlier execution authorization is withdrawn. New scope includes all UAR administration, authoritative catalog execution and issue296. Do not invoke execute or switch models until the operator reviews and authorizes the revised plan.

The operator authorized execution and all necessary commits, pushes, merges, GitHub releases and landing-site publication. Latest priority: Windows x64 AND Apple Silicon are essential. No IPFS. No unit/per-edit test loops. Use GPT-5.6-sol for execution; planning used GPT-6 Astra.

## Lifecycle

Full child ID: the-boss-shipping-and-settings::uar-working-agent::integration-administration. Assess and analyze completed with reviewed handoffs. Formal plan completed after two review rounds, final PASS. Preliminary draft review is historical, not the formal receipt. Read plan.md and handoffs/plan.handoff.json, then invoke the entire kbd-execute dispatch and kbd-apply task lifecycle. Do not repeat completed assess/analyze/plan. Execute and reflect are not complete. Separate mandatory C1–C5 closeout checklist prevents certification/archive/reflection from being skipped or circular.

Pass explicit absolute phaseDir to lib/kbd/stage-gate.mjs because its default lookup does not resolve this nested child. The kbd-new-child wrapper authored the wrong flat directory while canonical runtime correctly created this nested child; files were moved here, child:before was not repeated. All 22 task IDs are already registered. Registration is immutable and refuses duplicate IDs; canonical decision integration-admin-dual-customer-lifecycle records revised task 1.1 and 5.2–5.5 contracts. Current OpenSpec tasks.md controls acceptance/order. Never hand-edit generated position/progress.

## Read in this order

1. Project AGENTS.md, versions.toml, decisions, subsystem gotchas.
2. This phase plan.md, assessment.md, analysis.md, library-candidates.json and ux-assessment.md; OpenSpec integration-administration proposal/design/spec/tasks.
3. Relevant repository CLAUDE.md/AGENTS.md and Rust skills when editing Rust. Impeccable craft-floor only when editing UI. Missing superpowers and sycophancy-correction were reported; do not invent their execution.
4. Review receipts: assessment-r2.findings.json, analysis.findings.json, plan-r2.findings.json (all PASS).

## Worktrees and ownership

- Boss implementation: /Users/gqadonis/Projects/prometheus/worktrees/the-boss-uar. Clean at afd4deefd5; fetched origin/main 8bb3171a02 includes upstream merge and is ahead. Integrate latest main before feature edits. Own feature settings/routes/search, integration services/UAR launch, typed preferences/IPC and generated source pipeline, all locale translations, packaging/payload/release files. Preserve shared upstream primitives; no broad settings rewrite.
- UAR: /Users/gqadonis/Projects/prometheus/worktrees/uar-the-boss-sidecar at c29af47. Preserve unrelated dirty pnpm-lock.yaml. Own additive persistence auth scope, selected config/launch semantics and native payload. Existing SDK supports remote; current app forces surrealkv URL.
- Compass: /Users/gqadonis/Projects/references/compass at 33ecb365. Own structured explicit-output manifest-based freshness, extraction identity and required packaging. check-update only reads needs_update marker, NOT source drift. Reuse doctor detect/Manifest/BuildGuard instead.
- Mini: current repository. Own portable discovery/runner/Compose configuration, gateway role resolution, affected payload/skills/pins. Preserve dirty tools/prometheus-knowledge and unrelated Compass evidence/verification.
- liter-llm: tools/liter-llm fork GQAdonis/liter-llm, GitHub parent xberg-io/liter-llm. User authorized pull/merge upstream and relevant version pin updates; inspect fork patches first. Own nonstarting config-check using actual ProxyConfig parser, catalogs/packaging. No existing config-write HTTP API or validation CLI.
- Full pack: /Users/gqadonis/Projects/prometheus/prometheus-skill-pack. Narrow related role resolver/export changes only, preserve installations and user config. Full-pack launcher currently lacks --watch, so existing file saved does not necessarily mean loaded.
- Website: /Users/gqadonis/Projects/know-me/boss-landing-spot, existing Lovable project c0ca344c-ebc5-4be2-9d02-46d3d9631118. Publish each completed customer platform immediately via existing project.

Before production edits expand scope.json with concrete approved feature paths from this ownership map; read nested instructions. Keep all unrelated changes. Signed commits use Assisted-by, never Signed-off-by. Existing signing command used user.email=travis@know-me.tools, gpg.format=ssh and user.signingkey=/Users/gqadonis/.ssh/id_ed25519.pub; verify config/key availability first.

## Important evidence

Config is one Preference JSON app.prometheus.integrations, secrets protected by safeStorage. Avoid a new database/service: add versioned conversion and revision-checked feature patches, regenerate schemas from scripts/data-classify sources. Thirteen locale catalogs in each main/renderer. Operations currently cap 262144 chars, overwrite output between subprocesses, and show feedback far below controls.

Full pack uses native SurrealDB port28000 and memory database mcp. Discover without reading/logging secrets or opening another process's embedded files. Mixed Docker-to-host needs Docker Desktop host.docker.internal; never rebind external services automatically.

Provider metadata schemas/providers.json is not model catalog; bundle schemas/catalog.json too and reconcile live aliases. Use existing smol-toml for reads and pinned @rainbowatcher/toml-edit-js0.6.5 WASM for comment-preserving field edits. Bundle native liter config-check on both customer platforms, not a Rust/Docker requirement on end-user machines.

## Acceptance and release

Implement complete A/B/C functional increments, then their real integration gates once. Final app gate/Impeccable pass and shared release freeze5.2 precede independent native Windows5.3 and Apple5.4 build/publish tracks. Apple also requires local pnpm build:mac:arm64 copy. Both installed walkthroughs required: Windows operator confirmation; Apple local installed walkthrough or operator equivalent. Other platforms cannot delay either. Prior Apple sidecar run35964423818 succeeded but predates these repairs; do not claim it validates new code.

Last published Windows2.2.0 is on GitHub Releases; preserve it until new artifacts exist. Never IPFS. Goal/tool state may be paused by desktop; do not claim to have resumed it without support, but continue this explicitly authorized task. Goal cannot be complete until all delivery and lifecycle evidence is satisfied.
