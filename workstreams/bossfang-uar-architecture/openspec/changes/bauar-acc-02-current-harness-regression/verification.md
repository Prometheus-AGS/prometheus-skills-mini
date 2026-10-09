# Verification requirements — bauar-acc-02-current-harness-regression

All entries below are specifications, not executed evidence. Stable canonical phase: `phase-bauar-release-acceptance`; IDs retain backend task identities. Every behavior carries the complete acceptance template. Relative scenario evidence names resolve under `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/`.

The proposed exact integration gate is:

```text
/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/local-release-acceptance.mjs" --config "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/candidate-inputs.json" --stage integration
```

The proposed exact final aggregation gate, after component adjudication and completed-product review, is:

```text
/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/local-release-acceptance.mjs" --config "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/candidate-inputs.json" --stage finalize
```

Both commands use cwd `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture`. These commands/files do not yet exist. Plan must pin executable locations and immutable config without changing dependency versions. Child environment comes from that schema-bound config: fixture-only secrets, private HOME/CODEX_HOME/XDG/TMP, no inherited external UAR override or ambient keys. Integration runs only after all parent production and packaging are complete and scenario source readiness is recorded; finalize rereads matching receipts and runs no tests. Exit0 means all mandatory results for that selected stage observed; exit1 observed failure; exit2 unavailable/incomplete inputs/evidence/isolation/review. Historical evidence never silently supplies a newly changed behavior.

No test authoring/execution or product review before the coherent production barrier. Missing prerequisites are BLOCKED, not skips. Only owned children are stopped; retain sources, candidates, caches, rollback inputs and failed evidence. No shared service or live-profile mutation. F6 files are excluded from reads/search/hash/diff/test; no wildcard repository traversal. Wider platforms/signing/installation/remote/publication remain out of scope for selected local acceptance.
## Behavior H01: Selected Bossfang delegation and native compatibility

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-02-current-harness-regression / 1.1,1.2,2.1; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Bossfang 1d518936cb15b79d30bdd315510ff925613a0f4d; UAR 84ca0ffff5da8fafc1e2e7f5585efc07a396b14e. Exact completed tree/host/bundle/profile digests required. |
| Production entry point | Existing bauar-harness-gate.mjs argv apiHostTestBin kernelTestBin bundledUarBin uarSource; real API/kernel admission hosts |
| Real collaborators | Actual Bossfang API/kernel, embedded Surreal attempt storage, real bundled UAR launched standalone, controlled model/MCP peer |
| Boundary exercised | Job→attempt→harness admission and model/tool/approval/continuation ownership; actual receiver effect |
| Observable result | Normal/streamed identified manual attempt has one owning UAR loop and one selected effect; input/history/policy are mapped; model provider remains response-only; native compatibility retained |
| Negative control | Unsupported required semantics/durable recovery/ephemeral selection rejected before UAR admission, no completion-driver fallback; denied approval has zero target effects |
| Isolation | Existing privateEnv child home/XDG/TMP plus private CODEX_HOME/queue/plugin roots where relevant; embedded Surreal under unique harness root; real peer/fault-proxy loopback port0; owned process IDs and bounded cleanup; no shared services or pruning. |
| Prerequisites | Completed parent production, source-matching API/kernel binaries and bundled UAR; Node24.11.1; supporting cargo toolchain/CARGO_BIN_EXE binaries compiled once at final boundary when necessary, declared isolated target dir. |
| Final local gate | Exact integration command above; argv --config candidate-inputs.json --stage integration; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/h01.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Bundled binary as standalone peer is harness evidence, not packaged desktop startup. No automatic cron/deferred UAR job selection or production remote certification. |

## Behavior H02: Uncertain submission, reconnect, cancellation and restart

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-02-current-harness-regression / 1.1,1.2,2.1; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Bossfang 1d518936cb15b79d30bdd315510ff925613a0f4d; UAR 84ca0ffff5da8fafc1e2e7f5585efc07a396b14e. Exact completed tree/host/bundle/profile digests required. |
| Production entry point | Same real harness gate through actual API submission/observation/cancel endpoints and fault proxy |
| Real collaborators | Actual persisted attempt/admission/cursor state, UAR, receiver and network fault proxy |
| Boundary exercised | Lost admission acknowledgment, partial terminal stream/persistence, same-run reconnect, cancellation races and epoch restart |
| Observable result | Original admission/task/run/epoch preserved; reconnect observation creates no new run/effect; cancellation records actual/unknown outcome; new epoch reports unsupported/unknown requiring reconciliation |
| Negative control | Changed exact-retry payload conflicts; lost ack/intent/capture failures, retention gap and crash/restart do not fresh-admit/replay an effect; no outcome inferred from observer disconnect |
| Isolation | Existing privateEnv child home/XDG/TMP plus private CODEX_HOME/queue/plugin roots where relevant; embedded Surreal under unique harness root; real peer/fault-proxy loopback port0; owned process IDs and bounded cleanup; no shared services or pruning. |
| Prerequisites | Completed parent production, source-matching API/kernel binaries and bundled UAR; Node24.11.1; supporting cargo toolchain/CARGO_BIN_EXE binaries compiled once at final boundary when necessary, declared isolated target dir. |
| Final local gate | Exact integration command above; argv --config candidate-inputs.json --stage integration; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/h02.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Process-ephemeral capability only; no durable recovery/rollback or external exactly-once guarantee. Relevant planned architecture remains intent until actual trace/effect observed. |

## Behavior H03: Configured identity and immutable resource grant regression

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-02-current-harness-regression / 1.2,2.1; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Bossfang 1d518936cb15b79d30bdd315510ff925613a0f4d; UAR 84ca0ffff5da8fafc1e2e7f5585efc07a396b14e. Exact completed tree/host/bundle/profile digests required. |
| Production entry point | Finite existing cargo integration targets bauar_identity_boundary and bauar_resource_grants; actual generated sidecar and protected HTTP endpoints |
| Real collaborators | Actual UAR auth/key/workspace/run/grant paths, synthetic signed issuer/JWKS peer and independently authenticated configured resource receiver |
| Boundary exercised | HTTP auth/admission, issuer/audience/expiry and verified tenant/owner; registered resource, run/action/lease/revision credential snapshots |
| Observable result | Valid configured authority admits a permitted effect; authorized ownership preserved in key paths; renewal/new-run snapshots do not replace old active-run authority |
| Negative control | Wrong/missing audience/issuer/expiry, invalid signature/algorithm and bounded JWKS age; cross-tenant/owner/key authority; wrong destination/run, insufficient action scope, expired/revoked lease deny with no unauthorized effect |
| Isolation | Existing privateEnv child home/XDG/TMP plus private CODEX_HOME/queue/plugin roots where relevant; embedded Surreal under unique harness root; real peer/fault-proxy loopback port0; owned process IDs and bounded cleanup; no shared services or pruning. |
| Prerequisites | Completed parent production, source-matching API/kernel binaries and bundled UAR; Node24.11.1; supporting cargo toolchain/CARGO_BIN_EXE binaries compiled once at final boundary when necessary, declared isolated target dir. |
| Final local gate | Exact integration command above; argv --config candidate-inputs.json --stage integration; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/h03.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Supporting server-full,test-probes binary differs from production bundle; require actual nonzero tests. Synthetic configured admission/receiver evidence only; no original user JWT forwarding contract, named external IdP/custody or F6 check. |

## Behavior H04: Stdio environment, secret projections and stream cursor

| Field | Required declaration |
| --- | --- |
| Canonical identity | phase-bauar-release-acceptance / bauar-acc-02-current-harness-regression / 1.2,2.1; execution owner 03/2.1 for integration, 03/2.3 for finalize |
| Source identity | Bossfang 1d518936cb15b79d30bdd315510ff925613a0f4d; UAR 84ca0ffff5da8fafc1e2e7f5585efc07a396b14e. Exact completed tree/host/bundle/profile digests required. |
| Production entry point | Finite existing cargo targets bauar_stdio_boundary, bauar_secret_projection and bauar_full_harness_cursor |
| Real collaborators | Actual UAR managers/provider/MCP copies, spawned configured stdio fixture, real HTTP/SSE cursor path and private persistence |
| Boundary exercised | Process captured environment/termination, ordinary/model projection and execution-scoped SSE cursors |
| Observable result | Declared stdio credentials only; captured revision/child ownership maintained; canaries absent from projections; filtered reconnect preserves cursor and exposes retention gap |
| Negative control | Ambient undeclared provider credential/raw child stderr cannot leak; unavailable required sandbox rejected; cancellation/shutdown recorded; deliberate credential echo redacted and no fabricated cursor/replay |
| Isolation | Existing privateEnv child home/XDG/TMP plus private CODEX_HOME/queue/plugin roots where relevant; embedded Surreal under unique harness root; real peer/fault-proxy loopback port0; owned process IDs and bounded cleanup; no shared services or pruning. |
| Prerequisites | Completed parent production, source-matching API/kernel binaries and bundled UAR; Node24.11.1; supporting cargo toolchain/CARGO_BIN_EXE binaries compiled once at final boundary when necessary, declared isolated target dir. |
| Final local gate | Exact integration command above; argv --config candidate-inputs.json --stage integration; cwd/workstream and environment as declared above |
| Evidence | Pending: evidence/execute/h04.receipt.json, sanitized bounded observations, input/package/profile digests, actual exit and cleanup outcome; no placeholder or fabricated result |
| Limitations | Supporting tests include real subprocess/network boundaries but cannot certify OS tenant sandbox or remote production credential store; no ambient privileged secrets in fixture environment. |
