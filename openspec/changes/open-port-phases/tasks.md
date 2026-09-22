## 1. Create and seed

- [ ] 1.1 `prometheus kbd phase create --id adversarial-review-node --title "Port adversarial-review to Node" --command-id new-phase:adversarial-review-node`; same for `deep-research-node`. Do not activate.
- [ ] 1.2 Write both `goals.md` (from Q6a/Q6b, the process goals carried forward, the dependency order) and `progress.json` (the `kbd-new-phase` shape); copy the evidence excerpts into each `prior-context.md`.
- [ ] 1.3 Verify with `prometheus kbd status --json`: both present, both `pending`, active path unchanged; `git diff --quiet -- .kbd-orchestrator/project.json` exits 0; paste the output.

## 2. Close

- [ ] 2.1 Commit; `.prometheus/decisions.md`: the phases exist and are ordered; note the gotcha check (canonical vs files) was run.
