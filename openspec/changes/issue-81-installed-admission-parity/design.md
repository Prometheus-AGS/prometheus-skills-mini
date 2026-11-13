# Design

## Context and decision
The existing runner exercises a vendored corpus through the real CLI and Node helpers in isolated canonical projects. Reuse its adapter and fixture ownership. Associate this change with phase issue-81-admission-parity; do not hand-edit canonical projections.

## Interfaces
KBD_CONFORMANCE_INSTALLED_ROOT adds one selected-installed package to the existing three surfaces. KBD_CONFORMANCE_CASE_IDS is a comma-separated list of exact corpus IDs; unknown/empty selections fail rather than producing vacuous receipts. Explicit installed requests require a runnable typed-closure CLI and all existing helper entry points. KBD_CONFORMANCE_RECEIPTS continues to choose the receipt destination.

## Identity and evidence
Record source commit plus dirty-state limitation, corpus pin, executable path/version/hash, payload file hashes and actual Claude registration. Add assertion-step canonical disposition snapshots to receipts and compare normalized case steps across surfaces. Preserve the existing receipt files in place; use a new run subdirectory. Installation uses Claude's supported marketplace CLI with a disposable child-process home/config and no credentials or model invocation. Qualification calls installed Node helpers from unrelated scratch consumer projects, not harness hooks.

## Verification and closure
After all tooling and generated payloads are ready, run cases 18–23 once across source/generated Claude/generated Codex/installed Claude; require refusal without CLOSED, valid close once, idempotent retry/replay, no successor and identical canonical dispositions. Run distribution consistency and independent review at this boundary. Fix and rerun only failures. Publish an acceptance mapping and close #81 only on success; retain Windows/Linux as unverified. No second corpus/ledger or broader #62/#69 completion.
