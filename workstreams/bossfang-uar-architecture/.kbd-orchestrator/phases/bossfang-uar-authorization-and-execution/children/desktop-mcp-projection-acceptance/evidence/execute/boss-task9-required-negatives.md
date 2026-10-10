# Task9 required negatives — Boss coordinator source freeze

2026-10-07. Authorized by negative-control-authoring-dispatch.json after root reported instrumented build02 complete. Position revision252. This handoff covers only the three owned gate sources below; the separately owned provider-negative helper must also freeze before any dependent compiler/gate.

## Changes

A1: added changed_owner to the existing actual authenticated host claim-native immutable-mutation loop. Only invocation.ownerId changes; original receipt, admission and authentication remain unchanged. Actual refusal status must be409, persisted original state must remain authorized, and the live approval snapshot must remain authorized. The normal record guard requires unchanged receiving MCP effects, with zero acknowledged native consumes for the refused request. A finite ownerBinding stores numeric status and persisted/live state booleans. originalClaimUsable becomes true only after the existing unmodified concurrent claim requires statuses200/409, exact receipt equality, persisted claimed state and repeated-claim409. Original exact approval and all prior cases remain. This is host immutable-binding coverage with synthetic authority inputs, not actual UAR native dispatch or multi-user certification.

A4 main wiring: imports exerciseProviderNegativeCases/providerNegativeCaseProgress from the separately owned bauar-provider-negative-cases.ts. Invokes the helper after six positive profile/sink observations and all event observations, and after the original positive provider-conversation assertion. It reuses the ordinary app/model/deferred selected server before the seven ordinary native cases. Existing two separately instrumented post-ack cases and zero-unresolved-control assertion remain unchanged. Main is494 lines.

The scoped observer is captured at actual chat POST dispatch before body reading; response.once('finish') supplies response.statusCode. No expected400 is synthesized as observed evidence. providerRequestSnapshot returns copies containing only actual request authorization booleans. Negative driver failures stay separate from the positive providerConversations array; helper results become providerNegativeCases in the success receipt, and its finite partial-progress getter is always included in failure JSON. The helper owns selector/observer cleanup and must throw on any unmet negative predicate or operational failure; the main does not catch-to-pass or add retries.

The shared provider export is a structural ProjectionProviderDriver type with call/complete/failure steps and finite diagnostic records. Existing ProjectionProviderConversation implementation, fixed guards and transition behavior are untouched. NativeFaultConversation remains a separate union member.

## Frozen interface

exerciseProviderNegativeCases({app,page,sourceAgent,modelId,workspaceId,serverId,canary,intendedTargetName,targetEffects,fillerDispatches,conversation,setResponseObserver,providerRequestSnapshot}) returns {cases}. conversation accepts ProjectionProviderDriver|undefined; setResponseObserver accepts ((status:number)=>void)|undefined; providerRequestSnapshot returns Array<{authorized:boolean}>. Companion providerNegativeCaseProgress() supplies partial outcomes. Native helper author explicitly confirmed this interface before main authoring.

The separate author owns actual five-case execution, exact intact-request preconditions before bounded clone mutation, genuine filler preparation/approval/receiver refusal, run failure and cleanup. Filler dispatch is the approved A4 alternative; duplicate-target-proposal remains unrun and is not claimed covered. The first four cases test the controlled provider's correlation/refusal boundary on genuine incoming UAR requests, not UAR malformed-history robustness. Filler dispatch1 is not zero activity; protected target effects must remain0.

## Limits and next boundary

Static source readback only. No compiler, build, lint, formatter, test, gate, runtime request, KBD/team mutation, product/default/service/dependency edit, raw private log or excluded D0 access. Runtime behavior and new acceptance cases remain unverified. Parent must wait for both authors' final freezes, run the required completed-surface compiler, refresh source/artifact/prelaunch bindings, and run only the authorized gates. Ordinary product artifacts can be reused only after root confirms unchanged product inputs and exact hashes; instrumented artifact stays isolated to post-ack cases. Prior passing receipts do not certify these new cases.

No predicate was weakened, no production guard added, and no new approval bypass exists. This author changed only the three assigned gate files plus this evidence document.

## Source bindings

| Path | SHA-256 | Lines |
| --- | --- | --- |
| scripts/gates/bauar-native-host-cases.ts | f40a506ef8a79043bf8face9b361c48caccc664f7dd512912eb1256a2f7e5b0b | 208 |
| scripts/gates/bauar-secret-projection.ts | 8966bf31432f3bcb4f92b82efea1611f3b9a1439134d5f98a0a45e8cdb391ffd | 494 |
| scripts/gates/bauar-secret-projection-provider.ts | dabd8216a0889e1f644a3a1bfa9a6c1e8900f9dcce75786b2db88b71dd4750b8 | 140 |
