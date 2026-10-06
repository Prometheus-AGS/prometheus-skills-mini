# Execute scope amendment — operator decisions, 2026-10-06

This supplements the reviewed Plan and supersedes its three unresolved product inputs. It does not skip any lifecycle stage or claim acceptance.

## Direct user decisions

1. Restart: “Report unsupported/unknown and require reconciliation (recommended)”. Retain a stable attempt receipt; never automatically create a replacement admission after unknown effects or runtime epoch loss. Durable UAR recovery is outside this release.
2. Remote receivers/IdP/custodian: “None. Remove all of the defaults there for now, since the application has them.” No named external receiver integration or new credential custody system is selected. Remove UAR's shipped runtime MCP presets (Tavily, Surreal Memory and Kreuzberg) from mcp.json. Keep application-managed configuration, runtime catalog/grant APIs, and developer .mcp.json intact. This is a requested configuration change in Execute.
3. Approval compatibility: “Strict cutover; update owned callers together (recommended)”. Require exact decision identity; migrate owned callers. Unknown installed/external legacy callers are not promised compatibility.

## Task disposition and acceptance

Change 04 keeps its numeric IDs for traceability, but tasks 5–8 now record empty external receiver scope, application custody, removal of runtime defaults, and preservation of explicit application configuration. Their previous receiver-specific implementation is superseded by this direct instruction, not silently skipped. Generic host/grant boundaries and independently configured receiver responsibility remain architectural requirements. Existing Bossfang inbound MCP classification remains in scope.

No external production receiver deployment will be certified by this phase. Local desktop and remote-facing common boundaries retain separate evidence. An empty external receiver selection no longer blocks completion of the selected phase scope; lack of actual receiver evidence still prohibits claims about such a deployment.

Plan table P4R now means application-owned configuration/default removal; there is no new remote credential adapter or service. Original 32 requirement/59 scenario counts describe the reviewed version; additional empty-configuration acceptance is recorded in the amended delta. Final review must inspect these changes.

## Source reconciliation in progress

## Independent client scheduling amendment

The UAR D0 lockfile/pin inconsistency blocks UAR production, not the separately isolated The Boss controller. Its accepted provider event already supplies approval_id; the strict client requires that existing field and does not depend on the new identity structs. Therefore the driver may author The Boss 02/3 client slice and 02/4 scenarios while UAR remains unchanged. This supersedes P1-before-P2 only for those disjoint client files. No tests or integration acceptance move earlier; coordinated cutover and full V1/V2 still wait for all selected production. UAR02 implementation and Bossfang03 continue to wait for their actual provider dependencies.

UAR current a7cb972 includes ancestor C05 provider fcfce6d with identical full-harness provider files. Bossfang main lacks full-run consumer work already implemented on a separate release branch; accepted consumer checkpoint and residual scope require a source-binding amendment before code. No other worktree is merged or modified here.

## Isolation and observed setup

## Independent default-configuration scheduling amendment

The user's explicit removal of runtime presets is a disjoint configuration change. Parent 04/7 may therefore be authored before 01–03, with a repository child for the exact `mcp.json` edit. This supersedes the old `additionalDefaultsClaim: mcp.json after D0` scheduling restriction only for this ordinary configuration file. It does not run, assist or retry the blocked D0 diagnostic, authorize UAR Rust changes, or move V1/V2 earlier. Runtime empty-default and application-supplied configuration acceptance remain deferred to the complete production boundary. The only immediate observation is the resulting JSON shape and bounded diff.

The initial D0 dependency inconsistency was resolved using the existing recorded Liter source override. The current D0 blocker is automatic safety review, not an unresolved dependency choice. No session-isolation behavior was executed or established.

## Isolation and observed setup (continued)

Three clean product worktrees were created under ~/.claude/worktrees/bauar-{uar,bossfang,boss}. Each has a separately registered nested workstreams/bauar KBD UUID. The Boss's existing checkout hook automatically ran pnpm install and reported Passed during worktree creation; working-tree status remained clean. No service was started, no dependency version was selected or changed by this driver, and that hook output is not product acceptance.
