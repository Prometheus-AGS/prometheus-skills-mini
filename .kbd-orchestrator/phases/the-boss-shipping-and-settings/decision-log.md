# Decision log — the-boss-shipping-and-settings

### 2026-09-22 — the-boss already has a streaming diagnostic runner
Decision: adopt `DoctorService` shared-cache publishing rather than building a progress mechanism | Provenance: research (Tier 1, own code)
Evidence: `DoctorService.ts:298-301` republishes partial results through an execute() callback; the renderer subscribes via `useSharedCacheValue`. Goal D-12 reduces to one check-source that spawns `scripts/doctor.mjs`.

### 2026-09-22 — preferenceSchemas.ts is generated; no migration needed
Decision: add keys to `classification.json` and run `pnpm data:generate` | Provenance: research
Evidence: file header declares auto-generation; `preferenceTable` is (scope, key, value JSON) with a composite PK, so a new preference is a row and not a schema change.

### 2026-09-22 — Docker boundary between the mini and the-boss
Decision: the mini probes (`dockerState()`), the-boss renders and owns consent | Provenance: research
Evidence: the-boss has no Docker awareness (6 incidental mentions); the mini already specifies detection with no wsl.exe and no socket access. Prevents two divergent implementations.

### 2026-09-22 — sycophancy-correction is the long pole
Decision: sequence first or defer; it cannot be “tagged and released” | Provenance: operator-supplied URL + verification
Evidence: `Know-Me-Tools/sycophancy-correction-skill` has NO `.github/workflows` and 0 releases, unlike the other three forks whose workflows merely have never run. My assessment had searched the wrong repo name and wrongly reported it absent.

### 2026-09-22 — design skills govern composition, not primitives
Decision: the four design skills drive information architecture, state design and copy inside `@cherrystudio/ui`; they do not introduce a second component vocabulary | Provenance: research + judgement
Evidence: the-boss has an established settings language (`SettingsPrimitives.tsx`, a local Radix+Tailwind package). A Prometheus page that ignored it would be inconsistent, which is a defect rather than better design.
