# JWKS cache authoring receipt — not acceptance evidence

Date: 2026-10-06. Parent change: bauar-01-identity-boundaries, task 6.
Child: uar-bauar-identity-boundaries, task 6. Authoring is authorized by the
continued-development amendment; the unrelated D0 diagnostic remains blocked
and was neither inspected nor executed by this author.

## Source and scope

Product checkout: `/Users/gqadonis/.claude/worktrees/bauar-uar`.
Approved baseline: `a7cb972992d4f83db6585449ea81af0fe4a1c990`.
HEAD observed after module authoring: `8bff32deb870f6363e94687a2e22492f91a34dfd`;
peer identity edits and commits were concurrently in flight. This author made
no commit and did not edit any peer-owned source.

Only product file authored:
`src/uar/security/verifier/jwks_cache.rs`, 230 lines, SHA-256
`48670e8c74a1027d6b238e811fe5c0bd786a92c617bfbc03816318f6a2d4eee2`.
This receipt is the only other authored file. No dependency, service, KBD or
team state was changed. No Cargo, test, build, formatter or acceptance gate ran.

Read the full parent design and child design/spec, product AGENTS.md,
versions.toml, decisions.md, Rust rules, and matching security gotchas before
editing. Child position restored at revision 42, Execute in progress;
`openspec list` showed identity 1/7, runtime defaults 1/3, execution 0/6 at that
read. Position is driver-owned and these historical counts are not completion.
Skills applied: prometheus-rust-workspace, rust-best-practices,
rust-async-patterns, context7-mcp. No verifier or critic was activated early.
The delegated no-Cargo/complete-delivery policy supersedes the older Rust rule's
per-edit T0 command; no contradictory early check was performed.

Inspected existing `verifier/mod.rs`: old JwksCache held separate key and
SystemTime locks; cached known keys never triggered refresh; refresh replaced
keys but had no timeout/single-flight/retry bound; fetch errors logged raw URL
and reqwest error. The existing JwksVerifier enforces RS256 before key lookup,
initializes the shared RustCrypto provider and owns claim validation. Those
responsibilities stay with the integration owner.

## Implemented source contract

- `cache_for_issuer(issuer: Option<&str>, url: &str).await -> Arc<JwksCache>`
  indexes exact configured issuer/URL tuples, preserving `None` separately
  from an explicitly empty issuer. Never use unverified token claims to choose
  this cache identity.
- `cache.key(kid).await -> Result<DecodingKey, CacheError>` uses a five-second
  absolute monotonic budget covering its state reads, refresh-gate wait, HTTP,
  body read, conversion and publication checks. A timeout drops the caller-owned
  refresh future and releases its async gate; no detached refresh task exists.
- Refresh target 60 seconds; hard age 300 seconds; request budget five seconds;
  minimum interval five seconds between attempt starts. Attempt time is recorded
  before I/O, including a subsequently cancelled attempt.
- Snapshot is a complete key map plus successful-refresh Instant, published
  together. Successful empty sets remove all keys. Conversion failure publishes
  neither a partial map nor a new age. Known keys remain usable after refresh
  failure only at age strictly below 300 seconds. Unknown keys never gain access.
- An asynchronous Mutex owns the single refresh lane; a separate RwLock owns
  short state accesses. Waiters joining a flight reuse its outcome without
  automatically initiating another request. A changed attempt timestamp also
  closes the pre-lock race. Unknown identifiers share the same retry bound.
- `CacheError` has only unit variants: UnknownKeyId, Unavailable, Stale, Timeout,
  InvalidKeySet. No request URL, identifier, key, token, response body or raw
  reqwest error is retained in error diagnostics. The existing error-level
  `JWKS refresh failed` event is retained with sanitized reason text.
- Test-only `cache.refreshed_at().await -> Option<tokio::time::Instant>` enables
  monotonic-age assertions through the real verifier fixture.

These guards implement the approved signing-key freshness requirement at the
actual authentication boundary. Sanitized diagnostics protect the existing
configured-endpoint/error boundary. No unrelated hardening was added.

## Exact integration handoff

API was coordinated with the verifier owner before implementation. Add
`mod jwks_cache;` and import `CacheError`, `JwksCache`, `cache_for_issuer`.
Replace the old error variants carrying URL/raw error/kid with a sanitized
variant such as `#[error(transparent)] Jwks(#[from] CacheError)`.

In `JwksVerifier::new`, use
`cache: cache_for_issuer(issuer, url).await`.
Remove the verifier's old cache implementation, global maps/client, URL/client
fields and old cached_key/refresh/fetch_error methods once no longer referenced.
After existing header and RS256 checks, resolve the key with exactly:

```rust
let key = self.cache.key(&kid).await?;
```

Retain actual JWT decode and issuer/audience/leeway validation. Migrate the
test-only verifier accessor to return `Option<tokio::time::Instant>` and delegate
to `self.cache.refreshed_at().await`. Existing immediate-rotation source scenarios
must explicitly advance the five-second minimum before expecting another fetch.
Unknown-kid error assertions must match the sanitized cache variant. Production
integration and associated scenario authoring are owned by the driver/integrator.

## Dependency evidence

Cargo.lock inspected: jsonwebtoken 11.0.0, application reqwest 0.12.28,
Tokio 1.53.1; the separate MCP reqwest 0.13.4 is not used by this module.
No manifest or lockfile changes.

Context7 resolve then query completed for the official repositories:
`/keats/jsonwebtoken`, `/seanmonstar/reqwest/v0.12.9`, `/tokio-rs/tokio`.
The available reqwest documentation version was 0.12.9, so installed 0.12.28
source was inspected for the exact signatures/behavior. Installed registry
source also confirms jsonwebtoken 11.0.0 DecodingKey cloning/from_jwk and Tokio
1.53.1 cancellation/timeout semantics.

Relevant primary documentation:
[jsonwebtoken decoding](https://github.com/keats/jsonwebtoken/blob/master/_autodocs/api-reference/decode.md),
[reqwest request timeout](https://github.com/seanmonstar/reqwest/blob/v0.12.9/_autodocs/api-reference/request.md),
[Tokio time](https://github.com/tokio-rs/tokio/blob/master/_autodocs/api-reference/time.md).
Installed anchors under `/Users/gqadonis/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/`:
`jsonwebtoken-11.0.0/src/decoding.rs:77,213`,
`reqwest-0.12.28/src/async_impl/request.rs:284`,
`reqwest-0.12.28/src/async_impl/response.rs:269`,
`tokio-1.53.1/src/time/timeout.rs`,
`tokio-1.53.1/src/sync/mutex.rs`.

## Required completed-delivery real-verifier scenarios (NOT RUN)

Use actual JwksVerifier/verify_token and the protected router with synthetic
signed credentials and a controllable HTTP JWKS fixture. Record exact source,
fixture key identity labels, monotonic clock advances, response statuses,
outbound request timestamps and maximum concurrent requests. Exercise the
production verifier/cache; standalone cache-unit results are insufficient.

1. At time zero fetch keys A and B, verify both signatures with one HTTP request.
   At 59 seconds known keys use the same snapshot. At 60 seconds replace the
   fixture set with B only; verify A is rejected and B succeeds after exactly
   one complete refresh. Assert snapshot age renews only on success.
2. Sign old/new tokens with genuinely different RSA material sharing one kid.
   At the refresh target publish only new material. New signature succeeds;
   old signature fails. Do not merely rename identical key material.
3. After a successful snapshot, return HTTP failure, malformed JWKS, and a
   partially convertible set in separate controlled attempts. Known A may
   authenticate below 300 seconds; timestamp stays unchanged in all failures.
   At exactly 300 seconds and afterwards, with refresh unresolved, A is denied.
   A request starting before 300 seconds whose refresh timeout crosses that
   deadline must also deny. Restore a valid set and verify recovery.
4. Concurrent unknown-kid and target-due requests share one delayed refresh.
   Assert maximum concurrent fixture requests equals one, unknown keys always
   fail, no extra request starts inside five seconds, and completed wave waiters
   do not each queue another fetch. Repeat with timeout and caller cancellation.
5. Delay headers and then body beyond the five-second budget. Measure entire
   `key` call including waiting for another refresh; verify bounded completion,
   no stale acceptance, retained prior successful age, and retry spacing. A
   different configured issuer/URL pair has an independent refresh lane.
6. Capture failure logging with synthetic sentinel text in URL query, token kid
   and malformed response material. Assert no sentinel occurs in emitted
   error/debug text while the stable refresh-failed event remains observable.

## Uncomfortable limits and next boundary

The module is not declared by verifier/mod.rs at this handoff, so it is not
integrated or compiled. The component alone establishes no authentication,
rotation, timeout, concurrency, build or release acceptance claim.

The constructor's asynchronous global registry lookup happens before `key`'s
five-second budget. If the complete verifier-construction interval must be
included, the integration owner must carry one deadline across construction
and lookup or change registry acquisition accordingly; this receipt does not
misrepresent that as bounded already.

Tokio timeouts are cooperative: synchronous JSON parsing, key conversion and
scheduler starvation cannot be preempted by the timer. Explicit deadline checks
reject late publication, but do not promise hard real-time CPU preemption.
Successful fetch freshness is measured at complete publication; it cannot
prove an external issuer's own upstream freshness or retroactively cancel runs.

No unrequested product code or files were added. Read-only source/document
inspection and the 230-line/hash measurement are the only verification here.
All actual behavior remains unverified pending integrated AUTH V1, followed by
the separately required V2 build boundary.
