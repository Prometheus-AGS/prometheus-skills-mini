# Task 3.5 — Gate B receipt

Gate B passed on 2026-09-25 through the real Electron IPC and settings UI, real
Compass subprocesses, Docker Compose, an external SurrealDB 3.2.4 instance,
and the application-owned surreal-memory and liter-llm containers.

## Source checkpoint

- The Boss: `6ed2c45029ab5e544f3f48646beacce310c14008`
- prometheus-skills-mini payload: `b2e28ae4ef730681529d625670fdda0935f649c7`
- UAR sidecar used by the macOS gate: the pinned darwin-arm64 executable at
  `resources/binaries/darwin-arm64/uar-sidecar`

The Electron production bundle was rebuilt after the production Compass path
and workspace-identity fixes. The mini runtime payload was regenerated after
the full Docker log retrieval fix. No unit or mock-only suite was run.

## Command boundary

`pnpm test:e2e:gate-b` ran with the disposable external SurrealDB endpoint and
credentials supplied through environment variables. Secret values are omitted
from this receipt and from the generated evidence.

## Observed result

- Intentional bad SurrealDB authentication failed and exposed a persistent
  recovery action without disclosing the submitted credential.
- The external SurrealDB remained operational after managed-service restart and
  stop actions.
- Managed surreal-memory and liter-llm pulled, started, reported status and
  returned Docker logs.
- Two workspaces received distinct stable identities, graph directories and MCP
  definitions. A disabled workspace stayed disabled across application restart.
- An uncommitted edit plus deletion and untracked file changed Compass freshness
  from current to stale; refresh returned it to current.
- A real Compass refresh was cancelled through the operation API.
- Operation events replayed with 75 monotonic events after application restart.
- The complete service log contained 1,215,957 bytes across 19 pages. Submitted
  credentials were absent from the retained log.

The structured result is retained in `gate-b.json` beside this receipt.
