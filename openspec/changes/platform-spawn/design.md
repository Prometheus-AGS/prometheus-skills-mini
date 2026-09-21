## Context

The original goal — "spawn with `shell:false` and Windows `.cmd` shim resolution" — is infeasible: Node documents that `.bat`/`.cmd` files cannot be launched without a shell. The owner accepted the revision on 2026-09-21. Separately, on the development machine the global `openspec` belongs to a different Node than the one on `PATH`, so a global lookup fails even on macOS. Candidates: cand-006 (adopt), cand-009 (adopt), cand-007 (reference), cand-008 (rejected).

## Goals / Non-Goals

**Goals**
- Start the OpenSpec CLI identically on all three operating systems with no shell and no quoting.
- Make the dangerous path impossible rather than merely discouraged.

**Non-Goals**
- Running any tool that exists only as `.cmd`/`.bat`. None is needed; if one appears it gets its own proposal.
- A general process-management layer: timeouts, streaming, cancellation.
- Editing `.kbd-orchestrator/project.json` or `constraints.md`; the owner re-runs `/kbd-init --force`.

## Decisions

- **Resolve the bin from the package's own `package.json`** — it is the package's declared contract and survives npm layout changes. *Alternative considered:* parsing the generated `.cmd` shim — rejected, it is npm's private format.
- **Resolve the package with `createRequire(<project root>/package.json).resolve("<pkg>/package.json")`** — standard Node resolution from the project, independent of cwd. *Alternative considered:* `npm root -g` — observed to fail here across Node managers.
- **Exactly two functions, no escape hatch** — a third "run anything through cmd.exe" function would be the first thing reached for and is where argument-escaping vulnerabilities live. *Alternative considered:* `cross-spawn` — it solves `.cmd` by going through `cmd.exe /d /s /c`.
- **`scripts/spec-validate.mjs` as the first consumer** — gives the module a real call graph in this phase (A-9) and removes the raw `node_modules/...` path from CI.

## Risks / Trade-offs

- Some packages restrict `package.json` through `exports`; if OpenSpec does, resolution falls back to locating the package directory from its main entry. To be discovered in the RED step, not assumed.
- A future OpenSpec that ships a native binary instead of a JS bin would break `spawnNodeCli` for it; the exact version pin contains that.
