
## 2026-09-21 — artifact-refiner is IN the QA contract, and is ported to Node

**Decision (operator, 2026-09-21):** artifact-refiner joins the QA gate rather than being dropped from
it. This closes the question left open by `platform-foundation/reflection.md` corrective action 3,
where `execution.md` promised a gate that never ran. It must work on Windows without WSL.

**What the port actually requires — measured, not assumed:**

- The upstream repo (`GQAdonis/artifact-refiner-skill`, submodule at
  `prometheus-skill-pack/skills/imported/artifact-refiner`) has **555 tracked files, 39 `.sh`, 0 `.py`**.
  Most of the shell is harness installers and scaffolders the mini port does not need.
- **`refine-validate` — the skill the KBD QA gate actually invokes — references no shell script at all.**
  It is instructions plus two JSON schemas. This is the reason the port is small.
- The `.sh` dependency is confined to the **state lifecycle**: `state-init.sh` (105), `state-checkpoint.sh`
  (47), `state-finalize.sh` (57), `state-resolve-provider.sh` (45) = **254 lines of bash**.
- **Correction to an earlier statement in this session:** I reported "zero Python" on the strength of
  `git ls-files '*.py'` returning 0. That was wrong as a dependency claim. Three of the four state
  scripts *invoke* `python3` from inside bash, and so does `agents/artifact-validator.md` (2 blocks).
  A file-extension count does not measure an interpreter dependency.
- Every `python3` call is JSON read/write or UUID generation — `JSON.parse`/`JSON.stringify` and
  `crypto.randomUUID()` in Node. The port is mechanical, not a rewrite.
- Other POSIX deps found: `date -u` (3 scripts) → `toISOString()`; `sed` (state-finalize) and `grep`
  (state-resolve-provider) → string ops. All forbidden by the project's own command policy anyway.

**Consequence for `hook-entry-node-only`:** this is a second change in the phase, not a blocker on the
hook work — the two share `lib/platform/` but no files. The gate it enables applies from its own
completion onward.

### Scoping the "full skill port" — measured triage, 2026-09-21

Operator chose **full skill port**, sequenced **after the hooks in this phase**. Measuring what that
means before speccing it, because the literal reading (39 `.sh`, 5,396 lines) overstates the work by
about 5x and most of it is not artifact refinement:

| Category | Files | Lines | Reachable from the refinement loop? |
|---|---|---|---|
| Scaffolders | 7 | 2,886 | Only from scaffold-* skills and `refine-mcp-ui`; `scaffold-react-vite.sh` alone is 1,200 lines that generate a React/Vite starter |
| Installers | 16 | 1,496 | **No** — unreferenced by `agents/`, `skills/`, `prompts/` and `SKILL.md`. Target harnesses this project does not ship |
| **Core loop + validation** | **10** | **671** | **Yes** — `SKILL.md` invokes exactly 5 (`state-init`, `state-checkpoint`, `state-finalize`, `state-resolve-provider`, `workflow-dispatch`), plus the validation and session scripts |
| lib | 1 | 86 | `kebab-case.sh` — used by scaffolders |

Already Node: **19 `.mjs`, 4,520 lines.** These need a Windows *review*, not a port. A hazard scan
(`/tmp` literals, `process.env.HOME`, `shell: true`, `.sh` references) found exactly one:
`scripts/lib/model-routing.mjs:36` resolves `scripts/check-openai-proxy-health.sh`.

**Scope taken:** the 671-line core → Node, the 19 `.mjs` reviewed and the one hazard fixed, and all 20
sub-skills + 5 agents + schemas carried over. Scaffolders and installers are **not** ported as bash and
not rewritten in this change — a scaffolder that shells out to a POSIX toolchain is a separate problem
from the QA gate, and porting 2,886 lines of project generator would dominate a phase whose named goal
is hooks. Any scaffold-* skill that survives must call Node or be marked unavailable; that is its own
change, recorded as a follow-up rather than smuggled in here.

This is a narrower reading than "convert all 39 scripts". Flagged to the operator rather than assumed.

## 2026-09-21 — detect-project-context reports THIS project's context, not GitOps

**Decision (operator):** port `sessionstart-detect-project-context`, but change what it detects.

Upstream (`shared/scripts/detect-project-context.sh`, 34 lines) detects Kustomize overlays, ArgoCD
Application CRs and Terraform cluster resources, then advertises four devops skills:
`gitops-bootstrap · gitops-transform · argocd-multicloud · kustomize-overlay`.

README §4.3 puts devops skills out of scope here, and the analyze inventory dropped
`posttool-validate-gitops-write` for that exact reason. Porting the detection verbatim would advertise
four skills this project does not ship — a hook telling the operator about capabilities that do not
exist is worse than no hook.

**What it reports instead:** KBD phase and position, the spec backend and capability count, the Node
version against `engines`, and whether the two permitted services are reachable (both optional, both
reported as degraded when down).

This is a **behaviour change from upstream, made deliberately and recorded**, not a porting error. The
hook id, event and timeout are unchanged, so the manifest and the six-id scenario still hold.

## 2026-09-21 — provider resolution ports 4 of 6 tiers; tiers 4–5 are dead upstream

`state-resolve-provider.sh` declares a six-tier waterfall. Tiers 4 and 5 read:

```sh
if command -v mcp 2>/dev/null | grep -q "refiner_state" 2>/dev/null; then
```

`command -v` prints the **path** of an executable, not a list of tools it offers. On this machine
`command -v mcp` prints `/Users/gqadonis/.pyenv/shims/mcp`, which contains neither `refiner_state` nor
`memory`, so **neither tier can ever fire** regardless of what MCP servers are configured. Verified by
running the comparison.

**Decision:** port the four reachable tiers — env var, project-local, global config, filesystem default —
and do not port the two unreachable ones. Carrying them would reproduce a latent bug and add code with
no observed problem (A-2). If MCP-backed state is wanted later it needs a real capability probe, which
is a change with its own spec, not a line resurrected from a broken conditional.

The filesystem default is unchanged and is what actually runs today, so no behaviour anyone depends on
is lost. The only non-markdown reference to the script anywhere in the upstream repo is the script
itself.

## 2026-09-21 — operator decisions closing the karpathy-logs-node assessment

1. **Review judge:** the liter-llm gateway key was supplied by the operator in chat. Verified: `/v1/models` → 200, routing `MiniMax-M3` (critic) and `k3` (judge); both answered a one-token smoke test. The key is passed through the environment for a single command and is **not** written to any file, commit, packet or memory. `MiniMax-M3` emits a `<think>` block in its content, so a judge-output parser must strip it before extracting JSON.
2. **Filesystem MCP in The Boss: both.** `rust-mcp-filesystem` is embedded alongside The Boss's existing in-process TypeScript server, not instead of it. The tool-name overlap (`read, write, edit, delete, ls, glob, grep`) therefore has to be resolved by naming, not by removal.
3. **Runtime in The Boss: the bundled `bun`.** Tested against The Boss's own binary (`resources/binaries/darwin-arm64/bun`, 1.4.2, the pinned version): all six hooks dispatch and exit 0, the `realpathSync` self-invocation guard holds, stdin is read, the atomic write through `lib/platform/` works, an unknown hook id still exits 2, and `refine-validate` and `rules/build.mjs --check` both run. Cold start under bun: median ~22 ms, max 29.7 ms, against ~40 ms / 66.8 ms under node on the same host. **Scope of that claim:** macOS arm64 only. bun on Windows is untested here, and this project's test suite runs on node in CI, not bun.
4. **Sequencing:** `the-boss-integration` is the next phase after `karpathy-logs-node`.

## 2026-09-21 — karpathy logging uses the Rust `pk` CLI, vendored as a submodule (SUPERSEDES README §5.3 in part)

**Decision (operator):** do not write a Node-specific implementation of the Karpathy/OKF knowledge layer. Use the Rust `pk` CLI from `prometheus-knowledge-rs`, included here as a git submodule.

**Done:** `git submodule add -b main git@github.com:Prometheus-AGS/prometheus-knowledge-rs.git tools/prometheus-knowledge` — the same path the skill pack uses — pinned at `01a1dbe` (pk 1.8.0).

**What this supersedes.** README §5.3 says "`pk ingest` is gone (prometheus-knowledge is not one of the two kept services)" and collapses the result states to `recorded | duplicate | queued` on that basis. That reasoning no longer holds: `pk` is a CLI invoked per call, not a service, so it does not add a third daemon. The phase goals written from §5.3 are revised in `goals.md`.

**What `pk` covers, and what it does not** (`pk --help`, 1.8.0): `ingest, lint, focus, context, snapshot, search, get, list, stats, init, doctor, codegraph, events, migrate-*`. That is the knowledge/OKF half. It has **no progress recorder** — receipts, idempotency and the replay comparison live in the Python `record-progress.py`, which *calls* `pk ingest`. So the recorder half is still open: port it to Node as a thin caller of `pk`, or add it to `pk`. The float-hash finding in the assessment applies to that half and is unaffected.

**The premise that needs work: `pk` does not build for Windows today.** Verified at `origin/main` = `01a1dbe`:
- `pk-cli/src/main.rs:1216` — `use std::os::unix::fs::PermissionsExt;` inside `run_doctor`, in a file with **zero** `cfg(unix)`/`cfg(windows)` guards. That is a compile error for the `pk` binary on `x86_64-pc-windows-msvc`.
- `pk-learning-worker/src/main.rs` and `pk-store/src/prompt_snapshot.rs` use the same API with some guards (5 and 6); each use was **not** individually checked.
- The repository has **no CI workflows at all**, so nothing has ever built it on Windows, and it has **0 releases**, so there is no prebuilt binary for any platform.
- Dependencies are light (no RocksDB, SQLite or SurrealDB; `reqwest`, `tokio`, `notify`), so the port looks like a handful of `cfg` guards, not a rewrite. A patch for this was prepared in an earlier session's scratchpad and **never applied to any repository**.
- I could not verify a fix locally: no Windows rustup target is installed, and a cross `cargo check` would be unreliable for crates whose build scripts need the MSVC toolchain. The authoritative check is a `windows-latest` CI leg in the `pk` repo.

**Fallout in this repository, handled:**
- `no-shell-or-python-files` gained a pathspec exclusion for `tools/prometheus-knowledge` (it carries two upstream `.sh` files; `--no-index` scans the working tree). Pattern unchanged; mutation: a `.sh` directly under `tools/` is still caught.
- `rules/test/scaffold.test.mjs` now skips gitlink entries (git mode `160000`) in the LF-endings test — a submodule pointer is not a text file. Identified by mode, not path. Mutation: a genuine `i/crlf` index entry under `tools/` still fails the test. (My first mutation was invalid — `git add` normalised the CRLF — and I had to force the blob with `hash-object --no-filters`.)
- CI uses `actions/checkout@v4` without submodules, so the directory is empty there. Harmless until a test needs `pk`. The repo is PUBLIC, so HTTPS would work in CI where the SSH URL needs a deploy key.

**Tension with a standing constraint, stated rather than resolved:** the original brief says to support the Rust toolkit "but do not depend on loading any processes or services". A per-call CLI is not a service, but it *is* a process, and with 0 releases a user needs a Rust toolchain to get `pk` at all. Until `pk` ships binaries, this pack depends on something a clean Windows machine does not have.

## 2026-09-21 — `pk` builds and passes its tests on Windows; submodule pin moved to `80e864b` (SUPERSEDES "does not build for Windows" above)

The premise paragraph in the entry above — "`pk` does not build for Windows today", verified at `01a1dbe` — is **no longer true**. It is left in place as the record of what was true when the decision was made.

**Observed, not asserted.** pk PR #12 (`Prometheus-AGS/prometheus-knowledge-rs`), CI run 35644261220 at head `61688f1`: ubuntu 142 s, macOS 150 s, windows 209 s, all green. On `windows-latest`: 113 passed / 0 failed (macOS 115; the two absent tests are `#[cfg(unix)]` in source — `pk-store/tests/store_tests.rs:42`, `pk-learning-worker/src/main.rs:1291`). Merged 2026-09-21T21:09Z as merge commit `80e864b`, whose tree is identical to the tested `61688f1` (`git rev-parse <rev>^{tree}` on both). The pin is now `80e864b`.

**What the earlier entry got wrong.** It predicted "a handful of `cfg` guards, not a rewrite". The build did need only that (an unguarded `std::os::unix` import, jemalloc on MSVC, `fsync` on a directory). Running *correctly* needed more, none of it visible to a compiler: two competing home-directory lookups that disagree on Windows (the global KB became a literal `~` path), `is_safe_path` splitting on `/` only so `..\\..\\evil` escaped the wiki root (a security fix, and now stricter on unix too), and a CRLF body corrupting content hashes. The first three were found one CI failure at a time; the operator stopped that, and the rest came from one up-front audit. See `.prometheus/gotchas.md`.

**Still true:** pk has **0 releases**, so a clean machine has no `pk` and this pack must degrade without it. `pk doctor` is expected to report FAIL on a healthy Windows machine — a hypothesis from code reading, **not observed**; do not gate on it. `pk ingest` cannot succeed without a reachable LLM.

## 2026-09-21 — submodule pin moved to `abb6745` (OKF v0.2 writer merged); local `pk` binaries upgraded to 1.9.0

pk PR #13 (`okf-v02-writer`) merged as `abb6745` — CI green on all three OSes (ubuntu 151/0, macOS 151/0, windows 149/0; the two absent on Windows are the same `#[cfg(unix)]` tests noted above). The submodule pin moves from `80e864b` to `abb6745`. `git merge-base --is-ancestor abb6745 origin/main` on the pk repo: yes.

**Local binaries upgraded, operator-directed, outside any KBD change.** Built `cargo build --release -p pk-cli` from `abb6745` and installed to the two real locations on this machine: `~/.local/bin/pk` and `~/.prometheus/bin/pk` (`/usr/local/bin/pk` is a symlink to the latter, so one copy covers both). All three now report `pk 1.9.0`. `pk-cherry` was rebuilt and installed the same way.

**Deliberately not touched:** the dozens of project-local `.prometheus/knowledge/` directories under `~/Projects/` that a `find` for `pk`-shaped mentions surfaced. Installing a new binary writes nothing to them — only `pk ingest` / `pk snapshot` do, and none was run here. Section 7 of the `okf-v02-writer` PR already establishes that a knowledge base written by 1.9.0 is unreadable by 1.8.0 (and the reverse is fine); upgrading the binary is what makes 1.9.0 the one every future write in this account uses, not a migration of existing bases.

**Checked and not applicable:** `the-boss` and `compass` were checked for a pinned `pk` binary version or a `prometheus-knowledge` manifest reference — neither exists yet. That integration is unstarted (`the-boss-integration` phase), so there was nothing there to update.
