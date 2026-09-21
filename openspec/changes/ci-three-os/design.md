## Context

Nothing in this repository has been observed on Windows or on an LTS Node: the host is macOS on Node 26. The assess handoff required CI to land before any Windows-specific code so that such code is observed as it lands. This change therefore depends only on `project-scaffold`. Candidate: cand-010.

## Goals / Non-Goals

**Goals**
- The only source of Windows evidence and of Node 22/24 evidence.
- Exercise the shell-free OpenSpec invocation on Windows from day one.

**Non-Goals**
- Release, publish, deploy, or coverage gating.
- Creating or pushing to a remote — owner prerequisite P2; the agent never pushes.
- Linting the workflow with a tool that is not installed.

## Decisions

- **Invoke OpenSpec as `node node_modules/@fission-ai/openspec/bin/openspec.js`** — `scripts/spec-validate.mjs` does not exist until `platform-spawn`, which then switches this one step to it. *Alternative considered:* `npx openspec` — rejected, `npx` is `npx.cmd` on Windows.
- **Set `core.autocrlf true` via a step before `actions/checkout`** — `actions/checkout` honours the global git config; this tests `.gitattributes` against the hostile default.
- **`fail-fast: false`** — the point of the matrix is to see every platform's result.
- **Pin actions to a major version tag** — readable and conventional; SHA pinning is a hardening step for a later change.

## Risks / Trade-offs

- The workflow cannot be shown to pass until the owner adds a remote (P2). Until then this change is written but unverified, and that is stated rather than hidden.
- GitHub-hosted runner images change; a failure may come from the image, not the code.
- Six jobs per push cost minutes; acceptable for a repository this size.
