EXECUTION: integration-administration
Project: prometheus-skills-mini / The Boss integration workspace
Date: 2026-09-24
Selected backend: openspec
Dispatched to: Codex SELF through /kbd-apply
Backend rationale: The approved work spans The Boss, UAR, mini, Compass, liter-llm, release automation and the landing site. OpenSpec provides the checked 37-task dependency order and KBD-owned task boundaries; the existing native goal supplies the autonomous outer loop.
Backend entrypoint: /kbd-apply integration-administration, one task at a time
OpenSpec available: YES
Source plan: .kbd-orchestrator/phases/the-boss-shipping-and-settings/children/uar-working-agent/children/integration-administration/plan.md

EXECUTION SCOPE

- integration-administration: Deliver the approved storage, catalog, remote MCP identity, full UAR administration, service/Compass/liter-llm operations, customer-platform packages and publication plan.

DISPATCH CONTRACTS

- integration-administration → Codex SELF through OpenSpec/KBD
  Entry: Read the current waypoint, run kbd-apply list/progress, begin exactly one pending task, implement it, and end that task only when its stated production contract is complete.
  Model class: frontier
  Concrete model: gpt-5.6-sol
  Model rationale: The operator selected GPT-5.6-sol for execution; the change has 37 tasks, crosses Rust/runtime/Electron/service/release boundaries and introduces administration and authorization contracts.
  Progress file: .kbd-orchestrator/phases/the-boss-shipping-and-settings/children/uar-working-agent/children/integration-administration/progress.json
  Handoff: KBD apply owns task transitions and projections; cross-repository commits preserve unrelated changes and include Assisted-by trailers.

APPROVAL GATES

- The operator approved execution on 2026-09-24.
- Installed Windows x64 acceptance and installed Apple Silicon acceptance remain required completion evidence.

FALLBACK CONDITIONS

- If a repository or platform cannot expose inspectable task progress, keep OpenSpec/KBD as the canonical ledger and record the concrete blocker rather than using a bulk backend command.
- If an external account or native runner blocks a release action, complete all independent work and retain the corresponding task as pending.

VERIFICATION REQUIREMENTS

- Gate A: migrated settings/IPC, discovery, embedded and remote UAR storage, scoped auth and restart behavior.
- Gate R: registered-agent execution and a real two-principal authenticated remote MCP flow covering expiry, renewal, reconnect and rejection.
- Gate U: UAR administration settings and model consumers through real admin IPC/REST.
- Gate V: catalog-to-conversation, A2UI/AG-UI, knowledge and route coverage.
- Gate B: real Docker/service operations and two Compass projects with drift, cancellation and retained full logs.
- Gate C: managed/existing liter-llm configuration, real inference and critic/judge/backup identity resolution.
- Gate D-Windows and Gate D-Mac: native installer artifacts, GitHub Release metadata/live links and installed walkthroughs. No unit or per-edit test loops.

PROGRESS LEDGER

- IN_PROGRESS integration-administration — Codex SELF via /kbd-apply (0/37 tasks at dispatch)

OUTPUTS

- Production changes and source pins in all owned repositories.
- Gate evidence, release manifests, Windows x64 installer, Apple Silicon DMG and local Apple Silicon build.
- GitHub Release assets, RELEASES.md and the-boss.know-me.tools updates.
- OpenSpec archive, KBD reflection and parent handoff.

BLOCKERS

- NONE at dispatch.

REFLECTION HANDOFF

- Consume the task ledger, Gate A/R/U/V/B/C/D evidence, repository commits, release manifests, live-link receipts, installed acceptance records, refinement log and cumulative adversarial review.

EXECUTION READY
