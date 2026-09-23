---
title: Doctor
sidebar_label: Doctor
---

# Doctor

`skills/doctor/SKILL.md`: use when checking whether this pack's environment is healthy — Node
version, version authority, submodules, Docker, the two services, `pk`, `sycophancy-correction`,
home-directory skill copies, KBD position, and the install-scope rule. Also use before reporting
that something "is not installed" or "is not running," so the claim is a verdict rather than a
guess.

## Contract

`lib/doctor/contract.mjs` and `lib/doctor/contract.md` define the mini's own doctor contract — not
a mirror of the-boss's. Its `DoctorCheckRegistry` is exhaustive over a **closed** `DoctorCheckId`
union, so a mini check cannot silently register itself there; the-boss instead spawns
`scripts/doctor.mjs` and maps its JSON output lines. Every check function returns an **array of
human-readable failures**, empty when conformant — never a boolean, because a yes/no answer cannot
say what is wrong, and a caller cannot distinguish "conformant" from "did not look."

## Check groups (`lib/doctor/registry.mjs`)

Registered in report order — cheapest and most fundamental first, so a terminal reader sees the
runtime verdict before any network probe, and the binding install-scope rule last, where it cannot
be missed:

| Module | Checks |
|---|---|
| `runtime.mjs` | The Node version floor, the `versions.toml` version authority, and submodule checkouts. Touches no network or service, so it runs everywhere and is the first thing a terminal reader sees. |
| `kbd.mjs` | KBD position agreement: the canonical runtime (`prometheus kbd status`) and the on-disk `current-waypoint.json` projection must agree — a disagreement means something wrote state out of band. |
| `services.mjs` | The two resident services (surreal-memory, liter-llm) and Docker underneath them. "Not running" is always a **warning** with the start command, never a failure — this pack must keep working with both down. A **failure** here means something IS listening and answering *wrongly*, a genuine fault distinct from mere absence. |
| `tools.mjs` | Optional tools: the Karpathy `pk` CLI and the `sycophancy-correction` binary. Both absent is a warning with next steps; present-but-broken or present-but-misconfigured (e.g. pointed at the wrong gateway) is a failure. |
| `skills.mjs` | The home-directory skill copies under `<home>/.agents/skills/<name>` and `<home>/.claude/skills/<name>` — see [Installation](/docs/getting-started/installation). |
| `scope.mjs` | The install-scope rule: this pack must never be installed natively alongside a full pack install. No auto-fix is offered — removing a user's files is not an idempotent copy, and it is not obvious which install is authoritative, so this check names what to remove and stops. |

## Running it

```bash
node scripts/doctor.mjs
```

Prints **one JSON object per line**, then a summary line — a cross-process, stable output contract
consumed by the-boss's own doctor integration. `scripts/doctor.mjs` itself is an entry point only:
parse arguments, call `lib/doctor/`, print, exit. No logic lives in the script.

## See also

- [Installation](/docs/getting-started/installation) — the install-scope rule doctor enforces.
- [Docker Services](/docs/services/docker-services) — what "the two services" means concretely.
