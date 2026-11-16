# Proposal

## Why
Mini's version is 1.15.0, but its content stops at full-pack #209 (5d575cdc) plus OpenSpec 1.16. Full-pack 1.15.0 (#224, d59a5a81) made OpenSpec 2.0.0 the primary engine and VLBV the single verification method; #225 (73d67417) added R4 portability. The operator asked for feature parity and decided on 2026-11-16:
- D-P1: mini adopts VLBV as its single verification method; constitution A-9 is rewritten to match (no hourly cadence exception).
- D-P2: items that clash with mini's hard constraints are adapted or excluded and the exclusions are documented in COMPARE.md.

## What Changes
1. **OpenSpec 2.0.0**: exact pin (`package.json`, `config/spec-engines.json`, runner `PINNED_VERSION`, minimum 2.0.0). The runner no longer follows npm `latest` (reports `newerAvailable` / `migrationRequired`). SessionStart runs the read-only `verify`; the mutating `refresh` runs only at phase entry. Skills live once in `.agents/skills/openspec-*`, with real directory copies (no symlinks) in the other harness skill roots. `/opsx:*` commands are removed.
2. **VLBV single method**: one boundary taxonomy (`references/boundaries.md`, B0–B6) and the eight-step B4 sequence; `verificationMethod: "VLBV"` as the project default; per-phase deviations only as signed `KBD-METHOD` decisions disclosed in the closure packet; the compiler exception retired; skill text (kbd-execute, kbd-reflect, kbd-apply, value-scenario-verify, cross-tool protocol, artifact-refiner integration, Rust gates, delivery-cadence) points at the boundaries; a new `vlbv` entry skill.
3. **Adopted contract v2**: schema, adoption lint (`--lint-only`), refusal on unresolved CRITICAL findings, REJECT-STALE on bound spec delta (spec-delta digest), `closure.json` + `closure-packet.md`, generated template field lists, widened scenario-ID pattern, the conformance golden and defect fixtures.
4. **Harness capability profiles** (`capabilities.json`) with evidence-gated `supported` fields, printed by doctor; handoff packets carry the receiver profile.
5. **R4**: VLBV protocol evals, boundary authorization event, pre-authorization artifact scan (`boundaryPacket.runnerOutputGlobs`), capability evidence check.
6. **Context bootstrap** generates VLBV-conformant AGENTS.md/CLAUDE.md with the policy block and first-action protocol.
7. **liter-llm gateway** binds to 127.0.0.1.

## Exclusions (D-P2)
- Apple Foundation Models LaunchAgent: would be a third resident daemon.
- Rust kbd-runtime zeespec replay restoration: mini ships no Rust runtime.
- Full-pack installer root consolidation (`~/.agents/skills` + symlink shims): mini's distribution copies; symlinks are forbidden.
- Native SurrealDB 4.0 launchd/systemd templates: mini uses Docker Compose; only image pins are considered.
- Bash/Python implementations are re-implemented as Node `.mjs`.

## Capabilities
Modifies KBD verification, spec-engine and distribution requirements.

## Impact
Version 1.15.0 → 1.16.0. Generated distribution, rules and commands are regenerated. Verification follows VLBV: implementation completes first; the boundary packet (B4) runs once; an authorized repair reruns only affected checks (B5).
