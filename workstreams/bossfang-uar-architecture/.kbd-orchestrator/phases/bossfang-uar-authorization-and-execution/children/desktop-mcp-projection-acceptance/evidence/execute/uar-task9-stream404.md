# Task 9: bounded ordinary run/SSE 404 investigation

2026-10-07, canonical task 9 revision 245. Read-only author investigation, not independent review/certification. Only this document was written. No product changes, compiler, test, gate, endpoint request, service/default/dependency change, diagnostic retry, or auth bypass was performed.

## Observations and conclusion

`G2-03-finite-failure.json` reports successful catalog read/write and run creation, followed by stream `not_found`, zero frames, zero run-error frames, and zero model-provider requests. Run inspection is explicitly `not_observed`. Its `runRevisionMatches:[false]` therefore does not by itself prove a mismatched runtime revision or failed owner identity. That boolean lacks an observed run inspection in this record.

The root reports G2-01/02 obtained their initial streams. The inspected `G2-04-finite-failure.json` contains all six completed eager/deferred MCP profiles and a later sink-assertion failure. That does not explain or resolve the G2-03 404. No claim is made that the observed intermittent failure has been reproduced with a known cause.

The allowed source contains multiple ways for a successful ordinary create response to lead to a missing stream state, including pre-registration admission failure. Consequently **404 does not establish an owner failure**. No finite field in the inspected G2-03 artifact distinguishes the exact in-handler branch, an outer-router 404, or the relevant early admission failure. The cause remains unresolved.

## Exact normal ingress and two in-handler 404s

UAR paths below are relative to `/Users/gqadonis/.claude/worktrees/bauar-uar`.

- `src/uar/api/routes.rs:39-43` registers POST `/runs` and GET `/runs/{id}/stream` in the same router. `RunManagerState::from_ref` at 33-35 clones the same manager from `RunApiState`.
- `create_run` at 437-455 delegates to `admit_run`. Ordinary artifact/agent selection at 540-547 constructs a request with the middleware UserContext. Host resources attach at 591-601.
- The ordinary path awaits `execute_request` at 622. At 624-629 it asks `get_run` for context but substitutes an empty context if the run is absent. At 651-658 it still returns `Ok(CreateRunResponse)` with the run ID and generated stream URL.
- `stream_run` at 780-903 has exactly two explicit in-handler 404 responses: context lookup returns None at 787-788, or `subscribe` returns None at 790-792. Replay/cursor handling occurs only after both checks and does not produce this 404.
- `manager.rs:7063-7088` context lookup can return None because the current context cannot construct its expected actor owner, no map entry exists, or the retained verified owner/user ID differs. Actor owner includes both user and optional tenant (`actor/messages.rs:10-37`). The anonymous branch separately requires internally consistent subject and no tenant.
- `manager.rs:6929-6932` subscribes solely by finding the map entry. It does not reject a terminal status or zero existing receivers. A run could disappear between the two separately awaited read locks, but the record provides no evidence of that race.

The initial request also validates context (`turn/request.rs:280-295`, invoked at routes 544-545), so an invalid creation context would ordinarily be rejected before this successful response. This does not prove that the later GET used identical context or that a missing map entry was caused by identity.

## Source-grounded pre-registration failure possibility

`manager.rs:2422-2458` allocates/uses a run ID and executes the ordinary kernel. The graph path has a separate missing-state repair at 2450-2451; the ordinary path directly returns the inner result and does not use that graph repair.

The ordinary kernel creates its sender/history/emitter at 2869-2888. Its normal active-map insertion occurs much later at **3503-3524**. Several earlier failures emit an Error/RunDone into that local emitter and then return the run ID without this insertion:

| Fixed failure code | Relevant source anchor / condition |
| --- | --- |
| `remote_budget_invalid` | 2890-2915: requested budget intersection/serialization failed |
| `actor_root_mismatch` | 2920-2950: actor-root binding invalid or not committed; conditional actor-root path |
| `run_owner_mismatch` | 2954-2972: supplied user differs from captured verified owner |
| `mcp_catalog_unavailable` | 2975-2994: root MCP capture failed |
| `mcp_capture_mismatch` | 2999-3024: capture owner, inheritance, or working-directory mismatch |
| `child_bindings_unavailable` | 3031-3073: invalid inherited child bindings; conditional child path |
| `sandbox_binding_unavailable` | 3079-3108: sandbox capture failed |
| `remote_sandbox_incompatible` / `remote_sandbox_unavailable` | 3111-3147: inherited sandbox constraint cannot be enforced |
| `mcp_server_not_run_scoped` | 3246-3269 and 3312-3334: effective selected server outside the captured request set |
| `mcp_preflight_failed` | 3276-3297: actual request-scoped MCP tool discovery failed |

These are source possibilities, not observed G2-03 failures. Applicability of each conditional input is not established by the finite artifact. In particular an MCP discovery failure is compatible with no provider request, successful create response, and subsequent missing stream, but compatibility is not causation.

The checkpoint-revoked branch at 3383-3437 is different: it explicitly inserts an error RunStreamState before returning, so that branch alone does not imply an absent stream entry.

`RunEventEmitter::emit` at 279-302 updates an existing map state if present but never inserts one. It records through its private history. `turn/host/event_projection.rs:28-45` allows pre-admission Error/RunDone publication with a fixed message; it does not create manager state. Thus the pre-registration error codes can be generated without remaining available through a subsequent SSE subscribe to the manager. No additional read endpoint was called to work around that missing state.

## Retention and transport limits

`manager.rs:1013-1089` can remove retained terminal runs by timeout or cap. Timeout requires terminal time, detached time, and no live descendant; cap eviction requires eligible terminal runs with no receivers and no live descendant. These are real map-removal branches, not evidence they ran here. The G2-03 artifact contains no elapsed-time, terminal-map, cap-pressure, or sweep observation supporting retention as the cause. Ordinary completion does not itself make `subscribe` return None.

An outer routing/middleware response cannot be excluded by a stream 404 alone. This bounded assignment inspected handler and explicitly referenced allowed modules; it did not expand into sidecar routing/auth diagnostics or either excluded file. No auth failure was inferred.

## Existing safe finite oracle and limit

The existing gate's exact create response, ordinary stream response, and provider request counter already distinguish HTTP/SSE admission failure from a later provider/tool failure. Safe finite observations available on those same operations are numeric POST/GET status, valid create-response shape, whether the requested stream target exactly matches the returned stream URL and run ID (booleans only), whether the same already-established sidecar instance was used, frame count, and whether any provider request was observed. These do not require an alternate endpoint, raw credentials, headers, URLs, IDs, request content, error bodies, or a retry. This document does not authorize adding or executing instrumentation.

No existing field in this finite record distinguishes `get_run_for_context` failure from `subscribe` failure. Both handlers return the same empty 404. No per-branch finite log is emitted by those two handlers. The early pre-registration errors discussed above are local emitted events, not a retained manager stream or a guaranteed fixed-code log. Therefore the available finite oracle can localize the failure to before usable SSE/provider activity but **cannot identify the causal branch**. G2-04's later success is a separate observation, not proof of correction.

## Scoped source hashes and exclusions

| Path | SHA-256 |
| --- | --- |
| src/uar/api/routes.rs | 239904c15f76e335e656a653a8ba0274f4cf9b9aa6ddb705ee3c163b318d0df4 |
| src/uar/runtime/manager.rs | a786f4830611f92b0c718c474ae392efda8eb89ccf1fb4ca59e0947a1db40d17 |
| src/uar/runtime/actor/messages.rs | e8cecce072a4981490aa203a93b2938e37391a508806f243bceaf86da4d9c063 |
| src/uar/runtime/turn/request.rs | f407b8d8f4bac034b9efdd28bbc1608624fadec2798acf6e43c1eddae16027a0 |
| src/uar/runtime/turn/host/event_projection.rs | 55fac6382dc363357545d2a20a88a8ddc49c50f484713b7695bfa329c1dc33b6 |

Only explicit allowed source paths and their named module entry points were inspected. One named module-layout read found `turn/host.rs` absent; the referenced module's directory listing identified `host/mod.rs` and `event_projection.rs`. No broad multi-root content scan occurred. Neither `src/uar/mcp_server.rs` nor `tests/bauar_session_owner.rs` was opened/hashed in this task. The earlier task 7 accidental partial source exposure remains recorded in `task7-uar-fault-feasibility.md`; this task does not erase that incident or claim a session-wide absence of excluded access. No rejected diagnostic was retried or rerouted.
