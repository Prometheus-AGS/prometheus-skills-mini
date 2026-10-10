# Task 9: split text/reasoning event source investigation

2026-10-07, execute/task 9 revision 245. Bounded read-only author investigation. Only this document was written. No product/gate changes, tests, builds, endpoints, raw logs, provider/model changes, or excluded diagnostics were run.

## Observations and conclusion

Root reports G2-06 failed at `event_assertions/split`. The controlled provider sends two `reasoning_content` chunks and two content chunks separated by 20 ms, and the fixture requires at least two actual text and reasoning content events for the split injection. Exact failing counts/predicates were not yet observed in this investigation. Do not infer the measured failure from the source alone.

No text/reasoning size threshold or coalescing timer was found in the inspected UAR orchestrator, manager, copied-content projector, and SSE emission layers. There are two source-grounded constraints to distinguish from coalescing:

1. The compatible Liter driver emits content/tool/usage events but has no `reasoning_content` → ReasoningDelta path in its current stream loop. If this is the actual selected driver, sending reasoning chunks does not produce UAR reasoning events.
2. All text deltas within a run intentionally share one `messageId`, and all reasoning deltas share another. Distinct event boundaries must be identified by the real source SSE/event IDs, not distinct message IDs.

These are source facts, not an observed explanation of the G2-06 predicate. Actual per-channel event counts remain required.

## Exact emission path

Paths are relative to `/Users/gqadonis/.claude/worktrees/bauar-uar`.

- `src/llm/orchestrator.rs:85-131` selects native Anthropic only under the named provider/runtime condition. Otherwise it constructs `LiterLlmDriver` at 125-131. An externally supplied driver is also possible through the explicit `from_driver` API; this document does not assume a particular gate driver without its existing configuration evidence.
- `src/llm/liter_driver.rs:606-622` receives the library's chunk stream. At 637-644 it emits one MessageDelta for each nonempty `choice.delta.content`. Its full loop through 730 handles tool calls, finish reasons, and usage; it contains no ThinkingDelta/ReasoningDelta emission or `reasoning_content` mapping. There is no text timer/size accumulator in this UAR adapter. This does not claim to inspect every behavior inside the vendored SDK.
- `orchestrator.rs:2267-2292` applies a stream-idle timeout while awaiting each driver event; that is a failure timeout, not a batching timer. At 2293-2338 it updates execution accumulators and yields the current event. `assistant_text.push_str` at 2297-2298 accumulates canonical assistant content without replacing the per-event yield.
- `orchestrator.rs:2926-2935` wraps the returned stream in `ProjectedEventStream`. This is a copied-content sanitizer, not a timed batching layer.
- `src/uar/runtime/turn/host/secret_stream.rs:35-41` keeps independent text/thinking/reasoning streams. Each push invokes a finite prefix projector. At its `SecretStream::push` implementation, unresolved suffixes that might complete a captured secret remain pending until more bytes or terminal finish. It uses no elapsed-time or minimum-size threshold. `ProjectedEventStream::push` still appends the event even if its projected text becomes empty; finish may add a nonempty tail event.
- The actual carry rule is `secret_projection.rs`'s `prefix`: when an unfinished tail is a proper prefix of a captured variant, it stops consuming there. Complete matches become `[REDACTED]`; unrelated characters are emitted immediately. Increasing a 20 ms provider delay cannot force an unresolved secret prefix to flush.
- `manager.rs:6148-6167` maps MessageDelta, ThinkingDelta, and ReasoningDelta individually to their domain events. Its event-history publication at 77-99 assigns each source event a monotonically advancing history ID. The accumulated content at 6151 is separate from each emitted ChatDelta.
- `src/uar/api/adapters.rs:92-107` maps ChatDelta directly to `TEXT_MESSAGE_CONTENT` and ReasoningDelta to `REASONING_MESSAGE_CONTENT`. It assigns constant per-run message IDs (`run:assistant`, `run:reasoning`). **ThinkingDelta is explicitly omitted at line 100**, so thinking is not an interchangeable source for this required reasoning event.
- `src/uar/api/sse.rs:182-264` stages tool arguments only where necessary to preserve tool lifecycle ordering. The text/reasoning mappings pass through directly. At 360-395, each source event is projected/framed using its source ID; there is no text/reasoning batching. The 15-second interval at 397-398 is an SSE keepalive, not a content flush interval.

## Narrow finite diagnostics

The existing controlled provider and actual SSE interceptor can report the following without raw content, identifiers, alternate endpoints, or added production instrumentation:

- Provider-sent chunk counts by `content` and `reasoning_content`.
- Actual intercepted event counts for `TEXT_MESSAGE_CONTENT` and `REASONING_MESSAGE_CONTENT`, plus nonempty-delta counts for each.
- Number of distinct actual source SSE/event IDs for each channel; booleans confirming strictly preserved source sequence and unchanged message/control identifiers through injection.
- Number of eligible actual events consumed by the split injector per channel; whether both halves were injected; per-channel canary absence and marker presence after the existing projection.
- A fixed boolean/category for the already-known selected driver family, using existing configuration evidence only. Do not infer it from event absence alone.

Interpretation must stay bounded: `reasoningSent:2` with `reasoningEvents:0` is distinct from two events with identical message IDs, or two events whose payload becomes empty due to secret-prefix carry. Source IDs and message IDs answer different questions. A generic `split:false` alone distinguishes none of these.

## Minimal source-backed fixture options

For text event availability, keep two distinct nonempty ordinary provider content chunks containing harmless fixture text that is not a prefix of any captured canary variant. Then require two actual UAR text source events before injecting the canary halves into those real copied payloads. Do not synthesize SSE events, forge IDs, renumber sequence, or count provider chunks as UAR events. A larger time gap has no source-backed UAR flush threshold to target here.

For reasoning, if the actual selected path is Liter and finite counts show no reasoning events, no fixture-only timing/padding adjustment can make that driver's absent reasoning mapping emit the required events. Preserve the requirement as BLOCKED/unrun rather than substitute text/thinking events or fabricate reasoning frames. An implementation to support reasoning normalization, or a separately approved genuine existing reasoning-producing path, would require additional explicit scope; neither is authorized or proposed as an unobserved fix in this task. Model/provider defaults and configuration remain unchanged.

If the actual diagnostics show two reasoning events already exist, the absent-Liter-mapping observation is not the case's cause. Continue only from the concrete counts/predicates, especially source-ID versus message-ID checks and payload eligibility. This evidence is not permission to alter the fixture before those observations.

## Source snapshot and scope

| Path | SHA-256 |
| --- | --- |
| src/llm/orchestrator.rs | c0e6186b949ad587f4c17f55bde95f8c85e4f0d17abbacee62c8fa526921d8a7 |
| src/uar/runtime/manager.rs | a786f4830611f92b0c718c474ae392efda8eb89ccf1fb4ca59e0947a1db40d17 |
| src/llm/liter_driver.rs | ee25a3547a774694225f183af5ad2047f8aae523e2c9e0742c8e6a430d9d837f |
| src/uar/runtime/turn/host/secret_stream.rs | 9c30e2a3eaeebf8dd76ecce508ab06a30465dcf5ec33da20b882f30636398340 |
| src/uar/runtime/turn/host/secret_projection.rs | 47558fea97a13c1c3f24e1c5591f3e00bd3f1bea3cb18b17a28d4a3e332b8e87 |
| src/uar/api/sse.rs | 0eefc7542b68262e359697b2f10147f8de29e7a789a830d06f0dbbdc4af762d4 |
| src/uar/api/adapters.rs | a10638164fa4c62e2d1334d2088b49f0d32cf92bd5cc468cf72db24698a642df |

Inspected only the named orchestrator/manager and their explicitly referenced driver/emission helpers. An adapters directory lookup was absent; the named module is `adapters.rs`. No broad multi-root scan occurred. Neither excluded D0 source was opened/hashed, and no rejected diagnostic was retried or rerouted. The historical task 7 partial-exposure incident remains separately recorded and is not erased by this scoped account. No runtime acceptance is claimed.
