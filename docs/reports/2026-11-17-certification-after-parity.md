# Certification after the parity change — 2026-11-17

Taken at the boundary of change `parity-full-certification` with the certifier ported into this pack (`node skills/skill-certification/scripts/certify.mjs <skill-dir> --out <dir>`), static levels only, on macOS. Three validators ran for every skill: the built-in checks, `skills-ref` through `uvx`, and this repository's strict validator.

## Before and after

| | Before | After |
|---|---|---|
| Skills certified | 105 | 106 |
| Level held: C1 | 65 | 100 |
| Level held: none | 40 | 6 |
| C0 (specification) FAIL | 40 | 6 |
| C1 (static) FAIL | 0 | 0 |
| Validators that ran for C0 | 2 | 3 |

New since the baseline: `skill-certification` itself, which holds C1.

## Not exercised

- **C2 (trigger) and C3 (outcome)**: billed model runs; the owner chose static levels only. Six eval cases are in place for `vlbv`, `kbd-status` and `prometheus-rust-workspace` and have never been run.
- **C4 (portability)**: one harness only.
- **Windows**: every run was on macOS.

## Skills that do not hold the static level

Six skills fail C0 on one check, `top-level-fields`, and all three validators agree. They keep the same top-level fields as the same skills in the full pack.

| Skill | Top-level fields outside the specification |
|---|---|
| `adversarial-review` | authors, model_routing, triggers |
| `break` | disable-model-invocation |
| `explain-interface` | disable-model-invocation |
| `ideation-mindmap` | authors, triggers |
| `interface-review` | disable-model-invocation |
| `variant` | disable-model-invocation |

`disable-model-invocation` is read by Claude Code and makes those four skills user-invoked only; moving it under `metadata` would change their behaviour. The owner's options for each are: accept with a recorded exception (`--accept C0=<reason>`), move the field and accept the behaviour change, or leave as is.

## Warnings (no level fails on a warning)

| Check | Skills |
|---|---|
| no-eval-cases | 103 |
| description-no-trigger | 60 |
| skill-length | 1 |

`no-eval-cases` means a skill cannot be taken above C1 until cases are written for it. `description-no-trigger` means the description does not say when to use the skill, which is the usual cause of a skill that never starts.
