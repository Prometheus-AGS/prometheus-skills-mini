# G2-12 post-ack diagnostic and focused runner handoff

2026-10-07, Execute task 9 revision254. Authored source is frozen; no compiler, build, test, or gate was run by this author. Root owns execution and source/artifact rebinding.

## Observed failure and diagnosis limit

Read `G2-12-finite-failure.json`: native_post_ack failed during post_ack_positive_calibration at stage registration, cleanupConfirmed true. The cancellation case remains unrun. The retained providerConversationDiagnostic can be from an earlier case and is not correlated to this registration run; it does not establish the failure cause.

Source inspection found that registration covered six separate operations without a retained suboperation: session creation, run/assertion, warm close, selected tool-agent setup, and tool-session creation. The actual returned registration error/turn metadata was discarded by the assertion. This **diagnostic gap is observed**, but the underlying runtime cause is still unknown. No speculative production fix, retry, skipped assertion, fallback artifact, or changed authority was added.

## Frozen source

Boss root `/Users/gqadonis/.claude/worktrees/bauar-boss`.

| Path | Lines | SHA-256 |
| --- | ---: | --- |
| scripts/gates/bauar-post-ack-cases.ts | 314 | 70146e2045cc3eebd49530338081fffb0f924a2362a01f67f7dce04b2c2fa9a2 |
| scripts/gates/bauar-post-ack-gate.ts (new) | 128 | a95080010ffb9f3338e39ff4bde267c871309b77d1226378d638c370070c75da |

No native controls, provider negatives, main gate, production, or UAR source was edited. The helper API is unchanged. The new optional receipt registration/failure fields contain fixed operation strings, existing finite error classification, actual turn diagnostic, actual capture counters/statuses/categories, or failed-turn diagnostic. No raw error, user/model content, credential, canary, token, ID, endpoint, or stack is emitted.

## Diagnostic correction

The helper records session_create, capture_install, run_turn, stream_assertion, warm_session_close, tool_agent_setup, or tool_session_create as the current registration operation. It records `runTurn`'s finite diagnostic and `registrationErrorDiagnostic(registration.error)` **before** asserting the original empty error condition. The existing real HTTP/SSE capture supplies run/catalog HTTP counts and statuses plus bounded stream error categories. If runTurn throws, the existing failed-turn diagnostic is retained. The original thrown error is categorized, not printed. Capture-read failure is a boolean; it cannot produce a passing case.

The registration observer is installed only for that actual registration and restored before the existing native controls are installed. Every failure path also restores it before closing Electron. All artifact, checkpoint, final snapshot, correlated discovery, cancellation, persistence, no-replay and cleanup assertions remain unchanged.

## Focused runner README

Root may execute `scripts/gates/bauar-post-ack-gate.ts` with the same approved local TypeScript execution mechanism and Boss working directory as prior gates. Its optional first positional argument is the finite success receipt output path. Required inputs remain `THE_BOSS_UAR_POST_ACK_SIDECAR_PATH` and `THE_BOSS_UAR_POST_ACK_MANIFEST_PATH`. The helper still validates actual binary path/hash, source-manifest hash, and full feature set before every launch. Root must refresh source bindings before execution; this handoff does not relabel the earlier receipts.

The runner starts only the existing private deferred SDK MCP fixture and a private provider fixture on ephemeral loopback ports. It uses the genuine desktop launcher, fresh profiles/workspaces, actual stores/credentials and unchanged post-ack helper. Provider streaming preserves the full gate's original benign reasoning/text response for registration and its tool-call SSE response for the existing NativeFaultConversation. No replacement executor or fabricated discovery result is introduced. Calls remain authenticated by the same new synthetic credential supplied to the actual isolated app.

The runner exercises exactly the two unresolved cases, positive same-artifact calibration followed by post-ack cancellation. It does not invoke ordinary profiles, event cases, provider negatives, ordinary native cases, restart, storage cases, or G1. Receipt explicitly reports ordinaryCasesRepeated 0. It additionally checks provider authentication/fixture failures and zero protected MCP target/filler dispatches. Finite failure output contains the helper's partial case progress and fixture status/counters, not raw exceptions.

On exit, the helper closes sessions/interceptors/Electron; the focused runner clears its selector, closes the SDK receiver and all provider connections, waits for fixture shutdown, and confirms cleanup only after completion. Missing shutdown fails the run. No uncertain retained profile/control evidence is deleted.

## Pending root verification

Compiler compatibility and focused genuine runtime outcome remain unverified. The next failed-boundary run must determine the actual registration failure category/substep; this source delivery does not assert that the runtime fault is fixed. Earlier passing source15 cases retain their original evidence and are not promoted to a new boundary by this change. No private log was read or printed. Neither excluded UAR file was searched, opened or hashed; no D0 probe/reroute occurred.
