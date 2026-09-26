# Unified tool approval authority

## Goal

Define a single, enforceable human-in-the-loop approval architecture for UAR runs hosted by The Boss. The architecture must preserve the effective UAR run policy, allow The Boss to impose stricter local restrictions, bind approval to the exact tool call and arguments executed by the host MCP bridge, and survive stream detach/replay, cancellation, child runs and sidecar restarts without duplicate execution or silent approval.

## Assessment questions

1. Which component owns policy resolution, approval prompting, decision recording and execution admission?
2. How are UAR `deny`, `ask` and `auto` combined with stricter Boss permission modes and built-in tool rules without either layer weakening the other?
3. What stable identifiers and lifecycle states bind an approval decision to one run, one call, one argument digest and one execution attempt?
4. How do AG-UI/SSE replay, renderer detach/reattach, cancellation, descendants and sidecar generation changes affect a pending decision?
5. Which current code paths duplicate authority or permit time-of-check/time-of-use drift?
6. What production integration boundary proves the complete contract without unit-test loops?

## Constraints

- Assessment and research only in this child until its reviewed plan is approved; no production code changes.
- UAR remains the source of the effective run policy and owns the run state machine.
- The Boss remains the user interaction host and the authority over application-owned capabilities.
- A downstream layer may tighten an upstream decision but may never weaken an explicit denial or required approval.
- No tool reaches an application-owned MCP server unless the exact call identity was admitted.
- Decisions and secrets remain main-process scoped; renderer messages carry opaque identifiers only.
- Preserve upstream-friendly seams in both repositories and the existing Agent/AG-UI contracts where they are sound.

## Exit from assessment

Produce an evidence-backed `assessment.md` with the reproduced failure, current authority/data-flow map, external architecture research, rejected alternatives, security invariants, concrete gaps, and questions the analyze/plan stages must resolve.
