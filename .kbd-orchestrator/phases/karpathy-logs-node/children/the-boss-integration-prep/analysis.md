# Analysis — the-boss-integration-prep

Date: 2026-09-22. Mode: stack specified (Node ≥ 22, the `openspec/config.yaml` constraints). Input:
`assessment.md` (ten goals, nine NOT MET, nine open questions; an eleventh goal — the documentation
site — was added by the operator during this stage). Research budget used: Tier 3 (npm registry) 8 of 8
queries; Tier 1 (GitHub API) 8 of 8; Tier 2 (Context7/docfork) 0 — no candidate here has an API the
project has not already used; Tier 4 (web) 0. Wall time under the 20-minute cap. Two Tier-1 answers are
incomplete and are marked so: the GitHub API refused to list container packages without a `read:packages`
scope, and one repository lookup (`GQAdonis/liter-llm`) timed out at the TLS handshake.

## The landscape in one paragraph

Nothing in this child needs a library it does not already have. Every gap is either (a) a decision that
`config.yaml` has already bound and the tree has not honoured, (b) a small Node primitive on top of
`lib/platform/` (`spawnExecutable`, `atomicWrite`, `readText`), or (c) an external repository to vendor
and certify. The one genuine adopt is Docusaurus for the documentation site, and it lives in its own
`site/package.json` exactly as the full pack isolates it. The root `package.json` keeps zero runtime
dependencies: every "use a package" candidate below (dockerode, `@modelcontextprotocol/sdk`, ajv,
cross-spawn) is rejected for the same reason — the mini's tests assert the OpenSpec CLI is the only
dependency, `lib/platform/spawn.mjs` already gives shell-free process control, and each of those packages
buys less than a hundred lines of code would.

## Decisions on the open questions

### Q1 — `versions.toml`: the operator authors it; this analysis only proposes pins

`CLAUDE.md` §0.2 says agents read it before any dependency decision and do not edit it; it does not
exist. The constitution is not amended. **Decision:** every pin named in this analysis is a *proposal*,
recorded in `decision-log.md` and in the plan as "pending `versions.toml`"; the operator writes
`versions.toml` from those proposals (or overrides them) **before the plan's first pin-dependent change
starts** — that is the stage gate, and it is the operator's action, not an agent's draft awaiting a
signature. Until the file exists, no change that installs, vendors or pins anything may begin; the
housekeeping and documentation-site content work may. Proposed pins: Node `>=22` (engine floor, matches
`package.json`), `@docusaurus/core` and `preset-classic` `3.10.2`, the submodule commits — `pk`
`abb6745` (already vendored), OpenSpec fork `d39ca5a`, `sycophancy-correction` **at the post-fix fork
commit named in Q3, not the audit baseline** — and, if the-boss does not take it, `rust-mcp-filesystem`
`d977fbd`; the SurrealDB image `surrealdb/surrealdb:v3.0.5` (re-pinned by digest when `docker/` lands);
the two service sources as submodules — `liter-llm` `c5c6caac`, `surreal-memory-server` `452dab1` (Q1a) —
with their images recorded as "built from the submodule Dockerfile at the pinned commit" until a published
image is confirmed (the packages API could not be queried — see "What analyze could not establish").

### Q1a — Where the two service Dockerfiles come from: two more submodules, until images are published

`docker/compose.yaml` cannot `build:` from files the repository does not contain, and the mini has
neither service source — only the skill pack does (`tools/liter-llm` → `https://github.com/GQAdonis/liter-llm.git`
@ `c5c6caac`; `tools/surreal-memory-server` → `https://github.com/Prometheus-AGS/surreal-memory-server.git`
@ `452dab1`, both from the pack's `.gitmodules`). Two options: **(a)** vendor both as submodules and
`build:` from their Dockerfiles; **(b)** publish images to GHCR from each fork and `image:`-pin by digest.
(b) is better for users — `TOOL_ANALYSIS.md` §"Prioritized sequence" step 6 says "publish pinned images
to avoid multi-GB local Rust builds" — but it cannot be chosen yet: the packages API could not be
queried, no image is confirmed to exist, and publishing needs a workflow and a `write:packages` token in
each fork, which is the operator's. **Decision:** (a) now — `tools/liter-llm` @ `c5c6caac` and
`tools/surreal-memory-server` @ `452dab1` as submodules, pinned in `versions.toml`, exempted from the
`.sh` gate per Q8, used only as `build:` contexts (nothing under them is run on the host); and (b) as a
named follow-up for the operator — a `publish-image.yml` in each fork, after which `compose.yaml`
switches to `image:` + digest and the two submodules can be dropped. The first-start cost of (a) is
recorded honestly: a Rust build of each service inside Docker, minutes and gigabytes, once per machine.

### Q2 — Docker on Windows: detect and require; never install from the pack; fallback is what the design already is

Evidence: no Docker code exists in either repo; the source pack's precedent is `docker compose version`
in bash; `dockerode` (5.0.1, Apache-2.0, 6 deps) speaks to the daemon socket, which is a named pipe on
Windows and a Unix socket elsewhere — a platform branch the pack forbids. Installing Docker Desktop
needs administrator rights, a reboot, and enabling WSL 2 or Hyper-V; `config.yaml:42-45` says Docker's
backend is Docker's concern and the pack never enters WSL. **Decision:** `lib/platform/docker.mjs`
probes with `spawnExecutable('docker', ['version', '--format', '{{json .}}'])` — `Client` present and
`Server` absent means installed-but-daemon-down; a spawn error means absent — and reports one of
`absent | daemon-down | ready` with the version string. The installer and the doctor *require* `ready`
for the service steps and print the platform-specific next action (Docker Desktop on Windows/macOS,
the distribution's `docker` on Linux) without running it. There is no fallback path to build, because
the fallback already exists by construction: both services are optional and everything degrades without
them (`config.yaml:38-41`). Automated installation is handed to the-boss as a consent-gated UI action —
`winget install Docker.DockerDesktop` on Windows is a real executable the-boss may launch after the
user clicks — and is recorded as *not* something the pack does on its own. Rationale: an installer that
reboots the machine and enables a hypervisor is outside a skill pack's authority.

### Q3 — Homes: `sycophancy-correction` in the mini; `rust-mcp-filesystem` in the-boss

Evidence: the mini's `adversarial-review` port needs `sycophancy-correction` at review time, on every
host that runs the pack's CI; the-boss has no consumer of it. The mini has no consumer of a filesystem
MCP; the-boss launches stdio MCP servers, ships a built-in filesystem server already, and unpacks
`resources/**` on disk. Neither repository has a single release or Windows artifact (Tier 1: 0 releases
on all four). **Decision:** `sycophancy-correction` becomes `tools/sycophancy-correction` in the mini. Two
commits are distinct and must not be conflated: **`bc348fff` is the audit baseline** — the commit the
hazard sweep was run against, where the four blockers are still present (`config.rs:166` and
`skill.toml:73` default to `:8181`; `scripts/smoke-test.sh:40-42` uses `mktemp -u /tmp` and `mkfifo`;
no CI). **The landing pin is a new fork commit** on a repository the operator controls
(`Prometheus-AGS/sycophancy-correction`, to be created as a fork of `Know-Me-Tools/…`) that applies
exactly the four non-code fixes the audit named — repoint both `:8181` defaults to
`http://localhost:4000/v1`, replace the shell smoke test with a Node one, add `.github/workflows` with a
three-OS matrix plus `rust-version` and `.gitattributes`, delete the stale `ANTHROPIC_API_KEY` references
and the false `--port` doc line — and the submodule pins *that* commit once it exists and its CI is
green. Until then the pin is a named blocker in the plan, not a value in `versions.toml`. The mini's own
CI then builds and tests the submodule on three OSes as the certification the audit says is missing. `rust-mcp-filesystem` is handed to the-boss: it bundles the binary the
fork's own `cargo-dist` release produces (targets and MSI/npm/PowerShell installers are already declared;
the missing piece is a `windows-latest` test leg before the release matrix builds an untested `.exe`),
registers it as a namespaced second filesystem server with write off, and owns the confinement test
matrix on real Windows. The mini records the requirement in the handoff and does not vendor it.

### Q4 — The OpenSpec fork: a submodule, built on install, resolved by path

Evidence: the fork is `Prometheus-AGS/OpenSpec` `d39ca5a`, 1.13.1, two commits ahead of upstream (the
CRLF-preserving rewrite fix and karpathy logs); its `package.json` has `"prepare": "node build.js"` and
`files: ["dist","bin","schemas",…]`; `dist/` is git-ignored; its CI already has a `windows-latest` leg.
Two ways to consume it: **(a)** an npm git dependency `github:Prometheus-AGS/OpenSpec#d39ca5a` — npm runs
`prepare` on install and installs a real directory, not a symlink; **(b)** a submodule at
`tools/openspec` plus a Node install step that runs `npm ci` and `node build.js` inside it. Both need the
fork's devDependencies and a build; (a) additionally needs network `git` on every `npm ci`, hides the
pin inside `package-lock.json`, and gives the doctor nothing to inspect. **Decision:** (b), as the
operator directed — the submodule is the pin, `scripts/install.mjs` builds it through `process.execPath`
and npm's own JavaScript entry (`npm-cli.js`, never `npm.cmd`), `spawnNodeCli` gains a first-choice
resolver `tools/<name>/bin/<bin>.js` before falling back to `node_modules`, and the root `package.json`
drops `@fission-ai/openspec`. The two scaffold tests change deliberately: "pinned to an exact version and
the only dependency" becomes "the root has no dependencies and the CLI comes from `tools/openspec` at the
commit `versions.toml` names"; "runs from its JavaScript entry without a global install" keeps its
meaning against the new path. (a) is recorded as the rejected alternative and as the fallback if the
build-on-install step proves fragile on Windows CI.

### Q5 — Gateway: `:4000/v1` only

Evidence: `config.yaml:31-33` names one gateway; `:8181` is `openai-proxy`, excluded by
`TOOL_ANALYSIS.md`; both `sycophancy-correction` defaults and `adversarial-review`'s probe order name
`:8181`; every review in this repository so far ran through `:8181`, including this stage's. **Decision:**
the ports probe `http://localhost:4000/v1` and nothing else; the bearer comes from `LITER_LLM_API_KEY`
(the bridge's variable) or the git-ignored env file the compose stack uses; `401`/`403` is exit 3 with the
repair hint, not a second candidate. The vendored `sycophancy-correction` gets its `skill.toml` and
`config.rs` default repointed in the mini's fork commit. The historical `findings.json` files keep their
`:8181` records untouched — they are evidence of what ran, not configuration. `config.yaml` is not
amended; it was right.

### Q6 — OKF: the ports write v0.2

Evidence: `.prometheus/index.md` declares `0.2` (test-guarded), `pk` writes v0.2 (change 3), the
`adversarial-review` decision log and the `deep-research` report frontmatter write v0.1 (`timestamp`,
body `# Citations`). **Decision:** both ports emit v0.2 — `generated: { by, at }` as a mapping and
`sources` as structured entries, `type: Decision` / `type: research-report` — and read v0.1 leniently
(the spec requires consumers to tolerate older bundles). The mini's own artifacts stay on one version.

### Q6a — The `adversarial-review` port: shape decided, component by component

The goal requires analyze to decide the Node port's shape, not only where it lands. Evidence is the
audit (`assessment.md`, `assessment-evidence.md` E60–E70): five bash stages, 5,820 lines with 596 of
inline Python, an exit contract at `dispatch-judge.sh:9-15`, a caller-contract fallback, a named-pipe
sycophancy client, `findings.json` pinned by five real artifacts in this repository. Two alternatives
are rejected up front for every component: keeping the bash and running it under Git Bash (forbidden —
`config.yaml:10,14`), and a Rust rewrite (forbidden — no Rust toolchain or binary is required on a
Windows host, `config.yaml:46-49`). The port is Node under `lib/review/` (the path the README already
names) with one entry point `scripts/adversarial-review.mjs`; every component is a **build**:

| Component | Upstream | Port decision |
|---|---|---|
| Preflight | `preflight-models.sh` 286 | `lib/review/preflight.mjs`: reads the KBD models file (`.prometheus/kbd/models.toml` under the home directory, resolved through `lib/platform/paths.mjs` `homeDir()` — never a `~` or `$HOME` literal) `[roles]` and `project.json` `model_policy`; checks the gateway with `fetch('http://localhost:4000/v1/models')`; reads the liter-llm config for *key presence only* (`master_key` set or not) and never logs or copies a value; writes the same `.kbd-orchestrator/model-preflight.json` shape (status ∈ `ok|degraded|needs_configure|no_providers|unavailable|no_gateway|config_broken`), 24 h cache. |
| Packet builder | `build-review-packet.sh` 919 | `lib/review/packet.mjs`: **both layouts** — native-kbd `changes/<id>/{spec.md,tasks.json,verification.md}` and OpenSpec `openspec/changes/<id>/{specs/**,design.md,tasks.md}` (the gotcha of 2026-09-21: the bash builder cannot see OpenSpec changes); a `file_tree` that walks to depth 3 (the depth-2 gotcha); a `depends_on` manifest of untouched files a diff relies on (the missing-lockfile gotcha); per-field byte caps with a `truncation` block on every mode, not only research; `producer_model` required, never defaulted. |
| Model resolution | `kbd-model-resolve.sh` 330 | `lib/review/models.mjs`: precedence env → the models file (via `homeDir()`) → `project.json`, unchanged; gateway candidates collapse to `http://localhost:4000/v1` (Q5). |
| Judge dispatch | `dispatch-judge.sh` 379 | `lib/review/judge.mjs`: `fetch` POST `/chat/completions`, bearer from `LITER_LLM_API_KEY`, `temperature: 0` omitted for the same model-prefix list, 300 s timeout × 3 retries doubling on timeout-shaped failures; `cross_model_check` computed identically (`unverified-producer-unknown` / `same-model-collision` / `verified-distinct`); the exit contract 0/2/3/4 kept as the process exit code of the entry point and as the return value of the function. |
| Harness-native fallback | prose contract (`SKILL.md:278-283`) | Made code where it can be: on exit 3 the port writes `review/<target>/harness-native-request.json` = `{mandate, packet}` and prints the one-line instruction; the *calling session* still performs the subagent dispatch (no Node process can invoke the harness's Agent tool), then runs `scripts/adversarial-review.mjs --ingest <findings.json>` which validates the shape and stamps `isolation_mode: "harness-native"`. The skill document states the two-step explicitly. |
| Sycophancy gate | `check-findings-sycophancy.sh` 277 + `sycophancy.sh` | `lib/review/gate.mjs` over `cand-303` (the stdio JSON-RPC client); reject cap `PROMETHEUS_ADV_REJECT_CAP` with the same 1–5 bounds and refusal semantics; absent binary → warning and exit 0, exactly as upstream degrades. |
| Retry loop | `review-retry-loop.sh` 129 | `lib/review/retry.mjs`: two-round cap, `packet-r<N>`/`findings-r<N>` naming as this repository already uses. |
| Artifacts | `findings.schema.json`, `decision-log.sh` 236 | `lib/review/findings.mjs` validates against the same schema (structural validator, `cand-308` pattern); the decision log writes OKF **v0.2** (Q6). |
| `liter-llm-bridge` | 882 lines bash | Out of this port: the mini's `docker/` + `scripts/services.mjs` replace "install and configure a native gateway"; only `verify` survives, as a doctor check. |

Tests: the eight bash suites (1,507 lines) become `node:test` files under `lib/review/`; the fixture
trees carry over. This is the analysis for the `adversarial-review-node` phase's implementation; that
phase's own assess/analyze confirm it against the tree at the time rather than re-deriving it.

### Q6b — `deep-research`: build a Node checkpoint-mode port; do not move the code

The goal asks for a decision between (a) engineering a Node-only version and (b) moving the existing
code and making it Windows-compatible, with the changed LOC counted. **Decision: (a).** The reason is
categorical, not a matter of degree: the existing executable code is 32 `.sh` and 12 `.py` files and
`config.yaml:11-16` forbids both languages outright, so "move and make Windows-compatible" would rewrite
every executable line anyway — it is (a) with extra steps and a misleading history. What moves
unchanged is everything that is not executable: 5,586 lines of Markdown (ten stage skills, nine agent
prompts, fourteen references, five templates), 7 JSON schemas and 3 fixture packages. What is written
new: **3,463 lines of logic** — production shell 1,378 + hook shell 220 (`cat scripts/*.sh | wc -l`,
`cat hooks/*.sh | wc -l`) + production Python 1,865 (`cat scripts/*.py | wc -l`) — plus 1,588 lines of
bash tests (`cat tests/*.sh | wc -l`) re-expressed as `node:test`. Zero Rust: the server is the caller
of checkpoint mode, not a dependency (`headless-execution.md:4-9`), and it stays excluded. The port
keeps the driver's contracts exactly: exit 3 = `awaiting_stage` with the one-line JSON
`{next_stage, skill, package_dir}`, `checkpoint.json` resume semantics, the `research-package`
`format_version 2.0.0` manifest, the seven schemas, the `RESEARCH_*` environment names, Tavily and
Firecrawl as harness-side MCP servers (`cand-305`), `surreal-memory` optional, and OKF v0.2 report
frontmatter (Q6). Its stage-05 and stage-09→10 calls go to `lib/review/` (Q6a) and to the
`sycophancy-correction` binary (Q3), which is why it is last in the chain. This is the analysis for the
`deep-research-node` phase's implementation.

### Q7 — Sequencing, and what this child builds versus opens

The dependency chain is fixed by the audits: `sycophancy-correction` → `adversarial-review` →
`deep-research`. `config.yaml:88-90` binds `deep-research` and `adversarial-review` to be "each as its own
phase". **Decision (for the plan to confirm with the operator):** this child builds what is
infrastructure and what unblocks the chain, and *opens* the two phases rather than absorbing them:

1. Housekeeping — commit `COMPARE.md`, `TOOL_ANALYSIS.md`, archive `analyze-rust-tools-windows-portability`;
   draft `versions.toml` for signature.
2. `tools/openspec` submodule, `scripts/install.mjs`, the resolver change, the two test rewrites.
3. `tools/liter-llm` and `tools/surreal-memory-server` submodules (Q1a), then `docker/` (fresh
   `compose.yaml` building from those two Dockerfiles, `.env.example`, a redacted
   `liter-llm-proxy.example.toml` authored from the live file's key structure), `lib/platform/docker.mjs`,
   `scripts/services.mjs`.
4. `scripts/doctor.mjs` + `lib/doctor/` + the `doctor` skill — JSON-lines output whose check ids and
   `fix` actions mirror the-boss's `DoctorCheckRegistry` shape so the handoff can host them.
5. `tools/sycophancy-correction` submodule with three-OS CI in the mini and the fork commit that fixes the
   audit's four non-code items.
6. The documentation site (`site/`, `docs/guide/`, `docs-pages.yml`, README link and badge) — independent
   of 2–5, can run in parallel.
7. The `the-boss` handoff and the settings/doctor design brief (with `impeccable` and `ui-ux-pro-max`).
8. Open `adversarial-review-node` and `deep-research-node` as sibling top-level phases with their
   assessments seeded from this child's audits and evidence file, and their analyze stages seeded from
   Q6a and Q6b above — the build-vs-move decisions are made here; those phases implement them. They are
   not started here.

Rationale: the two ports are 3,463 and ~6,400 lines of logic respectively; folding them into a
"preparation" child would make the child larger than the parent phase and would contradict the binding
constraint that names them as phases. Deciding their shape here and building them there is the split
the goal asks for.

### Q8 — The `.sh`-ban gate and vendored trees

**Decision:** extend the gate's exemption list per vendored submodule path, exactly as it already exempts
`tools/prometheus-knowledge` — `tools/openspec` (the fork has shell in its own tooling), `tools/sycophancy-correction` (its
`scripts/smoke-test.sh` is replaced in the fork commit, but the gate should not depend on that),
`tools/liter-llm` and `tools/surreal-memory-server` (build contexts only; both carry shell). Ports under `skills/` and code under `lib/`/`scripts/` stay under the gate
with no exemption. The exemption list is a constraint edit and is called out in its own commit, as the
constraints file requires.

### Q9 — Landing spot: `Prometheus-AGS`, GitHub Releases, and one open positioning question

Evidence: the application's branding is `REPO_URL = github.com/Prometheus-AGS/the-boss`, `RELEASES_URL =
${REPO_URL}/releases` (`branding.ts:70-73`); the-boss's remote is `Prometheus-AGS/the-boss`; the site
says `Know-Me-Tools`, serves a 1.9.2 arm64 IPFS pin behind three buttons, and claims v2.2.0;
`electron-builder.yml:173-175` publishes to `releases.cherry-ai.com`. **Decision:** the organisation is
`Prometheus-AGS` (the app is the source of truth for its own identity); release artifacts live on
GitHub Releases of that repository, which the app already links to; the site's three platform buttons
resolve to per-platform assets there and its version string is read from the latest release, not typed;
the-boss's `publish` block changes to `provider: github` so the auto-updater checks its own releases —
a the-boss change, in the handoff. Whether "built on Cherry Studio" stays is positioning, not
engineering; it is the one item on this list the operator decides.

### Q10 — The documentation site: port the full pack's shape

Evidence: the full pack's `site/` is Docusaurus 3.10.2 (`@docusaurus/core` latest is 3.10.2, published
2026-09-18, MIT, node `>=20`), reads `../docs/guide` and `../docs/learn` in place through `path:` plugin
options, generates a catalog from `skills/**/SKILL.md` with a `.mjs` script, builds with
`docs-pages.yml` on push to `main` (paths-filtered, SHA-pinned actions, Node 24, `npm ci` in `site/`,
`upload-pages-artifact` → `deploy-pages`, workflow-type Pages), and links the site plus a build badge at
the top of `README.md`; `site/` contains no shell. **Decision:** adopt that shape wholesale. `site/` gets
its own `package.json` and `package-lock.json` (the workflow's `cache-dependency-path` needs it); the
root's "only dependency" test is scoped to the root and untouched by it; the constraint gate's greps
target `lib/ scripts/ hooks/ rules/` and do not see `site/`, which is correct — but `site/scripts/*.mjs`
must still obey the shell-free rules, so the plan adds `site/scripts` to `carried-mjs.test.mjs`'s walk.
`docs/guide/` is new content, written for the mini (its skills, tools, hooks, services, doctor, the
KBD flow), not copied from the full pack's 24 pages. Enabling Pages on the repository is a one-time
operator action (`gh api -X POST repos/Prometheus-AGS/prometheus-skills-mini/pages` needs admin) and the
workflow's own comment says so.

## Candidates, with verdicts

The machine contract is `library-candidates.json`. In prose:

- **adopt** — Docusaurus 3.10.2 (`cand-304`); the full pack's `docs-pages.yml` and `site/` layout
  (`cand-313`); the-boss's existing subsystems as the integration substrate (`cand-310`: `builtinSkills.ts`,
  `SkillService.reconcileSkills`, `DoctorCheckRegistry` with its `fixes` contract, `preferenceSchemas.ts`,
  `settingsMenu.ts`, `mcpStdioLaunch.ts`); the SurrealDB image `v3.0.5` (`cand-312`); `tavily-mcp` and
  `firecrawl-mcp` as *harness-side* stdio MCP servers the `deep-research` port talks to, never mini
  dependencies (`cand-305`).
- **adapt** — the OpenSpec fork via submodule + build-on-install (`cand-306`); `sycophancy-correction`
  via submodule + a fork commit fixing four non-code items (`cand-309a`); `rust-mcp-filesystem`'s own
  `cargo-dist` configuration as the model for `sycophancy-correction`'s Windows release (`cand-309`).
- **build** — `lib/platform/docker.mjs` (`cand-301`); `docker/compose.yaml` fresh from the two Dockerfiles
  (`cand-311`); a hand-rolled stdio JSON-RPC client for `detect_sycophancy` (`cand-303`, ~60 lines:
  `initialize`, `notifications/initialized`, `tools/call`); a structural validator for the research
  schemas (`cand-308`); the doctor.
- **reject** — `dockerode` (platform-specific socket, a dependency); `@modelcontextprotocol/sdk` (17
  dependencies for two JSON-RPC messages); `ajv` (a dependency for schemas the port controls);
  `cross-spawn` (the mini never spawns `.cmd`; `spawnNodeCli` already runs npm CLIs by their JavaScript
  entry); the npm git-dependency form of the fork (`cand-307`); automated Docker Desktop installation from
  the pack (`cand-302`).

## What analyze could not establish

- Whether either service fork publishes a container image: the GitHub packages API needs a
  `read:packages` scope this session's token lacks. Until known, `docker/compose.yaml` uses `build:`
  against the submodule Dockerfiles, and `versions.toml` says so.
- `GQAdonis/liter-llm`'s repository metadata (TLS timeout on one call); its Dockerfile and compose facts
  come from the local checkout in the evidence file and are not affected.
- Memory footprint of the two services on Windows — `TOOL_ANALYSIS.md` says the same; it is measured
  when `docker/` runs, not estimated here.

## Unresolved review findings (adversarial review, two rounds — the skill's cap)

Judge `kbd-judge` over `rest-gateway:http://localhost:8181/v1`, producer `claude-fable-5-1`,
`cross_model_check: verified-distinct` both rounds; artifacts in `review/analyze/`.

- Round 1 (BLOCK; 4 CRITICAL): `versions.toml` proposed as agent-drafted (contradicts §0.2) — **fixed**,
  operator-authored, pins only proposed (Q1); `sycophancy-correction` landing pin conflated with the audit
  baseline — **fixed**, post-fix fork commit named as the pin and as a blocker (Q3); the adversarial-review
  port shape not decided — **fixed**, Q6a and cand-314..318; deep-research build-vs-move deferred —
  **fixed**, Q6b and cand-319.
- Round 2 (BLOCK; 1 CRITICAL, 2 WARNING): the two service Dockerfiles had no source in this repository —
  **fixed**, Q1a (two more submodules, image publishing as an operator follow-up), Q1, Q7, Q8, cand-320/321;
  four rejected packages named in prose but absent from the machine contract — **fixed**, cand-322..325;
  a `~` literal in the port shape — **fixed**, resolved through `lib/platform/paths.mjs`. **Not re-vetted**:
  cap reached. The plan's own review sees the corrected text.

## Open questions carried to plan

1. Operator: confirm that `adversarial-review-node` and `deep-research-node` open as sibling phases
   rather than being built in this child (Q7).
2. Operator: sign `versions.toml` once drafted (Q1).
3. Operator: enable GitHub Pages on the mini repository (Q10) and decide the "built on Cherry Studio"
   positioning (Q9).
4. Plan: whether the doctor's repair actions run from the CLI (`--fix`) as well as from the-boss UI, or
   report-only from the CLI — the safe default is report-only with `--fix` limited to actions that are
   idempotent file copies.

### Q11 (addendum, spec stage) — `compass`: vendor at a tagged fork commit; stdio only; the-boss ships the fork's release tarball

Evidence: the assessment addendum. The fork is 37 commits ahead of upstream with no releases and a dirty
side-branch tree; upstream releases the exact MSVC tarballs the-boss needs. Two things must not happen:
vendoring from the dirty checkout, and enabling `--transport http` or `watch`. **Decision:** (1) the
operator tags a clean commit on `GQAdonis/compass` `main` (merging `docs/claude-md` first if those 37
commits are wanted) and runs the fork's existing `compass-release.yml` — a "run it" problem, the
pipeline already builds all six targets; (2) the mini vendors `tools/compass` at that tag, pinned in
`versions.toml`, exempt from the no-shell gate (its `scripts/` are dev tooling), and its CI job runs
`cargo test -p compass-mcp -p compass-cli` on the three OSes as certification — the pack itself never
builds compass on a user's host; (3) the-boss downloads the fork's release tarball for the platform
(`compass-<target>.tar.gz` + `.sha256`, verified) into `resources/` at build time and registers
`{"command": "<resources>/compass", "args": ["serve", "--transport", "stdio"]}` as a stdio MCP server;
(4) the doctor's `mini.compass` check resolves the binary, runs `compass --version`, and **fails** if any
registered MCP config for compass carries `--transport http` or if a `compass watch` process is
configured — the two-service budget is enforced where compass is spawned, because the CLI will bind
`:8080` on request. `rust-mcp-filesystem`'s cargo-dist question does not arise here: compass has its
own release workflow. Candidates: `cand-326` (adapt: vendor + certify), `cand-327` (adopt: the fork's
`compass-release.yml` as the artifact source), `cand-328` (reject: HTTP transport and `watch`).

### Q12 (addendum, plan stage) — never natively beside the full pack: detection and enforcement

Operator constraint, now binding in `openspec/config.yaml`. Evidence from this host (which has a full
install): `~/.prometheus/setup-state.json` (keys `last_run`, `components`), `~/.prometheus/capabilities.json`,
the `prometheus` CLI at `~/.local/bin/prometheus` (1.10.0), `~/.claude/skills/kbd-process-orchestrator/` and
`~/.agents/skills/kbd-process-orchestrator/` (608 skill directories under `~/.claude/skills`), and ten
`ai.prometheus.*` launch agents. **Decision:** `lib/platform/full-pack.mjs` `detectFullPack()` returns the
list of markers found among: `prometheus` resolvable on PATH (`spawnExecutable`, `--version`),
`<home>/.prometheus/setup-state.json` present, `<home>/.claude/skills/kbd-process-orchestrator` or
`<home>/.agents/skills/kbd-process-orchestrator` present, and — platform-specific, read-only —
`~/Library/LaunchAgents/ai.prometheus.*.plist` (macOS), `~/.config/systemd/user/ai.prometheus.*` (Linux);
Windows has no native full-pack service form, so the first three markers decide there. Any marker →
`present`. Enforcement lives in three places: `scripts/install.mjs` refuses native mode (`--home`) and
allows only `--app-data <dir>` when present; the doctor check `mini.install-scope` fails when a mini skill
copy exists under `<home>/.agents/skills` or `<home>/.claude/skills` while the full pack is present, and
`copy-skills` refuses on the same condition; the-boss handoff item 2 skips the push and shows a notice.
The rule is asymmetric on purpose: the full pack may live anywhere; the mini yields.
