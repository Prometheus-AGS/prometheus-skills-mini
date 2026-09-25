# Agent Fabric Convergence: prometheus-skills-mini

## Current capability and boundary

This note is grounded in
`2782c3a2d3d0b2bf3b969a5f55352be48b87d7f6` on
`codex/agent-fabric-convergence`. Mini already carries the four agent-team skills
and the same compiled team runtime as the full pack. The current v1 schema covers
roles, owned paths, dependencies, model policy and source/version-tagged native
options. The runtime stages definitions for UAR, Codex, Claude, Copilot, Kimi,
MiniMax, OpenCode, DeepSeek and BossFang, and keeps local revisioned task/handoff
state without requiring a resident service.

The active project phase owns The Boss/UAR approval delivery and must remain
untouched. Convergence work depends on its accepted `D-UAR-P1` result.

## Mini’s responsibility

Mini is the Windows-native, small distribution of the portable collaboration
workflow. It should consume canonical authored schemas and templates from the
full pack, preserve promised runtime parity, and prove that the installed
Node-based authoring/export tools work without shell scripts, symlinks or new
daemons. Mini does not become a second schema owner or orchestration runtime.

Its user story should remain direct: describe an outcome, receive the smallest
useful team and a single-agent alternative, review roles/skills/model evidence
and owned paths, stage a native export, then let the chosen harness execute under
its own controls. Local tasks and handoffs remain coordination records. UAR owns
runtime teams and workflows; Cedar owns protected-action decisions; The Boss
owns the desktop operator experience.

## Collaboration documents and governance

After C03 acceptance, mini should distribute the versioned
AgentDefinition/TeamDefinition/WorkflowDefinition/DeploymentBinding profile and
its loss diagnostics. A private RepresentationGrant may be referenced by ID and
required revision but must never be embedded in a portable package. Credentials,
approval decisions and Cedar grants are also installed state.

The v1 team fields remain migration inputs. Definitions declare skills by exact
version and whether they are required. Export must refuse an unknown required
semantic, report unsupported destination behavior, and preserve native
extensions without claiming validation. Live task, run, attempt and effect IDs
remain distinct and do not belong in a reusable definition.

Specialist templates for development, product, marketing/brand, logo/mobile/full
design, documentation and review should be opt-in suggestions with concrete
deliverables. Executive-office templates are generic roles. A named human’s
preferences, consent and ability to communicate or act require a private,
revocable RepresentationGrant enforced at the runtime/effect boundary. A role
title, prompt or signed file never grants authority.

## Codex CLI reference implementation

The installed `codex-cli 0.154.0` was inspected locally: it is a native arm64
executable with stable `multi_agent` and `goals` features, shared session
browsing, managed worktrees, sandbox modes and explicit approval policy. The
[official build instructions](https://github.com/openai/codex/blob/main/docs/install.md)
build it from the `codex-rs` Cargo workspace. Mini’s
Codex adapter should use that Rust harness as the first complete proof of the
portable profile: stage native agent TOML, preserve exact model/native settings,
run bounded work in owned paths and retain session/task/evidence receipts.

Codex remains responsible for spawning, worktrees, sandboxing, approvals and
session lifecycle. Mini must not treat installation as execution, copy Codex
permission state into Cedar, or claim portability of a native session. C15 must
refresh primary docs and the exact installed CLI schema before changing the
adapter; earlier 0.144.1 command evidence is version-scoped.

## Product, consent and administration touchpoints

Mini supplies procedures and artifacts, not product UI. It should document the
fields The Boss and KnowMe need to render: definition versus instance, placement,
role rationale, skill/model bindings, capability gaps, policy/grant references,
task graph, evidence and supported control verbs. UI products consume those
fields from authoritative runtime state.

Personal and digital-twin consent is intentionally outside mini’s local team
ledger. Mini may guide an operator to request the required representation and
data-use scopes, but it cannot issue, approve or persist the authoritative grant.
Revocation, offboarding, disclosure and organization separation belong to the
governed runtime/product flow.

## Non-goals

- Adding a third resident service or making surreal-memory/liter-llm mandatory
  for local team creation and export.
- Owning runtime scheduling, Cedar evaluation, approvals, secrets or digital-twin
  profiles.
- Forking the full-pack schema/runtime, hand-editing generated distributions or
  adding shell/Python helpers.
- Claiming Windows, installed harness, service authentication or cross-harness
  execution acceptance from source inspection.
- Expanding the active unified-tool-approval-authority phase with convergence
  implementation.

## Next repository-scoped KBD child

After the full pack’s `agent-team-collaboration-profile` is accepted, C15 pins
the harness contracts and the active UAR P1 phase is complete, create
`agent-fabric-mini-port`. It should own only the mini skill sources, compiled
runtime mirror, documentation and distribution inventory needed for the new
profile. Acceptance should prove full/mini parity and one installed Codex
workflow on the supported local platform before publication; Windows acceptance
remains a separate named release gate unless it is actually run there.
