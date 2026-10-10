# HARNESS fixture authoring receipt

Status: **source authored, unverified**. Five new files are released to the coordinator. No fixture/build/test process was run by this worker.

Source root: `/Users/gqadonis/.claude/worktrees/bauar-bossfang`. The gate requires **13 orchestration cases and 5 kernel cases (18 combined)**, nonzero model/effect observations, exact receipts, and no skips. These are authored assertions, not observed passes.

| File | Lines | SHA-256 |
|---|---:|---|
| `scripts/integration/bauar-harness-gate.mjs` | 399 | `89ae2e8f1f366dca13e9e45184c342d31104309cb2ab1e3db0290f4fa4fad541` |
| `scripts/integration/bauar-harness-peer.mjs` | 175 | `490c9721c00d22bebbee3091d7ba35c1b2fdffc407edb16815216dfd08f15c08` |
| `scripts/integration/bauar-harness-runtime.mjs` | 180 | `988c224bb96c20d28c75f60b76c7f4abd5c5732e2f6d213f81abd7591194fb10` |
| `crates/librefang-api/tests/bauar_harness_host.rs` | 139 | `aedf8b0e16ad25e659fa01ca120b1901e22eedbb37c3bd0acb634e5b895fb172` |
| `crates/librefang-kernel/tests/bauar_harness_delegation.rs` | 112 | `ad7d2512d5e7abd7396740e035dc52f613ead9b24413c8eb70794f2028efdaa4` |

Required artifacts: actual API `bauar_harness_host` and kernel `bauar_harness_delegation` integration-test binaries with `uar-driver` and default Surreal support; current UAR `universal-agent-runtime` standalone binary with at least `server` + `surreal-backend` (default `minimal` includes both). The coordinator chooses the accepted release artifact. No test-probes/stub-llm binary, sidecar or D0 path is required.

Future launch only: `<node24> scripts/integration/bauar-harness-gate.mjs <api-host-test-bin> <kernel-test-bin> <uar-bin> <uar-source>`. The gate does not build dependencies.

The actual host binds loopback port 0 and writes `<private-root>/boss/ready.json` containing its actual `base`, `pid`, `router: production`, and initial `backgroundSweep: false`. Readiness is not acceptance. Private command requests/responses live under `boss/commands/`; provider config/data under `provider/`; the independent kernel fixture under `kernel/`. Generated credentials are excluded from this receipt.

Actual authoring operations: source reads with `rg` and Node 24.14.1 `fs.readFileSync`; exact-file `apply_patch`; Node byte hashes/line counts; these evidence writes. Every shell tool used `login:false`. **No verification commands ran.** The JSON receipt records source case names and launch arguments.

- Source authored only: no FTEST compiler, build, test, gate, dependency installation, fixture process or service was run by this worker. No runtime PASS, V1/V2, shipping or C05 acceptance is asserted.
- Primary manual selected admission uses private task_board.assignee_wake=false and no background sweep. Separate native/selected race instance enables actual TaskPosted dispatch and explicitly starts the public task-board sweep with grace/interval/claim TTL 1 and max_retries 2. Shipping defaults are unchanged.
- Private store_pending_job intentionally omits the initial TaskPosted event only for the controlled selected-winner window; publish_stored_task emits the actual stored row through the actual kernel event producer. This is not evidence of atomic public task creation plus UAR selection.
- Cron/deferred producers without JobAttemptRef remain native. No automatic UAR cron activation, inferred selected mapping, alternate queue parity or daemon-wide scheduling acceptance is claimed.
- Host command directory invokes actual storage intent/read/reconciliation and public sweep operations; primary admission/control still crosses the actual authenticated production router. No UAR receipts or execution authority are synthesized.
- Current UAR MCP resource-capture/auth attribution compatibility remains untested. The fixture consumes the private actual mcp.json env secret-reference interface and real public collaboration seed endpoints; no provider MCP production/resource-capture source was modified.
- Test binaries and current standalone UAR binary must be supplied explicitly after coordinated builds. Installed/older runtime compatibility is unverified. No sidecar/D0/session-manager diagnostic path is used.
- Controlled peer counters reflect actual received model/MCP calls. Proxy forwards original headers/body/response bytes and only pauses or loses selected real responses; raw credentials and request arguments do not appear in acceptance evidence.

Source paths are released; the worker remains available for observed gate corrections.
