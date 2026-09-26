# Task 7.5 — Gate U integration evidence

## Boundary

Gate U entered through the production Electron IPC and data APIs, launched the
actual `uar-sidecar` process, exercised the UAR REST/runtime surfaces, used an
external SurrealDB 3.2.4 service, and sent model requests to a real local HTTP
provider fixture. It did not call internal adapters directly.

Production commits:

- The Boss: `1ee6042f96` (`feat(uar-admin): verify integration authority`)
- Universal Agent Runtime: `65fb008c` (`fix(sidecar): preserve run API routes`)

Machine-readable result: [`gate-u/results.json`](gate-u/results.json)

## Observed failures corrected at this boundary

1. Governance setting writes return per-field `results`, unlike ordinary
   namespaces. The Boss now projects that response into its typed update result
   and rereads the namespace after successful fields.
2. The supervised sidecar consumes its launch-token bearer before the user
   settings handler. The handler now admits the middleware-verified host
   principal while continuing to reject API-key and anonymous access.
3. The A2UI router was nested under `/api/uar/runs` after the primary run API and
   intercepted the stream URL returned by run creation. UAR now merges the A2UI
   run-adjacent routes into the single `/api/uar` router, preserving the public
   A2UI URLs and restoring stream, cancel, checkpoint and continuation routing.
4. A fresh external SurrealDB had no Gate U namespace/database. The gate now
   provisions its disposable namespace/database before launch and atomically
   configures both service ownership and the UAR remote storage profile.
5. Protected integration secret mutations are now reread after the encrypted
   atomic write. A requested set or clear that did not persist fails with the
   existing secret-storage error instead of reporting success.

## Acceptance result

The single Gate U run passed in 1.5 minutes and recorded:

- Boss, gateway and UAR model sources all completed inference.
- Boss, gateway and UAR credentials reached only their selected provider paths;
  evidence retains credential labels, never values.
- The configured nonconversation provider check was operational.
- Live, next-turn and restart setting modes were applied.
- A stale sibling field produced a partial save with a revision conflict.
- Protected admin authority and owner isolation were operational.
- Restart persistence was operational.
- Embedded and remote SurrealDB profiles retained separate provider catalogs;
  the final active profile was remote.

## Commands and observed output

```text
cargo build --bin uar-sidecar
Finished `dev` profile [unoptimized + debuginfo] target(s) in 8m 43s

pnpm build
exit 0; node/web/aicore/e2e typechecks and Electron/utility builds passed

pnpm playwright test --config playwright.gate.config.ts uarAdministrationGate.test.ts
1 passed (1.5m)
```

The Docker fixture used `surrealdb/surrealdb:v3.2.4`, was healthy, and was
bound only to `127.0.0.1:28119`. No unit, filtered-function, mock-only, broad
workspace, or repeated integration suite was run.

## Security boundary

Launch-token authority, asserted sidecar principal, UAR administration key,
provider credentials and SurrealDB credentials cross real trust boundaries.
The gate proved rejected unprivileged administration and owner separation. The
application never returns launch/admin authorities through IPC, and neither the
result JSON nor this receipt contains secret values.

## Remaining scope

Gate U completes Task 7.5 only. Agent, skill, experience, knowledge and run
administration remain in plan section 8. Customer-platform packaging and
installed Windows acceptance remain later release gates, so the parent goal
stays active.
