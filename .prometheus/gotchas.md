---
type: Gotcha Log
title: Gotchas
description: Learned constraints about this repo's tools and services; grep for a subsystem before the first edit in it.
tags: [gotchas, surreal-memory, kbd, adversarial-review]
generated: { by: claude-code/claude-fable-5-1, at: "2026-09-21T03:40:00Z" }
status: stable
sources:
  - id: pm-mirror
    resource: /postmortems/2026-09-20-surreal-memory-mirror-write-failed.md
    title: Postmortem — mirror write failed while surreal-memory reported healthy
  - id: assess-review
    resource: ../.kbd-orchestrator/phases/platform-foundation/review/assess/findings.json
    title: Adversarial review findings, assess stage
---

# Gotchas

Append-only and dated. Grep this for a subsystem before the first edit in it. Mark entries superseded; never
delete them.

## surreal-memory

- **2026-09-20 · `/health` 200 does not mean writes work.** Entity writes go through the MLX embedding
  executor and normally take 1.7–5.4 s; after any restart, 12 s+. The installed `kbd-memory-log` mirror
  aborts at 3 s, and an aborted request makes the server restart its executor (reproduced). Never abort an
  in-flight write; hand it to the outbox instead. Full evidence:
  `postmortems/2026-09-20-surreal-memory-mirror-write-failed.md`.
- **2026-09-20 · Startup takes 23 s to several minutes** before the REST API listens. A client that connects
  in that window times out; this is what an MCP "connection timed out" at session start usually is.
- **2026-09-20 · Another agent session may be reinstalling the launch agents.** Check
  `log show --predicate 'process == "launchd" AND eventMessage CONTAINS "surreal"'` for `removing service`
  and the `initiated by` chain before concluding that a service crashed.

## kbd (installed bash originals)

- **2026-09-20 · `kbd-memory-log` names entities from `.project // .projectId` in `project.json`,** keys the
  `kbd-init` template never writes. Without `projectId`, every lifecycle event is filed under `unknown/`.
  `projectId` was added to this repo's `project.json` by hand.

## adversarial-review (installed)

- **2026-09-21 · Artifact-mode packets carry a file tree built with `find -maxdepth 2`.** The judge cannot see
  anything deeper, and reports files it cannot see as nonexistent — a false CRITICAL. Everything under
  `lib/<capability>/` will sit at depth 3. Check a "file does not exist" finding against the disk before
  revising the artifact. First seen: `phases/platform-foundation/review/assess/findings.json`.
- **2026-09-21 · The anti-theater gate silently skips:** `check-findings-sycophancy.sh` prints
  "sycophancy.sh lib not found — gate skipped" and exits 0. The judge's report is not being screened.
- **2026-09-21 · `prometheus kbd status --json` is not read-only.** It creates `.prometheus/project.json` (a runtime
  `projectId` + repository fingerprint). Harmless and not an OKF concept file, but it means two files named
  `project.json` exist; always write the full path `.kbd-orchestrator/project.json`.

## hooks and packaging

- **2026-09-21 · A `hooks.json` that names a file the payload does not contain breaks EVERY hook, silently to
  our code.** Observed in the source pack: all 31 hook entries ran
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/hook-entry.mjs`, the distribution generator copied two other scripts by
  a hand-kept list, and `hook-entry.mjs` was never packaged — every Stop printed `Cannot find module`. The
  failure is in Node's loader, so nothing inside a hook can catch it. Prevention is at packaging time only:
  derive the file list from `hooks.json` and test that each path resolves in the built payload. Fixed upstream
  on branch `fix/package-hook-entry`. This repo's installer copies instead of symlinking, which makes the
  same drift easier — see the rule in `.claude/rules/node-scripts.md`.
- **2026-09-21 · Replaying a real hook is not side-effect free.** Running the pack's `stop-karpathy-learning`
  hook by hand wrote a session record into the wiki of whatever directory was cwd, and its learning worker
  left a stale `index.lock` behind. Replay hooks in a throwaway directory, never in a working tree.
- **2026-09-21 · `build-review-packet.sh --target spec` cannot see OpenSpec changes.** It looks only for
  `.kbd-orchestrator/changes/<id>/{spec.md,tasks.json,verification.md}` (the native-kbd layout) and exits 2
  with "no artifacts found" under the `openspec` backend — this project's default. Workaround used here:
  assemble the packet in the same schema from `openspec/changes/<id>/{specs/**,design.md,tasks.md}` and pass it
  to `dispatch-judge.sh --packet`. The Node port of adversarial-review must support both layouts.
- **2026-09-21 · A diff-mode review packet scoped to one change reports earlier changes' files as missing.**
  Twice in this phase a judge returned a false CRITICAL — "the lockfile was never committed", then "npm ci
  will fail, there is no manifest" — because the diff covered only the change under review, so files added by
  an earlier archived change were invisible. Both were disproved against the repository (`git cat-file -e
  HEAD:<path>`, and a clean `git clone` of HEAD running the full command sequence). Fix for the Node port:
  a diff packet must carry a manifest of the files the change DEPENDS ON but does not touch — at minimum
  `git ls-tree HEAD` for the paths named in its spec — or judges will keep inventing missing-file findings.
- **2026-09-21 · A test fixture copied from a real OpenSpec change breaks when that change is archived.**
  `rules/test/spec-validate.test.mjs` copied `openspec/changes/windows-evidence` to build an invalid
  change; archiving it moved the directory and the test failed with ENOENT. CI had been green because it
  ran before the archive. Build fixtures from literals, never from repository state that a later stage
  moves. The same trap applies to any test that reads `openspec/changes/*` or `phases/*` by name.
- **2026-09-21 · `kbd-validate-progress.sh --mark-implementation-complete` rewrites `progress.json` and
  drops the per-stage flags.** `assessment_complete` and `plan_complete`, set by the assess and plan
  stages, are absent after any change is marked implementation-complete; only the `completion` block and
  the `changes` array survive. Do not read those flags to decide whether a stage ran — read
  `handoffs/<stage>.handoff.json`, which is what the stage gate itself uses. The canonical phase status
  lives in the runtime (`prometheus kbd status --json` → `phases.<id>.status`), not in `progress.json`.
