# Bossfang baseline analysis

Recommend **local intake based explicitly on bac04cb6b2c144520e28234ad77f00d4cf0f5b23**, retaining the selected 72-file working-tree delta separately. Preserve the older main checkout. This is the smallest supported strategy for additional implementation work; it is not the smallest history difference against main and does not approve a release reference.

The accepted baseline already contains contracts that the completed phase extends. Backporting to main16beef0 would require identifying and adapting those prerequisites. The bounded inspection establishes concrete missing prerequisites, but not their smallest complete transitive closure. It therefore cannot honestly label a backport simpler or mergeable.

## Observed boundary

The [intake inventory](../intake-comparison.json) binds source HEAD bac04cb6 and candidate main16beef0fcf3053970a901990df4fedbdf86bd87d. The candidate has zero unique commits and trails the source baseline by 279 commits. All 72 phase paths are uncommitted and unstaged in the source; 30 are phase additions. Merging source HEAD alone would omit all 72 phase deltas.

Of those paths, 33 target contents match the accepted baseline, including matching absence for additions. The other 39 are reconciliation candidates: 18 pre-phase baseline files are absent at target, and 21 present files differ. No compared target path had local changes at intake. These are hash observations, not demonstrated text-merge conflicts or current whole-checkout cleanliness.

## Narrow contract evidence

| Contract | Observed prerequisite | Consequence for an old-main backport |
| --- | --- | --- |
| Full-run client and shared types | Baseline drivers/uar_run/mod.rs explicitly distinguishes UAR full-harness control from an LlmDriver and declares binding, diagnostic, retained, wire and observation modules. Baseline types/uar_run.rs defines the correlated run projection. Both entry files are absent at target. | The phase's selected kernel harness depends on a pre-existing client/type subsystem, not just its new selection and approval modules. |
| Authenticated API and control | Baseline routes/uar_delegation.rs already mounts admit, lookup, observe, approve, cancel, detach and steer. It uses authenticated API users, stored projections and separate error/storage helpers. Current job mapping passes the existing AppState control into selected dispatch. | Recreating only the phase route edits would omit established control and ownership context. Helper existence outside the original inventory was not inferred from imports alone. |
| Durable product correlation | The explicit target-to-base a2a.rs diff adds a projection map/table, loading/upsert, atomic task-plus-projection admission and lookup. | These are pre-phase persistence changes on which the new attempt/observation work builds. Persistence cannot be reduced to copying new selected-attempt files. |
| Queue contract | The target-to-base task-queue implementation changes task_post to accept TaskQueueCaps, preserves quota errors and adds pagination; the memory facade exports TaskQueueCaps. | Whole-file transplantation would bring baseline queue behavior along with phase edits. A narrower adaptation would need deliberate API reconciliation. |
| Channel observations | Baseline channel_actions.rs defines durable causal actions, observer delivery and authority/routing references. The API baseline exports channel_authority/channel_observers absent from the older API facade; several associated baseline files are absent at target. | Channel cancellation/observation changes rely on baseline routing and storage. They should not be described as independent leaf-file additions. |

The selected kernel contract directly retains one UAR-owned loop: SelectedUarJob holds the application-owned UarRunControl; delegated results remain separate from native completion streams. Required durable restart recovery and steer have explicit unsupported errors. Integration must preserve these constraints, exact approval identities, application-owned resource credentials and unknown outcomes. This analysis proposes no new capability.

## Strategy comparison

**Accepted-baseline local candidate — recommended.** Use the established bac04 baseline with the explicit phase delta and existing bindings. This preserves the substrate against which implementation and retained scoped acceptance were produced. It avoids inventing a new backport or modifying the older main checkout. The 279-commit ancestry difference must be visible in the baseline decision; those commits are not relabeled phase-authored, independently reviewed or release-certified.

**Scoped backport to16beef0 — possible, not presently bounded.** This would require a concrete prerequisite closure for client/types, API/control, correlation storage, channel observations and queue interfaces, followed by deliberate adaptation of the 72-path delta. The current 39-file divergence list is a starting inventory, not the complete dependency set. No commit subset, patch application or resulting build has been demonstrated. Selecting this strategy would introduce additional integration work beyond the already completed implementation.

**Whole-branch merge into old main — not the minimal implicit transfer.** It would import the 279 baseline commits and still require capture of the uncommitted phase delta. No requirement currently authorizes silently treating that history as a phase-only merge. Choosing an explicit local candidate baseline keeps that decision separate from eventual promotion into a release branch.

## Minimum inputs and remaining decisions

The supported local candidate needs the exact bac04 object, all 72 bound working-tree changes or their accepted-base cumulative patch, the prior source binding, and the cross-repository contracts. Keep the current-pair and H28 receipts at their original boundaries. A later approved Plan should record the candidate location, ownership and baseline before any transfer or commit; this analysis creates none of them.

This recommendation resolves which option is supported by current evidence. It does not establish acceptance of every inherited commit, whole-repository dependency compatibility, text-merge success or a release artifact. If the release owner requires the older main baseline, the prerequisite-closure work becomes concrete scope at that point rather than a hypothetical blocker now.

## Evidence and limits

[Structured analysis](bossfang-baseline-analysis.json) records the facts, inference chain, exact 39 paths, hashes and alternative dispositions. Inspection was limited to selected Bossfang contracts and explicit target-to-base diffs. An optional exact sibling/module metadata probe returned no output before interruption and contributes no findings.

No product file, source ref or target checkout changed. No merge, commit, build, test, dependency operation or service ran. No UAR excluded file was inspected. F6 remains cancelled; broad tests, cumulative review and formatting debt retain their operator-deferred dispositions. Current candidate build health remains UNKNOWN.
