# D1 — Who controls a UAR agent in the-boss (revision 3)

Revision 3, 2026-09-23. Revised after two adversarial reviews (round 1: 2 CRITICAL; round 2: 4 CRITICAL),
a field-mapping and isolation spike, deep research (package `how-should-a-desktop-electron-20260923-2b0f`),
and operator decisions. UAR repository changes are authorized by the operator as part of this effort
(own worktree `uar-the-boss-sidecar`).

## Decision

UAR becomes a fourth `the-boss` agent runtime (`AGENT_TYPES` beside `claude-code`, `pi`, `dsh`). UAR runs
the agent loop, skill selection, context compaction and A2UI; the-boss stays in control of the agent
definition, credentials, tools and approvals. One shared UAR process serves all the-boss sessions,
multiplexed by UAR `session_id`; the-boss supervises it (health check, restart with backoff).

**Agent definition.** the-boss's agent row is the source of truth. For every run the main process builds
UAR's agent artifact inline and posts it to `POST /api/uar/runs`; run policy travels in
`artifact.extensions["uar.run_policy"]`. Every existing agent-row field has an explicit contract:

| Field | Contract for UAR agents |
|---|---|
| name, description, avatar | **preserved** → `metadata.title` / `description` / `icon` |
| instructions + host-built prompt (SOUL/USER/FACT, citations, language, role) | **preserved** → `prompt.system` + `prompt.instructions[]` |
| model | **preserved** → `policy.provider.default` |
| mcps + injected host servers | **preserved** → run-scoped MCP servers (below) |
| disabledTools | **preserved** → `policy.tools.deny` |
| skills, memory on/off | **preserved** via the-boss's skills MCP tools and `memory.conversation.enabled` |
| knowledge bases | **UAR knowledge bases** (operator decision, step 2): the-boss uploads documents for UAR agents into UAR KBs owned by the session principal, so UAR chunking (incl. agentic), retrieval and citations apply; ingestion requests carry a request-scoped model credential (same shape as the run credential, never persisted); runs select them via `memory.kb.knowledge_bases` |
| working directory | **preserved** after UAR change (add to the run request) |
| reasoning_effort | **preserved** after UAR change (add to the run request) |
| permission_mode `default` / `auto` / `bypassPermissions` | **preserved** → `uar.run_policy.tool_approval` (`ask` / `auto` / `auto`) |
| permission_mode `acceptEdits` | **emulated host-side** (operator decision): UAR runs with `ask`; the-boss auto-approves file-edit tools and asks for the rest |
| permission_mode `plan` | **emulated host-side** (operator decision): the-boss denies every tool that writes or executes |
| slash_commands | **emulated host-side**: expanded before the input is sent |
| scheduler (cron/interval/one-time) | **preserved host-side**: the-boss scheduler starts a normal UAR run |
| env_vars | **preserved host-side** for the-boss's own MCP servers; **disabled with UI copy** for UAR itself |
| plan/small model tiers, service_tier, heartbeat | **disabled with UI copy** ("not supported by the Universal Agent Runtime"), via capability flags |

**`.agent.md` import/export (operator decision).** Import compiles through `POST /api/uar/compiler/compile`
(no save) and maps onto an agent row; export uses a the-boss serializer (UAR has no decompile path). Every
field that does not round-trip is listed to the user on import and export.

**Credentials (operator decision).** Provider credentials travel with the run as a run-scoped credential
on `CreateRunRequest`: a secret type that is never serialized, never persisted, checkpointed, logged or
traced, applied after UAR's credential layer, and propagated in memory to child and resumed runs. the-boss
never calls `POST /api/uar/providers`.

**Tools (operator decision).** the-boss's tools are served as per-session Streamable HTTP MCP endpoints on
loopback and passed to UAR as **run-scoped MCP servers**: connected for that run only, never written to
UAR's global registry or settings, torn down when the run ends, and the only servers that run may call.
Each definition carries its own per-launch bearer token in a request header, sent over the already
authenticated host→UAR channel. The endpoints apply every D4 security control (token on every request,
Host allowlist, reject `Origin`, no CORS, MCP SDK ≥ 1.24.0 host validation); their MCP session ids are
random and die with the run.

**Approvals.** UAR's `CUSTOM uar.tool.approval_required` becomes a the-boss `tool-approval-request`,
answered via `POST /api/uar/runs/{id}/tool-approval`. Defense in depth: the-boss's MCP endpoint refuses a
host tool call unless an approval record exists for `(toolCallId, hash of arguments)`.

## Assumptions

- The driver contract fits a runtime that owns its loop (`dsh` already does).
- UAR keeps sessions separate in one process: session context is keyed by `session_id`
  (`manager.rs:2400-2407`) and compaction, memory and A2UI state are per session.
- UAR's `Selected` MCP policy enforcement is a sound base for run-scoped servers.

## Falsifier

Named tests in step 2; any failure reopens this decision.

1. **Field contract:** for every row in the table, a test shows the stated contract holds (preserved values
   reach UAR's recorded run policy; emulated modes approve/deny the right tools; disabled fields are hidden
   with the stated copy). An agent-row field with no row in the table fails the test.
2. **Session isolation in the shared process:** two concurrent sessions with distinguishable private
   content, then a compaction, a memory write, an A2UI surface and a sidecar restart with history reload;
   neither session's replies, compacted summaries, memory, surfaces or events contain the other's content,
   and each reloaded history binds to the right session.
3. **Credential containment:** runs with distinct run-scoped keys, including a child run, a resumed run, a
   checkpoint write and reload, and a forced error path, each use only their own key (mock provider records
   keys); afterwards a byte search of every UAR data directory, log, trace and crash output finds no key.
4. **Tool isolation:** two concurrent sessions in different workspaces cannot list or call each other's
   tools; after the runs end no the-boss server remains in UAR's registry or settings.
5. **Host MCP endpoint abuse:** requests with no token, a wrong token, a token from an ended run, a reused
   or guessed MCP session id, a replayed request, `Host: attacker.example`, or any `Origin` header are all
   rejected; an endpoint is unreachable after its run ends.
6. **Approval defense in depth:** with UAR policy forced to `auto`, a host tool call without a matching
   approval record is refused.
7. **Import/export:** round-tripping each `templates/*.agent.md` lists every lost field by name.

## Unresolved review findings (round 3, accepted by operator decision; carried into step 2 as open risks)

Review: judge `gpt-5.5`, producer `claude-opus-5-5`, `verified-distinct`, verdict BLOCK (3 CRITICAL,
4 WARNING); findings in `../review/d1-loop-ownership.r3.findings.json`.

1. **Resumed runs vs. unpersisted credentials.** A resume after a sidecar restart has no credential.
   Resolution to confirm in step 2: the-boss re-attaches the run-scoped credential on every resume and
   continuation request; resume without it fails closed.
2. **UAR API changes treated as available.** Run-scoped credentials and MCP servers, working directory,
   reasoning effort and history reload do not exist yet. Step 2 starts with failing contract tests against
   the UAR branch for each; the-boss driver work that depends on them waits until they pass.
3. **Shared-process isolation evidence is narrow.** Only session context keying was cited. Step 2 must
   inventory every shared mutable store (credential layer, MCP registry and runtime caches, approval
   registry, logs/traces, memory, A2UI state) before relying on one shared process; if any store cannot be
   made per-session, fall back to one UAR process per the-boss session.
