# Changelog

All notable changes to prometheus-skills-mini are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Earlier releases are
recorded in the git history and in `COMPARE.md`; this file starts at 1.16.0.

## [1.21.0] - Unreleased

- **Eval grader reads reasoning-model replies.** The grader's token limit is raised and its verdict is read after any `<think>` block, which had left 12 of 54 samples ungraded. `evals/vlbv-protocol/regrade.mjs` grades such samples again from retained transcripts without new agent sessions.
- **Opt-in qualification cases (#98).** `evals/vlbv-protocol/run.mjs --corpus outcome-first` runs nine agent cases for outcome-first resume, blocker advice and the bounded memory lookup against the generated package, with `--no-helper` for the fallback without `prometheus`. The default corpus and its reports are unchanged. No model session has been run yet; status is in the change's `receipts/README.md`.
- **Native services start through a Node launcher.** The launchd and systemd units now run a private `start-service.mjs` with the installing Node binary; Mini no longer generates a shell script. Credentials stay in `launch.json`. An existing installation is re-applied once, and its earlier launcher is removed after the new job starts. Each native service now keeps one Node parent process.
- **Phase closure with the real CLI.** An exceeded budget is reported in the full pack's wording (`budget-exceeded(exceeded:…)`). Two evaluators closing one phase at once no longer leave the second exiting 1 on a held completion-action lock; it waits for the first. Adoption writes the contract snapshot to the phase's canonical projection directory as well, so a nested bound phase closes under runtimes from full pack 1.18.
- **Existing-project and rules audit on Windows.** A project path given as an 8.3 short name is accepted as the Git top-level, and linked worktrees are reported by native path.
- **Test suite repairs.** Stale fixtures and assertions corrected, the vendored phase-closure corpus refreshed to full-pack commit `9de86b4d`, and real-CLI suites skip with a reason when no `prometheus` executable is present.
- **Advice for a repeated blocker (#98).** `kbd-bottleneck-detector advise <attempts.json>` recommends one of four dispositions after two completed attempts at the same blocker with no new evidence. Approval waits and running jobs are never counted, nothing is stopped, and it works without the `prometheus` CLI. The detector script now ships in both plugin packages.
- **Read-only rules audit (#98).** `prometheus-context-bootstrap`'s `audit-rules.mjs` lists root and nested instruction files, imports, harness rule directories and linked worktrees, flags passages that treat a test count or task order as the goal, and reports the installed pack and skill versions.

- **Bounded project-memory lookup during execution (#98).** `kbd-memory-recall --outcome … --blocker …` asks project-scoped Surreal Memory once, then `pk` once where installed, and otherwise lets the task continue. Recalled lessons are fenced as untrusted evidence; `--screen` refuses to promote a lesson that matches a credential pattern. The recall script and its modules now ship in both plugin packages.

- Include the archived verification and closure records for bootstrapping Mini into an existing project.
- State the adopted user outcome, its last evidence and the next authorized action when KBD work starts or resumes (#98). Task order now only sequences work inside an adopted plan; adopted plans are never reordered.
- Judge `kbd-goal-check` by the outcome's oracle and recorded evidence instead of test or task counts. An unexercised journey reports `NOT_EXERCISED`, and an earlier pass does not carry to a changed candidate.
- Offer outcome-ranked scope as an opt-in for new phases in Assess and Plan. Defaults are unchanged.

## [1.20.1] - 2026-11-23

- Support SurrealDB 4.0.1 with a matching 4.x memory-server client.
- Choose a native service, a Docker container or a compatible existing instance during installation. The release workflow packages the Linux ARM64 and AMD64 native executables as versioned GHCR images.

## [1.20.0] - Unreleased

- Add audit, preview and digest-bound apply for existing project instructions. The installed Bootstrap skill preserves local prose and reports which files an update would change.
- Ship KBD reflection and phase completion actions in both Mini plugin packages. Accepted reflections persist lessons, and retries resume failed actions using phase-scoped receipts.
- Support signed superseded and unmet phase exits, pre-signing adoption checks, withdrawal-aware successor seeds, and reconciliation of phase task counts across canonical state, progress projections and OpenSpec.

## [1.19.0] - Unreleased

- Scope KBD Assess and Plan to the end user's Origin/Before outcome and a reachable,
  independently observable exit contract.
- Allow early static fixture and runner feedback without creating execution or
  acceptance authority. Explain focused phase-end VLBV and bounded harness-only
  recovery without invalidating unrelated evidence or changing release gates.
- Clarify that Bootstrap preserves project-local hooks and does not migrate them.

## [1.18.1] - 2026-11-19

- Bind Bootstrap and KBD acceptance completion to delivered user value, relevant VLBV evidence, guidance/access, honest limits and reflection; distinguish review-ready from done. Existing gates unchanged.

## [1.18.0] - 2026-11-19

- Require user goals/value and plain-language business rules in Context Bootstrap, KBD and VLBV; trace reachable meaningful scenarios to accepted rules, controls and evidence.
- Preserve established phase-end verification/release processes and all independent runtime/dependency pins.

## [1.17.0] - Unreleased

Parity with the full pack's certification work (#226–#238) and OpenSpec 2.1.0 (full-pack
#239). OpenSpec change `parity-full-certification`; owner decisions of 2026-11-17: recent
changes only, existing exclusions kept, static certification levels only.

### Added

- **`skill-certification` skill**, ported to Node. It certifies one skill against five
  evidence levels and writes a certificate bound to the skill's content hash.
  `run-evals.mjs` replaces the shell runner; every child process is started without a
  shell, and a Windows `.cmd`/`.bat`/`.ps1` shim is reported as not exercised instead of
  being run. A shell, Python or PowerShell script inside a skill is a static-level error.
- **Strict skill validator**: `npm run validate` and `npm run validate:strict`
  (`scripts/validate-skills.mjs`, `lib/skills/validate.mjs`). Strict mode requires
  `license`, `metadata.version` and a comma-separated `metadata.tags`, rejects a top-level
  `version`, and rejects a description the packaged plugin cannot read.
- **VLBV session-start hook** (`sessionstart-vlbv`): states the boundary rule in a
  KBD-managed project. Modes `kbd` (default), `always` and `off`, from
  `PROMETHEUS_VLBV_DEFAULT`, `<project>/.prometheus/vlbv-default` or
  `<home>/.prometheus/config/vlbv-default`.
- **Eval cases** for `vlbv`, `kbd-status` and `prometheus-rust-workspace` (6 cases). They
  have not been run.

### Changed

- **OpenSpec 2.1.0**, pinned exactly; Node.js 22.20.0 or newer. The runner's `init` passes
  `--scope project`; `verify` and `refresh` use `openspec update --dry-run --json`; a
  refresh that needs the network and cannot reach it returns `refresh-unavailable` and
  exits 0. The 12 `openspec-*` skills were regenerated.
- **Skill frontmatter** in 93 skills now follows the Agent Skills specification:
  `metadata.version`, string tags, and a licence. Missing values came from the same skill in
  the full pack; the 20 artifact-refiner skills take `MIT` from that repository's licence.
- **Installed skills no longer carry `evals/` or a `.claude-plugin/` directory** that sits
  beside their `SKILL.md`. This applies to both plugin packages and to doctor's
  `copy-skills`.
- `vlbv` 1.1.0: a description that says when to use it and when not to, and a "Where it
  applies" section. `kbd-apply` and `prometheus-rust-workspace` route to it.

### Not verified

- Nothing in this release was run on Windows.
- The trigger and outcome certification levels (C2, C3) were not run; they are billed
  model runs.
- Five full-pack eval cases were not ported because they need a bash scaffold script.

## [1.16.0] - Unreleased

Feature parity with full-pack 1.15.0 (#224, d59a5a81), the liter-llm loopback fix
(78abfd84) and R4 portability (#225, 73d67417), from mini's previous parity point
(full-pack 5d575cdc). OpenSpec change `parity-full-1-15-vlbv`; operator decisions
D-P1 and D-P2 (2026-11-16).

### Changed

- **OpenSpec 2.0.0** is the planning engine, pinned exactly (`package.json`,
  `config/spec-engines.json`, the runner's `PINNED_VERSION`; minimum 2.0.0). The
  runner no longer follows npm `latest`: a newer release is reported as
  `newerAvailable`, a newer major as `migrationRequired`. SessionStart runs the
  read-only `verify`; the mutating `refresh` runs only at phase entry. OpenSpec
  skills are generated once into `.agents/skills/openspec-*` and copied (never
  linked) into the other harness roots. The `/opsx:*` commands are removed.
- **VLBV is the single verification method (D-P1).** Constitution A-9 is
  rewritten: implementation completes first; generated code executes only at B4
  (the adopted boundary packet, once) or B5 (an owner-authorized repair that
  reruns only the affected checks). The compiler exception and the hourly-cadence
  exception are retired. `CLAUDE.md`/`AGENTS.md` carry the marked
  `<!-- kbd-policy:begin/end -->` block and a §0 first-action step; A-6, A-10,
  A-13(d), the Rust path rule and the bug procedure in `review.md` follow.
  Boundaries are defined once in
  `skills/kbd-process-orchestrator/references/boundaries.md` (B0–B6, the
  eight-step B4 sequence); a new `vlbv` entry skill carries the method text.
- **Adopted contract v2**: schema, adoption lint (`--lint-only`), refusal while a
  CRITICAL review finding lacks an owner decision, REJECT-STALE on a bound spec
  delta (spec-delta digest), `closure.json` and `closure-packet.md`, generated
  template field lists, the widened scenario-ID pattern and conformance fixtures.
- **Context bootstrap** (`prometheus-context-bootstrap` 1.2.0) generates
  VLBV-conformant `AGENTS.md`, `CLAUDE.md` and stack rules: the policy block, a
  first-action protocol that works without hooks, precedence over built-in TDD,
  verify and apply skills, and no compiler exception. Every run prints a `POLICY`
  line; `--check` fails a governing file without exactly one policy block stating
  `verification: VLBV`, or a managed region with retired compiler-exception or
  opt-in VLBV wording or an `/opsx:*` command. Retired wording in operator prose
  is reported as `STALE`, never rewritten (Node port of `vlbv-policy-check.sh`).
- Skill routing names the `openspec-propose` skill instead of a removed slash
  command.

### Added

- **Harness capability profiles** in `config/harnesses/capabilities.json` for
  claude-code, codex, opencode, kimi-code, zed, cursor, gemini, windsurf and cline.
  A field is `supported` only when the profile records an exercised run and the
  field carries its own evidence: a committed file, or a PASS protocol-eval case
  of the same harness that declares the field. Gate:
  `npm run check:harness-capabilities` (`--capabilities <file>` checks a
  candidate). `node scripts/doctor.mjs profile [<harness>] [--json]` prints a
  profile without changing the doctor's check stream. Handoff packets carry the
  receiver profile. Only codex `skillRoots` is supported, on evidence carried from
  the full pack (`docs/decisions/harness-evidence/`).
- **VLBV protocol evals** (`evals/vlbv-protocol/`, R4 CR-31) in Node: 23 cases,
  machinery cases through mini's phase-closure conformance adapter, cross-family
  grading through the liter-llm gateway, isolation with scratch homes, report
  validation with planted-defect negative controls, PASS-only capability
  promotion, the pre-authorization artifact scan fixture and a secret scanner.
  Adapters exist for claude-code, codex, opencode and kimi-code; the other
  harnesses are reported not run. `npm run eval:vlbv-protocol`. Transcripts stay
  under the gitignored `evals/runs/`.
- **R4 boundary machinery**: the boundary authorization event, the passive
  pre-authorization artifact scan (`boundaryPacket.runnerOutputGlobs`) and
  delivery-cadence attachment to the boundary.

### Security

- **liter-llm loopback bind** (full-pack 78abfd84): no change was needed. Mini
  starts liter-llm only through Docker Compose, which already publishes the
  gateway on `127.0.0.1:${LITER_PORT:-4000}` only; inside the container it must
  listen on `0.0.0.0` for port publishing to work.

### Not ported (D-P2)

- Apple Foundation Models LaunchAgent: it would be a third resident daemon.
- Rust `kbd-runtime` zeespec replay restoration: mini ships no Rust runtime.
- Installer root consolidation (`~/.agents/skills` plus symlink shims): mini's
  distribution copies; symlinks are forbidden.
- Native SurrealDB 4.0 launchd/systemd templates: mini uses Docker Compose.
- Bash and Python implementations are re-implemented as Node `.mjs`. See
  `COMPARE.md`, section "Exclusions from the full-pack 1.15.0 parity port".
