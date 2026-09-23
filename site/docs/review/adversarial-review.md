---
title: Adversarial Review
sidebar_label: Adversarial Review
---

# Adversarial Review

`skills/adversarial-review/SKILL.md` describes isolated, cross-model adversarial review of KBD
artifacts and change diffs: it dispatches a fresh-context LLM judge over an OpenAI-compatible REST
gateway (`liter-llm api`) with an explicit mandate to find problems. **The model that produced an
artifact or change is never the model that reviews it.** It runs as a pipeline stage inside
`kbd-assess`/`analyze`/`plan` (artifact mode) and `kbd-execute`'s per-change QA gate (diff mode).
Findings are severity-bucketed (`CRITICAL` / `WARNING` / `SUGGESTION`), and the judge's own report
is screened by the sycophancy anti-theater gate before it is surfaced.

This is a full Node port of the full pack's 6,146-line bash + inline Python implementation, with
`python3` and `curl` eliminated entirely (plain JS objects and `fetch`).

## The judge/producer isolation guarantee

The pipeline's central invariant: **judge ≠ producer**. `lib/review/judge-findings.mjs` (a port of
the extract/normalize block in `dispatch-judge.sh`) computes `cross_model_check`, the artifact's
own record of whether that guarantee actually held. This is called out as the safety-critical half
of the dispatch — a bug here would silently turn a same-model self-grade into a report that *looks*
like a genuine cross-model review.

`KBD_PRODUCER_MODEL` must be explicit — there is no silent default, matching the source's own
stated reasoning that a default there would defeat the isolation contract. `lib/review/decision-validate.mjs`
enforces this even more strictly for decision-mode artifacts: a decision is what a human commits to,
so an honest record of a failed judge≠producer guarantee is itself a rejection, not a footnote.

## Pipeline modules (`lib/review/`)

| Module | Ported from | Role |
|---|---|---|
| `judge-client.mjs` | `dispatch-judge.sh` (379 lines, dispatch half) | Request-body construction and the timeout-escalation retry loop against an OpenAI-compatible `/v1/chat/completions` endpoint. Hand-rolled `fetch` client, not a reuse of the phase-tier routing module — the judge has no equivalent of `resolvePhase()`'s tiering. |
| `judge-findings.mjs` | `dispatch-judge.sh` (extract/normalize) | Computes `cross_model_check` — the safety-critical isolation record described above. |
| `model-resolution.mjs` | `kbd-model-resolve.sh` | Role/gateway resolution across two files: `~/.prometheus/kbd/models.toml` (KBD owns role → model name) and `~/.config/liter-llm/liter-llm-proxy.toml` (liter-llm owns name → provider + base URL + API key). Reads only the first file — never touches the proxy config or API keys directly. |
| `preflight.mjs` | `preflight-models.sh` (286 lines) | Verifies liter-llm is installed and configured with enough distinct models for cross-model judging. Never writes `config.toml`, never touches API keys. Advisory only — every exported function is pure, and the CLI entry point is responsible for catching everything and always exiting 0. |
| `retry-loop.mjs` | `review-retry-loop.sh` (129 lines) | Bounded `CRITICAL`-finding retry loop shared by the skill/agent creators. `PROMETHEUS_ADV_RETRY_ROUNDS` (default 2) bounds how many times an *artifact* is re-reviewed — a deliberately different knob than the sycophancy screen's own rejection cap, so a lenient screen setting can never silently extend how long a broken artifact keeps being retried. |
| `sycophancy-binary.mjs` | `sycophancy.sh` (`syco_find_bin`, `syco_map_strictness`, `syco_analyze`) | Locates the `sycophancy-correction` binary on `PATH` only (the source's plugin-cache fallback path does not apply here — this pack has no plugin cache). A binary not on `PATH` is reported absent; the CLI degrades gracefully. |
| `sycophancy-gate.mjs` | `check-findings-sycophancy.sh` (277 lines) | The anti-theater gate for the judge's *own* findings report — catches the failure mode where a reviewer softens itself back toward agreement (hedged praise, "no real issues," empty findings on substantial input). |
| `decision-log.mjs` | `decision-log.sh` (236 lines) | Persists decisions and their outcomes in the knowledge wiki, as OKF v0.1 entries (`type: Decision` is purely additive). Idea rankings are known to flip after execution, so a score recorded at decision time is only meaningful once checked against what actually happened. |
| `decision-validate.mjs` | `validate-decision-artifact.sh` (98 lines) | Enforces the stricter judge≠producer requirement for decision-mode artifacts (see above). |
| `commit-gate.mjs` | `commit-before-reveal.sh` (140 lines) | Withholds analysis until the user commits their own judgement first. Ordering, not content, is the intervention — showing analysis before asking what someone thinks produces agreement, not judgement. This gate **refuses** rather than warns. |
| `mobile-classify.mjs` | `classify-mobile-execution.sh` (196 lines) | Assigns every script-bearing skill a mobile-execution verdict (E0 already portable, E1 portable as Wasm, E2 needs a native binary/daemon), recomputed from the tree every run so a `--check` comparison fails on drift. |

## Packet builder (`lib/review/packet-builder/`)

A port of the 919-line `build-review-packet.sh`, split by responsibility:

- **`truncation.mjs`** — per-field character caps, applied per field (never per packet), always
  recorded in the packet even when nothing was cut.
- **`manifest-guard.mjs`** — structurally enforces "manifest-level, never full source" for
  skill/agent creation modes, via unanchored patterns that catch a leaked shell function or Rust
  `fn`/`use`/`impl` mid-line inside a supposedly descriptive field.
- **`cited-paths.mjs`** — resolves every backtick-quoted, source-extension path the artifact
  *cites* and stamps each `EXISTS`/`MISSING`/`EXTERNAL`, bounded by the artifact rather than by
  `file_tree`'s `maxdepth 2` (which would otherwise false-flag correct citations at depth 3+).
- **`diff-assembler.mjs`** — diff-mode assembly, scoped to the change's recorded file list when
  available. Excludes review receipts under the change's own review directory to avoid recursive
  self-reference.
- **`decision-fields.mjs`** — parses decision/assumptions/falsifier fields; a decision with no
  falsifier cannot be wrong about anything, so its absence is recorded structurally rather than
  treated as a parse error.
- **`skill-manifest.mjs`** / **`agent-manifest.mjs`** — skill and agent (Rust workspace + MCP
  wiring) manifest assembly, both manifest-level only.
- **`producer-model.mjs`** — best-effort record of which model produced the work under review.
  `"unknown"` is deliberately *not* a harmless default — it would make the judge≠producer check
  pass trivially, so this warns loudly rather than staying silent.
- **`file-tree.mjs`** — the pruned, sorted `find . -maxdepth 2` equivalent.
- **`research-packet.mjs`** — the one artifact target that is not a KBD stage: reviews a
  deep-research report (`report.md`, `<slug>.provenance.md`, `plan.md`, all required) before
  delivery.
- **`packet.mjs`** — top-level mode dispatch and field selection, composing every module above.

## Exit contract

Gateway unreachable → caller falls back to a fresh-context subagent and records
`isolation_mode=harness-native`. This preserves the source pack's C8a guarantee: the KBD loop keeps
working with the liter-llm gateway down.

## See also

- [Docker Services](/docs/services/docker-services) — how the liter-llm gateway and surreal-memory run.
- [KBD Overview](/docs/kbd/overview) — where the review gate fires in the lifecycle.
