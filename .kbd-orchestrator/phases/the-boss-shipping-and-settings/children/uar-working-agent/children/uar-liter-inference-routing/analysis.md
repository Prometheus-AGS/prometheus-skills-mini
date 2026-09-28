# Analysis — inference authority

## Existing alternatives

| Route | Finding | Decision |
|---|---|---|
| Reuse the ordinary Boss model picker for UAR | The picker currently accepts OAuth-only Codex because its predicate checks protocol shape. A UAR run credential has only a base URL, protocol, model, and API key. Passing a fake key or copying an OAuth token would not reproduce Boss's Codex request signing and lifecycle. | Reject as the implicit/default route. Retain an explicit Boss route only for credentials that meet UAR's host contract. |
| Use the configured liter-llm gateway | The Boss already discovers served aliases from the configured gateway `/v1/models`, stores the gateway secret in main-process protected storage, and resolves `source: gateway` into UAR run credentials. This matches the operator's expectation that liter configuration controls gateway models. | Adapt the existing route into the create/edit experience; require a served alias and operational gateway state. |
| Use UAR's configured providers directly | UAR already lists enabled models and credential presence through `/api/uar/providers`; the assignment schema and runtime support `source: uar`. | Keep as a selectable route for independently configured UAR models. |
| Add an OAuth-to-UAR credential adapter | No source contract supports passing Codex's OAuth signing/session through `run_credentials`, and doing so would cross a distinct authentication boundary. | Reject for this child. A future native provider integration would require its own architecture and acceptance. |

## Contract decision

UAR is the execution authority. The Boss is the trusted configuration and credential bridge. liter-llm is a selectable model gateway, not the UAR scheduler. At creation and editing of a Boss-owned UAR agent, users select the UAR inference source and a model from that source's live, enabled catalog. The saved `uar_model_assignment` is the run authority; the generic Boss `model` remains a compatibility field but must not be represented as the effective UAR model when a distinct assignment exists. A legacy agent with no assignment may continue when its active Boss route actually satisfies the API-key credential contract; an OAuth-only or otherwise unusable route receives a configuration prompt without a silent persisted migration. An explicitly selected Boss source must be disabled for providers without an actual API-key-compatible endpoint and credential. A catalog-owned agent instead edits its UAR catalog policy, and any UAR provider selection must be checked against the session's bound UAR instance.

The gateway catalog is not a promise that upstream inference works: `/v1/models` establishes a served alias, while the final real prompt proves operation. Missing gateway credentials or unavailable service are actionable selection states. Secrets never cross renderer IPC; only presence and catalog identities do.

## Dependency and scope

No dependency upgrade, UAR code edit, database migration, or new service is required by the observed failure. The work is in The Boss's shared wizard/edit surface, model source projection/validation, runtime preflight and truthful conversation labeling, plus all locales. One completed Apple Silicon build and real inference path is the boundary gate. The ongoing 2.2.7 release is a separate frozen source and must not absorb this change mid-publication.
