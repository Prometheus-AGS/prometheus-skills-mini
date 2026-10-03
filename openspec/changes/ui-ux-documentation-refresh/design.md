## Context

See proposal.md. The implementation PRs are merged: full pack #102, mini #3 and The Boss #4. Each documentation branch starts at current main in the existing isolated checkout. Full and mini own Docusaurus sources; The Boss owns Markdown reference/contributor docs and a generated index.

## Goals / Non-Goals

**Goals:** Readers can discover the new workflow from each README, follow source-accurate instructions and distinguish bundled functionality from deferred ports and execution gaps. The Boss uses its existing official logo and name.

**Non-Goals:** No runtime or skill behavior changes, dependency or submodule upgrades, new website platform, redeployment, blanket upstream/API renaming, or renewed platform certification.

## Decisions

- One production documentation owner per repository, with disjoint paths; root owns this plan, final validation, commits and PR publication. This follows the repository team policy and preserves independent authoring without shared-file edits.
- Hand-author narrative at existing documentation sources and run the existing index/catalog generators. Do not edit generated copies directly.
- Treat runtime source and pinned catalog as factual authority. Describe 41 full UI catalog entries / 40 portable entries separately from total distributed skill counts. Avoid global claims based on older foundation tests.
- Keep project design authority, role permissions and user-only skill restrictions explicit. The phase-boundary helper reports an evidence contract; it does not perform captures or independently certify review.
- The Boss logo must be an inspected, tracked product asset, referenced locally. Replace upstream product marketing and links with verified The Boss destinations; retain legal attribution and existing technical identifiers.
- Finish every production documentation edit before local site builds and documentation checks. Validate through the actual documentation production pipeline, then do one independent whole-change review and bounded corrections if needed. Do not poll or cite hosted test workflows.

## Risks / Trade-offs

- Generated catalog pages can expose pre-existing MDX or link defects → use existing generators and fix only defects that block the requested documentation output; disclose unrelated limitations.
- Docs may imply release availability → say merged source/build integration unless published binary evidence specifically establishes availability.
- Upstream branding appears in API names and legal notices → limit renaming to product-facing prose and preserve provenance.
- Separate repositories drift → use the same workflow/compatibility distinctions and cross-link the companion guides and PRs.

## Migration Plan

Create one new documentation PR per repository against main after local validation. No deployment is performed. Each documentation commit can be reverted independently.
