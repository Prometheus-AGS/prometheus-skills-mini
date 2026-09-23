# D3 — UAR's algorithm options and where their settings live (revision 3)

Revision 3, 2026-09-23. Revised after two adversarial reviews (round 1: 2 CRITICAL; round 2: 2 CRITICAL),
a feasibility spike on each stub, and operator decisions ("drop the legacy classifier stubs, build the real
ones"; "configure + see").

## Decision

Every UAR option the-boss exposes must actually work.

**Build in UAR:**
- SkillService `Llm` skill matching (today falls back to keyword, `skills/service.rs:697-701`): reuse the
  prompt and parser in `runtime/matching/intent/llm.rs`, run on the run's bound driver, honour `model_name`.
  Estimate 1 day.
- A distinct `LocalEmbedding` matcher (today identical to `Embedding`, `service.rs:703`): on-device
  fastembed with an in-memory skill-vector cache rebuilt on reconciliation. Estimate 2 days (upper bound).
- `agentic` chunking (today returns the whole document, `rag/chunking.rs:79-82`): LLM boundary offsets,
  windowing, reconstruction check, `Recursive` fallback; a one-page design first. Estimate 3 days (upper
  bound).
- Parser bugs: map `"agentic"`; accept `fixed_size` (settings) as `"fixed"` (parsers).

**Drop:** the dead legacy intent classifier's `wasm`/`llm`/`localembedding` stubs; its settings namespace is
not exposed by the-boss and is marked legacy in UAR.

**Stop rule.** Effort is tracked as focused working days, recorded by the implementer in the KBD task log
(start/stop entries per task); estimates use the upper bound of each range. An item whose recorded effort
reaches 1.5× its upper bound without passing its gate (LLM matching 1.5 days, local embedding 3 days,
agentic chunking 4.5 days) stops: it is hidden from the-boss's settings and recorded as follow-up work. The
three together are capped at 8 recorded days; reaching the cap stops whichever items are still open.

**Settings split.**
- *Per agent* (new capability flag + `configuration.uar`; UAR section in `AgentEditDialog`; sent inline
  with every run): context compaction strategy (`none`, `sliding_window`, `summarize`, `truncate_middle`,
  `hierarchical`, `auto`), skill `prefer` and `max_active`, tool approval and execution mode
  (`direct`/`sandboxed`/`auto`, `max_concurrent`), memory on/off and knowledge bases, budgets (only once
  enforcement is verified).
- *App-wide* (new `/settings/uar` page; pushed on every sidecar start): skill-matching algorithm and
  thresholds, skill activation mode, guardrails, sycophancy.
- *Precedence:* per-agent values win over app-wide values for the same concern; guardrails and sycophancy
  can only make a run stricter (a guardrail denial is final); the UI states this beside each setting.
- *Persistence:* the-boss persists all of these; UAR's in-memory skill-matching config is re-pushed on every
  sidecar start.

## Assumptions

- The recorded-effort stop rule is followed.
- UAR resolves per-agent options per run from the artifact and app-wide options globally (verified in code,
  except budget enforcement on root runs).

## Falsifier

Named tests in step 2; any failure hides the affected option or reopens this decision.

1. **LLM matching:** on `evals/skill-activation.yaml` plus ≥ 5 paraphrase cases with no keyword overlap and
   a deterministic mock driver, `Llm` picks the expected skill in ≥ 4 of 5 paraphrase cases where keyword
   matching picks it in ≤ 1; a malformed reply falls back to keyword.
2. **Local embedding:** zero calls to the remote embedding backend (existing `RecordingEmbeddingBackend`
   double, `service.rs:959`); still matches with persistence off.
3. **Agentic chunking:** on a three-topic fixture with a mock LLM: > 1 chunk, chunks concatenate to the exact
   input, boundaries match the mock's offsets; LLM error → `Recursive`.
4. **Every per-agent option applies per run:** for each compaction strategy, skill `prefer`/`max_active`,
   tool approval mode, execution mode, and memory/KB setting, a test shows UAR's recorded run policy for a
   run from that agent carries the value, and a second agent with a different value in a concurrent run
   gets its own.
5. **Budgets:** a root run with `max_tool_calls_per_turn: 1` attempting two tool calls is stopped at the
   second; if not, budgets stay hidden.
6. **App-wide push and persistence:** after changing each app-wide setting, UAR's settings API reports the
   new value; after a sidecar restart it still does (re-pushed).
7. **Precedence:** a per-agent tool approval of `auto` with an app-wide guardrail that denies a tool still
   denies that tool; a per-agent value overrides the app-wide value where both exist.
8. **Stop rule:** the KBD task log shows recorded effort per item; any item past its limit is hidden.

## Unresolved review findings (round 3, accepted by operator decision; carried into step 2 as open risks)

Review: judge `gpt-5.5`, `verified-distinct`, verdict BLOCK (2 CRITICAL, 4 WARNING); findings in
`../review/d3-options-settings.r3.findings.json`.

1. **Propagation tests are not behaviour tests.** Step 2 adds a behaviour-level gate per exposed option
   (e.g. each compaction strategy changes the model-visible history as specified; `max_active` limits active
   skills; execution mode changes where a tool runs); an option without one is hidden.
2. **The stop rule is self-reported.** Step 2 records dated start/stop entries in the KBD task log before
   work begins, and the phase's adversarial review checks them at each threshold.
