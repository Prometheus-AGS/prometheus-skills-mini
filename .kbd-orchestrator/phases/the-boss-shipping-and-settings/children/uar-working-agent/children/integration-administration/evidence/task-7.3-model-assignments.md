# Task 7.3 — model assignments

Completed the active UAR model-assignment production path at these source commits:

- The Boss `1a22138047135c78c370b62bbfe09df28ce81968`
- Universal Agent Runtime `28fb96cbb73a313b9a79225cd91c787b45641f52`

The Boss now stores an optional per-agent UAR assignment with three explicit sources. A missing assignment preserves the active Boss model. Boss-linked models and liter-llm gateway aliases receive one request-scoped credential; UAR-owned provider/model routes send no host credential and use UAR's encrypted credential resolver. The catalog policy remains authoritative: a catalog edit that changes the selected route is not overwritten at run admission.

The main-process model-source projection reports the connected instance, friendly names, effective provider/model identities, operational state and credential-presence flags for The Boss, the selected gateway and UAR. It also reports actual sidecar consumer capability states: agent inference is configurable across all three sources; knowledge embeddings and intent classification are local; vision has no separate consumer; Mistral OCR and in-process memory are disabled in The Boss's sidecar profile. No secret value crosses IPC.

UAR now refuses an unavailable catalog provider/model when no request-scoped credential is present. It emits `provider_model_unavailable` rather than silently running the global model. Request-scoped Boss/gateway routes retain their existing later credential binding.

Boundary verification at these commits:

- `pnpm typecheck:node` — passed.
- `pnpm typecheck:web` — passed.
- targeted `oxlint --deny-warnings` over the changed Boss contracts — passed.
- `cargo check --bin uar-sidecar` — passed.
- `git diff --check` in both repositories — passed.

No unit suite or per-edit test loop ran. Gate U remains deferred until task 7.4 completes schema-driven controls and the UI, then task 7.5 exercises the integrated production paths once.

Security boundaries exercised in the implementation: provider credentials remain in Electron protected storage or UAR's encrypted credential store; request-scoped credentials are included only in the run request and redaction set; ordinary preferences, catalog metadata and renderer IPC receive identities and presence flags only.
