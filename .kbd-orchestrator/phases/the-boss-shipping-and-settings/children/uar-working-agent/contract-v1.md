# The Boss ↔ UAR sidecar contract v1

**Contract ID:** `the-boss.uar.sidecar/1`

**Status:** frozen for P1 implementation

**Owners:** The Boss main process owns admission, credentials, MCP catalogs and approvals. UAR owns governed run execution and AG-UI emission.

This contract binds the existing The Boss runtime interfaces to UAR's existing `RunExecutionRequest`. It is the implementation boundary for OpenSpec tasks 1.2–1.7. A later contract revision is required to add or weaken any authority carried here.

## Admission and principal

The Boss starts one supervised UAR sidecar with UAR's existing random launch bearer. The bearer authenticates the local host process and is never persisted in preferences, renderer state, logs or run history.

After launch-bearer authentication, The Boss supplies a stable opaque principal ID derived in the main process from:

- the application profile ID;
- the canonical workspace ID; and
- the conversation ID.

UAR accepts this assertion only on a request that already passed the launch-token guard. The assertion is installed as `UserContext`, converted to `ActorOwner`, and becomes the ownership key for sessions, runs, approvals, cancellation, resume, children and retention. Raw filesystem paths and provider credentials are excluded from the principal ID. UAR removes the bearer and asserted-principal headers before handler execution.

Anonymous fallback is forbidden for The Boss managed runs. A missing or malformed principal assertion fails admission before a run is created.

## Trusted run envelope

The Boss sends one versioned envelope per root run. The envelope is main-process-only and never accepted from renderer or model tool arguments.

| Envelope field | Authority | UAR mapping |
| --- | --- | --- |
| `contractVersion` | fixed `the-boss.uar.sidecar/1` | admission compatibility check |
| `requestId` | The Boss generated correlation ID | structured logs and error correlation |
| `conversationId` | current conversation | admitted session binding |
| `workspace.id` | workspace resolver | principal derivation and MCP catalog scope |
| `workspace.cwd` | workspace resolver | `RunExecutionRequest.working_directory` |
| `history` | persisted host conversation | `RunExecutionRequest.seed_history` |
| `provider` | resolved account/model route | request-scoped provider binding |
| `provider.credential` | protected host credential lookup | request-scoped secret binding; memory only |
| `reasoningEffort` | conversation/model settings | request-scoped provider option |
| `mcp` | immutable host catalog capture | `RunExecutionRequest.mcp_resources` |
| `policy` | host approval/sandbox policy | host policy, budget and sandbox constraints |
| `skills` | installed skill resolver | `RunExecutionRequest.skill_attachments` |
| `presentation` | host-supported AG-UI/A2UI profile | `presentation_negotiation` |

The envelope may restrict UAR policy but cannot grant resources absent from the host capture. Provider credentials remain in memory for the request lifetime, are redacted from diagnostics, and are never written into UAR global settings or persistence.

Resume and child execution retain the verified owner, provider binding, immutable MCP capture, policy ceilings and correlation lineage. A child may narrow those values but may not replace or enlarge them.

## MCP and approvals

The Boss remains the sole MCP connection owner. UAR receives an immutable catalog with opaque resource IDs and invokes tools through an authenticated loopback host bridge. UAR never launches or reconnects the configured MCP servers for a managed run.

Every tool call uses the correlation tuple:

`(principalId, conversationId, runId, stepId, toolCallId, resourceId)`

The Boss validates the tuple against the active run capture before presenting or resolving an approval. Approval IDs are single-use and bind the exact tool name plus a canonical input digest. A denial, stale approval, tuple mismatch or unlisted resource returns an explicit terminal tool result; it never falls through to native execution. Preview mode disables UAR native tools that could bypass the host bridge.

## AG-UI stream and recovery

UAR advertises profile `uar.agui/1` and emits stable run, step and tool-call IDs. The Boss adapter maps those events into the existing `AgentRuntimeEvent` union and persists only host-owned conversation state.

The stream contract is ordered and gap-aware:

- each event carries a monotonic sequence within a run;
- reconnect supplies the last persisted sequence;
- UAR replays retained events or returns an explicit unrecoverable-gap result;
- broadcast lag is never silently discarded;
- cancellation is idempotent and terminates the matching run only;
- interrupted tool calls persist as `indeterminate` unless UAR has a recorded terminal result.

## Capability and lifecycle negotiation

Startup succeeds only when UAR reports compatible contract/profile revisions and the P1 capabilities used by The Boss. The Boss records the advertised and effective capability sets and exposes mismatches in diagnostics.

The main process owns one supervised sidecar per app profile. It waits for readiness, restarts after an observed unexpected exit with bounded backoff, terminates the child during shutdown, and never exposes the launch token or provider credentials to renderer processes. Conversation connections are isolated by principal and run ID even though the process is shared.

## Existing interface mapping

- The Boss `AgentSessionRuntimeDriver` is the registration boundary.
- The Boss `AgentRuntimeConnectInput` supplies conversation, workspace, model, reasoning and history inputs.
- The Boss `AgentRuntimeConnection` supplies streaming, send, reconciliation and close/cancel behavior.
- The Boss `AgentRuntimeToolApprovalRequest` remains the user-facing approval object; bridge correlation remains main-process-only.
- UAR `RunExecutionRequest` is the internal execution boundary; HTTP DTOs may deserialize the envelope, but handlers must construct this owned request only after admission.

## P1 phase gate

Static inspection establishes wiring only. Behavioral acceptance occurs once, after all P1 production paths are complete, against installed Windows x64 and Apple Silicon candidates. The gate exercises a real workspace task, approve/deny/plan-mode tool calls, restart and stream recovery, cross-conversation isolation, diagnostics, local no-Docker startup and packaged skills. No unit or per-task test result substitutes for that gate.
