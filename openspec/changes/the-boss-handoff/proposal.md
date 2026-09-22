## Why

The next full phase integrates the mini with `the-boss`. Its inputs must be executable, not implied: which existing the-boss subsystem each requirement extends (the assessment found most already exist), what is genuinely new (the push into `$HOME/.agents` and `$HOME/.claude`, Docker handling, MCP registrations, the update-feed fix), a settings/doctor UI designed with `impeccable` and `ui-ux-pro-max`, and the landing-spot corrections. Every the-boss code change is a named item here and is never started in the mini.

## What Changes

- Add `docs/handoff/the-boss-integration.md` — ten items, organised by the-boss subsystem, each with the file:line it extends (from `assessment.md` and `assessment-evidence.md`), acceptance criteria, and the mini artifact it consumes:
  1. **Default skill set** — bundle the mini's `skills/` into `resources/skills/` so `installBuiltinSkills()` (`builtinSkills.ts:31`) installs them with a `.version`; the `.version` scheme must handle a box where an older the-boss already ran (version compare, never "first run only").
  2. **Every-boot reconcile to the home directories** — a new lifecycle service (never `main.ts`; `main.ts:1-10`) chained after `reconcileSkills()` in `AiService.onInit()` (`AiService.ts:396-417`) that copies (never symlinks) each built-in skill to `<home>/.agents/skills/<name>` and `<home>/.claude/skills/<name>` when absent or differing, using the same byte comparison as the mini doctor's `mini.skill-copies`, and shows a non-modal notice while it runs; **on a machine where `detectFullPack()` (the mini's `lib/platform/full-pack.mjs`, run from the app-data copy) reports the full pack present, the push is skipped entirely and a persistent notice says why** — the mini runs only inside the-boss's data directory there (`config.yaml`); `systemSkillSources.ts:25-27` stays import-only for third-party skills.
  3. **Doctor hosting** — register the mini's checks (`lib/doctor/registry.mjs`) in `DoctorCheckRegistry` (`registry.ts`) by spawning `scripts/doctor.mjs` from the app-data copy and mapping its JSON lines to check results; map `mini.skill-copies`'s `copy-skills` to a `fixes` entry (`checks/config.ts:22-32` is the precedent); expose it in `DoctorDialog`.
  4. **Settings** — a `/settings/prometheus` section registered in `settingsMenu.ts:58+` beside `/settings/skills`, backed by new keys in `preferenceSchemas.ts` (services enabled, gateway URL fixed to `:4000/v1`, Docker consent, home-directory push on/off, doctor auto-run) and a Drizzle migration only if a table is needed (default: preference keys only).
  5. **Services and Docker** — a consent-gated action that runs `winget install Docker.DockerDesktop` (Windows) or opens the Docker Desktop download (macOS) — never automatic; `scripts/services.mjs` invoked from the app-data copy for up/down/status; the mini's `docker/` shipped in `resources/`.
  6. **MCP registrations** — `sycophancy-correction` and `compass` as stdio servers using the mini resolvers' `mcpServerConfig()`; compass **stdio only** (the doctor fails HTTP); `rust-mcp-filesystem` shipped by the-boss from the fork's cargo-dist release once a `windows-latest` test leg exists, registered namespaced with write off.
  7. **Binaries** — `compass-<target>.tar.gz` + `.sha256` from the fork's release verified at build time into `resources/`; `sycophancy-correction` likewise once its CI publishes; `pk` from `prometheus-knowledge-rs` releases when they exist.
  8. **Update feed** — `electron-builder.yml:173-175` `publish` → `provider: github` (`Prometheus-AGS/the-boss`); the auto-updater must stop checking `releases.cherry-ai.com`.
  10. **Compass** — download `compass-<target>.tar.gz` + `.sha256` from the fork's release at build time, verify the digest, unpack into `resources/compass/<target>/`; register `{ command: <resources>/compass, args: ['serve', '--transport', 'stdio'] }` as a stdio MCP server and nothing else (never `--transport http`, never `watch`); host the mini's `mini.compass` doctor check. (Decided in `analysis.md` Q11; written here from the start so this change's acceptance is final.)
  9. **Landing spot** (`Know-Me-Tools/boss-landing-spot`) — GitHub links → `Prometheus-AGS/the-boss`; three platform buttons → per-platform assets on GitHub Releases; version string read from the latest release; social images on a project domain; "built on Cherry Studio" per the operator's decision.
- Add `docs/handoff/settings-doctor-design.md`: the design brief produced with the `impeccable` and `ui-ux-pro-max` skills — information architecture for the Prometheus settings section, the health panel, the doctor with one-click repair, states (all services down, Docker absent, home push in progress), copy, and tokens consistent with the-boss's existing settings pages.

## Capabilities

### New Capabilities
- `integration/the-boss-handoff`: the handoff document's required contents and the design brief.

### Modified Capabilities
<!-- none -->

## Impact

- New: `docs/handoff/the-boss-integration.md`, `docs/handoff/settings-doctor-design.md`, a test that every the-boss citation in the handoff exists at commit `10aa57f76c` (read from the local checkout; `skip` with reason when the checkout is absent).
- No the-boss file changes.

## Non-goals

- Implementing any item — that is the next phase.
- Deciding "built on Cherry Studio" — the operator's.
