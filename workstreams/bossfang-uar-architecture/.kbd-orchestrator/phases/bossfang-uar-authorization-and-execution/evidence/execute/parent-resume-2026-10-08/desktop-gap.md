# Desktop aggregate G2 gap — 2026-10-08

Read-only source/evidence investigation for resumed parent Execute. No product edits, tests, builds, live probes, excluded UAR inspection, or canonical mutations. This note is not an independent acceptance verdict.

## Why G2-12 exited 1

The finite receipt establishes failure at `native_post_ack`, first `post_ack_positive_calibration` case, stage `registration`. The second cancellation case was unrun. In current source, `scripts/gates/bauar-secret-projection.ts` main calls `exercisePostAckCases` at lines 428–431; failure propagates before final sink assertions (435–439), event aggregate assertion (440–441), and success receipt write (443–465).

The narrower first focused run adds an AssertionError at registration `stream_assertion`: run opened but emitted one error, did not finish, and no capabilities/catalog/run/stream HTTP request was observed. Current `bauar-post-ack-cases.ts` function `exercisePostAckCases` lines 197–203 explicitly asserts registration.error is empty. The original exact error text was not retained. Therefore the exact historical root cause is **unproven**; claiming its error was definitely a missing-manifest error would exceed the evidence.

A concrete staging defect was independently observed: instrumented payload12 lacked the application-required adjacent `payload-manifest.json`. The separate research gate manifest does not replace that application manifest. Corrected development payload13 added it without changing binary bytes. Focused postack02 subsequently exited 0 with the same real helper, positive body-entry calibration 1 and cancellation body-entry 0. This supports the correction's applicability without retroactively classifying the unavailable historical error.

## Why finite predicates do not make G2-12 exit 0

`finishMcpSinkCapture` in `bauar-secret-projection-mcp.ts` lines 323–362 captured actual sink observations before later event/native scenarios. Its nine `fieldMatches` (350–359) correspond to `assertMcpSinkCapture` assertions (366–377). The finite disposition separately checked them, but the aggregate function call at projection.ts436 was never reached. G2-12 stays exit1. The two later focused cases plus source-scoped earlier cases support split local acceptance, not an aggregate process success.

The aggregate script already uses `projectedModelResultAccepted` (mcp.ts382–384), allowing canary-free generic transport errors with matching failure provenance rather than requiring replacement markers in omitted payloads. `allModelInputsRedacted:false` is diagnostic, not a remaining failing aggregate assertion. There is no evidence for changing that predicate again.

## Current source and minimum next gate

Current hashes of the aggregate script, MCP helper, postack cases helper and focused runner match their source17 records. The aggregate script is unchanged from source15; it receives gate sidecar/manifest paths from environment. The source17 postack helper adds safe bounded failure diagnostics, but does not automatically switch payload12 to payload13. Correct launch inputs remain necessary.

The failed child subgate has already been rerun successfully as `scripts/gates/bauar-post-ack-gate.ts`, focused02. Under the existing rerun-only-failed rule, **no additional child runtime rerun follows solely from old aggregate exit1**. Preserve and reconcile the source-scoped split receipts.

If the parent expressly requires a new actual aggregate EXIT0 receipt, the smallest existing executable that reaches the outstanding final aggregate block is `scripts/gates/bauar-secret-projection.ts` itself. It has no existing sink-only/resume switch; do not invent one or reconstruct missing raw capture arrays. That run necessarily repeats previously passing cases, so record the parent gate requirement and completed-delivery boundary before running. No additional functional code correction is established by this investigation.

Root would execute from `/Users/gqadonis/.claude/worktrees/bauar-boss` through the existing locked Node LTS/tsx launcher, with normal production-feature sidecar, real storage fixture, fresh isolated profile, and corrected instrumented payload13. Last successful instrumented inputs: `development-uar-gate-payload-13/uar-sidecar` and `development-uar-gate-payload-13/gate-artifact-manifest-17.json`. Revalidate current authorized source/artifact applicability and prerequisite compiler/build boundary first; this note hashed only four gate sources, not the whole product. Do not rebuild or retest unaffected passing surfaces merely to turn historical receipts green. Do not reuse a stale manifest if a current input differs.

## Evidence

All following are relative to sibling child `children/desktop-mcp-projection-acceptance/evidence/execute/` under this parent phase:

- `G2-12-command-receipt.json`: actual exit1, no success artifact.
- `G2-12-finite-failure.json`: exact failed stage/case and retained earlier observations.
- `G2-postack-01-finite-failure.json`: pretransport registration assertion; exact source error unclassified.
- `instrumented-payload-correction-01.json`: missing application manifest observed, payload13 correction, byte-identical binary, explicit historical error limitation.
- `G2-postack-02-command-receipt.json` and `G2-postack-02-bound-receipt.json`: focused actual exit0 and source binding. Generic command-receipt acceptance flag remains false; use bound case evidence, not that generic flag, for the recorded scoped verdict.
- `G2-postack-02-finite-evidence.json`: real calibration/cancellation and cleanup, ordinaryCasesRepeated0.
- `G2-postack-02-prelaunch-binding.json`: successful corrected manifest path/source and artifact binding.
- `G2-12-finite-predicate-disposition.json`: separately asserted existing finite predicates; runtimeCasesRepeated0.
- `source17-focused-postack-rebinding.json`: two gate-only source differences; ordinary binaries emitted source12 and instrumented source13, no fresh whole-source17 build claim.
- `acceptance-disposition.json`: approved A1–A6 local development scope and nonclaims.

Limits retained: no remote JWT/D0, Windows, installed/package, parent-release certification; body count covers search_tools only; cancellation dropped the held stream rather than proving the later guard ran. Raw/private logs were not opened. No excluded UAR file was read/searched/hashed.

Tooling note: first attempt to write this note through an inline Node string failed parsing before execution; the note was then written with apply_patch. No product verification was involved.
