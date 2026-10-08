# Spec review round 1 dispositions

The first request was truncated and rejected; the completed retry returned BLOCK (2 critical, 4 warnings, 1 suggestion). Its language screen scored 0.017857 with a low length flag only. Exact producer identity remains unknown. No completed verdict is rewritten.

- Critical delegation policy: added proposed security.api_key_delegable_roles default [user], exact role intersection, host-session/admin forbidden, persisted-record/direct/exchange assertions, and explicit scoped administrative principal configuration. These are new proposed fields, not claims about existing configuration.
- Critical receiver authority: added canonical ResourcePrincipal derived only from resource JWT validation or authenticated active-token introspection using the named receiver mapping. The initial common profile denies cross-tenant access; cross-tenant delegation is unsupported without a separate reviewed extension. Receiver/IdP selection remains blocked, not guessed.
- Warning deduplication: specified epoch/task/run/numeric SSE event ID, transactional persisted cursor and product update, gap/malformed-event handling. Source: UAR full_harness/handlers.rs:181–266.
- Warning F6 closure: added exact receipt fields and production owner-comparison/namespace code branch correlated with valid A/B requests; JWT signature validity alone cannot prove ownership. The fixture still gates any correction.
- Warning JWKS time source: monotonic age and no reset on failure are now normative.
- Warning reconciliation authority: explicitly named verified owner/workspace/admission and epoch guard. Rejected the suggested statement that changing any namespace field necessarily yields 409: UAR reserve keys admission by owner/workspace/ID, and digest conflicts only within that namespace. The adapter forbids identity changes during reconciliation; epoch loss remains unknown/unsupported.
- Suggestion attribution: enumerated non-secret request-context fields and positive/forged-input assertions.

Additional author correction before round 2: added execution envelope mapping/unsupported-field rejection so F1's history/tool/policy context cannot be silently dropped. The complete updated artifact set is submitted for round 2.
