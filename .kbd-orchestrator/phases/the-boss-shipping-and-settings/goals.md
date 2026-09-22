# Goals — the-boss shipping and settings UI

Ship the mini pack inside `the-boss` on every platform Windows-first, and give it a settings
surface an operator can actually run. Three shipping mechanisms, deliberately separated, plus
the UI that exposes them.

**Scope note.** The sibling phase `the-boss-integration-prep` *prepares* the handoff and never
starts the-boss code. This phase is where the-boss code changes happen, and where the forks we
own get their release infrastructure turned on.

## A · Release infrastructure on the forks we own

1. **`GQAdonis/rust-mcp-filesystem` builds Windows on ARM.** `dist-workspace.toml` listed only
   `x86_64-pc-windows-msvc`, so an arm64 Windows build of the-boss would have had no artifact.
   Added `aarch64-pc-windows-msvc` with a native `windows-11-arm` runner.
   *(Done on branch `feat/windows-arm64-target`, unpushed — commit `3a8d182`.)*
2. **First release on each fork.** All three have working release workflows that have never been
   run: `GQAdonis/compass` (`compass-release.yml`, already builds both Windows arches),
   `GQAdonis/rust-mcp-filesystem` (cargo-dist), `Prometheus-AGS/openspec` (`release-prepare.yml`).
   Zero releases each. Tag and run them.
3. **`sycophancy-correction` does not exist under `Prometheus-AGS`.** Create it from the
   `Know-Me-Tools` fork and land the four Windows blockers already scoped in change
   `sycophancy-correction-vendored`.

## B · Vendoring — submodules in the mini, artifacts in the-boss

4. **The mini vendors the source.** compass, rust-mcp-filesystem, openspec and
   sycophancy-correction as submodules under `tools/`, pinned to released commits, so the
   doctor's resolvers and `versions.toml` have a source of truth.
5. **the-boss consumes built artifacts, not source.** compass and rust-mcp-filesystem are Rust
   workspaces; nothing in an Electron build compiles Rust, so submodules of them in the-boss
   would be dead weight. They become `TOOLS` entries in the existing
   `scripts/download-binaries.js` — per-platform URL, SHA-256, `platform-arch` key — which
   already ships mise, bun, uv, ripgrep and MinGit that way and is verified by
   `verifyBundledBinaries()` in `before-pack.js`.
6. **The openspec fork is the exception and must be used.** It is Node, it is a build/dev
   dependency rather than a shipped binary, and its Windows fixes are the reason full Windows
   compatibility works at all. Submodule, not release artifact.
7. **The mini's skills ship as a submodule → `resources/skills/`.** `installBuiltinSkills()`
   (`src/main/utils/builtinSkills.ts:31`, called from `AiService.ts:407`) already runs on every
   startup, copies each directory into `{userData}/Data/Skills/`, registers it, and mirrors it
   into `CLAUDE_CONFIG_DIR/skills`. Updates are gated on a **content hash**, not a version
   string, so the 21 mini skills without `version:` are fine. Pass the dormant `namespace`
   parameter on `syncBuiltinSkill` so the 22 never collide with the-boss's own 5.

## C · Services are Docker, never bundled

8. **surrealdb, surreal-memory and liter-llm run in Docker after detection.** Never shipped as
   binaries, never a native daemon on Windows. the-boss detects Docker, and on absence reports a
   status with the platform's next step rather than an error — the pack must keep working with
   every service down. Endpoints are fixed on every platform: surreal-memory
   `http://localhost:23001/mcp/sse`, SurrealDB `127.0.0.1:28000`, liter-llm
   `http://localhost:4000/v1`.

## D · Settings UI/UX in the-boss

Designed with the `impeccable`, `ui-ux-pro-max`, `anth-frontend-design` and
`frontend-ui-engineering` skills — not assembled from defaults. A settings page that looks like
an unmodified component library is a failure of this goal.

9. **Settings schema.** New preference keys in the-boss's existing preference system (services
   enabled, gateway URL pinned to `:4000/v1`, Docker consent, home-directory push on/off, doctor
   auto-run). A Drizzle migration only if a table is genuinely needed; preference keys by default.
10. **Internationalization.** Every label, description, status string and error goes through
    the-boss's i18n layer with real keys. No hardcoded English in the components.
11. **The settings surface itself.** A `/settings/prometheus` section registered beside
    `/settings/skills`, showing health, configuration, and the state of the home-directory push.
    Real hover/focus/active states, real hierarchy, states designed for: all services down,
    Docker absent, push in progress, full pack detected.
12. **Doctor, run from the UI with its results rendered.** the-boss spawns
    `scripts/doctor.mjs` from the app-data copy and maps its JSON lines onto its own check
    results — it cannot register the mini's checks directly, because `DoctorCheckRegistry` is
    exhaustive over a closed id union. The adapter mapping is already written in
    `lib/doctor/contract.md` (`refused` → `failed`, `summary` → `devMessage`/evidence). One-click
    repair for the one check that offers a fix.
13. **Detection and deployment to the OS skills directories.** Copy (never symlink) each skill to
    `<home>/.agents/skills/<name>` and `<home>/.claude/skills/<name>` on every startup when
    absent or differing, with a visible non-modal notice while it runs. **On a machine where
    `detectFullPack()` reports the full pack present, the push is skipped entirely and a
    persistent notice says why** — the binding rule in `openspec/config.yaml`. This development
    machine is exactly that case: 42 mini skill copies currently sit beside a full-pack install.

## Constraints carried in

- Node LTS only for scripts; no `.sh`/`.py`; no symlinks; copies only.
- the-boss ships `--win --x64 --arm64` — every Rust artifact needs all four platform/arch pairs.
- A-11: tagging releases and creating repositories are operator-authorized, not agent-initiated.
- The mini is never installed natively beside the full pack, on any platform.
