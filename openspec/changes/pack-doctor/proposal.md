## Why

The README names `scripts/doctor.mjs`; it does not exist. `the-boss` has a 31-check doctor with a full UI and a repair contract (`checks/config.ts:22-32`: `actions: [{ kind: 'fix', fixId }]` and `fixes.<id>(ctx)`), and no skills-specific check. The operator wants a doctor that runs as a Node tool and a skill on any platform, renders in the-boss's settings UI, and can correct what it finds.

**Amended 2026-09-22, before implementation.** This proposal originally said the mini's output *is* the-boss's check contract, mirroring its `DoctorCheck` shape field for field so the-boss "hosts it rather than duplicating it". That premise is false, verified against the commit this change already cites (`the-boss@10aa57f76c`, `src/shared/types/doctor.ts` and `src/main/services/diagnostics/doctor/types.ts`; recorded in `.prometheus/gotchas.md`):

- `DoctorCheckRegistry = { readonly [Id in DoctorCheckId]: DoctorCheckDefinition<Id> }` is **exhaustive and closed**, over a hardcoded 31-element `as const` array. Its own comment: "a catalog entry without an implementation (or vice versa) is a compile error." There is no plugin, dynamic or external registration anywhere in `registry.ts`.
- `mini.*` ids are invalid three times over: `DoctorDomain` is a closed union of ten domains with no `mini`; `DomainOfId` enforces at compile time that a check's domain equals its id prefix; and ids are `domain-thing`, never `domain.thing`.
- `detail` is not free text but `{ variant, params }`, where `variant` is `DoctorCheckCatalog[Id]['details'][number]` — a typed key declared inside the-boss's own catalog, per check, for i18n. The mini cannot produce a legal value from outside that compile unit.
- There is no `summary` field: `pass` carries optional `detail`, `skip` requires `detail`, `warn`/`fail` require `attribution` + `detail` + `actions`.
- A fix resolves to `{ status: 'fixed' | 'requires_relaunch' }` or `{ status: 'failed', message }`. **There is no `refused`** — which this change requires for `copy-skills` on a full-pack machine.

`the-boss-handoff` already names the correct mechanism, and it contradicted this proposal: the-boss **spawns `scripts/doctor.mjs` from the app-data copy and maps its JSON lines** to its own check results. That adapter lives on the-boss side, which is where the closed union lives.

So the mini owns **a stable JSON line format of its own**, documented against the-boss's shape rather than pretending to be it. Every check, the fix, the entry point and the skill are unchanged in substance; only the contract they target changes. Ids are `mini-*` (hyphen, matching the-boss's own convention) and the format keeps `summary` as human-readable text and `refused` as a fix status — both things the mini needs and the host lacks, which the adapter maps (`refused` → `failed` with the message).

## What Changes

- Add `lib/doctor/` — one module per check group, each exporting `checks: [{ id, title, run(ctx) → { status: 'pass' | 'warn' | 'fail' | 'skip', summary, detail?, actions?: [{ kind: 'fix', fixId }] }, fixes?: { [fixId]: (ctx) → { status: 'fixed' | 'requires_relaunch' | 'refused', summary } } }]`. This is **the mini's own contract**, documented in `lib/doctor/contract.md` against the-boss's shape — every field mapped, every divergence named with the reason — and verified by a conformance test. It is not a mirror: see Why.
- Checks (ids stable, namespaced `mini-*` with a hyphen, matching the-boss's own `domain-thing` convention): `mini-node-version` (≥ 22), `mini-versions-toml` (present and consistent with the tree — consumes `rules/lib/versions-toml.mjs` `compareToTree`, created by change `review-housekeeping`), `mini-submodules` (each gitlink present — **fail** when a checkout is missing, since nothing can be built from it — and built where applicable: `tools/openspec/dist`, and the vendored `pk` at `tools/prometheus-knowledge/target/release/pk`. An unbuilt artifact is a **warn**, not a fail: the tree is incompletely set up, but a usable binary may be installed elsewhere and `mini-pk` reports whether one resolves. Operator decision, 2026-09-22), `mini-docker` (from `lib/platform/docker.mjs`), `mini-service-surreal-memory` and `mini-service-liter-llm` (health endpoints), `mini-pk` (`pk --version` resolvable, degraded-not-failed), `mini-sycophancy-correction` (binary resolvable via an injected resolver — `lib/platform/sycophancy.mjs` once change `sycophancy-correction-vendored` provides it, a `PATH`/`SYCOPHANCY_BIN` lookup until then; `warn` when absent; `fail` when the resolved `skill.toml` names a gateway other than `http://localhost:4000/v1` — **this change is the sole owner of the check**), `mini-skill-copies` (every skill under `skills/` present and byte-identical under `<home>/.agents/skills/<name>` and `<home>/.claude/skills/<name>`, via `homeDir()`), `mini-kbd-state` (`prometheus kbd status --json` resolves or the waypoint projection parses; never both disagreeing), `mini-install-scope` (**fail** when `lib/platform/full-pack.mjs` reports the full pack present AND any mini skill copy exists under `<home>/.agents/skills` or `<home>/.claude/skills` — the binding rule in `config.yaml` that the mini never installs natively beside the full pack; `pass` otherwise, naming the markers found).
- Add `lib/platform/full-pack.mjs`: `detectFullPack({ home, spawn })` → the list of markers found (the `prometheus` CLI on PATH, `~/.prometheus/setup-state.json`, a `kbd-process-orchestrator` skill directory under either skills root, an `ai.prometheus.*` service unit on macOS/Linux); read-only, injected for tests.
- Fixes, limited to idempotent copies: `mini-skill-copies` offers `fix: 'copy-skills'` (copy, never symlink, atomic per file) **and refuses with `status: refused` when the full pack is present**; `mini-skill-copies` itself reports `skip` with the reason on such a machine; everything else reports the next step and offers no fix — installing Docker, starting services, or building submodules are `scripts/install.mjs`/`services.mjs` commands the summary names.
- Add `scripts/doctor.mjs`: runs all checks, prints **one JSON object per line** (`{ id, title, status, summary, detail, actions }`), then a final summary line; `--fix <fixId>` applies one named fix and prints its result line; `--human` renders a table instead. Exit 0 when nothing failed, 1 when any `fail`, never a stack trace.
- Add `skills/doctor/SKILL.md`: how an agent runs it, reads the JSON lines, and applies a fix only when the check offered it.
- `lib/doctor/contract.md` additionally records the **adapter contract** the-boss implements on its side: mini `status` → the-boss `DoctorCheckOutcome` (`warn`/`fail` need an `attribution` and a catalog-declared `detail.variant`, which only the-boss can supply), mini `summary` → `devMessage` or an evidence item (the host has no `summary`), and mini `refused` → `{ status: 'failed', message }` (the host has no `refused`). Named here so `the-boss-handoff` inherits a written mapping rather than inventing one.
- `scripts/install.mjs --doctor` (run the doctor at the end of an install) is added by change `openspec-fork-submodule` when it creates that file; this change does not touch `scripts/install.mjs`.

## Capabilities

### New Capabilities
- `doctor/checks`: the check contract, the check set, the fix contract, the output format, and the exit codes.

### Modified Capabilities
<!-- none -->

## Impact

- New: `lib/doctor/*.mjs` + tests, `scripts/doctor.mjs` + test, `skills/doctor/SKILL.md`, `lib/doctor/contract.md`.
- Depends on: `lib/platform/docker.mjs` (change `docker-services`), the versions comparison (change `review-housekeeping`), `resolveNodeCli` (change `openspec-fork-submodule`). Each check degrades to `skip` with a reason when its dependency is absent, so the doctor is runnable before those changes land.
- Security (A-3): `copy-skills` writes under the user's home directory — a real boundary; it writes only under `<home>/.agents/skills/<name>` and `<home>/.claude/skills/<name>` for names that exist under `skills/`, refuses any name containing a path separator or `..`, and never deletes.

## Non-goals

- A UI — the-boss's `DoctorDialog` renders these checks once the handoff's adapter maps them into its registry. Registering mini ids directly is impossible (closed union); the adapter is the-boss's work, not this change's.
- Repairing anything that is not an idempotent copy.
- The-boss-side checks (its own 31 remain its own).
