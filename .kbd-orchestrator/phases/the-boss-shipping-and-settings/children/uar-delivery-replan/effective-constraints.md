# Effective constraints for UAR delivery replanning

The operator's 2026-09-23 request overrides historical testing instructions for this effort: “testing can be deferred to full integration testing of phases [that] represent pieces of demonstrable functionality where we build and test while you keep building in succeeding phases.” They also explicitly require “No code in this phase.” Prior instructions reject unit-test/review loops.

Therefore: this child performs document/source inspection, OpenSpec validation, and the expressly requested independent plan review only. It does not run npm test, repository-wide rule regeneration checks, Cargo, or application builds. Later execution uses actual packaging and complete phase integration gates. The old mini constraints.md tests-pass/build-passes/workflow triggers do not override this operator instruction; unchanged generated-rule files are not a reason to build/regenerate. Validate this new OpenSpec change alone.

Other applicable constraints remain: no secrets, no destructive state changes, preserve WIP, native Windows compatibility, explicit ownership, truthful evidence, no edits to dependency pins, no runtime code now. Mini's two-service rule continues to prohibit new pack-managed daemons; the approved Boss-owned sidecar is an application subprocess, not an additional mini Docker service.

This scoped override records the operator's existing authorization; it neither changes global project rules nor grants implementation approval.
