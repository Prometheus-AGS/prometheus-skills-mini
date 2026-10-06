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

## Independent default-configuration scheduling amendment

The user's explicit removal of runtime presets is a disjoint configuration change. Parent 04/7 may therefore be authored before 01–03, with a repository child for the exact `mcp.json` edit. This supersedes the old `additionalDefaultsClaim: mcp.json after D0` scheduling restriction only for this ordinary configuration file. It does not run, assist or retry the blocked D0 diagnostic, authorize UAR Rust changes, or move V1/V2 earlier. Runtime empty-default and application-supplied configuration acceptance remain deferred to the complete production boundary. The only immediate observation is the resulting JSON shape and bounded diff.

The initial D0 dependency inconsistency was resolved using the existing recorded Liter source override. The current D0 blocker is automatic safety review, not an unresolved dependency choice. No session-isolation behavior was executed or established.

## Isolation and observed setup (continued)

## Continued development after blocked diagnostic — 2026-10-06

The operator explicitly directed continued development because this phase blocks the main release. D0 remains blocked by automatic safety review: do not retry, rephrase, move its execution to another agent/route, or infer a result. Parent02/5 and conditional02/6 remain unresolved; release certification still requires eligible evidence or an explicitly permitted waiver, neither of which is supplied here.

The former blanket D0-before-product-edit scheduling rule is narrowed to work whose correctness depends on its result: session-manager ownership correction. Approved identity, exact-approval, secret-projection and resource-boundary authoring may proceed independently, and Bossfang storage/selection may proceed after corrected design acceptance against the existing provider contract. The accepted pre-edit source remains identified by a7cb972 and D0's hashes; any future eligible baseline observation must name that exact source, not the modified implementation. No diagnostic is performed by this amendment.

The Boss finite run-secret projection may be authored alongside UAR identity in its disjoint worktree, using the already-authored strict client as its serial predecessor. Final integration/review/build gates stay at the full selected delivery boundary. Corrected material design review is a planning prerequisite, not a partial production QA gate. No source finding is closed by this scheduling change.

Three clean product worktrees were created under ~/.claude/worktrees/bauar-{uar,bossfang,boss}. Each has a separately registered nested workstreams/bauar KBD UUID. The Boss's existing checkout hook automatically ran pnpm install and reported Passed during worktree creation; working-tree status remained clean. No service was started, no dependency version was selected or changed by this driver, and that hook output is not product acceptance.

Task01/6 component authoring is parallel on only the new JWKS cache module. The identity worker retains exclusive verifier/mod.rs integration ownership. This changes scheduling only; configured 60/300/5-second policy, single-flight semantics and completed-boundary acceptance are unchanged. No D0 operation is involved.

### Design confirmation availability — 2026-10-06T14:08:24.229Z

The corrected material design confirmation through MiniMax-M3 timed out after one 300000ms attempt. This is not a PASS and the prior BLOCK remains recorded. Apply adversarial-review’s documented fresh-context native fallback when a team slot is free: exact artifact mandate plus packet only, gpt-6.1-sol/high native route, same model family isolation disclosed and producer identity unknown. This is planning review, not premature production QA. Independent approved production remains eligible while this receipt is pending. The D0 diagnostic remains blocked and is not retried or substituted.

Native fallback adaptation: the confirmation packet is 146624 bytes. Use a fresh file-backed packet wrapper containing only the mandate and exact packet path; the reviewer must hydrate that one packet in full and inspect no product source or conversation. Log this as harness-native-file-backed, not the stronger literal REST payload guarantee. No production QA is opened by this planning review.

### Accepted material refinement and independent storage

Native confirmation returns zero findings with twelve explicit checked classes. Original BLOCK and primary timeout receipts are preserved. This approves the corrected repository-specific design for source authoring only; full provider/strict-approval handover remains required before control integration. Parent03/1 and child prerequisite1 remain open until that final checkpoint exists. Independent F-STORAGE task2 may begin against existing bac04cb6/uar a7cb972 contract after this design acceptance; it does not exercise providers or make runtime claims. Exact initial paths are recorded in execution-bindings.json; schema storage handoff precedes selection writes.

UAR identity task3 adds exact cohesive policy.rs and tests.rs under security/api_keys to partition the existing541-line module by responsibility; no UserContext fields or broader directory grant.

### Concrete storage presentation and client scheduling

The accepted durable-presentation invariant requires non-executable history text, not merely event metadata. Within F-STORAGE owned types/store paths, accept ordered Message(speaker,text) and ToolResult(name,outcome,text) parts, with explicit SecretExcludedText producer obligation; this wrapper does not sanitize or verify content. Observation owner must apply finite run-secret projection and existing message bounds before construction. Persist no executable arguments, credentials, headers or raw envelope. Old metadata-only events retain explicit unavailable text. This fulfills the already reviewed event/cursor/outcome transaction contract without executable recovery or additional persistence surfaces.

Boss secret-projection task3 may consume the completed approval-client task2 source-authoring handoff as its serial source predecessor. That approval task canonical exit explicitly requires V1 and therefore remains in_progress; do not manufacture acceptance solely to satisfy authoring order. This clarifies the earlier independent projection scheduling amendment; complete cutover acceptance remains at the combined gate.
