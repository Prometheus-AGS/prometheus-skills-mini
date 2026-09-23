# A1 execution plan

The executable plan is openspec/changes/compass-mcp-protocol-negotiation/{proposal.md,design.md,tasks.md,specs/compass-mcp-protocol-negotiation/spec.md} in this repository. Implementation is in /private/tmp/compass-fix, branch fix/mcp-protocol-negotiation, owned by the Compass fork.

1. Verify the handoff against actual sources and reproduce the installed binary's refusal.
2. Finish all A1 code, regression coverage and compatibility documentation before one serial verification wave.
3. Verify the fresh binary against all four revisions and The Boss's installed SDK; distinguish pre-existing golden failures from regressions.
4. Review, push, open PR and merge only on green CI. No tag, publish workflow, dependency-pin edit or A2 work.

Observed correction: rmcp 3.1.4 emits SSE for both initial and subsequent legacy-session responses; the handoff incorrectly says subsequent requests honor json_response. Existing Compass middleware leaves the conversion disabled. Tests must parse both SSE responses.

Required skills are installed and read. superpowers and prometheus-rust-workspace are absent. Skill template dependency versions and test timing do not override repository pins or the operator's explicit handoff checks.
