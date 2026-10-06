# Full-harness contiguous cursor source handoff

Status: source authored, acceptance pending. Scope: acceptedSlices.Cursor within active resource4 / parent04/4 and parent03 provider contract. No compiler, test, build, formatter, lint, service, dependency, D0, canonical or commit operation ran. Snapshot 2026-10-06T15:57:12.748Z; worktree /Users/gqadonis/.claude/worktrees/bauar-uar; HEAD 8bff32deb870f6363e94687a2e22492f91a34dfd plus current dirty source.

## Provider wire contract

RuntimeDescriptor now advertises event_cursor_profile = "contiguous_cursor_frames_v1" alongside unchanged profile full_harness_v1, runtime epoch, unsupported_after_restart recovery, retention and steer flag. This is an additive descriptor field with one native constructor. The selected consumer must require the exact value before reservation as separately owned by Bossfang; manual legacy profile validation remains its separate compatibility path. No consumer source was edited here.

Only full-harness stream_task invokes the new build_full_harness_sse_response(stream, original_run_id) wrapper. Existing build_sse_response callers still pass no cursor fallback. Both wrappers use the same internal projection function. If to_agui_event returns None, the full-harness stream emits:

    id: <original numeric StreamEvent.id>
    event: uar.cursor
    data: {"request_id":"<original UAR run_id>"}

No user/tool/model text, normalized event name, arguments or tool output enters that cursor payload. The run ID comes from the owned task receipt, not a caller-provided wire value. No counter is introduced and IDs are not renumbered. Mapped AG-UI content frames are unchanged; default global and agui_spec behavior is unchanged. Keepalive comments remain content-free, without source IDs.

The existing source continuity/replay/broadcast lag/gap handling in full_harness/handlers.rs still runs before conversion. Last-Event-ID and query-cursor precedence are untouched. STREAM_GAP stays an agui.error with its existing synthetic next ID and original request_id; it is never disguised as a cursor frame. Retention/recovery limits are unchanged. This fixes a filtered source event looking like transport loss, not actual lost source history.

## Scenario source

New tests/bauar_full_harness_cursor.rs is below500 lines and exercises the actual public full-harness/run routers, native RunManager/executor and Liter HTTP driver against a controlled loopback model. It does not substitute a fake run or emit fabricated RuntimeStep events. Fixture-only owner context supplies identity; this is expressly not an authentication test or server-startup certification.

Scenario1 admits a real content run, reads its retained normalized history, requires actual executor RuntimeStep output, compares all full-harness numeric frame IDs with that history, and verifies each filtered RuntimeStep is exactly a uar.cursor payload containing request_id only. It reconnects using Last-Event-ID at a real cursor and compares the suffix; it also checks the ordinary run stream still suppresses those events and contains no uar.cursor frames. Descriptor profile and unchanged recovery are asserted.

Scenario2 drives700 actual provider SSE content chunks through the real executor so the source history exceeds its512 retained-event window. It requires observable retention truncation, then reconnects from1 and asserts the existing single agui.error/STREAM_GAP at2 and matching original run ID. No direct history mutation, forged approval, session-manager scenario or diagnostic retry is included.

These are unexecuted source scenarios. Compilation, actual model/event timing and the retention-window positive control remain unverified until the complete shared gate. This source handoff does not claim acceptance or recoverability.

## Files and integration release

- sse.rs: existing wrapper retained; one explicit full-harness wrapper and internal optional cursor projection.
- full_harness/types.rs: additive descriptor event_cursor_profile field.
- full_harness.rs: native descriptor supplies exact supported profile.
- full_harness/handlers.rs: stream_task uses only the new wrapper and original receipt.run_id; R3 ingress capture edits retained.
- tests/bauar_full_harness_cursor.rs: real router/model/executor source scenarios above.

All five paths are accepted Cursor claims. No additional product path was edited and no resource-owned manager/orchestrator/projector source was modified. All Cursor-owned files are released at this handoff. Existing oversized modules received surgical wiring; the new scenario is below500 lines.

Read/writes used Node24, rg and read-only Git. Context7 was consulted for Axum streaming body consumption (Body::into_data_stream / BodyDataStream); no dependency changes. Earlier shell-login startup delayed bounded source reads; subsequent commands explicitly disabled shell login and returned normally. No test/service process was launched.

## Snapshot hashes

Scoped tracked diff SHA-256 against HEAD: 3d71dd76b65bd6fc62167c4618fd593e6f4fc2afea3cea03deec436d613a0504. This includes prior dirty ingress changes in the shared handler file, while new untracked scenario content is bound by its file hash below.

| Path | Lines | SHA-256 |
| --- | ---: | --- |
| `src/uar/api/sse.rs` | 1494 | `0eefc7542b68262e359697b2f10147f8de29e7a789a830d06f0dbbdc4af762d4` |
| `src/uar/api/full_harness.rs` | 433 | `2e8c50409bedbc34a446fb92c9ad982986ee7aa70a57c17820b7053da7947852` |
| `src/uar/api/full_harness/types.rs` | 77 | `32dd4f5ecb61f84f9cbfdbe7b4a2c30d6d3566b64cead8a05f1d6d30427d5e60` |
| `src/uar/api/full_harness/handlers.rs` | 450 | `3a6e1a12b8e2fd0e4c6f744d49c5ef9f9357357cbc8bebf9798b248169937242` |
| `tests/bauar_full_harness_cursor.rs` | 223 | `bec3fa2c6df5ca0856bd48c99ead37c89b209be32f42b893f4968e6db40481d2` |

## Next identity fixture proposal — not authorized for authoring yet

Proposed only: tests/bauar_identity_boundary.rs owns real standalone-router scenarios; tests/support/bauar_identity_peer.rs owns private temporary startup config, test-key signing, HTTP helpers and an actual loopback JWKS peer. Reuse existing sidecar_process::launch_standalone rather than changing production startup or the helper. Both new modules must stay below500 lines and no session-owner/D0 scenario is included.

Use separate explicitly configured local-secret and remote-JWKS profiles. Cover issuer/audience/expiration, remote missing tenant and unmapped workspace; actual key issue/list/revoke plus direct-key and exchanged-token admission; role attenuation, owner/tenant isolation and exact privileged marker distinctions; bounded exchange TTL; JWKS successful lookup, unknown-key rotation/cooldown, warm stale-last-good failure and hard expiry through the actual upstream peer. Await root's exact allocation before source authoring. Legacy stored-key records are not seedable through the standalone HTTP API because the only backend is in-memory; retain the existing actual storage-policy scenario or obtain an explicitly accepted fixture-only backend construction path, without adding production test hooks. Old signed exchange tokens lacking credential kind can be exercised through the real verifier as unclassified principals. External deployment/IdP certification remains excluded.
