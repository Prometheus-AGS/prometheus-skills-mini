# Goals — the-boss-integration-prep

Child of `karpathy-logs-node`. A final review of where the mini pack actually stands, grounded on
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
