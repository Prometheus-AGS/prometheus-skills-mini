# Task 9: G2-08 registration paths and bounded diagnostic

Read-only author investigation, 2026-10-07; position restored at revision 248. This document is the only write. No implementation, runtime/private log access, gate, test, compiler, endpoint request, or service/config/default change occurred.

## What the finite record actually establishes

`G2-08-finite-failure.json` reports exit 1 at `registration_run`, operation `stream_assertion`, `streamErrorPresent=true`, HTTP status null, reason `unclassified`, provider requests zero. Catalog, catalog write, run, inspection, and stream status are all `not_observed`; capture count and frames are zero. All native cases are unrun.

This does **not** establish a created run ID, a reached UAR handler, an HTTP 404, an owner failure, a failed sidecar startup, or a particular UAR setup error. It also does not prove no UAR request occurred: capture coverage itself is unobserved. The earlier G2-03 had observed catalog/create responses followed by stream 404. Its source candidates remain real but cannot be promoted to G2-08's diagnosis.

No Boss exception path was investigated here; its owner is independently investigating the pre-capture/finite error diagnostics. No raw error text or private logs were requested.

## UAR boundaries, before model provider activity

All source paths below are relative to `/Users/gqadonis/.claude/worktrees/bauar-uar`.

### 1. HTTP admission can reject before allocating an ordinary run

`src/uar/api/routes.rs:437–455` enters `admit_run`; the ordinary selector builds its request at `540–547`. Manager execution is not called until `602–623`.

| Source anchor | Actual prerequisite / rejection |
| --- | --- |
| `routes.rs:731–776` | Exactly one selector; inline artifact validates, or registered agent resolves. Fixed codes include `run_agent_selector_required`, `run_artifact_invalid`, `run_agent_not_found`, `run_agent_invalid`, `run_agent_catalog_unavailable`. |
| `routes.rs:543–545` | Captured request context must form a valid principal. This is a source prerequisite, not evidence of a principal problem in G2-08. |
| `routes.rs:573–589` | Attached tool admission requires authenticated sidecar host authority; incompatible input yields `tool_admission_invalid`. |
| `routes.rs:226–252,265–267` | Requested working directory must be absolute, existing, a directory, and non-root; failures yield `working_directory_invalid`. |
| `routes.rs:268–315` | Reasoning effort and history validate; credentials parse and cover default/fallback providers. Unsupported effort or missing credential binding rejects before execution. |
| `routes.rs:316–366` | Requested MCP servers must cover declared selection, use a verified owner and valid working directory, and pass manager admission. |
| `manager.rs:1370–1413` | MCP admission needs a root destination catalog only when an input has a grant; otherwise it uses an empty catalog. It captures an existing or directory-derived binding environment, validates inputs, and creates run resources. Fixed outer errors include `run_mcp_destination_unavailable` and `working_directory_invalid`; input validation may return its own fixed code. |

Conditional deployment/service-placement paths (`routes.rs:483–539,551–568`) have additional conflict/principal/binding checks. The finite artifact does not establish that these optional inputs were used; they are not ranked as candidates for this ordinary fixture.

`RunApiError` returns an HTTP status and JSON `code` plus `error` (`routes.rs:181–223`). `HostInputError` maps to 422 except the specific MCP grant authentication code maps to 401. A numeric status and an allowlisted code are sufficient finite observations; raw `error` is unnecessary and may contain dynamic details. Framework extraction or outer routing failures may not use this JSON shape; absence of a recognized code must remain `unclassified`.

### 2. The ordinary kernel can return a run ID without inserting active state

`manager.rs:2422–2458` allocates the ID and awaits the ordinary inner kernel. Graph routing is narrowly `artifact.id == "orchestrator-agent" && agent_graph.is_some()` (`1632–1634`); graph failure repair (`2450–2451`) is separate and must not be assumed for an ordinary run.

The ordinary emitter/history is created at `2869–2888`; normal `active_runs` insertion happens at `3503–3524`. The following early exits still precede that insertion, with unchanged source hashes from the earlier bounded investigation:

| Fixed code | Anchor and condition |
| --- | --- |
| `remote_budget_invalid` | `2890–2915`: supplied remote-budget narrowing fails. |
| `actor_root_mismatch` | `2920–2950`: conditional actor root binding is invalid. |
| `run_owner_mismatch` | `2954–2972`: captured owner differs from supplied user. |
| `mcp_catalog_unavailable` | `2975–2994`: root MCP resource capture fails. |
| `mcp_capture_mismatch` | `2999–3024`: captured MCP owner/inheritance/directory does not match. |
| `child_bindings_unavailable` | `3031–3073`: conditional inherited child bindings fail. |
| `sandbox_binding_unavailable` | `3079–3108`: sandbox capture fails. |
| `remote_sandbox_incompatible` / `remote_sandbox_unavailable` | `3111–3147`: supplied inherited constraint cannot be enforced. |
| `mcp_server_not_run_scoped` | `3246–3269,3312–3334`: selected policy server is outside request-captured names. |
| `mcp_preflight_failed` | `3276–3297`: non-pre-resolved request-scoped tool discovery fails. |

These paths emit local errors and return the ID. They do not by themselves publish an accessible active-run stream. `routes.rs:624–629` substitutes an empty context if `get_run` returns None and still returns `CreateRunResponse` at `651–658`. This is the concrete successful-create/missing-state path previously documented in `uar-task9-stream404.md`. The checkpoint-revoked branch is different: it inserts an error state before returning (`manager.rs:3383–3437`).

To apply this explanation to an actual attempt requires first observing successful create and then the stream result. G2-08 provides neither. No input-presence evidence ranks the conditional budget/actor/child/sandbox paths here.

### 3. Setup can fail after insertion but before a provider request

Many setup failures retain an active run and emit a terminal event before model execution. Examples inspected here:

| Source anchor | Distinct retained-state outcome |
| --- | --- |
| `manager.rs:3571–3591` | Already-cancelled derived run token marks Cancelled and returns. |
| `3600–3625` | Approval registration failure emits `approval_channel_unavailable`. |
| `3649–3680` | World-state construction emits `world_state_load_failed`. |
| `3693–3745` | Tool-admission context/runtime construction emits `tool_admission_context_failed`. |
| `4139–4171` | Activation/MCP setup failure emits `mcp_preflight_failed`, or Cancelled if its token was cancelled. This same code also occurs before insertion, so code alone is not a unique phase oracle. |
| `4458–4497` | Selected run credential binding fails before constructing the model. |
| `4593–4665` | Capturing model bindings fails; ordinary path emits `orchestrator_start_failed`. |
| `4671–4694` | Executable artifact or staged secret projection cannot be admitted. |

This table is deliberately not an exhaustive review of the large kernel. It identifies source-backed prerequisites and illustrates why provider count zero alone cannot distinguish pre-registration from post-registration failure. The final ordinary producer is spawned only after setup (`6861`); `execute_request_inner` returns its ID at `6926`. `subscribe` (`6929–6932`) checks map membership, not terminal success, so retained error state is not automatically a 404.

The stream handler first checks `get_run_for_context` and then subscribes (`routes.rs:787–792`); either absence returns the same 404. No such response is observed in G2-08. This investigation does not inspect sidecar startup internals or infer a failed startup from the empty capture.

## Smallest next diagnostic, proposed only

The next useful observation belongs at the **existing operation boundary**, coordinated with the Boss diagnostic owner. Keep the same real operations and expose finite states: `not_entered`, `entered`, `response_received`, or `threw`, plus numeric HTTP status if a response exists. Record whether a created-run response had a valid shape and whether the returned target matches the target used (booleans only). Preserve `not_observed` rather than turning absence into failure.

For an already-received create error, classify only its fixed JSON `code` against an explicit allowlist derived from the above handlers, otherwise `unclassified`; omit raw body/message/URL/IDs/headers/credentials. For an already-opened stream, retain frame count and existing allowlisted RUN_ERROR categories. This uses no new UAR endpoint, no private logs, no retries, no owner probe, and no source-side fallback.

Interpretation after that observation:

1. No existing UAR operation entered: UAR handler/setup is not yet implicated; Boss's pre-request path remains the diagnostic boundary.
2. Entered but no response: only transport/exception phase is established, not a particular UAR branch.
3. Create HTTP failure with recognized code: localize to its named admission check.
4. Create success plus stream 404: revisit the missing-state/context branches from the earlier artifact; a code-free 404 still cannot select among them.
5. Create/stream success with a retained fixed error and no model call: localize to setup using the code, while accounting for duplicate codes.

If finite observation again ends before any response, these source candidates remain unproven. A production instrumentation proposal would need separate exact scope approval; none is included or implemented here. Pending driver/cancellation amendments are unrelated and remain pending.

## Snapshot and limits

| Explicit source file | SHA-256 |
| --- | --- |
| `src/uar/api/routes.rs` | `239904c15f76e335e656a653a8ba0274f4cf9b9aa6ddb705ee3c163b318d0df4` |
| `src/uar/runtime/manager.rs` | `a786f4830611f92b0c718c474ae392efda8eb89ccf1fb4ca59e0947a1db40d17` |

Only these explicit source files were read in this followup, plus the named finite/prior evidence and position reminder. No excluded file was opened or hashed in this investigation; no D0 diagnostic or reroute occurred. The earlier Task 7 accidental partial source exposure remains disclosed in its incident artifact and is not erased by this scoped limit. No cause is certified and no runtime acceptance is claimed. Root retains all gate, scope, and state authority.
