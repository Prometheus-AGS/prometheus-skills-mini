# R3Projection source handoff

Author: `/root/uar_resource_continue`, replacing the capacity-limited resource author. Recorded 2026-10-06T16:19:25.023Z. Source root `/Users/gqadonis/.claude/worktrees/bauar-uar`; HEAD `8bff32deb870f6363e94687a2e22492f91a34dfd`. Accepted scope is `execution-bindings.json` R3Projection plus the explicitly accepted world-state runtime slice. This is source authoring only; no runtime acceptance or certification is claimed.

## Production source

The prior author's finite projector, independent stream tails, canonical receipt projection, typed event projection, MCP header capture and private admission staging remain in place. APIs `RunSecretScrubber::{extend,from_values,scrub}` are compatible with the ingress/provider capture handoff. Raw, JSON-escaped body, upper/lower percent spelling and standard/URL-safe padded/unpadded base64 variants are deduplicated and matched longest-first against original input. Object-key collisions become an explicitly non-lossless representation. No authority-bearing executable argument accumulator is projected.

Canonical projection occurs before both the no-store return and acquisition/save. Verified UTF-8 segments are rebuilt from projected bytes with new base64, length and SHA-256; opaque/unavailable segments are omitted with an explicit count. Source acquisition incompleteness stays incomplete. Optional serde-default `secret_projection` metadata has version 1, actual-redaction flag and omitted count; it participates in canonical equality and validation. Legacy receipts remain unlabeled. Complete describes the represented projected view, not original-byte losslessness.

Admission retains input/history/events privately until the same once-resolved selected ClientConfig corpus is captured. Shared emitter clones use an explicit admission projection state, bounded at 4 MiB/1000 events, with static rejection/terminal publication. Active and pre-admission failure shells withhold executable snapshots and ordinary input. Executable snapshots containing a known captured variant fail with `SECRET_IN_EXECUTABLE_ARTIFACT` before their manager retention or generation use; their authority/revision is never rewritten. Existing policy IDs, call IDs, approval capabilities, targets, signatures and routing choices remain control data.

The continuation finishes first-retention integration:

- `manager.rs` restores the original host-only world-state baseline onto the detached staging view through the existing `record_world_state` API with no appended messages. After successful capture it binds the original retained session to the world-state runtime. Normal publication performs only the existing seed-if-empty and new-input append; explicitly authorized checkpoint history retains its replace behavior. No stale whole-state assignment or session-manager correction was introduced.
- `world_state/runtime.rs` receives the completed capture and original session through a surgical setter. Each commit projects an owned copy of update messages before `record_world_state`; the host baseline, selected snapshot, instruction access and control state remain intact. Subsequent contributions keep the original shared append authority.
- `manager.rs` passes a copied `routing_input` through RAG, matching, classifier and classifier-fallback seams using the auth/host/MCP corpus already captured at that point. Generation credentials resolved later cannot retroactively protect those earlier calls. Restored/model history copies and late assembled fragments are projected before ordinary retention/model consumers.
- `orchestrator.rs` projects step-fragment copies and rebuilds manifests from the represented fragments and projected warnings before publication; manifest hashes describe that view. `secret_stream.rs` preserves typed UAR request/resolved-step envelope identities rather than applying arbitrary-content rewriting to them. Provider custom content is still projected. Artifact warning metadata is projected separately from capability/identity metadata.
- The obsolete `resolve_pending_approval` test import was removed under root's explicit mechanical integration authorization. No run-only approval helper or approval behavior was restored.

Early approval ordering was read at the actual seams: root broker registration does not await a decision; pre-capture projected activation preparation awaits MCP preflight and attachment preparation without a human-approval request. The awaited tool-approval gate is installed after completed capture. No approval channel was suppressed or redesigned.

## Authored scenario source

`tests/bauar_secret_projection.rs` and its accepted helper author the actual sidecar/router path with an embedded synthetic HTTP model/MCP/embedding peer. They do not assert genuine external model inference or receiver certification.

The scenario creates and ingests a KB through the real routes, positively reaches the embedding receiver, then holds the actual early RAG request. At that boundary it inspects the active run shell before generation-client capture and asserts no retained executable revision or generation call. Early input contains authenticated ingress and admitted MCP canaries in finite variants, while the generation-key canary is configured separately and emitted by the provider only after resolution. A projected-secret routing positive control prevents an empty observation from passing.

The generation peer emits character-split variants; reconstructed stream channels, actual post-tool model requests, run inspection and process stderr are checked for captured variants. The MCP receiver checks the original executable echo argument and an unrelated legitimate control, with exactly one effect. Secret-bearing trusted project instructions exercise the world-state copy boundary. A second actual run reuses the original session, checking prior user/world-state content and no effect replay. A final executable-secret artifact is rejected with the fixed code before any additional generation request/effect. The separate receipt metadata scenario checks projected represented-byte hashes, legacy absence and rejection of an unknown projection version; it is not an executed canonical-store integration result.

## Limits and command discipline

No test, compiler, build, formatter, lint, service, dependency mutation, review gate, commit, publication or canonical-state mutation was run. No D0 source/scenario, `bauar_session_owner.rs`, or conditional session-manager correction was inspected or edited. The exact test/helper compile compatibility, routing hold/timing, actual event contracts, filesystem instruction retention, receiver effects and receipt runtime behavior remain unverified until the complete authorized delivery gate.

The finite corpus does not discover arbitrary secrets/encodings. Empty-key constructor-owned Liter credentials, refreshable ADC/Bedrock credentials, opaque supplied drivers and opaque routing credentials remain unknown. No provider-wide resolution, second ambient resolution or routing disable was added. Dependency-internal logs remain outside the stated capture guarantee. A dropped/cancelled consumer can discard a private undecided stream suffix; no dropped private suffix is published. Normal upstream terminal/error/end flushes use the finite projector. Keeping the host baseline exact can cause a later full world-state contribution when projected history no longer matches a raw baseline message; this preserves the existing lost-baseline interpretation instead of reconstructing authority from projected text.

Only accepted product/scenario paths were changed; the newly claimed runtime file is 128 lines, and all new modules/scenarios are below 500 lines. Existing large incumbent files received surgical edits. Every projection guard traces to the actual authenticated ingress, model dispatch, MCP output, executable artifact, event history, canonical receipt or session retention boundary. No unrequested product feature or speculative guard was added. Skills applied: `prometheus-rust-workspace`, `rust-router`, `rust-best-practices`, `rust-async-patterns`, `rust-mcp-server-generator`; gate suggestions were deferred under the explicit task restriction. The older local per-edit Cargo rule conflicts with that restriction and was not followed.

One initial read-only binding extraction accidentally used the host's Node 26 and failed on the binding JSON nesting; it changed no source. Subsequent scripted reads, authoring support and hashes used `/opt/homebrew/opt/node@24/bin/node`. Read-only Git/source discovery and patch edits were the other operations.

## Source fingerprints

Scoped tracked diff SHA-256 against HEAD: `ebd67b490c423143e1afe343c1e4982bf3f332a5df2c0129f61af91947e114ff`. It includes earlier preserved tracked content and excludes untracked new files; complete per-file hashes bind the actual handoff including those files.

| Path | Lines | SHA-256 |
| --- | ---: | --- |
| `src/uar/persistence/agent_threads.rs` | 860 | `a864391c18dddb7e14059bf3b1683aa36b9b9a03d6d8a0c4ecb711f25388d324` |
| `src/uar/runtime/turn/host/secret_projection.rs` | 127 | `9ef53b7fa0ea0399549a38eb5c360b1f2eadc62363c170b055b2f5144c54770d` |
| `src/uar/runtime/turn/host/secret_stream.rs` | 129 | `f923b2f9cfe6e47dde123d999059186c487de0d92de2ef6dfde2af532ae69794` |
| `src/uar/runtime/turn/host/receipt_projection.rs` | 42 | `f7aaeb83128b60e776fd26a9160458dfa4cc8f92bc13e6f052a4c8c7277ecdfe` |
| `src/uar/runtime/turn/host/event_projection.rs` | 180 | `dfb94716a0d7b28d934095169ed2aef459ad92275ef8fcac30539df88b189f19` |
| `src/uar/runtime/turn/host/mod.rs` | 125 | `a094d1496119a5c62112790c8486007a24c08508d83ce249f536b635243e83f4` |
| `src/uar/runtime/turn/host/mcp.rs` | 437 | `ffbce8153ab1cdd9e5d8a702112b5d12fc0b6f6a4e63b483c7ca024a98b6c81b` |
| `src/mcp/runtime.rs` | 929 | `2107903dc1fea8bdbbd341b180e11ac9f4a2be1720995003d15093ceb614888a` |
| `src/llm/orchestrator.rs` | 3353 | `dc5a76e4e39e96a26bc9100bd7a0971ef027f825918ca3366537d27631de4021` |
| `src/uar/runtime/manager.rs` | 7522 | `e88ab0d01bdef1f15b9d658d50d55a738cdf09ad00d9e2dd1ef8c42ab1ec09a5` |
| `src/llm/anthropic_driver.rs` | 549 | `ed1c06ee5cddab76394f3ba583eed5ddc4793215ea8c85197156b3bb32a78e32` |
| `tests/bauar_secret_projection.rs` | 247 | `3579357980603bd6ee6f30ded9c45824837caa43489cad6a2e4b218d6bce2600` |
| `tests/support/bauar_secret_provider.rs` | 123 | `37251d28ce0b869eb519423229ab71d89d45f3a91c07405fa9dd987026687f71` |
| `src/uar/runtime/world_state/runtime.rs` | 128 | `f91c0fc3c2430bfdea5acb2610b50c62a8054f37cffb4211fffd1f9440a6cfac` |

Source ownership is released to root for the next authorized phase boundary. This source handoff does not mark R3, V1/V2 or the resource change accepted or complete in canonical state.
