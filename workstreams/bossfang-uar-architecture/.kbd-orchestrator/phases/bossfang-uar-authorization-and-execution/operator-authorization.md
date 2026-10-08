# Operator authorization and stage boundaries

On 2026-10-06 the user explicitly requested a new worktree FIRST, then a phase to address every issue in the architectural review. Exact instruction: "Do not skip ANYTHING. Execute the full assess -> analyze -> plan -> execute -> reflection set of stages, stopping after each one, so I can review the work and approve the handover to the next step."

Current authorization: create isolated worktree/project/phase and finish Assess. Analyze is pending explicit human handover approval. Specification, normally optional in KBD, is retained under the no-skips instruction; stop for review there too. No stage is skipped. Future approval must be recorded before entering each successor. No publishing, merging or deployment is authorized by this stage setup.

All product repositories are read-only references during assessment. Separate source worktrees are required before approved execution. No existing shipping task or delivery gate belongs to this new phase.

## Analyze handover approval

User explicitly approved: "yes, go to analyze". Analyze alone is now authorized. Stop before Spec for the next approval; no implementation is authorized.

## Spec handover approval

User explicitly approved: "Approved for handover", responding to the Spec handover question. Spec alone is now authorized. Stop before Plan for approval. The generic handover approval does not resolve the separately identified remote deployment, recovery, compatibility or ownership inputs. No product implementation is authorized.

## Plan handover approval

User explicitly approved: "Approved", responding to the Plan handover question. Plan alone is now authorized. Stop before Execute. Unanswered deployment, recovery, compatibility and ownership inputs remain unresolved. No product implementation is authorized.
