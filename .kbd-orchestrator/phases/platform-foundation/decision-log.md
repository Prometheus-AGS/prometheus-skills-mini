# Decision log — platform-foundation

### 2026-09-21T03:10Z — pk submodule pointer
Options: repoint .gitmodules to git@github.com:Prometheus-AGS/prometheus-knowledge-rs.git vs leave as is
Decision: leave as is | Provenance: research
Both .gitmodules already reference Prometheus-AGS/prometheus-knowledge-rs over https; the 404 URL appears in no tracked file. https → ssh is an owner decision (it breaks token-based clones).

### 2026-09-21T03:20Z — pk Windows patch
Options: apply in the operator's clone vs prepare in a scratch export
Decision: scratch export only | Provenance: user (the operator declined the step that would have modified the clone)
3 files, +49 −8, against 01a1dbe. `cargo check -p pk-store -p pk-learning-worker -p pk-cli -j 4` → exit 0 on aarch64-apple-darwin. Windows branch unverified. Rename-retry omitted: unobserved (A-2).

### 2026-09-21T03:25Z — spawning Node CLIs on Windows
Options: resolve the .cmd shim vs cross-spawn vs process.execPath + JS entry
Decision: process.execPath + JS entry, with @fission-ai/openspec as a pinned devDependency | Provenance: research
Node documents that .bat/.cmd cannot be launched without a shell. rules/src/project/node-scripts.md corrected and rebuilt.

### 2026-09-21T03:40Z — log format
Options: keep OKF v0.1 (what pk and the source pack write) vs OKF v0.2
Decision: write v0.2, read v0.1 and v0.2 | Provenance: user ("latest version") + research (SPEC.md declares 0.2)
log.md is newest-first and OKF does not cover event streams, so events.jsonl stays the append-only truth and log.md is rendered from it.

### 2026-09-21T03:50Z — Karpathy accumulation on Windows
Options: A Node only · B pk native · C pk in Docker · D Node primary + pk optional
Decision: D (recommended; awaiting owner) | Provenance: research
Matches how every pk call site in the source pack already degrades.

### 2026-09-21T04:30Z — three tiers of log
Options: submodules · symlinks · sources registry + home clones · surreal-memory · package
Decision: sources registry + home clones, with a per-phase sources receipt checked by the stage gate (recommended; awaiting owner) | Provenance: user (requirement) + research
Team logs change only by pull request; promotion from a private log is per-entry opt-in.

### 2026-09-21T04:30Z — porting deep-research and adversarial-review
Options: port now vs phase after platform-foundation
Decision: phase after platform-foundation | Provenance: research
~15,000 lines with exit-code contracts; both need lib/platform plus a gateway client, a TOML reader and an OKF reader/writer. Porting first would create duplicate copies of each.

### 2026-09-21T06:00Z — spawn goal revision
Options: keep the infeasible goal vs revise it
Decision: revised — npm CLIs run via process.execPath + their JS entry; a .cmd-only tool is refused with a clear error | Provenance: user (accepted explicitly)
Unblocks /kbd-plan. lib/platform contract: spawnNodeCli(package, bin, args) and spawnExecutable(name, args); no third function.

### 2026-09-21T09:10Z — spec stage: adversarial review
Round 1 BLOCK (1 CRITICAL, 2 WARNING): no acceptance criteria for "AAA, tests written first"; atomicWrite parent-directory creation untested; the CRLF GREEN task narrower than its requirement. All fixed.
Round 2 BLOCK (1 CRITICAL): ci-three-os required the CI validation step to name node_modules/@fission-ai/openspec while platform-spawn required that no step does. Fixed with a MODIFIED delta to `continuous-integration` inside platform-spawn. Two rounds is the cap: THIS FIX IS UNREVIEWED.
The review packet was assembled by hand: build-review-packet.sh --target spec reads only the native-kbd layout and finds nothing under the openspec backend.
