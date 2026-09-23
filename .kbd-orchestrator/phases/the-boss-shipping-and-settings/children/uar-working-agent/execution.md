# Execution — uar-working-agent

Project: prometheus-skills-mini coordinating The Boss and universal-agent-runtime
Date: 2026-09-23
Selected backend: hybrid
Dispatched to: Codex / GPT-5.6-sol
Backend entrypoint: KBD-owned OpenSpec task loop for `uar-delivery-replan`, restricted to tasks 1.1–1.10
OpenSpec available: yes
Source plan: `plan.md`

## Backend rationale

The existing OpenSpec change is the traceability contract, while implementation spans two external worktrees and release systems. KBD remains canonical for task state and phase position. Codex owns the cross-repository production work. No bare OpenSpec apply command, duplicate change, or new architecture phase is created.

The single registered change is high-complexity/frontier work: it crosses Rust HTTP/runtime/storage, Electron main/renderer/settings, native packaging, GitHub release publication and website deployment. GPT-5.6-sol is the concrete executor requested by the operator. GPT-6 Astra produced the reviewed plan; this execution records the model handoff rather than restarting planning.

## Execution scope

- `uar-delivery-replan` tasks 1.1–1.10 only: ship installed P1 UAR in The Boss, Windows x64 first and Apple Silicon second.
- P2–P5 tasks 2.1–5.3 remain pending and are not eligible for completion in this child.
- Existing Compass, filesystem MCP, mini skills and release infrastructure are reused and preserved.

## Dispatch contract

- Backend source of task truth: `openspec/changes/uar-delivery-replan/tasks.md`
- Canonical lifecycle source: this child's `progress.json` and typed `prometheus kbd` transitions
- Task boundary driver: KBD apply semantics, one semantic P1 task at a time. OpenSpec ordinal 1 maps to canonical task `1.1`, ordinal 2 to `1.2`, through ordinal 10 to `1.10`; ordinals must never be registered as duplicate canonical IDs.
- Implementation owner: Codex / GPT-5.6-sol. It may separate nonoverlapping Boss and UAR ownership only after task 1.1 records the transfer; one writer per file/build directory.
- Rust routing: `prometheus-rust-workspace` with `rust-best-practices`, `rust-async-patterns`, and MCP guidance when transport work is touched. Project pins override examples.
- UI routing: apply the required Impeccable, frontend, UI/UX Pro Max, Vercel React and project design guidance immediately before UI edits.
- Progress: begin/end each semantic task through typed KBD transitions and update the OpenSpec checkbox only when the specified behavior is fully implemented.
- Commits: signed conventional commits in each owning repository; preserve existing WIP and unrelated changes.

## Verification and release boundary

Implementation uses static inspection and reasoning. No unit, component, filtered, mock-only, per-edit, per-task or repeated review/test loops. No intermediate application build. Cargo and application packaging serialize and begin only after complete P1 production wiring, except a narrow compiler invocation if an observed compiler problem blocks further code.

The frozen candidate's actual installers are the verification artifacts. Run the complete installed P1 gate from `plan.md` once per customer platform, with focused reruns only for observed failures. GitHub Actions may build/deploy with tests disabled; product integration is local/installed. Public publication requires the platform's completed release gate, and Windows installed acceptance remains pending until reported by the operator.

## Approval gates

Existing session authorization covers scoped commits, pushes, native artifact publication, GitHub releases and website deployment. No repeated approval is required for those steps. Stop only for a required architecture/pin change, irrecoverable data action, unavailable external credential/account state, or inability to preserve existing work.

## Fallback conditions

- If existing WIP has an active owner, record a handoff or move this execution to an isolated checkout before edits.
- If the trusted contract cannot be expressed through existing RunExecutionRequest/runtime driver/host catalog interfaces, pause with the concrete incompatible interface; do not add a competing framework.
- If full required native features cannot build on a customer platform, record the actual build failure and repair it; do not silently reduce features.
- If installed acceptance reveals credential leakage, workspace crossover, approval bypass, destructive replay, launch failure or primary workflow failure, block that artifact's public distribution and fix the frozen candidate.

## Progress ledger

- IN_PROGRESS `uar-delivery-replan` — task 1.1 next; 0/10 P1 tasks complete.
- PENDING evidence — no production code, build or installed acceptance has completed at dispatch.
- PENDING certification/publication — final gates belong to tasks 1.9–1.10.

## Outputs for reflection

Reflection consumes the execution manifest, per-repository signed commits, exact candidate/source manifests, task transitions, installed scenario results, release URLs/checksums/signing status, website link verification, failure/recovery timing, human interventions and pending Windows acceptance.

## First action

Reconcile worktree ownership and WIP hashes, fetch current remote refs without merging, record exact baselines/build directories/contract version and resolve the existing website checkout. Then complete task 1.1 and proceed directly to principal isolation.
