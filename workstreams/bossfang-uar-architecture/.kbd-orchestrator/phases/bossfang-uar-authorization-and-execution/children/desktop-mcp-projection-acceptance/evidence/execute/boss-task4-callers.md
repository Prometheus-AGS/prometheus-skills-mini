# Boss task 4 caller migration handoff

Date: 2026-10-07T12:23:20.652Z. Canonical identity: bossfang-uar-authorization-and-execution::desktop-mcp-projection-acceptance / bauar-05-native-discovery-admission / task 4. Role: boss-core boss-runtime, assigned gpt-6-astra/high from child plan.md. Assignment restored Execute revision 231; root owns task/team transitions, build directories, gates, and commits. This records source changes only, not runtime acceptance or independent review.

## Owned caller inventory and changes

- scripts/gates/uar-exact-tool-admission.ts is the existing synthetic producer for the mounted filesystem MCP source. Its invocation now declares host_mcp, preparation checks the returned kind, its manually reconstructed receipt includes that kind, and both regular and lost-response MCP metadata carry the prepared kind. The existing incompatible-version scenario now submits version 1, preserving the wrong-version refusal intent after the production constant changed to 2. Existing matrix, revalidation, lease, identity, revision, arguments, replay, concurrency, lost-response, and leakage assertions remain. No native scenario or new acceptance flow was authored.
- tests/e2e/gates/bauarHostAdmissionDiagnostic.ts is a passive observer, not an authority producer. It registers only version-2 advertised admission URLs at /uar/admission/v2, observes claim-native separately from nonconsuming claim, and checks invocation/metadata version 2 and host_mcp equality for MCP dispatch bindings. Existing booleans, refusal categories and terminal-conflict fields remain; additive nativeClaims/nativeClaimRejected counts describe observed requests/refusals, never proof of consumption or native effects. It still forwards the original fetch, request events and response end unchanged and restores original handlers.
- The additional manual Boss producer scripts/gates/bauar-secret-projection-mcp.ts was reported to root and remains assigned to the concurrent Boss writer. No bauar-secret-projection-* file was edited here. Bounded source inventory searched src, scripts and tests TypeScript/TSX files for v1 admission paths, admission metadata, managedMcpMetadata and authorityRevision, excluding artifacts. No other manual admission producer requiring a new scope amendment was identified. Unrelated schema/run-policy version-1 fields are distinct contracts.

## Authority and architecture

Current wire.ts, UarHostToolAdmission.ts and uarHostClaimRevalidation.ts define required executionKind, exact receipt/invocation equality, v2 paths and kind-specific consumption. The actual bridge exports the current protocol version/path; UarRuntimeConnection forwards bridge.toolAdmission into the run POST. G1 already obtains the production bridge URL/version, so no replacement route or fallback was introduced. The observer receives private endpoints only from its actual run request.

UAR tool_admission/mod.rs was inspected read-only: NativeSkill/BuiltIn map to runtime_native, Mcp maps to host_mcp, and the existing canonical authority digest envelope binds camelCase executionKind. These two owned Boss files do not compute that authority digest. Root explicitly confirmed preserving G1's existing opaque gate-a1-authority identity: Boss binds its exact immutable value and does not recompute a second authority algorithm. G1's synthetic producer cannot prove UAR digest construction/recomputation; actual UAR behavior remains G2 acceptance work. No kindless or v1 executable fallback added.

The affected surface is gate protocol authoring and passive E2E observation. No production persistence schema, lifecycle owner, renderer/UI, dependency, service, or packaging change was made. Existing uncommitted/untracked work was preserved. HEAD at inspection was e2ae2ce21245030293c0bea96ed02ae853b820a7; G1 was already modified and the diagnostic was already untracked before this task. Git diff against HEAD therefore includes earlier work; the before hashes below identify this task's actual input bytes.

## Source hashes and static limits

- /Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/uar-exact-tool-admission.ts
  - Before SHA-256: eba2c5bc4bdda9fef443349ce553a0b73d474a77964b140c49cea2cb10d51c58
  - After SHA-256: ca1e618c53433ec85405386a6f534c3d89dc02868ea3b421dd6c14e08ad88a52
  - Physical lines: 367 (below 500)
- /Users/gqadonis/.claude/worktrees/bauar-boss/tests/e2e/gates/bauarHostAdmissionDiagnostic.ts
  - Before SHA-256: 4821812697701522da0570a97a8873a9edf9035b1063d8f081f2d1ab143018c6
  - After SHA-256: aa40fa528f0fd1e9234011b95be1c22a562a142a94166f142870b493c8be6919
  - Physical lines: 203 (below 500)

No new product file or partition was needed. Evidence file: /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/boss-task4-callers.md.

## Evidence and remaining limits

Applied local .agents/skills/agent-team-handoff/SKILL.md and .agents/skills/cherry-electron-dev/SKILL.md. Root retains all formal handoff/task mutations; this worker made none. Complete-delivery timing overrides the generic Electron skill loop; no Electron process was launched or inspected, and no PID/CDP claim is made. Mini no-Signed-off-by policy overrides the Boss DCO instruction; no commit was made. No library/SDK API was changed or newly used.

Compass freshness files are absent in the isolated worktree. Initial tool calls with no project path reported missing graph.json. Retrying the configured Boss project path produced 254715 nodes and 438852 edges; bounded search for UarHostToolAdmission returned no_match and incomplete coverage with 63 quarantined edges. The graph excludes tests/docs, so there is no trusted exact caller traversal or runtime claim. Source inspection supplied the contract and caller inventory.

Only read-only source inspection, bounded searches, Git identity/status/diff inspection, and byte hashes/line counts were performed. No compiler, build, test, formatter, package install, QA, real acceptance invocation or new executable scenario ran. Root must run final C-main/C-e2e and completed G1/G2 after tasks 1–6 and task 7 scenario authoring; all runtime outcomes remain unverified. Historical runtime12 remains undiagnosed. No D0-excluded file was opened or hashed; no diagnostic reroute occurred.

Completion self-check: edits are limited to the two assigned source paths and this handoff; preserved all prior scenarios/assertions; no speculative guards or new authority store/algorithm; no production security hardening added. Existing authenticated host/MCP kind separation is the contract being mirrored. Root reconciles the cross-repository task-4 inventory and later acceptance. This worker stops after this handoff.
