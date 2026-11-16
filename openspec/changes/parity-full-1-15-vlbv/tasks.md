# Tasks

## 1. OpenSpec 2.0 engine
- [x] 1.1 Pin OpenSpec 2.0.0 (package.json, lockfile, config/spec-engines.json, runner PINNED_VERSION and minimum); newerAvailable/migrationRequired reporting.
- [x] 1.2 Split runner verify (read-only, SessionStart) from refresh (phase entry); update the SessionStart hook.
- [x] 1.3 Regenerate OpenSpec skills with 2.0.0 into .agents/skills and copy (no symlinks) into the other harness roots; remove /opsx commands and stale wrappers.

## 2. VLBV method, contract v2, R4 machinery
- [x] 2.1 boundaries.md (B0–B6) and the B4 sequence; vlbv entry skill; skill text points at boundaries; compiler exception retired.
- [x] 2.2 Adopted contract v2 schema, lint, CRITICAL-finding refusal, spec-delta digest and REJECT-STALE, closure.json and closure-packet.md, template generation, conformance fixtures.
- [x] 2.3 Boundary authorization event, pre-authorization artifact scan, delivery-cadence boundary attachment.

## 3. Rules, bootstrap, profiles, evals, docs
- [x] 3.1 Rewrite constitution A-9 and related rules for VLBV; re-render rules.
- [x] 3.2 Context bootstrap emits the VLBV policy block and first-action protocol.
- [x] 3.3 Harness capability profiles with evidence gate; doctor prints them; handoff carries receiver profile.
- [x] 3.4 VLBV protocol evals port; liter-llm 127.0.0.1 bind.
- [x] 3.5 COMPARE.md exclusions, CHANGELOG, version 1.16.0, regenerate distribution and commands.

## 4. Boundary
- [ ] 4.1 B4 boundary packet once; B5 only for an authorized repair.
