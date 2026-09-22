# Spec handoff — the-boss-shipping-and-settings

**6 changes across 2 repositories**, all validating. ZeeSpec: n/a (no `.zeespec/`).

**Mini (2 new):** `mini-vendor-submodules` (goal B4 — four SOURCE submodules under `tools/`, pinned
to released commits), `the-boss-release-infrastructure` (goal A — three workflows to run, one CI
to build from scratch).

**the-boss (4 new, `prometheus-00N` following its own series):** `001-skills-bundling`
(submodule + runnable app-data pack + namespace), `002-binary-shipping` (two `TOOLS[]` entries),
`003-settings-and-doctor` (check source, repair, startup push, settings section, preferences,
i18n), `004-docker-services` (consent and rendering only).

**Already in the mini's backlog and NOT duplicated:** `compass-vendored`,
`openspec-fork-submodule`, `sycophancy-correction-vendored`, `docker-services` (51 tasks, 0 done).
`prometheus-004` depends on `docker-services` landing.

## Two review rounds; both found real defects

R1 CRITICAL — nothing created the **app-data copy** of the runnable pack, yet 003 and 004 both
spawn `scripts/doctor.mjs` and `services.mjs` from it. Both would have failed at runtime. Fixed in
001 §3.

R1 also: goal B6 (openspec submodule) unclaimed; the sycophancy repo target contradicted the goal;
preference keys underspecified; Docker endpoints unstated.

R2 CRITICAL — contradictions I introduced while fixing R1: the openspec submodule was promised in a
proposal but had no task; Docker consent was owned by two changes; the push spec told the-boss to
copy while its proposal said delegate to the mini. All fixed.

## Carried to plan

- **Ordering is forced:** `the-boss-release-infrastructure` → `mini-vendor-submodules` and
  `prometheus-002`. Nothing binary-related can start before a release exists.
- **`prometheus-001` §3 gates `003` and `004`** — they spawn what it installs.
- **sycophancy-correction is the long pole** — no CI at all, and its repo target is an operator
  decision (default `Prometheus-AGS` per goal A-3; anything else is a goal change).
- **Windows is unverified everywhere.** Every change's last task says so.
- Five targets, not four: two Windows, two macOS, one Linux.

## Unresolved

The two-round cap was reached. Both rounds were fixed in full; no finding was left standing. The
standing caveat from the analyze stage still applies: the-boss citations are outside any packet
built from the mini, so execution must RE-READ them rather than trust them — one stale citation
already occurred this phase.
