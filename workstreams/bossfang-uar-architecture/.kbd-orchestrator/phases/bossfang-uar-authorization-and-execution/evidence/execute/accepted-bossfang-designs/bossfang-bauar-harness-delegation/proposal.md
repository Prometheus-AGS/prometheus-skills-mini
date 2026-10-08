# Proposal

## Why

Bossfang's existing C05 full-harness client already owns admission, observation and control, but BAUAR requires job-attempt scheduling and strict approval semantics beyond that historical delivery. The original plan inspected an older main checkout and would duplicate the existing consumer unless the child adopts its accepted source checkpoint.

## What Changes

- Reuse C05 `UarRunControl`, `UarDelegatedRunProjection`, `A2aTaskStore`, and unified A2A views from source checkpoint `bac04cb6b2c144520e28234ad77f00d4cf0f5b23`.
- Add explicit job/attempt harness selection and context mapping before supported kernel native loops; preserve native-provider behavior.
- Persist versioned attempt correlation and atomic cursor/event/outcome projection, then guard retry, status reset and wake paths against uncertain resubmission.
- **BREAKING**: migrate owned approval callers together to caller-observed exact decision identity/revision; no automatic revision refresh or legacy anonymous fallback.
- Keep first-release restart outcomes unsupported/unknown with reconciliation, as explicitly selected by the operator. No durable UAR recovery or new remote receiver/custody integration.

## Capabilities

### New Capabilities

- `job-harness-delegation`: Local execution-child refinement of the coordinating parent capability, using existing product C05 authorities.

### Modified Capabilities

None in this isolated nested spec root. Existing product-root `bossfang-full-run-delegation` remains authoritative; the refinement does not reopen its completed historical gate.

## Impact

Kernel dispatch/scheduling, existing UAR client/API, shared projection types and existing persistence. No dependency or service additions, no CLI/branding/UI redesign. Proposed exact files, serial ownership and technical acceptance prerequisites are in design.md. The nested planning root is not a blanket product write grant: driver execution binding must explicitly include the product root before apply.
