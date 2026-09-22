# Analysis — the-boss-shipping-and-settings

Build-vs-adopt calls for the gaps in `assessment.md`. The research was almost entirely **Tier 1
against code we own** rather than a library landscape: every capability this phase needs either
already exists in `the-boss` or is specified in the mini. Six of nine decisions are *adopt an
existing mechanism*, and the genuinely new work is smaller than the goals implied.

## The finding that reframes the phase

**`the-boss` already contains a streaming diagnostic runner with a settings UI.** The "Doctor"
subsystem (`src/main/services/diagnostics/doctor/DoctorService.ts`, 486 lines) runs checks, publishes
partial results as they arrive, handles cancellation, and renders through
`DoctorChecksPanel.tsx` / `DoctorDialog.tsx`.

Verified directly (`DoctorService.ts:298-301`):

```js
this.publish(scope, running)
const { results, pendingChecks } = await record.execution.execute(controller.signal,
  (results, activeCheckIds) => this.publish(scope, { ...running, results, activeCheckIds }))
```

Progress does **not** travel over IPC. Main writes to a shared cache key
(`doctorStateCacheKey(scope)`), and the renderer subscribes with `useSharedCacheValue`
(`useCache.ts:397-403`) via `useSyncExternalStore`. Both processes derive the same key from
`src/shared/utils/doctor.ts:25-38`.

**Goal D-12 is therefore not "build a runner and a results view." It is "add one check-source that
shells out to `scripts/doctor.mjs` and map its JSON lines."** That is the single largest scope
reduction available in this phase, and it also removes the risk of inventing a second, divergent
progress mechanism.

**One-click repair is also already modelled.** `checks/config.ts:22-35` shows a check declaring
`actions: [{ kind: 'fix', fixId }]` with a `fixes` handler, and `DoctorService` exposes
`diagnostics.doctor.confirm_check` alongside `run` (`src/main/ipc/handlers/doctor.ts:5-9`). The mini
side already emits the action: `mini-skill-copies` is the one check that offers `copy-skills`, and
the adapter mapping for it — including `refused` → `{ status: 'failed', message }`, which the
host has no native equivalent for — is written in `lib/doctor/contract.md`.

So repair is: map our `actions` array onto the host's `DoctorFixAction`, and route the host's fix
handler back to `node scripts/doctor.mjs --fix copy-skills`. **The A-11 constraint travels with
it** — that fix writes under the user's home and must refuse on a full-pack machine, which the
mini's implementation already enforces and the UI must not bypass.

Its failure path carries a lesson worth copying verbatim (`DoctorService.ts:332-336`): *"`running`
was already published; without a terminal state every window spins forever."*

## Decisions

### D1 · Skills into `resources/skills/` — adopt the `build:builtin-knowledge` precedent

**Adopt.** `resources/skills/` is git-tracked, and the-boss already has the pattern for
"generated files that are committed and verified": `scripts/generate-cherry-assistant-knowledge/index.ts:53-69`
implements `--check` that fails CI when an output is missing or stale, wired as
`build:builtin-knowledge:check` (`package.json`).

A `scripts/sync-mini-skills.ts` with the same `--check` mode keeps one source of truth (the
submodule) while leaving the copies reviewable in diffs. The alternative — making
`resources/skills/` generated-and-ignored — would change how *the-boss's own five* skills are
managed, which is out of scope and not ours to decide.

**Resolves open question 1.**

### D2 · Two vendoring targets, two different mechanisms — both required

Goal B4 and goal B5 are **separate requirements**, and an earlier draft of this analysis addressed
only B5. Both stand:

**B4 — the mini vendors SOURCE.** compass, rust-mcp-filesystem, openspec and
sycophancy-correction become submodules under `tools/` in the mini, pinned to released commits.
This is not optional and not redundant: the mini's own resolvers already depend on it. The
sycophancy resolver is specified to search
`tools/sycophancy-correction/target/release/` "for developer checkouts"
(`sycophancy-correction-vendored` proposal), `mini-submodules` checks that each vendored submodule
is built, and `versions.toml` pins each gitlink by commit. Without the submodules those checks have
nothing to point at.

**B5 — the-boss consumes ARTIFACTS.** compass and rust-mcp-filesystem are Rust workspaces and
nothing in an Electron build compiles Rust, so in **the-boss** they are `TOOLS` entries consuming
release archives. The mini (markdown) and openspec (Node, the source of the Windows fixes) are
the-boss submodules.

So compass and rust-mcp-filesystem are vendored **twice, differently**: as source in the mini
(where they are built, resolved and pinned) and as downloaded binaries in the-boss (where they are
only executed). That is the distinction, not a choice between the two.

Compass's artifact shape was verified against `compass-release.yml:106-132`: it produces
`compass-<target>.tar.gz` **with a `.sha256` sidecar**, extracting to `compass-<target>/`, and the
workflow itself verifies the binary runs and the licences are present. That maps onto the `TOOLS`
manifest exactly: `url` → the release asset, `archive: 'tar.gz'`, `strip: 'compass-<target>'`,
`sha256` → the sidecar's content.

### D3 · Docker — the mini owns detection, the-boss owns consent and UI

**Adopt the mini's contract; build only the UI.** `docker-services`'s proposal already specifies
`lib/platform/docker.mjs` exporting `dockerState()` → `{ state: 'absent' | 'daemon-down' | 'ready',
client, server }` from `spawnExecutable('docker', ['version', '--format', '{{json .}}'])`, with
**no `wsl.exe`, no socket access, no dependency**.

the-boss must not reimplement this. It spawns the mini's `scripts/services.mjs` exactly as it will
spawn `scripts/doctor.mjs`, and owns only: the consent preference, the notice, and the rendering of
the three states.

**Resolves open question 2.** The boundary is: *anything that probes Docker is the mini's; anything
a user clicks is the-boss's.*

### D4 · Preferences — generated, not hand-written

**Adopt, with a trap to avoid.** `src/shared/data/preference/preferenceSchemas.ts` is
**auto-generated** — verified at its header: *"This file is automatically generated from
classification.json."* Editing it directly means the next `pnpm data:generate` silently discards the
work.

Prometheus keys go into `scripts/data-classify/data/classification.json`, then `pnpm data:generate`.

Two consequences:
- **No Drizzle migration is needed.** `preferenceTable` is `(scope, key, value JSON)` with a
  composite primary key (`src/main/data/db/schemas/preference.ts`), so a new preference is a row,
  not a schema change. Goal D-9's "migration only if a table is needed" resolves to **no table**.
- **Key convention is `namespace.sub.key_name`**, strict lowercase + underscores, ESLint-enforced —
  and it differs from the i18n convention (camelCase leaves). They must not be unified.

### D5 · i18n — 13 locales, and CI fails on a single missing key

**Adopt, and treat as a hard gate.** Verified: 13 locale files, 5,720 keys in `en-us.json`, and
`ci:basic-check` runs `pnpm i18n:check && pnpm i18n:unused:check && pnpm i18n:hardcoded:strict`.
`i18n:check` throws on a missing key, an *extra* key, or a non-string value.

Catalogs are **flat** — `keySeparator: false` (`resolver.ts:94-95`) — so `settings.prometheus.title`
is one literal key, not a path. `pnpm i18n:sync` propagates new keys to the other 12 locales.

This is the constraint most likely to break a build late: every string in the new settings section
needs a key in all 13 locales before CI passes.

### D6 · IPC — the typed `IpcApi` layer, not the legacy channel registry

**Adopt.** `src/shared/IpcChannel.ts` self-describes as legacy. The modern path is zod-validated
routes (`src/shared/ipc/define.ts`) with **zero preload changes** per route
(`src/preload/ipc.ts:8-9`). The doctor's own routes are the template
(`src/shared/ipc/schemas/doctor.ts:47-55` → `src/main/ipc/handlers/doctor.ts:5-9` →
`ipcApi.request(...)`).

The one exception is preferences, which use a dedicated legacy bridge marked
`// DO NOT MODIFY THIS SECTION` (`preload.ts:236-254`) — consume it through `usePreference`, never
extend it.

### D7 · Settings section — three registries, all manual

**Adopt the existing primitives.** `SettingsPrimitives.tsx` provides `SettingsContentColumn`,
`SettingGroup`, `SettingRow`, `SettingRowTitle`, `SettingDivider`, `SettingHelpText`. The UI library
is a local workspace package `@cherrystudio/ui` — Radix + Tailwind, vendored shadcn-style — **not**
antd and not a stock shadcn CLI install.

Adding the section touches three places, none auto-discovered except the third:
1. `src/renderer/routes/settings/prometheus.tsx` (TanStack file route; `routeTree.gen.ts` is generated)
2. `src/renderer/components/settingsMenu.ts` (hand-maintained array; order is render order)
3. `prometheus.search.ts` (auto-globbed, makes rows searchable and scroll-to-focusable)

### D8 · The four design skills apply to composition, not primitives

**Build, with constraint.** `impeccable`, `ui-ux-pro-max`, `anth-frontend-design` and
`frontend-ui-engineering` are all installed and are required inputs for goal D. But the-boss has an
established settings visual language, and a Prometheus page that ignores it would be *worse*
design, not better — inconsistency is a defect.

The design skills therefore govern **information architecture, state design and copy** — how the
health panel is organised, what the four doctor statuses look like, how "42 copies beside a full
pack" is presented without alarming a user who cannot act on it — not the choice of button
component. The anti-template rule in `web/design-quality.md` is satisfied by hierarchy and state
handling within `@cherrystudio/ui`, not by introducing a second component vocabulary.

### D8a · The home-directory push is TWO behaviours, not one

Goal D-13 asks for an **every-startup, unattended** push with a visible notice. Goal D-12 asks for
**on-demand repair** a user clicks. A first draft of this analysis collapsed them into the repair
path, which would have let a plan ship a settings page with no startup behaviour at all.

They differ in when they run, who triggers them, and what they must do on failure:

| | Every-startup push (D-13) | One-click repair (D-12) |
|---|---|---|
| Trigger | boot, unattended | a user, in settings |
| Chaining | a lifecycle service after `reconcileSkills()` — never `main.ts` | the host’s doctor fix handler |
| Feedback | non-modal notice while running | the doctor result line |
| Full pack present | **skipped entirely**, persistent notice | `refused`, nothing written |

Both delegate the copy to the mini’s `copy-skills` rather than reimplementing it. The install-scope
rule binds the unattended path hardest: an automatic startup task that wrote into the home skills
roots on a full-pack machine would violate `openspec/config.yaml`, and this very machine is that
case — 42 mini copies already sit beside a full-pack install.

### D9 · sycophancy-correction is the weakest link

**Build.** `Know-Me-Tools/sycophancy-correction-skill` (operator-supplied; my assessment searched
the wrong name and wrongly reported it absent) is a Rust workspace with **no `.github/workflows` at
all** and **0 releases**, last pushed 2026-07-02, not a fork.

Unlike compass and rust-mcp-filesystem — which have working release workflows that merely have never
run — this one needs CI built from scratch before it can produce an artifact. That matches the four
blockers already scoped in the mini's `sycophancy-correction-vendored` change.

**This is the long pole of goal A** and should be sequenced first or deferred, not discovered late.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| No release workflow has ever run on any fork | **high** | Run compass first — it has the most mature pipeline (contract tests, provenance attestation) and both Windows arches. A failure there predicts the others. |
| sycophancy-correction has no CI at all | **high** | Sequence first or drop from scope; it cannot be "tagged and released". |
| i18n gate fails the build late | medium | Add all keys + `pnpm i18n:sync` **in the same change** as the components. |
| Editing generated `preferenceSchemas.ts` | medium | Edit `classification.json`; a CI regeneration would silently revert direct edits. |
| Mini and the-boss both implement Docker | medium | D3 boundary: mini probes, the-boss renders. |
| Windows never exercised | **high** | Everything here is macOS-observed or CI-claimed. The four-arch matrix is unverified. |

## Open questions carried to spec

1. **Which of the eleven mini checks does the-boss surface?** Each needs an id in the-boss's closed
   `DoctorCheckId` union plus a catalog `detail.variant`. All eleven, or the subset a user can act on?
   *(Unchanged from assess; needs a product call.)*
2. **Does the first compass release actually succeed?** Unknowable until run. Gates D2.
3. **Is `windows-11-arm` available to these repos?** Compass names it and rust-mcp-filesystem now
   does too, but neither has run. GitHub's ARM Windows runners have had availability limits.
4. **`versions.toml` is still unauthored** — agents may not write it, and five mini changes gate on it.

## Method note

Tier 1 (`gh` against repos we own) and direct source reading answered every question; Tiers 2–4
(Context7, registries, web) were not needed and not spent. No library adoption decision arose —
every candidate was an in-house mechanism. Two claims from the parallel inventory were
independently re-verified before being relied on here (the generated preference schema, and the
doctor's incremental publish); both held.

## Unresolved review findings

Three rounds of `--mode artifact analyze` ran; two rounds of CRITICALs were fixed (see below). Round 3 returned one CRITICAL and one WARNING that are **the same objection** and are accepted rather than fixed, with the reason recorded here.

**The objection:** the adopt verdicts rest on `the-boss` source files that are not in the review packet, so a reviewer cannot verify them from the packet alone.

**Why it is not fixable here:** `build-review-packet.sh` collects artifacts from THIS repository. `the-boss` is a separate checkout at `/Users/gqadonis/Projects/prometheus/the-boss`, so no packet built from the mini can ever contain it. The alternative — pasting the cited source into the analysis to satisfy the packet — would inflate the artifact without adding verifiability, since the paste would be no more checkable than the citation.

**What was done instead:**
- Every the-boss citation carries a file path and line number, so it is checkable by anyone with the checkout.
- The two load-bearing claims were independently RE-VERIFIED after the inventory that produced them: `preferenceSchemas.ts` auto-generation (read the file header) and `DoctorService` incremental publish (read `DoctorService.ts:296-302`). Both held.
- `library-candidates.json` carries a `verification_note` telling spec to re-read anything it depends on in the-boss rather than trusting this file.

**Residual risk, stated plainly:** a citation could be stale if the-boss moves. The mitigation is the re-read instruction, not confidence. One such error has already occurred in this phase — my assess stage cited `src/main/services/skills/`, a directory that does not exist — which is exactly why the instruction is there.

### Fixed in earlier rounds

- **R1 CRITICAL** — goal B4 (the mini vendors compass/rust-mcp-filesystem/openspec/sycophancy as SOURCE submodules) was silently dropped; only the-boss-side artifact consumption was analysed. Now D2 and `cand-012`.
- **R1 CRITICAL** — goal D-12 one-click repair was never evaluated. Now `cand-013`, with the A-11 refusal constraint carried.
- **R1 CRITICAL** — `build-001` pointed its `capability_gap_id` at an unrelated candidate.
- **R2 CRITICAL** — goal D-13’s EVERY-STARTUP push was collapsed into the on-demand repair path. They differ in trigger, chaining, feedback and full-pack behaviour; now separated as `cand-014` and analysis §D8a.
- **R2 WARNING** — goal B6 (openspec as a the-boss submodule) had no candidate. Now `cand-015`.
