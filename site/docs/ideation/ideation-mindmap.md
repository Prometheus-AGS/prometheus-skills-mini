---
title: Ideation Mindmap
sidebar_label: Ideation Mindmap
---

# Ideation Mindmap

`skills/ideation-mindmap/SKILL.md`: takes a one-line business or product concept and generates a
6-branch concept mindmap via surreal-memory's `generate_ideation_mindmap` tool, structuring raw
ideas into actionable branches through independent generation, pooling, and critic scoring.

Triggers on phrases like "ideation mindmap," "concept tree," "expand idea," "branch concept," or
"mindmap my idea" — any one-line business/product concept the user wants structured into branched
concept clusters before deeper specification.

## Why independence is verified, not just instructed

A skill can say "generate each branch independently" in its prose, and a model can share context
across branches anyway — with nothing downstream the wiser. Chen et al. (2026) found multi-agent
LLM ideation collapses toward agreement despite architectural attempts to diversify, so this pack's
defence is **structural**, not another sentence of instruction: `lib/ideation/dispatch.mjs` and
`lib/ideation/independence.mjs` record and check the property directly.

## `lib/ideation/` modules

| Module | Ported from | What it does |
|---|---|---|
| `dispatch.mjs` | `record-dispatch.sh` (96 lines) | Writes down the input each dispatch actually received. The property being enforced: every set's input contains the topic and *nothing* drawn from another set's output. Fails at record time — a contaminated set never enters the pool at all, the cheapest place to catch it. |
| `independence.mjs` | `assert-independent-dispatch.sh` (126 lines) | Reads what each dispatch actually received (from `dispatch.mjs`'s recorded inputs) and asserts: (1) at least *N* sets exist (default 3), (2) no set's input contains another set's output, (3) every set's input references the topic — the same question, not *N* different ones, (4) outputs are not byte-identical (a copied set is not a second sample). |
| `ui-intent.mjs` | `emit-ui-intent.sh` (90 lines) | The ideation flow's presentation path. **Judgment call, recorded explicitly:** the source shells out to a sibling skill, `ui-surface`, for harness UI-tier resolution and a Tier-1 file-pair handshake. `ui-surface` has not been ported to this repo (it is not a Phase C target), so this module is scoped to Tier-0 text only — porting an entire second skill as a side effect would have been scope creep. |

## Dependency

Ideation-mindmap's hard dependency, surreal-memory, is one of the two services this pack keeps —
see [Docker Services](/docs/services/docker-services). Unlike the full pack (where surreal-memory
had no defined Windows path), it is now available on every platform this pack targets.

## See also

- [Adversarial Review](/docs/review/adversarial-review) — the sibling review pipeline, also cross-model by design.
- [Docker Services](/docs/services/docker-services) — surreal-memory's endpoint and lifecycle.
