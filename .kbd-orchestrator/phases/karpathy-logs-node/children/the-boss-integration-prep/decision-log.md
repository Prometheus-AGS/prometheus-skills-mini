# Decision log — the-boss-integration-prep (child of karpathy-logs-node)

### 2026-09-22T10:20Z — versions.toml is authored by the operator; this analysis only proposes pins
Options: agent drafts and operator signs · operator authors from proposed pins · amend the constitution
Decision: **operator authors; the proposed pins are recorded here and in analysis.md Q1; no pin-dependent change starts before the file exists** | Provenance: research — corrected after round-1 review
CLAUDE.md §0.2: agents read it and do not edit it. An agent-drafted file awaiting a signature would still be
an agent edit; the constitution is not amended. Proposed pins: Node >=22; Docusaurus 3.10.2; pk abb6745;
OpenSpec fork d39ca5a; sycophancy-correction at the post-fix fork commit (not bc348fff, the audit baseline);
rust-mcp-filesystem d977fbd if the-boss does not take it; surrealdb/surrealdb:v3.0.5 (digest when docker/
lands); the two service images built from submodule Dockerfiles until a published image is confirmed.

### 2026-09-22T10:20Z — Docker on Windows
Options: require with a clear message · fallback path · automate installation
Decision: **detect and require; no fallback to build; no installation from the pack** | Provenance: research
`lib/platform/docker.mjs` reports `absent | daemon-down | ready` from `docker version --format '{{json .}}'`.
The fallback already exists by construction (both services optional, `config.yaml:38-41`). Installing
Docker Desktop needs admin, a reboot and a hypervisor feature — handed to the-boss as a consent-gated UI
action, never run by the pack. `dockerode` rejected (platform-specific socket, a dependency).

### 2026-09-22T10:20Z — homes for the two MCP binaries
Options: both as mini submodules · both in the-boss · split
Decision: **`sycophancy-correction` → mini submodule `tools/sycophancy-correction` at a post-fix fork commit (audit baseline `bc348fff` is not the pin); `rust-mcp-filesystem` → the-boss** | Provenance: research — pin corrected after round-1 review
The mini's `adversarial-review` port is the only consumer of the first; the-boss is the only consumer of
the second and already launches stdio MCP servers and unpacks `resources/**`. Neither has a release; the
mini's CI certifies the first on three OSes, the fork's existing `cargo-dist` config releases the second
once a `windows-latest` test leg is added.

### 2026-09-22T10:20Z — the OpenSpec fork
Options: submodule + build-on-install · npm git dependency (`prepare` builds) · both
Decision: **submodule `tools/openspec` @ `d39ca5a`, built by `scripts/install.mjs`, resolved by path** | Provenance: user (submodule) + research (mechanism)
The fork's `prepare` script builds `dist/`; npm is invoked by its JavaScript entry, never `npm.cmd`; the
root `package.json` drops `@fission-ai/openspec` and ends with zero dependencies; the two scaffold tests
are rewritten deliberately. Git-dependency form kept as the documented fallback.

### 2026-09-22T10:20Z — the gateway is :4000/v1 only
Options: `:4000` only · accept `:8181` as a second candidate and amend config.yaml
Decision: **`:4000/v1` only** | Provenance: research
`:8181` is the excluded `openai-proxy`. The vendored `sycophancy-correction` gets both defaults repointed
in the fork commit. Historical `findings.json` records stay as evidence.

### 2026-09-22T10:20Z — OKF version in the ports
Options: write v0.1 as upstream does · write v0.2 and read v0.1
Decision: **write v0.2, read v0.1** | Provenance: research
`index.md` declares 0.2 and `pk` writes 0.2; one version across the mini's own artifacts.

### 2026-09-22T10:20Z — what this child builds versus opens
Options: build the two ports here · open them as sibling phases
Decision: **open `adversarial-review-node` and `deep-research-node` as sibling phases; build the infrastructure here** | Provenance: research — **operator confirmation requested at plan**
`config.yaml:88-90` binds each to be its own phase; together they are ~10,000 lines of logic, larger than
the parent phase. Chain: `sycophancy-correction` → `adversarial-review` → `deep-research`.

### 2026-09-22T10:20Z — the .sh-ban gate and vendored trees
Options: exempt per submodule path · forbid vendoring anything with shell
Decision: **exempt per submodule path, in its own commit** | Provenance: research
Precedent: `tools/prometheus-knowledge` is already exempt. Ports under `skills/` carry no exemption.

### 2026-09-22T10:20Z — landing spot identity
Options: `Know-Me-Tools` (site) · `Prometheus-AGS` (application)
Decision: **`Prometheus-AGS`; releases on GitHub Releases; the-boss `publish` → `provider: github`** | Provenance: research — **"built on Cherry Studio" positioning is the operator's call**
The application's `branding.ts:70-73` is the source of truth for its own identity; the auto-updater must
stop checking `releases.cherry-ai.com`.

### 2026-09-22T10:20Z — the documentation site
Options: port the full pack's `site/` shape · a different generator
Decision: **port the shape: Docusaurus 3.10.2, `site/` with its own lockfile, `docs/guide/`, `docs-pages.yml`, README link + badge** | Provenance: user (parity with the full pack) + research (mechanism)
Shell-free already; `site/scripts/*.mjs` joins the carried-mjs scan; Pages enablement is an operator action.

### 2026-09-22T10:40Z — the adversarial-review port's shape
Options: keep bash under Git Bash · Rust rewrite · Node under lib/review/
Decision: **Node, component by component (analysis.md Q6a, cand-314..318)** | Provenance: research — added after round-1 review
Git Bash and Rust are both forbidden by config.yaml. Every component is a build; both packet layouts,
depth-3 tree, depends_on manifest, :4000 only, fallback made code where it can be, OKF v0.2 decision log.

### 2026-09-22T10:40Z — deep-research: build (a), do not move (b)
Options: (a) Node-only checkpoint-mode port · (b) move the bash/Python and make it Windows-compatible
Decision: **(a)** | Provenance: research — added after round-1 review
Categorical: config.yaml:11-16 forbids both source languages, so (b) rewrites every executable line anyway.
3,463 logic lines new (commands in analysis.md Q6b); 5,586 prose lines, 7 schemas, 3 fixtures move unchanged;
0 Rust. Contracts kept verbatim (exit 3 awaiting_stage, checkpoint.json, manifest 2.0.0, RESEARCH_* names).

### 2026-09-22T10:55Z — where the two service Dockerfiles come from
Options: vendor `liter-llm` and `surreal-memory-server` as submodules and `build:` · publish images to GHCR and `image:`-pin by digest
Decision: **submodules now (`c5c6caac`, `452dab1`), image publishing as an operator follow-up** | Provenance: research — added after round-2 review
No published image could be confirmed (packages API needs a scope this session lacks); publishing needs a
workflow and a `write:packages` token in each fork. Build contexts only; nothing under them runs on the
host; `.sh` gate exemption per submodule. Once images exist, compose switches to digest pins and the two
submodules are dropped.

### 2026-09-22T11:05Z — the two ports open as sibling phases (operator confirmation)
Options: build `adversarial-review-node` and `deep-research-node` in this child · open them as sibling top-level phases
Decision: **sibling phases** | Provenance: user
Confirms analysis.md Q7. This child specs the infrastructure and the handoff; the two phases inherit Q6a/Q6b as their analyze inputs.

### 2026-09-22T11:30Z — compass (operator scope addition at spec)
Options: vendor from the current checkout · vendor at a tagged clean fork commit · rely on upstream releases only
Decision: **tagged clean fork commit under `tools/compass`; stdio only; the-boss ships the fork's release tarball; doctor enforces no HTTP transport and no watch** | Provenance: user (scope) + research (mechanism)
Windows is a tested CI target upstream; the fork has 0 releases and a dirty side-branch tree — the operator tags and runs `compass-release.yml`. See analysis.md Q11, cand-326..328.
