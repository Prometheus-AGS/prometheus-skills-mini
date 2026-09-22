# Goals — the-boss-integration-prep

Child of `karpathy-logs-node`. Scope amended 2026-09-22 by the operator to add `deep-research`, its prerequisite `adversarial-review`, the `openspec` fork as a submodule, the `boss-landing-spot` site, a Docusaurus documentation site with GitHub Pages, and the `compass` fork (added at spec). A final review of where the mini pack actually stands, grounded on
`COMPARE.md` and `TOOL_ANALYSIS.md`, and the preparation for the next full phase: integrating the pack with
`the-boss` (the controller application, cross-platform, Windows being the point) so that `the-boss` ships,
installs, checks, and controls this skill system on every host. The-boss code changes themselves belong to
that next phase; this child decides and prepares, and builds what belongs in the mini pack.

## Outcome goals

- **The review is evidence, not opinion.** `COMPARE.md` and `TOOL_ANALYSIS.md` are read in full and each
  claim they make about the mini pack is checked against the tree as it is today, not as those documents
  remember it. The assessment names every claim in `README.md` that the tree does not honour — starting
  with the `docker/` directory the README describes and the tree does not contain.
- **The two permitted services are installable from this repository on every platform.** `docker/`
  exists and carries what `openspec/config.yaml` already binds it to: `compose.yaml` for `surrealdb`,
  `surreal-memory` and `liter-llm`, loopback-only ports, a git-ignored env file, named volumes, memory
  limits, pinned images. A Node installer (`scripts/`, `lib/platform/` — no `.sh`, no `.ps1` without a
  cross-platform twin) can run it as part of installing `the-boss` or as an onboarding step `the-boss`
  drives. Verified by running it, on the platforms it can be run on here; the rest labelled self-reported.
- **Docker's presence on Windows is detected and handled, and the choice is deliberate.** Detect
  `docker` (and whether its daemon answers). Decide in analyze among: require it with a clear message,
  provide a fallback, or automate its installation — and record why. Nothing in this pack enters WSL or
  calls `wsl.exe` (config.yaml); Docker's backend stays Docker's concern.
- **`sycophancy-correction` is a Windows-compatible stdio MCP server available to the mini pack.** Decide
  in analyze whether it is vendored as a submodule under `tools/` (as `pk` is) or installed by `the-boss`;
  its code is audited for Windows compatibility the way `pk` was — every hazard class up front, not one CI
  failure at a time (`.prometheus/gotchas.md`). It stays STDIO, logs to stderr, uses no unix-only APIs.
- **The `rust-mcp-filesystem` fork has a decided home.** Submodule under `tools/` here, or shipped and
  installed by `the-boss` (the stated preference). Decided in analyze with the reason recorded; if it lands
  in `the-boss`, this child hands the requirement over rather than building it.
- **A `doctor` exists as a Node tool and a skill, and can repair.** `scripts/doctor.mjs` (the README already
  names it) checks the pack's health on any platform — Node version, the two services, `pk`,
  `sycophancy-correction`, Docker, the skill copies under `$HOME/.agents` and `$HOME/.claude`, the KBD state
  — reports as JSON one JSON object per line so a UI can render it, and offers automatic correction for
  what it can safely correct. Its checks are the contract `the-boss`'s settings UI will render.
- **`adversarial-review` is shipped by the mini pack, not borrowed from the host.** Every review in this
  project so far has run from the skill pack installed on this macOS host; the mini ships none of it
  (`COMPARE.md`: "planned, not currently shipped"). The source is bash plus inline Python. This child
  assesses it the way the other candidates are assessed — packet builder, preflight, model resolution,
  critic and judge dispatch over the loopback `liter-llm` gateway, the exit contract, the
  `harness-native` fallback with `isolation_mode` recorded, the sycophancy MCP client, the findings and
  decision-log artifacts — and analyze decides the Node port's shape. It is a prerequisite: the
  `deep-research` port below must call it (stage 05 verify and stage 06 resolve already do upstream), so
  it is sequenced first and its absence on a host is a degraded review, never a skipped one.
- **`deep-research` has a Windows-native path, and the choice between building and moving is decided.**
  The source pack's ten-stage research pipeline (plan → search → retrieve → collect → verify → resolve →
  graph → cite → report → export) is assessed the way the other candidates are: every executable file
  inventoried, every POSIX-only dependency named, the Rust research server (`:7891`) and surface bridge
  (`:7890`) treated as excluded per `config.yaml`, and "checkpoint mode only" given a concrete definition.
  Analyze decides between (a) engineering a Node-only version for the mini pack that keeps the source
  pack's request/report/citation contracts, or (b) moving the existing code and making it
  Windows-compatible — with the reason recorded, and the LOC that must change counted by a command.
  Whichever is chosen, it keeps working with both services down and never adds a third resident process.
- **The `openspec` CLI the mini runs is the Prometheus fork with its Windows fixes, vendored as a
  submodule.** Today the mini pins upstream `@fission-ai/openspec@1.10.0` from npm as its only dependency;
  the fork (`Prometheus-AGS/OpenSpec`, currently 1.13.1) carries a Windows fix upstream does not — a file
  rewritten on a CRLF checkout keeps its line endings, and `npm.cmd` is spawned through `cross-spawn`. The
  fork becomes a submodule under `tools/`, the mini's `spawnNodeCli` resolves the CLI's JavaScript entry
  from it, and analyze decides how the fork's `dist/` (git-ignored; built by `node build.js`) is produced on
  a clean checkout without a symlink, a shell, or a global install — the constraints the existing
  "pinned CLI, only dependency, runs from its JavaScript entry" tests already enforce and must keep
  enforcing against the new source.
- **The boss landing spot tells the truth about the application it advertises.** `boss-landing-spot`
  (`Know-Me-Tools/boss-landing-spot`, the site at `the-boss.know-me.tools`) names the wrong GitHub
  organisation, a download that is two minor versions and one architecture behind, and a version string
  that matches neither the download nor the application. This child records every identity, URL, version
  and platform claim on the site against `the-boss`'s own branding and build configuration, and the
  handoff names what the next phase changes on the site and — where the site is right and the application
  is wrong, as with the update server — what changes in `the-boss` instead.
- **The mini has its own documentation site, published the way the full pack publishes.** A `site/`
  Docusaurus project whose content plugins point at a new `docs/guide/` (the full pack keeps its 24-page
  guide there and its site reads it in place), a skills catalog generated from `skills/**/SKILL.md`, a
  `.github/workflows/docs-pages.yml` that builds on push to `main` and deploys with workflow-type
  GitHub Pages (SHA-pinned actions, as the full pack pins them), the Pages setting enabled on the
  repository, and a link plus a build badge at the top of `README.md` — the same three things a reader
  finds on the full pack's home page. No shell in `site/`; the generator scripts are `.mjs`. Decided
  in analyze: the Docusaurus version to pin, whether the site directory carries its own lockfile (the
  full pack's does, and its workflow caches on it), and how the constraint gate treats a second
  `package.json`.
- **The `compass` fork is vendored, certified for Windows, and installed by `the-boss` as a platform-built
  Rust component.** `compass` (`~/Projects/references/compass`, a Rust workspace with a CLI and MCP servers)
  joins the pack the way `pk` did: audited on every Windows hazard class before any pin, vendored under
  `tools/` at a named commit, built and tested on three OSes in this repository's CI, its MCP servers kept to
  stdio with stderr-only logging and no resident process or port, and its binaries shipped by `the-boss` for
  each platform from release artifacts — never built on the user's machine. Added at spec time; assess and
  analyze addenda record its audit and its decisions before its change is written.
- **The handoff to the `the-boss` integration phase is written, not implied.** A handoff document that
  the next phase can execute from: (1) the skill system is part of `the-boss`'s default skill set, present
  even on a box where an older `the-boss` already ran, running from the application-data directory;
  (2) on every startup — not only the first — `the-boss` reconciles copies into `$HOME/.agents` and
  `$HOME/.claude` skills directories so other tools and CLIs find them, with a UI that tells the user when
  it is doing so; (3) a settings surface and settings schema for this skill system — health, configuration
  parameters, the doctor with one-click repair — designed with the `impeccable` and `ui-ux-pro-max` skills
  and captured as a design brief the next phase implements; (4) which of `sycophancy-correction`,
  `rust-mcp-filesystem` and the services `the-boss` installs, and how. Every `the-boss` code change is a
  named item in that handoff, never started here.

## Constraints that bind this child (from `openspec/config.yaml` and CLAUDE.md §P)

- Exactly two resident services; no third daemon or port. Node LTS is the only script runtime; no `.sh`,
  no `.py`; `spawn` with `shell: false`; paths via `path.join`/`os.homedir()`/`os.tmpdir()`; copies, never
  symlinks. Everything keeps working with both services down.
- **The mini is never installed natively on a machine that has the full skill pack** (operator constraint,
  2026-09-22, now `openspec/config.yaml`): on such a machine it runs only inside the-boss's application
  data directory. The installer refuses, the doctor fails a native copy beside a full install, and the-boss
  skips its home-directory push with a visible notice. Markers: the `prometheus` CLI on PATH,
  `~/.prometheus/setup-state.json`, a `kbd-process-orchestrator` skill directory, an `ai.prometheus.*` unit.
- `.prometheus/decisions.md` records each decision with its reason; `gotchas.md` records each learned
  constraint. `versions.toml` is read before any dependency decision and is not edited by agents.

## Process goals — carried from `karpathy-logs-node`

- **Verify the claim, not just the code.** A claim of Windows behaviour is self-reported until a
  `windows-latest` run with a named asserting test says otherwise; this phase found two such gaps in its
  own tests only because real CI ran.
- **Audit every platform hazard class before the first push; never fix one CI failure at a time**
  (`.prometheus/gotchas.md`, "porting `pk` to Windows one CI failure at a time").
- **On any accepted finding, search the whole tree for the pattern before fixing the instance.** The
  `path.relative()`-versus-POSIX-literal bug was found in one file and was present in two.
- **Plan-time path check:** every task naming a file names the earlier task that creates it.
- **Every count cites the command that produced it.**
- **The review gate is open** (liter-llm key supplied; `MiniMax-M3` critic and `k3` judge verified live):
  every artifact in this child is adversarially reviewed cross-family, and the judge is named.
