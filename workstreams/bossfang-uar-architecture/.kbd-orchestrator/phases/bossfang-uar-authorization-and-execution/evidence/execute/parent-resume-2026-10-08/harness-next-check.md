# Harness 03/9 — smallest current-pair check

2026-10-08. Read-only selection requested by root; parent Execute revision294 restored, root later reported revision298. No build, test, gate, product/fixture edit, credential/log read, dependency mutation or KBD/team mutation. Only this evidence note was written. The two excluded D0 files were never accessed, searched or hashed.

## Decision

Use the existing four-case postlint gate with a prospectively bound host fixture and a newly emitted **standalone universal-agent-runtime** executable using the ordinary server-full profile. Do not supply the staged uar-sidecar directly. No gate adaptation is needed or proposed. Do not repeat H28's18 cases, selected passing lint, CLI packaging, or the desktop child cases merely to give them a new date.

The concrete missing evidence is a selected actual Bossfang consumer/provider pairing after the provider's desktop-child changes. The host also needs prospective compilation binding because historical source21 omitted two dirty consumer inputs. Build only the selected host target and the compatible standalone provider executable, serially; then run the unchanged four-case entry. This is a bounded current-pair integration receipt, not a claim that all historical scenarios were rerun or all repository checks/platforms passed.

## Observed launch mismatch

The actual Cargo manifest names the sidecar source src/bin/uar-sidecar.rs (the earlier illustrative underscore path is absent). Root explicitly authorized reading only that entrypoint and its CLI definition after the metadata-only pass.

- src/config.rs:16–27 defines shared Cli with --config and --port. Thus --config syntax itself is accepted.
- src/bin/uar-sidecar.rs:197–203 requires the first stdin line to contain its64-hex launch token and exits2 otherwise, before binding. The existing Bossfang scripts/integration/bauar-harness-runtime.mjs:111 spawns with stdin ignored. This is a deterministic source-level startup contradiction; no failed sidecar launch was run here.
- The sidecar binds from cli.port/default1906 at208 before loading configuration; providerFixture supplies only --config at runtime.mjs:201 and puts its chosen free port in the YAML/JSON server section.
- Sidecar entrypoint181/185 sets managed ownership and JWT_REQUIRED=false unless the corresponding process environment settings exist. The existing isolated provider fixture supplies external ownership and jwt_required:true in configuration at runtime.mjs:180/186, not those environment overrides.
- The sidecar additionally emits READY on stdout at315 and uses its stdin-EOF/launch-token contract. The current fixture ignores stdout and uses standalone authenticated readiness. Sharing server-full features does not erase this process/authentication contract.

Therefore substituting binaries would not establish the desired external full-harness boundary. Do not add token forwarding, auth overrides, port discovery, fixture mode or retry merely to reuse the sidecar. The existing standalone gate route already fits this check.

## Existing bindings and what they do not prove

The accepted child ordinary artifact metadata is final-artifact-manifest-17.json, emission source12 with explicit scoped source17 rebinding. Staged sidecar:
  children/desktop-mcp-projection-acceptance/evidence/execute/development-uar-payload-12/uar-sidecar
SHA256 bfd2194f5942474082d71ede227e01fda356afd9e1d93257bdf847dfae2d5f4f.
It has ordinary13 expanded server-full features, not the post-ack gate feature. Its adjacent storage fixture is gate-only and is not a standalone-server replacement. Metadata establishes those artifacts' prior provenance, not compatibility with this fixture.

bossfang-postlint-host-compile-09-manifest.json binds:
  /Users/gqadonis/.cargo-build/ac/bc2af224a6da42/debug/deps/bauar_harness_host-c60280c0df75470d
SHA256 d0b7043a71fb308744905f4aee4521de9f5422e76709c95bbc4e30448138a0af.
Target is librefang-api/tests/bauar_harness_host.rs; actual features default,surreal-backend,telemetry,test-util,uar-driver. Its command receipt is final-gates/bossfang-host-compile-09.json and source binding is source-inventory-cold-history-postlint-delivery-21.json. The retained hash is not newly measured here.

The current finite disposition preserves69 consumer hashes plus postlint and two source17 gap paths,72 total. The two omitted historical inputs are crates/librefang-llm-drivers/src/drivers/uar.rs and crates/librefang-llm-drivers/src/drivers/uar_run/http.rs. A prospective host no-run build closes the current compilation provenance gap; it cannot reconstruct their past hashes. Do not retroactively modify historical receipts. The old standalone UAR executable used by postlint01 is likewise not the source12/provider checkpoint.

## Exact next command request — root execution only

First capture prospective known consumer/gate/compiler inputs and the approved provider checkpoint without traversing excluded D0 paths. Use root's existing isolated target/build receipt runner, preserving accepted caches and one writer. Set SKIP_DASHBOARD_BUILD=1 for the Bossfang command as in the retained host compilation. The following is the exact previously successful selected target command, now requested with prospective source binding:

Cwd /Users/gqadonis/.claude/worktrees/bauar-bossfang:
  cargo test --offline --locked -p librefang-kernel -p librefang-api --features librefang-kernel/uar-driver,librefang-api/uar-driver --test bauar_harness_host --no-run --message-format=json

It compiles the host; it does not execute Rust test cases. Capture the emitted executable from Cargo JSON instead of assuming the historical hashed filename. The API uar-driver feature forwards to kernel and the fixture; default embedded storage remains enabled.

Then, serialized in /Users/gqadonis/.claude/worktrees/bauar-uar:
  cargo build --offline --locked -p universal-agent-runtime --no-default-features --features server-full --bin universal-agent-runtime --message-format=json

This is the same ordinary profile and package used by the accepted sidecar build, selecting the compatible manifest-declared standalone entry instead of the sidecar. Do not add instrumented features, dependency changes or a new daemon. Capture its emitted executable and exact checkpoint/artifact binding. Neither command was run by this author.

After both complete and root verifies prelaunch bindings, use an explicit argument array (HOST_EMITTED and UAR_STANDALONE_EMITTED are the two actual Cargo JSON executable values, not guessed paths):

executable: /opt/homebrew/opt/node@24/bin/node
cwd: /Users/gqadonis/.claude/worktrees/bauar-bossfang
args: [
  "scripts/integration/bauar-postlint-gate.mjs",
  HOST_EMITTED,
  UAR_STANDALONE_EMITTED,
  "/Users/gqadonis/.claude/worktrees/bauar-uar"
]

The third argument is required because existing providerFixture reads only its named policies and collaboration fixtures. It is not the payload directory, which does not contain that source fixture tree. The unchanged gate owns isolated private roots, temporary provider/model/MCP listeners and cleanup; no shared resident service or operator defaults are mutated. No command to run an excluded diagnostic is requested.

## What this one gate observes

The unchanged postlint script requires exactly4 completed cases, one real approved safe effect and actual model calls. It covers nullable selected-intent persistence/restart with no readmission; exact wrong/stale/missing/duplicate approval refusals, current provider effect, event/terminal cursor correlation and boxed checkpoint restart; original A2A parameter errors; and enabled connections/OpenAPI descriptors. It uses the actual production Bossfang router/kernel plus UAR external full-harness and real MCP receiver. It does not invoke the displayed diagnostics endpoint.

Its case count has no selection CLI. A one-case flag must not be invented. Reusing this existing four-case unit is the smallest existing runnable check; adding another runner would change scope without demonstrated need. Retain H28's18 cases under their original bindings. This current-pair receipt, if successful, covers the outstanding bounded integration decision; it does not certify every native/stream/recovery variation against the new provider. Any additional current-provider behavior requirement must name an actual uncovered task criterion, not a speculative broad regression suite.

Parent03/9 requires selected repository checks and platform/checkpoint disposition plus contribution to independent parent04/10 review. Historical lint/CLI results remain useful with their stated bindings; Node-only branding/workspace-check limitations remain explicit. Root decides task completion after the new receipt and those dispositions. No original UAR C05, D0/F6, packaged shipping, installed-platform, cross-platform or aggregate desktop gate closure follows.

## Read scope and operational note

Read the full parent03 tasks, repository child tasks, existing check disposition/inventory, explicit postlint gate/runtime helper, API Cargo manifest and private host fixture. UAR reads were finite build/artifact metadata, the Cargo bin declarations, and the newly authorized sidecar/CLI source only. No tree search or excluded-file read/hash occurred.

Initial ordinary Node/heredoc read commands stalled in shell setup; only those author-owned read processes were interrupted. Explicit /opt/homebrew/opt/node@24/bin/node -e with login:false completed the read-only work. This is a tooling observation, not a product failure and not a gate retry.

## Existing root runner and exact emission selection

The read existing evidence/execute/final-gate-runner.mjs accepts [label,cwd,command,...args], spawns the explicit command with inherited root-controlled environment, captures stdout/stderr into an exclusive-created final-gates/<label>.log, and emits schemaVersion1 JSON with label,cwd,command,args,startedAt,finishedAt,exitCode,signal,log,result,buildEnvironment. Exit0 means command-completed-not-yet-case-certified. Its buildEnvironment records CARGO_TARGET_DIR, SKIP_DASHBOARD_BUILD, LIBREFANG_ALLOW_NO_AUTH, NODE_ENV and RUST_MIN_STACK only when supplied. It is a command receipt, not source certification. Keep logs private; publish only finite compiler fields.

Root can invoke that unchanged runner with the two exact Cargo argv arrays above and fresh labels uar-current-pair-standalone-01 and bossfang-current-pair-host-01, then bossfang-current-pair-runtime-01 for the unchanged Node gate. Prefer standalone first, then host, then runtime: no runtime until both builds finish. These labels are requests, not emitted receipts.

The historical host executable establishes the existing isolated target /Users/gqadonis/.cargo-build/ac/bc2af224a6da42. The accepted ordinary sidecar emission establishes UAR's /Users/gqadonis/.claude/worktrees/bauar-uar/target. For an explicit reproducible request, root may set CARGO_TARGET_DIR to those respective existing target directories (and SKIP_DASHBOARD_BUILD=1 for Bossfang), with one writer and no cleanup/cache deletion. Do not assume a changed environment preserves the historical build fingerprint; record the actual environment and fresh Cargo JSON result.

Select host artifact by reason=compiler-artifact, manifest_path=/Users/gqadonis/.claude/worktrees/bauar-bossfang/crates/librefang-api/Cargo.toml, target.name=bauar_harness_host, target.kind containing test, and nonnull executable. Require the expected uar-driver/default embedded storage feature profile. Select provider artifact by package universal-agent-runtime, target.name=universal-agent-runtime, target.kind containing bin, nonnull executable and the ordinary server-full feature profile. Use those executable fields directly; if Cargo reports fresh=true, that is acceptable compilation output only with the prospective inputs recorded, never a claim the linker ran anew.

Companion source/artifact manifests should follow the existing compile09 shape: commandReceipt, sourceBinding, full selected compiler-artifact record, executable SHA256, log SHA256, and explicit compile-only/runtime-pending scope. Source binding includes the already enumerated72 Bossfang paths (including both historical gap paths), actual selected Cargo manifests/lock and gate helpers consumed, plus the approved UAR checkpoint's allowed explicit inputs and required policies/collaboration fixture inputs. Capture before/after equality and unchanged pins. Do not add either excluded D0 file or use broad UAR traversal, test listing or diagnostic output. Provider source12/scoped17 remains the accepted starting point; the new standalone emission receives its own prospective binding rather than inheriting a sidecar filename or historical standalone hash.

Authority is parent bauar-03-harness-delegation/tasks.md3.2 and the repository child task3.2, with parent's approved scoped checks/platform disposition. The reader's recommendation adds no new broad-check requirement. Root has separately confirmed this completed boundary permits one serialized standalone+host compilation followed by the unchanged selected postlint gate.
