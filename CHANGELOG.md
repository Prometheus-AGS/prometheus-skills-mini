# Changelog

All notable changes to prometheus-skills-mini are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Earlier releases are
recorded in the git history and in `COMPARE.md`; this file starts at 1.16.0.

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
